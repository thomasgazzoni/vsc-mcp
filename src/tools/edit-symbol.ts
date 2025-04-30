import {
  WorkspaceEdit
} from "vscode-languageserver-protocol";
import { z } from "zod";
import {
  applyWorkspaceEdit
} from "../utils/lsp-utils.js";
import { findSymbolPositionByName } from "../utils/symbol-utils.js";
import { setupLSPTool } from "../utils/tool-utils.js";

export const editSymbolTool = {
  name: "edit_symbol",
  description:
    "Edits a symbol (function, class, etc.) by name and type in a given file using LSP.",
  paramsSchema: {
    filePath: z.string().describe("Path to the file containing the symbol"),
    name: z.string().describe("Name of the symbol to edit"),
    type: z
      .enum([
        "function",
        "method",
        "class",
        "interface",
        "variable",
        "constant",
        "property",
        "field",
      ])
      .describe(
        "Type of the symbol. Supported types: function, method, class, interface, variable, constant, property, field"
      ),
    newContent: z.string().describe("New content for the symbol"),
  },
};

export function editSymbolPrompts(params: {
  filePath: string;
  name: string;
  type: string;
  newContent: string;
}) {
  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Edit ${params.type} ${params.name} in file ${params.filePath} with new content: ${params.newContent}
          
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

export async function editSymbolHandler({
  filePath,
  name,
  type,
  newContent,
}: {
  filePath: string;
  name: string;
  type: string;
  newContent: string;
}) {
  return await setupLSPTool(editSymbolTool.name, filePath, async (params) => {
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

    // Create a workspace edit to update the symbol
    const workspaceEdit: WorkspaceEdit = {
      changes: {
        [params.fileRelativeUri]: [
          {
            range: symbolPosition.range,
            newText: newContent,
          },
        ],
      },
    };

    // Apply the edit directly to the file
    const { changedFiles, totalChanges } = await applyWorkspaceEdit(
      workspaceEdit
    );

    return {
      content: [
        {
          type: "text" as const,
          mimeType: "application/json",
          text: JSON.stringify({
            success: true,
            changes: {
              changedFiles,
              totalChanges,
              symbolPosition,
            },
          }),
        },
      ],
    };
  });
}
