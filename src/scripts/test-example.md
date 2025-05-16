# Test VSC-MCP Edit Symbol Example

This is an example markdown file demonstrating the VSC-MCP edit_symbol block format.

## Example Edit Symbol Block

The following block will edit the CardTitle component:

```vsc-mcp.edit_symbol { filePath="/Users/pika/Coding/thomas/MCP-SuperAssistant/pages/content/src/components/ui/card.tsx", name="CardTitle", type="variable" }
const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-2xl font-semibold leading-none tracking-tight dark:text-card-title-dark text-primary', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';
```

## Multiple Edit Symbol Blocks

You can include multiple edit_symbol blocks in a single markdown file:

```vsc-mcp.edit_symbol { filePath="/Users/pika/Coding/thomas/MCP-SuperAssistant/pages/content/src/components/ui/card.tsx", name="CardHeader", type="variable" }
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';
```
