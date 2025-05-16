#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from 'axios';
import clipboardy from 'clipboardy';
// Import EventSource
import { EventSource } from 'eventsource';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';

interface EditSymbolParams {
  serverName: string;
  filePath: string;
  name: string;
  type: string;
  newContent: string;
}

/**
 * Extract edit_symbol blocks from markdown AST
 */
// Plugin to extract edit_symbol blocks
function extractEditSymbolBlocks() {
  return function transformer(tree: any, file: any) {
    const results: EditSymbolParams[] = [];
    
    visit(tree, 'code', (node: any) => {
      // Check if this is an edit_symbol block
      if (node.lang && node.lang.includes('.edit_symbol')) {
        const serverName = node.lang.split('.')[0];
        
        // Parse the meta information
        const meta = node.meta || '';
        const filePath = meta.match(/filePath="([^"]+)"/)?.[1];
        const name = meta.match(/name="([^"]+)"/)?.[1];
        const type = meta.match(/type="([^"]+)"/)?.[1];
        
        if (filePath && name && type) {
          results.push({
            serverName,
            filePath,
            name,
            type,
            newContent: node.value
          });
        }
      }
    });
    
    // Store results in file.data
    if (!file.data) {
      file.data = {};
    }
    
    file.data.editSymbolBlocks = results;
  };
}

/**
 * Parse the markdown content to extract VSC-MCP edit_symbol blocks
 */
async function parseMarkdownContent(content: string): Promise<EditSymbolParams[]> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(extractEditSymbolBlocks)
    .use(remarkStringify)
    .process(content);
  
  // Ensure we return an array even if editSymbolBlocks is undefined
  return (file.data as any).editSymbolBlocks || [];
}

/**
 * Class to manage SSE connection to MCP server
 */
class McpSseClient {
  private eventSource: EventSource | null = null;
  private messageEndpoint: string | null = null;
  private baseUrl: string;
  private connected = false;
  private connectionPromise: Promise<void> | null = null;
  
  constructor(serverUrl: string) {
    this.baseUrl = new URL(serverUrl).origin;
  }
  
  /**
   * Connect to the SSE endpoint and wait for the message endpoint
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }
    
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    
    this.connectionPromise = new Promise<void>((resolve, reject) => {
      try {
        console.log(`Connecting to SSE endpoint at ${this.baseUrl}/sse...`);
        this.eventSource = new EventSource(`${this.baseUrl}/sse`);
        
        // Make sure eventSource is not null before adding event listeners
        if (this.eventSource) {
          this.eventSource.addEventListener('open', () => {
            console.log('SSE connection established');
          });
          
          this.eventSource.addEventListener('endpoint', (event: MessageEvent) => {
            this.messageEndpoint = event.data;
            console.log(`Received message endpoint: ${this.messageEndpoint}`);
            this.connected = true;
            resolve();
          });
          
          this.eventSource.addEventListener('message', (event: MessageEvent) => {
            try {
              const data = JSON.parse(event.data);
              console.log('Received SSE message:', data);
            } catch (error) {
              console.log('Received non-JSON SSE message:', event.data);
            }
          });
          
          this.eventSource.addEventListener('error', (event: Event) => {
            console.error('SSE connection error:', event);
            if (!this.connected) {
              reject(new Error('Failed to establish SSE connection'));
            }
          });
        }
        
        // Set a timeout in case we never receive the endpoint event
        setTimeout(() => {
          if (!this.connected) {
            reject(new Error('Timed out waiting for message endpoint'));
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
    
    return this.connectionPromise;
  }
  
  /**
   * Call a tool on the MCP server
   */
  async callTool(toolName: string, params: any): Promise<any> {
    if (!this.connected || !this.messageEndpoint) {
      await this.connect();
    }
    
    // Generate a unique request ID
    const requestId = Date.now().toString();
    
    const jsonRpcRequest = {
      jsonrpc: "2.0",
      id: requestId,
      method: "tool",
      params: {
        name: toolName,
        params
      }
    };
    
    const fullEndpoint = `${this.baseUrl}${this.messageEndpoint}`;
    console.log(`Calling tool ${toolName} at ${fullEndpoint}`);
    console.log('Request payload:', JSON.stringify(jsonRpcRequest, null, 2));
    
    const response = await axios.post(fullEndpoint, jsonRpcRequest, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('Raw response status:', response.status);
    console.log('Raw response headers:', JSON.stringify(response.headers, null, 2));
    console.log('Raw response data:', JSON.stringify(response.data, null, 2));
    
    // Type assertion for the response data
    interface JsonRpcResponse {
      jsonrpc: string;
      id: string;
      result?: any;
      error?: {
        code: number;
        message: string;
        data?: any;
      };
    }
    
    const jsonRpcResponse = response.data as JsonRpcResponse;
    
    if (jsonRpcResponse.error) {
      throw new Error(`MCP server error: ${JSON.stringify(jsonRpcResponse.error)}`);
    }
    
    if (!jsonRpcResponse.result) {
      console.warn('Warning: Received empty result from server');
    }
    
    return jsonRpcResponse.result;
  }
  
  /**
   * Close the SSE connection
   */
  close(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.connected = false;
      this.connectionPromise = null;
    }
  }
}

/**
 * Call the VSC-MCP server to edit a symbol using JSON-RPC over SSE
 */
