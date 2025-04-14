import * as fs from "fs";
import * as path from "path";

import {
  DidOpenTextDocumentNotification,
  Position,
  RenameParams,
  TextDocumentIdentifier,
  WorkspaceEdit
} from "vscode-languageserver-protocol";
import { findProjectRoot, getLSPInstance, applyWorkspaceEdit } from "../utils/lsp-utils.js";

export const renameSymbolTool = {
  name: "rename_symbol",
  description:
    "Renames a symbol at the given position to a new name using LSP.",
  inputSchema: {
    type: "object",
    properties: {
      filePath: { type: "string", description: "Path to the source file" },
      line: { type: "number", description: "Line number (0-based)" },
      character: { type: "number", description: "Character in line (0-based)" },
      newName: { type: "string", description: "New name for the symbol" },
    },
    required: ["filePath", "line", "character", "newName"],
  },
};

export async function renameSymbolHandler({
  filePath,
  line,
  character,
  newName,
}: {
  filePath: string;
  line: number;
  character: number;
  newName: string;
}) {
  try {
    const edit = await renameSymbol({ filePath, line, character, newName });
    
    // Apply the workspace edit to the files
    const { changedFiles, totalChanges } = await applyWorkspaceEdit(edit);
    
    // Process the workspace edit to make it more readable for the response
    const changes: Record<string, { range: any; newText: string }[]> = {};
    
    if (edit.changes) {
      for (const [uri, edits] of Object.entries(edit.changes)) {
        // Convert URI to a more readable path
        const filePath = uri.startsWith('file://') ? uri.slice(7) : uri;
        changes[filePath] = edits.map(edit => ({
          range: edit.range,
          newText: edit.newText
        }));
      }
    }

    return {
      content: [
        {
          type: 'text' as const,
          mimeType: 'application/json',
          text: JSON.stringify({ 
            changes,
            summary: {
              changedFiles,
              totalChanges
            }
          })
        },
      ],
    } as any;
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: `Error renaming symbol: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
    };
  }
}

// LSP utility
async function renameSymbol(params: {
  filePath: string;
  line: number;
  character: number;
  newName: string;
}): Promise<WorkspaceEdit> {
  const { filePath, line, character, newName } = params;
  const fileUri = `file://${path.resolve(filePath)}`;
  const fileContent = fs.readFileSync(filePath, "utf-8");

  // Find project root using the shared utility function
  const projectRoot = findProjectRoot(filePath);

  const { connection, serverProcess } = await getLSPInstance(projectRoot);

  // Open the document in the language server
  await connection.sendNotification(
    DidOpenTextDocumentNotification.type.method,
    {
      textDocument: {
        uri: fileUri,
        languageId: "typescript",
        version: 1,
        text: fileContent,
      },
    }
  );

  // Create rename parameters
  const renameParams: RenameParams = {
    textDocument: TextDocumentIdentifier.create(fileUri),
    position: Position.create(line, character),
    newName: newName
  };

  // Request rename from the language server
  const result: WorkspaceEdit = await connection.sendRequest(
    "textDocument/rename",
    renameParams
  );

  // Clean up resources
  connection.dispose();
  serverProcess.kill();

  return result;
}