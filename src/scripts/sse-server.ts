#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import dotenv from "dotenv";
import express from "express";

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
  findReferencesTool,
} from "../tools/index.js";
import { logger } from "../utils/logger.js";

// Load environment variables
dotenv.config();

/**
 * Start the server using SSE transport.
 * This allows the server to communicate via HTTP with Server-Sent Events.
 */
export async function startSseServer(port: number = 3004): Promise<void> {
  logger.info(`Starting MCP Server with SSE transport on port ${port}`);

  const app = express();

  const server = new McpServer({
    name: "vsc-mcp",
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

  // Create and connect the SSE transport
  let transport: SSEServerTransport | null = null;

  app.get("/sse", (req, res) => {
    transport = new SSEServerTransport("/messages", res);
    server.connect(transport);
  });

  app.post("/messages", (req, res) => {
    if (transport) {
      transport.handlePostMessage(req, res);
    }
  });

  app.listen(port);

  logger.info(
    `MCP Server running with SSE transport on http://localhost:${port}/sse`
  );
  logger.info(`API endpoint available at http://localhost:${port}/api`);

  // Keep the process running
  process.on("SIGINT", () => {
    logger.info("Shutting down MCP Server...");
    process.exit(0);
  });
}
