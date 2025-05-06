# VSC-MCP

This project provides tools that expose Language Server Protocol (LSP) functionality as **MCP (Model Context Protocol)** tools. It enables AI clients to programmatically analyze and edit code through standardized MCP tool calls.

It started as a simple project focused on coding only with TypeScript, then evolved to a full-featured MCP server that supports any language supported by VS Code.

Full details about latest changes and migration to headless VC Code can be found [here](https://thomasgazzoni.com/coding/enhance-vsc-mcp-capabilities-with-headless-vscode-part-three/)

## Docker Mode & VS Code LSP Integration

VSC-MCP can run in two modes:
- **Standalone Mode**: It spawn a local [typescript-language-server](https://github.com/typescript-language-server/typescript-language-server) to provide LSP support ONLY for TypeScript/JavaScript.
- **Docker Mode**: Leverages a headless VS Code port by Gitpod, namely [OpenVSCode Server](https://github.com/gitpod-io/openvscode-server), running in Docker to provide richer LSP support, for any languages supported by VC Code like Rust, Go, C#, Python, etc.

### Why Docker Mode?
- **Unified LSP**: Avoids the hassle of launching separate local language servers for each language.
- **Rich Extension Ecosystem**: Inherits VS Code's extension support and APIs for advanced language features.
- **Live Editing**: Open http://localhost:3000 to watch edits in real time as your AI agent interacts with MCP.
- **Works without IDE**: we can write and analyze code without opening any IDE.

### How It Works
1. **OpenVSCode Server** runs inside Docker, exposing port `3000` (IDE UI) and `5007` (LSP bridge).
2. Required VS Code extensions are pre-installed (e.g., _rust-analyzer_, _pyright_, _eslint_, and the VSC-MCP extension).
3. The **VSC-MCP extension** creates a WebSocket channel between MCP and the VS Code back-end.
4. File I/O tools use direct access; LSP tools use VS Code's internal language servers.

## Installation

### Prerequisites
- [Docker](https://www.docker.com/) (for running the VS Code server)
- [Bun](https://bun.sh/) (for launching MCP)

### Setup
1. **Clone the repository** and `cd` into it.
2. **Install dependencies**
   ```bash
   bun install
   ```
3. **Build and start OpenVSCode Server** (mount your project into the container)
   ```bash
   PROJECT_PATH=/path/to/your/project docker-compose up
   ```
4. **Register MCP in your AI client** (example `settings.json`)
   ```json
   {
     "mcpServers": {
       "vsc-mcp": {
         "command": "bun",
         "args": ["<vsc_mcp_cloned_dir>/src/index.ts"],
         "env": {
           "USE_VSCODE_LSP": "true",
           "LOG_DIR": "<vsc_mcp_cloned_dir>/logs",
           "ALLOWED_DIRECTORIES": "/path/to/your/project"
         }
       }
     }
   }
   ```

#### Environment Variables
| Variable              | Purpose                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| `USE_VSCODE_LSP`      | **Set to `true` to enable Docker/VS Code LSP mode.** MCP will forward LSP requests to VS Code (port 5007) instead of spawning a local language server. |
| `ALLOWED_DIRECTORIES` | Restricts direct-file manipulation to the specified directories.                                         |
| `LOG_DIR`             | Where MCP writes logs for debugging.                                                                     |

> **Note:** By default, `USE_VSCODE_LSP` is `false` (standalone mode). Set it to `true` to use Docker/VS Code LSP integration.

## Suggested AI Client Configurations

### Claude Desktop

For now the best workflow is to use Claude Desktop as AI Client, it support MCP servers and it provide a monthly plan for 20$/month, and by using the VSC-MCP tools, we can "chat" and work with our codebase.

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
        "<vsc_mcp_cloned_dir>/src/index.ts"
      ],
      "env": {
        "USE_VSCODE_LSP": "true",
        "LOG_DIR": "<vsc_mcp_cloned_dir>/logs",
        "ALLOWED_DIRECTORIES": "/path/to/your/project"
      }
    }
  }
}
```

We suggest to add the `repomix` mcp server dependency, to know why, you can read [this blog post](https://thomasgazzoni.com/coding/use-vsc-mcp-to-add-new-tools-part-two/).

Replace `<vsc_mcp_cloned_dir>` with the actual path to your vsc-mcp cloned directory.

## Security Features

### Docker Workspace Restriction

When we start docker we need to specify the workspace directory.
```bash
PROJECT_PATH=/path/to/your/project docker-compose up
```

VSC-MCP tools will only be able to access files in the workspace directory.

### Path Restriction

The VSC-MCP tools include a security feature to restrict OS file operations (read and write files on disk) to specific directories:

- **ALLOWED_DIRECTORIES**: An environment variable that specifies a comma-separated list of directories where file operations are permitted.
  
  Example:
  ```
  ALLOWED_DIRECTORIES=/home/user/projects,/tmp/workspace
  ```

- If this environment variable is not set, operations default to the current working directory only.
- All file operations (read, write, edit) will check if the target path is within the allowed directories.
- Attempting to access files outside allowed directories will result in an "Access denied" error.

This feature helps prevent unauthorized access to sensitive files and directories on the system.

## Available Tools

Currently, the following tools are available:

- `edit_symbol`: Edits a symbol (function, class, method, etc.) by name and type in a given file using LSP.
  - Supports various symbol types: function, method, class, interface, variable, constant, property, field
  - Uses LSP's workspace/symbol and textDocument/documentSymbol requests to find symbols
  - Applies edits directly to files

- `read_symbol`: Reads a symbol (function, class, method, etc.) by name and type in a given file using LSP.
  - Supports the same symbol types as editSymbol
  - Uses LSP to locate the symbol and extract its content
  - Returns the symbol content along with its location information

- `read_file`: Reads the content of a file.
  - Returns the file content with appropriate MIME type based on file extension
  - Handles various file formats including code, text, and configuration files
  - Provides detailed error messages for common issues (file not found, directory access, etc.)

- `write_file`: Creates a new file or overwrites an existing file with the provided content.
  - Creates parent directories if they don't exist
  - Supports any file type
  - Returns information about the file operation (created/overwritten, file size)

- `search_replace_file`: Searches for content in a file and replaces it with new content.
  - Ignores whitespace differences when searching (spaces, tabs, newlines)
  - Supports flexible matching of content patterns
  - Returns the number of replacements made
  
- `get_errors`: Fetches code errors and issues for a specific file using the LSP textDocument/diagnostic API.
  - Provides detailed diagnostics including error messages, severity, and location
  - Uses the VS Code extension's diagnostics api to validate code
  - Returns structured information about code issues

- `find_references`: Finds all references to a symbol (function, class, etc.) by name and type in a given file using LSP.
  - Supports various symbol types: function, method, class, interface, variable, constant, property, field
  - Uses LSP's textDocument/reference API to find all references to a symbol
  - Returns a list of references with file paths and positions
  - Helps with code analysis, refactoring, and understanding code usage
