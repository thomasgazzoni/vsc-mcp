# Hugo Markdown VSC-MCP Parser

This tool parses Hugo markdown files containing VSC-MCP edit_symbol blocks and executes the edit_symbol commands against a VSC-MCP server.

## Installation

Make sure you have the necessary dependencies installed:

```bash
npm install
```

Then build the project:

```bash
npm run build
```

## Usage

### Command Line Interface

The tool can be used from the command line:

```bash
npm run parse-hugo -- <markdown-file> --server <mcp-server-url>
```

Or directly:

```bash
node build/scripts/cli.js parse <markdown-file> --server <mcp-server-url>
```

### Options

- `<markdown-file>`: Path to the markdown file containing VSC-MCP edit_symbol blocks
- `--server, -s <url>`: URL of the MCP server (default: http://localhost:3000)

## Markdown Format

The tool recognizes VSC-MCP edit_symbol blocks in the following format:

````markdown
```<server-name>.edit_symbol { filePath="<file-path>", name="<symbol-name>", type="<symbol-type>" }
// Code content to replace the symbol with
```
````

Example:

````markdown
```vsc-mcp.edit_symbol { filePath="/Users/pika/Coding/thomas/MCP-SuperAssistant/pages/content/src/components/ui/card.tsx", name="CardTitle", type="variable" }
const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-2xl font-semibold leading-none tracking-tight dark:text-card-title-dark', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';
```
````

## Supported Symbol Types

The following symbol types are supported:

- `function`: A standalone function
- `method`: A function that is part of a class or object
- `class`: A class definition
- `interface`: An interface definition
- `variable`: A variable declaration
- `constant`: A constant declaration
- `property`: An object property
- `field`: A class field
