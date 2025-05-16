#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import {
  editSymbolHandler,
  editSymbolPrompts,
  editSymbolTool,
  writeFileHandler,
  writeFilePrompts,
  writeFileTool,
  searchReplaceFileHandler,
  searchReplaceFilePrompts,
  searchReplaceFileTool,
  readSymbolHandler,
  readSymbolPrompts,
  readSymbolTool,
  readFileHandler,
  readFilePrompts,
  readFileTool,
  getErrorsHandler,
  getErrorsPrompts,
  getErrorsTool,
  findReferencesHandler,
  findReferencesPrompts,
  findReferencesTool
} from "./tools/index.js";
import { logger } from "./utils/logger.js";

// Load environment variables
dotenv.config();

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  logger.info("Starting MCP Server");

  const server = new McpServer({
    name: "vcs-mcp",
    version: "0.1.0",
  });

  const toolRegistry = [
    [editSymbolTool, editSymbolHandler, editSymbolPrompts],
    [writeFileTool, writeFileHandler, writeFilePrompts],
    [searchReplaceFileTool, searchReplaceFileHandler, searchReplaceFilePrompts],
    [readSymbolTool, readSymbolHandler, readSymbolPrompts],
    [readFileTool, readFileHandler, readFilePrompts],
    [getErrorsTool, getErrorsHandler, getErrorsPrompts],
    [findReferencesTool, findReferencesHandler, findReferencesPrompts],
  ] as const;

  for (const [tool, handler, promptFn] of toolRegistry) {
    logger.info(`Registering ${tool.name} tool`);
    server.tool(tool.name, tool.description, tool.paramsSchema, handler);
    server.prompt(tool.name, tool.paramsSchema, promptFn);
  }

  // Create and connect the transport
  const transport = new StdioServerTransport();
  logger.info("Connecting to transport");
  await server.connect(transport);

  logger.info("MCP Server running on stdio");
}

main().catch((error) => {
  logger.error(`Server error: ${error.message}`);
  logger.error(error.stack || "No stack trace available");
  process.exit(1);
});
