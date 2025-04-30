#!/bin/bash

# Setup script for VSC-MCP Language Server Bridge extension

# Navigate to the extension directory
cd "$(dirname "$0")"

echo "Installing dependencies..."
bun install

echo "Building extension..."
bun run compile

echo "Extension setup complete!"
echo ""
echo "To use the extension in VS Code:"
echo "1. Open VS Code"
echo "2. Run the 'Developer: Install Extension from Location...' command"
echo "3. Select this directory"
echo ""
echo "Alternatively, you can create a symlink to this directory in your VS Code extensions folder:"
echo "  macOS: ~/.vscode/extensions"
echo "  Linux: ~/.vscode/extensions"
echo "  Windows: %USERPROFILE%\\.vscode\\extensions"
echo ""
echo "For example:"
echo "  ln -s \"$(pwd)\" ~/.vscode/extensions/vsc-mcp-extension"
