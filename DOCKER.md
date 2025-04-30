# Introduction

This guide shows you how to run the **VSC-MCP** server inside a Docker container alongside an **OpenVSCode Server** instance.

The first public version of MCP forced you to launch a separate Language Server for every language you work with. That's tolerable for JavaScript or TypeScript, since MCP already runs on Node, but a nuisance for Go, Rust, Python, and friends.

Another problem specifically for Typescript is that the typescript language server does not support the `textDocument/diagnostic` LSP request, to get errors and diagnostics on demand.

By spinning up a headless VS Code (thanks to [GitPod OpenVSCode Server](https://github.com/gitpod-io/openvscode-server)) we inherit the rich extension ecosystem and let VS Code mediate all LSP traffic.

We pre-install all the extensions we need to support out programming languages, including the [VSC-MCP extension](./extension/README.md) that allow us to have a communication channel between the MCP Server and the openvscode-server running in docker.

You can even open **http://localhost:3000** to watch edits in real time while your AI agent talks to MCP behind the scenes.

## How It Works

1. **OpenVSCode Server** runs inside Docker and exposes port `3000` for the IDE UI and `5007` for its LSP bridge.
2. We pre-install any VS Code extensions your stack requires (for example _rust-analyzer_, _pyright_, _eslint_).
3. The **VSC-MCP extension** creates a WebSocket channel between MCP and the running VS Code back-end.
4. MCP tools for file reads/writes still use I/O, tools that require LSP requests will use VS Code's internal language servers.

## Prerequisites

- [Docker](https://www.docker.com/) (for running the server)
- [Bun](https://bun.sh/) (for launching MCP)

## Setup

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
         "args": ["/path/to/your/vsc-mcp/src/index.ts"],
         "env": {
           "USE_VSCODE_LSP": "true",
           "LOG_DIR": "/path/to/your/vsc-mcp/logs",
           "ALLOWED_DIRECTORIES": "/path/to/your/project"
         }
       }
     }
   }
   ```

### What Those Variables Do

| Variable              | Purpose                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| `USE_VSCODE_LSP`      | Tells MCP to forward requests to VS Code (default port `5007`) instead of spawn a local language server. |
| `ALLOWED_DIRECTORIES` | Restricts direct-file manipulation to the specified directories.                                         |
| `LOG_DIR`             | Where MCP writes logs for debugging.                                                                     |

## Caveats

1. **Single workspace only** – OpenVSCode Server opens one folder per container.
- in the future it should be possible to load multiple projects once we start the docker container.
2. **Path mapping** – VS Code knows only the paths inside the container. If a file lives at `/home/user/website/src/index.ts` on the host, pass `/home/workspace/project/src/index.ts` to tools like `get_errors`.
- in the future MCP releases, MCP tools will perform this translation for you
