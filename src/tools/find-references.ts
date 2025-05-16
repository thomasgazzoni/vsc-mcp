import * as path from "path";
import {
  Location,
  ReferenceParams,
  ReferencesRequest
} from "vscode-languageserver-protocol";
import { z } from "zod";
import { logger } from "../utils/logger.js";
import { findSymbolPositionByName } from "../utils/symbol-utils.js";
import { setupLSPTool } from "../utils/tool-utils.js";

export const findReferencesTool = {
  name: "find_references",
  description:
    "Finds all references to a symbol (function, class, etc.) by name and type in a given file using LSP.",
  paramsSchema: {
    filePath: z.string().describe("Path to the file containing the symbol"),
    name: z.string().describe("Name of the symbol to find references for"),
    type: z
      .enum(["function", "method", "class", "interface", "variable", "constant", "property", "field"])
      .describe("Type of the symbol. Supported types: function, method, class, interface, variable, constant, property, field"),
  },
};

export function findReferencesPrompts(
  params: { filePath: string; name: string; type: string }
) {
  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Find all references to ${params.type} ${params.name} in file ${params.filePath}
          
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

export async function findReferencesHandler({
  filePath,
  name,
  type,
}: {
  filePath: string;
  name: string;
  type: string;
}) {
   return await setupLSPTool(findReferencesTool.name, filePath, async (params) => {

      // First find the symbol position
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

      // Now find references to the symbol using textDocument/references
      logger.debug(`Finding references to symbol at position ${JSON.stringify(symbolPosition.range)}`);
      
      const referenceParams: ReferenceParams = {
        textDocument: { uri: params.fileRelativeUri },
        position: symbolPosition.range.start,
        context: { includeDeclaration: true }
      };
      
      const references = await params.connection.sendRequest<Location[]>(
        ReferencesRequest.type.method,
        referenceParams
      );

      logger.debug(`Found ${references?.length || 0} references`);

      // Format the references for better readability
      const formattedReferences = references?.map((ref) => {
        // Convert URI to file path for better readability
        let refPath = ref.uri.startsWith("file://") 
          ? ref.uri.slice(7) // Remove file:// prefix
          : ref.uri;
        
        return {
          filePath: refPath,
          range: ref.range,
          // Create a human-readable location string (file:line:column)
          location: `${path.basename(refPath)}:${ref.range.start.line + 1}:${ref.range.start.character + 1}`
        };
      }) || [];

      return {
        content: [
          {
            type: "text" as const,
            mimeType: "application/json",
            text: JSON.stringify({
              success: true,
              symbolName: name,
              symbolType: type,
              symbolLocation: {
                filePath: filePath,
                range: symbolPosition.range,
              },
              referencesCount: formattedReferences.length,
              references: formattedReferences,
            }, null, 2),
          },
        ],
      };
   });
}