async function callEditSymbolHttp(params: EditSymbolParams, serverUrl: string, sseClient: McpSseClient): Promise<void> {
  const { serverName, filePath, name, type, newContent } = params;
  
  console.log(`Editing symbol '${name}' of type '${type}' in file '${filePath}'`);
  console.log(`Content length: ${newContent.length} characters`);
  
  try {
    // Check if the file exists first (if it's a local file)
    if (filePath.startsWith('/') && fs.existsSync(filePath)) {
      console.log(`File exists: ${filePath}`);
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        console.log(`File content length: ${fileContent.length} characters`);
        console.log(`File contains symbol '${name}': ${fileContent.includes(name)}`);
      } catch (readError: any) {
        console.log(`Could not read file: ${readError.message}`);
      }
    } else if (filePath.startsWith('/')) {
      console.log(`File does not exist: ${filePath}`);
    }
    
    console.log('Calling edit_symbol tool with params:', { filePath, name, type });
    
    const result = await sseClient.callTool('edit_symbol', {
      filePath,
      name,
      type,
      newContent
    });
    
    if (result) {
      console.log('Edit symbol result:', JSON.stringify(result, null, 2));
    } else {
      console.log('Edit symbol completed, but returned no result (this may be normal depending on the server implementation)');
    }
    
    // Check if the file was modified (if it's a local file)
    if (filePath.startsWith('/') && fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`File last modified: ${stats.mtime}`);
    }
  } catch (error: any) {
    console.error('Error calling edit_symbol:', error.message);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
  }
}

/**
 * Main function to process a markdown file
 */
async function processMarkdownFile(filePath: string, serverUrl: string): Promise<void> {
  try {
    // Read the markdown file
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Process the content
    await processMarkdownString(content, serverUrl);
  } catch (error) {
    console.error('Error processing markdown file:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Import the SSE server starter
import { startSseServer } from './sse-server.js';

/**
 * Check if a server is running at the given URL
 */
async function isServerRunning(url: string): Promise<boolean> {
  try {
    const response = await axios.get(url, { timeout: 1000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

/**
 * Ensure that an MCP server is running
 */
async function ensureServerRunning(serverUrl: string): Promise<void> {
  const baseUrl = new URL(serverUrl).origin;
  const isRunning = await isServerRunning(`${baseUrl}/sse`);
  
  if (!isRunning) {
    console.log(`No server detected at ${baseUrl}. Starting MCP server...`);
    // Extract port from URL
    const port = parseInt(new URL(serverUrl).port, 10) || 3004;
    
    // Start the server in the background
    await startSseServer(port);
    
    // Wait a moment for the server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`MCP server started on port ${port}`);
  } else {
    console.log(`MCP server detected at ${baseUrl}`);
  }
}

// Set up the CLI
const program = new Command()
  .name('hugo-mcp-parser')
  .description('Parse Hugo markdown files and execute VSC-MCP edit_symbol commands')
  .version('1.0.0');

/**
 * Process markdown content directly from a string
 */
async function processMarkdownString(content: string, serverUrl: string): Promise<void> {
  try {
    // Parse the content to extract edit_symbol blocks
    const editSymbolBlocks = await parseMarkdownContent(content);
    
    console.log(`Found ${editSymbolBlocks.length} edit_symbol blocks`);
    
    if (editSymbolBlocks.length === 0) {
      console.log('No edit_symbol blocks found in the content');
      return;
    }
    
    // Create an SSE client for the MCP server
    const sseClient = new McpSseClient(serverUrl);
    
    try {
      // Connect to the SSE endpoint
      await sseClient.connect();
      
      // Process each block
      for (const block of editSymbolBlocks) {
        await callEditSymbolHttp(block, serverUrl, sseClient);
      }
      
      console.log('All edit_symbol blocks processed successfully');
    } finally {
      // Close the SSE connection
      sseClient.close();
    }
  } catch (error) {
    console.error('Error processing markdown content:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

program
  .command('parse')
  .description('Parse a markdown file and execute the edit_symbol commands')
  .argument('[file]', 'Path to the markdown file (optional if --paste is used)')
  .option('-s, --server <url>', 'URL of the MCP server', 'http://localhost:3004/sse')
  .option('-p, --paste', 'Read markdown content from clipboard instead of a file')
  .action(async (file: string | undefined, options: { server: string, paste: boolean }) => {
    const serverUrl = options.server;
    console.log(`Using MCP server: ${serverUrl}`);
    
    // Ensure the server is running
    try {
      await ensureServerRunning(serverUrl);
    } catch (error) {
      console.error('Failed to start MCP server:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    
    if (options.paste) {
      console.log('Reading markdown from clipboard...');
      try {
        const clipboardContent = await clipboardy.read();
        if (!clipboardContent.trim()) {
          console.error('Clipboard is empty!');
          process.exit(1);
        }
        await processMarkdownString(clipboardContent, serverUrl);
      } catch (error) {
        console.error('Error reading from clipboard:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    } else if (file) {
      console.log(`Processing file: ${file}`);
      await processMarkdownFile(file, serverUrl);
    } else {
      console.error('Error: Either provide a file path or use --paste option');
      process.exit(1);
    }
  });

// Add a command to start the MCP server with SSE transport
program
  .command('start-sse')
  .description('Start the VSC-MCP server with SSE transport')
  .option('-p, --port <number>', 'Port to run the SSE server on', '3006')
  .action(async (options: { port: string }) => {
    const port = parseInt(options.port, 10);
    console.log(`Starting VSC-MCP server with SSE transport on port ${port}...`);
    await startSseServer(port);
  });

program.parse();
