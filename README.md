# HelperPro MCP

A TypeScript implementation of the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) for code analysis. This server enables LLMs to interact with codebases.

## Installation

You can install the package globally:

```bash
npm install -g @gshaxor/helperpro-mcp
```

Or use it directly with npx:

```bash
npx -y @gshaxor/helperpro-mcp
```

## Codeium Configuration

To use this MCP server with Codeium, add the following configuration to your `mcp_config.json` file (typically located at `~/.codeium/windsurf/mcp_config.json`):

```json
{
  "mcpServers": {
    "helperpro-mcp": {
      "command": "npx",
      "args": ["-y", "@gshaxor/helperpro-mcp"]
    }
  }
}
```

## Available Tools

This MCP server provides the following tools:

### get_functions

Retrieves all functions in a directory, recursively exploring up to a specified maximum depth.

**Parameters:**
- `path`: Path to the directory to search for functions
- `maxDepth`: (Optional) Maximum search depth, default is 4

### get_classes

Retrieves all classes in a directory, recursively exploring up to a specified maximum depth.

**Parameters:**
- `path`: Path to the directory to search for classes
- `maxDepth`: (Optional) Maximum search depth, default is 4

## Using with Codeium

Once configured, you can use these tools in Codeium with commands like:

```
Use the helperpro-mcp get_functions tool to find all functions in my project
```

```
Use the helperpro-mcp get_classes tool to find all classes in my project
```

## Development

To contribute to the project:

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the code: `npm run build`
4. Run tests: `npm run test`