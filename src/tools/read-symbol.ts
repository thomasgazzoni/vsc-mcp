import * as fs from "fs";
import * as path from "path";
import {
  DidOpenTextDocumentNotification
} from "vscode-languageserver-protocol";
import { z } from "zod";
import { logger } from "../utils/logger.js";
import { isPathAllowed } from "../utils/file-utils.js";
import {
  findProjectRoot,
  getLanguageIdFromPath,
  getLSPInstance,
} from "../utils/lsp-utils.js";
import { findSymbolPositionByName } from "../utils/symbol-utils.js";

export const readSymbolTool = {
  name: "read_symbol",
  description:
    "Reads a symbol (function, class, etc.) by name and type in a given file using LSP.",
  paramsSchema: {
    filePath: z.string().describe("Path to the file containing the symbol"),
    name: z.string().describe("Name of the symbol to read"),
    type: z
      .enum(["function", "method", "class", "interface", "variable", "constant", "property", "field"])
      .describe("Type of the symbol. Supported types: function, method, class, interface, variable, constant, property, field"),
  },
};

export function readSymbolPrompts(
  params: { filePath: string; name: string; type: string }
) {
  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Read ${params.type} ${params.name} in file ${params.filePath}
          
Supported symbol types are:
- function: A standalone function
- method: A function that is part of a class or object
- class: A class definition
- interface: An interface definition
- variable: A variable declaration
- constant: A constant declaration
- property: An object property
- field: A class field`,
        },
      },
    ],
  };
}

export async function readSymbolHandler({
  filePath,
  name,
  type,
}: {
  filePath: string;
  name: string;
  type: string;
}) {
  try {
    const absolutePath = path.resolve(filePath);
    
    // Check if the path is allowed
    const pathCheck = isPathAllowed(absolutePath);
    if (!pathCheck.allowed) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: pathCheck.error || "Access denied: File path is not within allowed directories",
          },
        ],
      };
    }
    
    if (!fs.existsSync(absolutePath)) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `File not found: ${absolutePath}`,
          },
        ],
      };
    }

    const fileUri = `file://${absolutePath}`;
    const fileContent = fs.readFileSync(absolutePath, "utf-8");
    const projectRoot = findProjectRoot(absolutePath);

    const { connection, serverProcess } = await getLSPInstance(projectRoot);

    try {
      // Open the document in the language server
      await connection.sendNotification(
        DidOpenTextDocumentNotification.type.method,
        {
          textDocument: {
            uri: fileUri,
            languageId: getLanguageIdFromPath(absolutePath),
            version: 1,
            text: fileContent,
          },
        }
      );

      // Find the symbol by name in the file
      const symbolPosition = await findSymbolPositionByName(
        connection,
        fileUri,
        name,
        type
      );

      if (!symbolPosition) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Symbol '${name}' of type '${type}' not found in file ${filePath}`,
            },
          ],
        };
      }

      // Extract the symbol content using the range
      const range = symbolPosition.range;
      const lines = fileContent.split('\n');
      
      // Extract content based on the range
      let symbolContent = '';
      
      for (let i = range.start.line; i <= range.end.line; i++) {
        const line = lines[i];
        
        if (i === range.start.line && i === range.end.line) {
          // Symbol is on a single line
          symbolContent += line.substring(range.start.character, range.end.character);
        } else if (i === range.start.line) {
          // First line of multi-line symbol
          symbolContent += line.substring(range.start.character) + '\n';
        } else if (i === range.end.line) {
          // Last line of multi-line symbol
          symbolContent += line.substring(0, range.end.character);
        } else {
          // Middle lines of multi-line symbol
          symbolContent += line + '\n';
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            mimeType: "application/json",
            text: JSON.stringify({
              success: true,
              filePath,
              symbolName: name,
              symbolType: type,
              symbolContent,
              range,
            }),
          },
        ],
      };
    } finally {
      // Clean up resources
      connection.dispose();
      serverProcess.kill();
    }
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Error reading symbol: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
    };
  }
}
