import * as fs from "fs";
import * as path from "path";
import { MessageConnection } from "vscode-jsonrpc";
import { logger } from "./logger.js";
import { DocumentSymbol, TextDocumentIdentifier, Location, WorkspaceSymbol, SymbolKind, Position } from "vscode-languageserver-types";

/**
 * Finds the position of a symbol by name in a file
 */
export async function findSymbolPositionByName(
  connection: MessageConnection,
  fileUri: string,
  symbolName: string,
  symbolType: string
): Promise<Location | null> {
  try {
    // First try to get workspace symbols
    logger.debug(`Trying to find symbol via workspace/symbol`);
    const workspaceSymbols = await connection.sendRequest<WorkspaceSymbol[]>(
      "workspace/symbol",
      { query: symbolName }
    );

    logger.debug(`Workspace symbols: ${JSON.stringify(workspaceSymbols)}`);
    if (workspaceSymbols && workspaceSymbols.length > 0) {
      for (const symbol of workspaceSymbols) {
        if (
          symbol.name === symbolName &&
          matchesSymbolType(symbol.kind, symbolType) &&
          (symbol.location.uri === fileUri ||
            symbol.location.uri === fileUri.replace("file://", ""))
        ) {
          const range = (symbol.location as any).range;

          logger.debug(
            `Found symbol: ${JSON.stringify(symbol)} in range ${JSON.stringify(
              range
            )}`
          );

          // Ensure the location has a range property
          if ('range' in symbol.location) {
            return symbol.location;
          }
        }
      }
    }

    // If not found via workspace/symbol, try document symbols
    logger.debug(`Trying to find symbol via textDocument/documentSymbol`);
    const documentSymbols = await connection.sendRequest<DocumentSymbol[]>(
      "textDocument/documentSymbol",
      { textDocument: { uri: fileUri } }
    );

    logger.debug(`Document symbols: ${JSON.stringify(documentSymbols)}`);
    if (documentSymbols && documentSymbols.length > 0) {
      const foundSymbol = findSymbolInDocumentSymbols(
        documentSymbols,
        symbolName,
        symbolType
      );

      if (foundSymbol) {
        logger.debug(
          `Found symbol in document symbols: ${JSON.stringify(foundSymbol)}`
        );
        return {
          uri: fileUri,
          range: foundSymbol.range,
        };
      }
    }

    // If still not found, try implementation
    logger.debug(`Trying to find symbol via textDocument/implementation`);
    const implementations = await connection.sendRequest<Location[]>(
      "textDocument/implementation",
      {
        textDocument: { uri: fileUri },
        position: { line: 0, character: 0 },
      }
    );

    logger.debug(`Implementations: ${JSON.stringify(implementations)}`);
    if (implementations && implementations.length > 0) {
      for (const impl of implementations) {
        if (impl.uri === fileUri || impl.uri === fileUri.replace("file://", "")) {
          // This is a rough approximation, as we don't have the symbol name from implementation
          // In a real implementation, you might want to check the content at this location
          if ('range' in impl) {
            return impl;
          }
        }
      }
    }

    return null;
  } catch (error) {
    logger.error(
      `Error finding symbol position: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }
}

/**
 * Recursively searches for a symbol in document symbols
 */
function findSymbolInDocumentSymbols(
  symbols: DocumentSymbol[],
  symbolName: string,
  symbolType: string
): DocumentSymbol | null {
  for (const symbol of symbols) {
    if (
      symbol.name === symbolName &&
      matchesSymbolType(symbol.kind, symbolType)
    ) {
      return symbol;
    }

    if (symbol.children && symbol.children.length > 0) {
      const foundInChildren = findSymbolInDocumentSymbols(
        symbol.children,
        symbolName,
        symbolType
      );
      if (foundInChildren) {
        return foundInChildren;
      }
    }
  }

  return null;
}

/**
 * Matches a symbol kind to a type string
 */
function matchesSymbolType(kind: SymbolKind, typeStr: string): boolean {
  switch (typeStr) {
    case "function":
      return kind === SymbolKind.Function;
    case "method":
      return kind === SymbolKind.Method;
    case "class":
      return kind === SymbolKind.Class;
    case "interface":
      return kind === SymbolKind.Interface;
    case "variable":
      return kind === SymbolKind.Variable;
    case "constant":
      return kind === SymbolKind.Constant;
    case "property":
      return kind === SymbolKind.Property;
    case "field":
      return kind === SymbolKind.Field;
    default:
      return false;
  }
}
