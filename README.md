# HelperPro MCP

A TypeScript implementation of the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) for code analysis. This server enables LLMs to interact with codebases.

## Configuration

```
{
  "mcpServers": {
    "helperpro-mcp": {
      "command": "npx",
      "args": ["-y", "@gshaxor/helperpro-mcp"]
    }
  }
}
```