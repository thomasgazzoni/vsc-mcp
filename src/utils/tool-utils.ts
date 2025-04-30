import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";
import { MessageConnection } from "vscode-jsonrpc";
import { DidOpenTextDocumentNotification } from "vscode-languageserver-protocol";
import { isPathAllowed } from "./file-utils.js";
import { getLanguageIdFromPath, getLSPInstance } from "./lsp-utils.js";

export interface ToolSetupParams {
  connection: MessageConnection;
  absolutePath: string;
  fileRelativeUri: string;
  fileContent: string;
}

export async function setupLSPTool(
  toolName: string,
  filePath: string,
  toolImplementation: (params: ToolSetupParams) => Promise<CallToolResult>
) {
  const absolutePath = path.resolve(filePath);

  // Check if the path is allowed
  const pathCheck = isPathAllowed(absolutePath);
  if (!pathCheck.allowed) {
    throw new Error(
      pathCheck.error ||
        "Access denied: File path is not within allowed directories"
    );
  }

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  // Get LSP instance and file information
  const { connection, serverProcess, fileRelativeUri, fileContent } =
    await getLSPInstance(absolutePath);

  try {
    // Open the document in the language server
    await connection.sendNotification(
      DidOpenTextDocumentNotification.type.method,
      {
        textDocument: {
          uri: fileRelativeUri,
          languageId: getLanguageIdFromPath(absolutePath),
          version: 1,
          text: fileContent,
        },
      }
    );

    const result = await toolImplementation({
      connection,
      absolutePath,
      fileRelativeUri,
      fileContent,
    });

    // Clean up resources
    connection.dispose();
    serverProcess.kill();

    return result;
  } catch (error) {
    // Clean up resources
    connection.dispose();
    serverProcess.kill();

    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Error ${toolName}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
    };
  }
}
