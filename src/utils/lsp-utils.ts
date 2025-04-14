import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import { createMessageConnection } from "vscode-jsonrpc";
import {
  StreamMessageReader,
  StreamMessageWriter,
} from "vscode-jsonrpc/node.js";
import {
  InitializeParams,
  InitializeRequest,
  WorkspaceEdit,
} from "vscode-languageserver-protocol";
import { logger } from "./logger.js";

/**
 * Finds the project root directory by looking for tsconfig.json or package.json
 * @param filePath The path to the source file
 * @returns The path to the project root directory
 */
export function findProjectRoot(filePath: string): string {
  let projectRoot = path.dirname(filePath);
  let foundRoot = false;

  while (!foundRoot && projectRoot !== "/") {
    if (
      fs.existsSync(path.join(projectRoot, "tsconfig.json")) ||
      fs.existsSync(path.join(projectRoot, "package.json"))
    ) {
      foundRoot = true;
    } else {
      projectRoot = path.dirname(projectRoot);
    }
  }
  logger.debug(`foundRoot: ${foundRoot}`);
  logger.debug(`Project root: ${projectRoot}`);

  if (!foundRoot) {
    projectRoot = path.dirname(filePath); // Fallback to file directory
  }

  return projectRoot;
}

export async function getLSPInstance(projectRoot: string, useVSCode = true) {
  logger.debug(
    `Starting TypeScript language server for project: ${projectRoot}`
  );

  let serverProcess;
  let reader;
  let writer;

  if (useVSCode) {
    // Connect to VS Code's language server via socket
    const net = require("net");
    const socket = net.connect({ port: 5870 }); // Use the port VS Code is listening on

    reader = new StreamMessageReader(socket);
    writer = new StreamMessageWriter(socket);

    // Create a mock server process object with a kill method
    serverProcess = {
      kill: () => {
        socket.end();
        logger.debug("Closed connection to VS Code language server");
      },
    };
  } else {
    // Use the standalone TypeScript language server
    serverProcess = cp.spawn("npx", ["typescript-language-server", "--stdio"]);
    reader = new StreamMessageReader(serverProcess.stdout);
    writer = new StreamMessageWriter(serverProcess.stdin);
  }
  // Create connection
  const connection = createMessageConnection(reader, writer);
  connection.listen();

  // Initialize the language server with proper capabilities
  const initializeParams: InitializeParams = {
    processId: process.pid,
    capabilities: {
      workspace: {
        workspaceEdit: {
          documentChanges: true,
        },
        applyEdit: true,
        workspaceFolders: true,
        symbol: {
          resolveSupport: {
            properties: ["location.range"],
          },
        },
      },
      textDocument: {
        rename: {
          dynamicRegistration: true,
          prepareSupport: true,
        },
        definition: {
          dynamicRegistration: true,
        },
        typeDefinition: {
          dynamicRegistration: true,
          linkSupport: true,
        },
        references: {
          dynamicRegistration: true,
        },
      },
    },
    rootUri: `file://${projectRoot}`,
    workspaceFolders: [
      { uri: `file://${projectRoot}`, name: path.basename(projectRoot) },
    ],
  };

  logger.debug("Initializing language server");
  await connection.sendRequest(InitializeRequest.type.method, initializeParams);
  logger.debug("Language server initialized");
  return { connection, serverProcess };
}

/**
 * Applies workspace edits to files
 * @param workspaceEdit The workspace edit to apply
 * @returns Object containing information about the applied changes
 */
export async function applyWorkspaceEdit(
  workspaceEdit: WorkspaceEdit
): Promise<{
  changedFiles: string[];
  totalChanges: number;
}> {
  const changedFiles: string[] = [];
  let totalChanges = 0;

  if (!workspaceEdit.changes) {
    logger.warn("No changes in workspace edit");
    return { changedFiles, totalChanges };
  }

  logger.info(
    `Applying workspace edits to ${
      Object.keys(workspaceEdit.changes).length
    } files`
  );

  // Process each file's changes
  for (const [uri, edits] of Object.entries(workspaceEdit.changes)) {
    // Convert URI to file path
    const filePath = uri.startsWith("file://") ? uri.slice(7) : uri;

    if (!fs.existsSync(filePath)) {
      logger.error(`File does not exist: ${filePath}`);
      continue;
    }

    logger.debug(`Processing ${edits.length} edits for file: ${filePath}`);

    // Read the file content
    let content = fs.readFileSync(filePath, "utf-8");
    const originalContent = content;

    // Sort edits in reverse order (from bottom to top) to avoid position shifts
    const sortedEdits = [...edits].sort((a, b) => {
      if (a.range.start.line !== b.range.start.line) {
        return b.range.start.line - a.range.start.line;
      }
      return b.range.start.character - a.range.start.character;
    });

    // Apply each edit
    for (const edit of sortedEdits) {
      const { range, newText } = edit;
      const { start, end } = range;

      // Split content into lines
      const lines = content.split("\n");

      // Calculate start and end positions in the string
      const startPos = getPositionOffset(lines, start.line, start.character);
      const endPos = getPositionOffset(lines, end.line, end.character);

      // Apply the edit
      content =
        content.substring(0, startPos) + newText + content.substring(endPos);
      totalChanges++;

      logger.debug(
        `Applied edit at ${start.line}:${start.character}-${end.line}:${end.character}`
      );
    }

    // Only write to file if content has changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, "utf-8");
      changedFiles.push(filePath);
      logger.info(`Updated file: ${filePath}`);
    } else {
      logger.debug(`No changes to write for file: ${filePath}`);
    }
  }

  logger.info(
    `Applied ${totalChanges} changes to ${changedFiles.length} files`
  );
  return { changedFiles, totalChanges };
}

/**
 * Helper function to calculate the absolute offset in a string based on line and character position
 */
function getPositionOffset(
  lines: string[],
  line: number,
  character: number
): number {
  let offset = 0;

  // Add lengths of all previous lines
  for (let i = 0; i < line; i++) {
    offset += lines[i].length + 1; // +1 for the newline character
  }

  // Add the character offset in the current line
  offset += Math.min(character, lines[line]?.length || 0);

  return offset;
}

/**
 * Determines the language ID from the file path
 */
export function getLanguageIdFromPath(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();

  // Map common extensions to language IDs
  const extensionToLanguageId: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "typescriptreact",
    ".js": "javascript",
    ".jsx": "javascriptreact",
    ".py": "python",
    ".java": "java",
    ".c": "c",
    ".cpp": "cpp",
    ".cs": "csharp",
    ".go": "go",
    ".rs": "rust",
    ".rb": "ruby",
    ".php": "php",
    ".swift": "swift",
    ".kt": "kotlin",
    ".scala": "scala",
    ".html": "html",
    ".css": "css",
    ".json": "json",
    ".md": "markdown",
    ".xml": "xml",
    ".yaml": "yaml",
    ".yml": "yaml",
  };

  return extensionToLanguageId[extension] || "plaintext";
}
