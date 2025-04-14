import * as path from 'path';
import * as fs from 'fs';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { logger } from '../src/utils/logger.js';

/**
 * Creates a test fixture directory with sample files
 * @param fixtureName Name of the test fixture
 * @returns Path to the fixture directory
 */
export function createFixture(fixtureName: string): string {
  const fixtureDir = path.join(process.cwd(), 'tests', 'fixtures', fixtureName);
  
  // Create the fixture directory if it doesn't exist
  if (!fs.existsSync(fixtureDir)) {
    fs.mkdirSync(fixtureDir, { recursive: true });
  }
  
  return fixtureDir;
}

/**
 * Creates a JavaScript test file with a sample function
 * @param fixtureDir Directory to create the file in
 * @param fileName Name of the file
 * @param functionName Name of the function to create
 * @returns Path to the created file
 */
export function createJavaScriptTestFile(fixtureDir: string, fileName: string, functionName: string): string {
  const filePath = path.join(fixtureDir, fileName);
  const content = `
/**
 * Sample function for testing
 * @param {string} param1 First parameter
 * @param {number} param2 Second parameter
 * @returns {boolean} Result of the operation
 */
function ${functionName}(param1, param2) {
  console.log("Processing", param1, param2);
  return param1.length > param2;
}

/**
 * Another sample function
 */
function anotherFunction() {
  return true;
}

module.exports = {
  ${functionName},
  anotherFunction
};
`;

  fs.writeFileSync(filePath, content);
  return filePath;
}

/**
 * Creates a TypeScript test file with a sample class and method
 * @param fixtureDir Directory to create the file in
 * @param fileName Name of the file
 * @param className Name of the class to create
 * @returns Path to the created file
 */
export function createTypeScriptTestFile(fixtureDir: string, fileName: string, className: string): string {
  const filePath = path.join(fixtureDir, fileName);
  const content = `
/**
 * Sample class for testing
 */
export class ${className} {
  private value: string;
  
  constructor(initialValue: string) {
    this.value = initialValue;
  }
  
  /**
   * Sample method
   * @param input Input parameter
   * @returns Modified value
   */
  public processValue(input: number): string {
    return this.value + input.toString();
  }
  
  /**
   * Another sample method
   */
  public getValue(): string {
    return this.value;
  }
}

/**
 * Standalone function
 */
export function helperFunction(param: string): boolean {
  return param.length > 0;
}
`;

  fs.writeFileSync(filePath, content);
  return filePath;
}

/**
 * Cleans up a fixture directory
 * @param fixtureName Name of the fixture to clean up
 */
export function cleanupFixture(fixtureName: string): void {
  const fixtureDir = path.join(process.cwd(), 'tests', 'fixtures', fixtureName);
  
  if (fs.existsSync(fixtureDir)) {
    // Remove all files in the directory
    const files = fs.readdirSync(fixtureDir);
    for (const file of files) {
      fs.unlinkSync(path.join(fixtureDir, file));
    }
    
    // Remove the directory
    fs.rmdirSync(fixtureDir);
  }
}

/**
 * Creates a test MCP server with the specified tools
 * @param tools Array of tools to register
 * @returns MCP server instance
 */
export function createTestServer(tools: any[]): McpServer {
  const server = new McpServer({
    name: "test-mcp-server",
    version: "0.1.0",
  });
  
  // Register each tool
  for (const tool of tools) {
    server.tool(
      tool.name,
      tool.description,
      tool.paramsSchema,
      tool.handler
    );
    
    if (tool.promptsHandler) {
      server.prompt(
        tool.name,
        tool.paramsSchema,
        tool.promptsHandler
      );
    }
  }
  
  return server;
}

/**
 * Starts a test server with stdio transport
 * @param server MCP server instance
 * @returns The transport instance
 */
export function startTestServer(server: McpServer): StdioServerTransport {
  const transport = new StdioServerTransport();
  server.connect(transport);
  logger.info("Test server started");
  return transport;
}

/**
 * Stops a test server
 * @param transport Transport instance
 */
export function stopTestServer(transport: StdioServerTransport): void {
  transport.close();
  logger.info("Test server stopped");
}
