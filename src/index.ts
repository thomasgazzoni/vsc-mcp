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

  logger.info("Registering edit_symbol tool");
  server.tool(
    editSymbolTool.name,
    editSymbolTool.description,
    editSymbolTool.paramsSchema,
    editSymbolHandler,
  );
  server.prompt(
    editSymbolTool.name,
    editSymbolTool.paramsSchema,
    editSymbolPrompts,
  );

  logger.info("Registering write_file tool");
  server.tool(
    writeFileTool.name,
    writeFileTool.description,
    writeFileTool.paramsSchema,
    writeFileHandler,
  );
  server.prompt(
    writeFileTool.name,
    writeFileTool.paramsSchema,
    writeFilePrompts,
  );

  logger.info("Registering search_replace_file tool");
  server.tool(
    searchReplaceFileTool.name,
    searchReplaceFileTool.description,
    searchReplaceFileTool.paramsSchema,
    searchReplaceFileHandler,
  );
  server.prompt(
    searchReplaceFileTool.name,
    searchReplaceFileTool.paramsSchema,
    searchReplaceFilePrompts,
  );

  logger.info("Registering read_symbol tool");
  server.tool(
    readSymbolTool.name,
    readSymbolTool.description,
    readSymbolTool.paramsSchema,
    readSymbolHandler,
  );
  server.prompt(
    readSymbolTool.name,
    readSymbolTool.paramsSchema,
    readSymbolPrompts,
  );

  logger.info("Registering read_file tool");
  server.tool(
    readFileTool.name,
    readFileTool.description,
    readFileTool.paramsSchema,
    readFileHandler,
  );
  server.prompt(
    readFileTool.name,
    readFileTool.paramsSchema,
    readFilePrompts,
  );

  logger.info("Registering get_errors tool");
  server.tool(
    getErrorsTool.name,
    getErrorsTool.description,
    getErrorsTool.paramsSchema,
    getErrorsHandler,
  );
  server.prompt(
    getErrorsTool.name,
    getErrorsTool.paramsSchema,
    getErrorsPrompts,
  );

  logger.info("Registering find_references tool");
  server.tool(
    findReferencesTool.name,
    findReferencesTool.description,
    findReferencesTool.paramsSchema,
    findReferencesHandler,
  );
  server.prompt(
    findReferencesTool.name,
    findReferencesTool.paramsSchema,
    findReferencesPrompts,
  );

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
