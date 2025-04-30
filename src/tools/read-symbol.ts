import { z } from "zod";
import { findSymbolPositionByName } from "../utils/symbol-utils.js";
import { setupLSPTool } from "../utils/tool-utils.js";

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
  return await setupLSPTool(readSymbolTool.name, filePath, async (params) => {
    // Find the symbol by name in the file
    const symbolPosition = await findSymbolPositionByName(
      params.connection,
      params.fileRelativeUri,
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
      const lines = params.fileContent.split('\n');
      
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
  });
}
