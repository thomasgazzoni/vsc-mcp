# VSC-MCP

This project provides tools that expose Language Server Protocol (LSP) functionality as **MCP (Model Context Protocol)** tools. It enables AI agents to programmatically analyze and edit TypeScript/JavaScript code through standardized MCP tool calls.

## Features

- Works in **single-file mode** or **project mode** (`tsconfig.json` detection).
- Language-agnostic code manipulation through LSP APIs.
- Fully compatible with [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol/typescript-sdk) SDK.


## Installation

### Prerequisites

- [Bun](https://bun.sh/) (for package management and building)
- Node.js (for running the server)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```

### Configuration in Claude (macOS)

To use with Claude Desktop, add the server configuration to the Claude Desktop config file:

- On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

Add the following configurations to the `mcp_servers` section of the config file:

```json
{
  "mcpServers": {
    "repomix": {
      "command": "npx",
      "args": [
        "-y",
        "repomix",
        "--mcp"
      ]
    },
    "vsc-mcp": {
      "command": "bun",
      "args": [
        "/path/to/your/vsc-mcp/src/index.ts"
      ],
      "env": {
        "LOG_DIR": "/path/to/your/vsc-mcp/logs",
        "ALLOWED_DIRECTORIES": "/path/to/your/vsc-mcp"
      }
    }
  }
}
```

We need the `repomix` mcp server dependency.

Replace `/path/to/your/vsc-mcp` with the actual path to your vsc-mcp cloned directory.

## Security Features

### Path Restriction

The VSC-MCP tools include a security feature to restrict file operations to specific directories:

- **ALLOWED_DIRECTORIES**: An environment variable that specifies a comma-separated list of directories where file operations are permitted.
  
  Example:
  ```
  ALLOWED_DIRECTORIES=/home/user/projects,/tmp/workspace
  ```

- If this environment variable is not set, operations default to the current working directory only.
- All file operations (read, write, edit) will check if the target path is within the allowed directories.
- Attempting to access files outside allowed directories will result in an "Access denied" error.

This feature helps prevent unauthorized access to sensitive files and directories on the system.

## How It Works

- Launches the typescript-language-server in --stdio mode.
- Sends LSP initialize and didOpen notifications.
- Finds symbols using workspace/symbol and textDocument/documentSymbol requests.
- Falls back to textDocument/implementation for additional symbol discovery.
- Applies edits directly to files using applyWorkspaceEdit utility.
- Returns the result of the operation to the caller.

## Available Tools

Currently, the following tools are available:

- `editSymbol`: Edits a symbol (function, class, method, etc.) by name and type in a given file using LSP.
  - Supports various symbol types: function, method, class, interface, variable, constant, property, field
  - Uses LSP's workspace/symbol and textDocument/documentSymbol requests to find symbols
  - Applies edits directly to files

- `readSymbol`: Reads a symbol (function, class, method, etc.) by name and type in a given file using LSP.
  - Supports the same symbol types as editSymbol
  - Uses LSP to locate the symbol and extract its content
  - Returns the symbol content along with its location information

- `readFile`: Reads the content of a file.
  - Returns the file content with appropriate MIME type based on file extension
  - Handles various file formats including code, text, and configuration files
  - Provides detailed error messages for common issues (file not found, directory access, etc.)

- `writeFile`: Creates a new file or overwrites an existing file with the provided content.
  - Creates parent directories if they don't exist
  - Supports any file type
  - Returns information about the file operation (created/overwritten, file size)

- `searchReplaceFile`: Searches for content in a file and replaces it with new content.
  - Ignores whitespace differences when searching (spaces, tabs, newlines)
  - Supports flexible matching of content patterns
  - Returns the number of replacements made
  
- `get_errors`: Fetches code errors and issues for a specific file using the LSP textDocument/diagnostic API.
  - Provides detailed diagnostics including error messages, severity, and location
  - Uses the TypeScript language server to validate code
  - Returns structured information about code issues

- `find_references`: Finds all references to a symbol (function, class, etc.) by name and type in a given file using LSP.
  - Supports various symbol types: function, method, class, interface, variable, constant, property, field
  - Uses LSP's textDocument/reference API to find all references to a symbol
  - Returns a list of references with file paths and positions
  - Helps with code analysis, refactoring, and understanding code usage
