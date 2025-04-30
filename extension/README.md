# VSC-MCP Language Server Bridge

This VS Code extension creates a bridge between VS Code's language servers and external applications like VSC-MCP. It exposes VS Code's language services through a socket server, allowing external tools to leverage VS Code's powerful language features.

## Features

- Exposes VS Code's language servers via a socket server
- Forwards LSP requests between external clients and VS Code
- Supports key language features:
  - Symbol search (workspace and document)
  - Go to definition
  - Find references
  - And more

## Usage

### Starting the Server

The extension can start the language server bridge automatically on VS Code startup (default behavior) or manually:

1. **Automatic start**: The extension starts the server automatically when VS Code launches (configurable)
2. **Manual start**: Run the command `VSC-MCP: Start Language Server Bridge` from the command palette

### Connecting to the Server

External applications can connect to the language server bridge using a standard socket connection:

```typescript
const net = require('net');
const socket = net.connect({ port: 5870 }); // Default port, configurable in settings

// Create LSP message reader and writer
const reader = new StreamMessageReader(socket);
const writer = new StreamMessageWriter(socket);

// Create connection
const connection = createMessageConnection(reader, writer);
connection.listen();

// Now you can send LSP requests to VS Code
const result = await connection.sendRequest('textDocument/definition', { ... });
```

## Configuration

The extension provides the following configuration options:

- `vscMcp.port`: Port to expose the language server on (default: 5870)
- `vscMcp.autoStart`: Automatically start the language server bridge on VS Code startup (default: true)

## Development

### Building the Extension

1. Navigate to the extension directory
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension

### Debugging

1. Open the extension folder in VS Code
2. Press F5 to start debugging
3. A new VS Code window will open with the extension loaded
4. Check the output panel for logs (select "VSC-MCP Language Server Bridge" from the dropdown)

## How It Works

The extension creates a socket server that accepts connections from external clients. When a client connects, the extension:

1. Creates an LSP message connection for the socket
2. Sets up handlers for LSP requests
3. Forwards requests to VS Code's internal language services
4. Returns the results back to the client

This allows external tools to leverage VS Code's language features without having to implement their own language servers.
