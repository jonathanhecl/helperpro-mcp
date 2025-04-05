#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import path from 'path';

// Import utility functions
import { 
  createIgnoreFilter, 
  extractFunctions, 
  extractClasses, 
  getFilesRecursively 
} from './utils.js';

// Create an MCP server
const server = new Server({
  name: "HelperPro Code Analyzer",
  version: "1.2.0",
}, {
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Define available tools
const TOOLS = [
  {
    name: "get_functions",
    description: "Get all functions in a directory. Returns an array of objects with function name, line number, and file path.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        maxDepth: { type: "number", default: 4 },
      },
      required: ["path"],
    },
  },
  {
    name: "get_classes",
    description: "Get all classes in a directory. Returns an array of objects with class name, line number, and file path.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        maxDepth: { type: "number", default: 4 },
      },
      required: ["path"],
    },
  },
];

/**
 * Handle tool calls from the MCP client
 * @param {string} name - Tool name
 * @param {object} args - Tool arguments
 * @returns {object} - Tool response
 */
async function handleToolCall(name, args) {
  switch (name) {
    case "get_functions":
      try {
        // Normalize and resolve the path
        const absolutePath = path.resolve(args.path);
  
        // Get patterns to ignore from .gitignore
        const ignoredPatterns = await createIgnoreFilter(absolutePath);
        
        // Get all files
        const files = await getFilesRecursively(absolutePath, args.maxDepth, ignoredPatterns);
        
        // Extract functions from all files
        let allFunctions = [];
        for (const file of files) {
          const functions = await extractFunctions(file, absolutePath);
          allFunctions = [...allFunctions, ...functions];
        }
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify(allFunctions, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({ error: error.message }, null, 2)
          }]
        };
      }
    
    case "get_classes":
      try {
        // Normalize and resolve the path
        const absolutePath = path.resolve(args.path);
        
        // Get patterns to ignore from .gitignore
        const ignoredPatterns = await createIgnoreFilter(absolutePath);
        
        // Get all files
        const files = await getFilesRecursively(absolutePath, args.maxDepth, ignoredPatterns);
        
        // Extract classes from all files
        let allClasses = [];
        for (const file of files) {
          const classes = await extractClasses(file, absolutePath);
          allClasses = [...allClasses, ...classes];
        }
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify(allClasses, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({ error: error.message }, null, 2)
          }]
        };
      }
      
    default:
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2)
        }]
      };
  }
}

// Register request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => 
  handleToolCall(request.params.name, request.params.arguments ?? {})
);

// Start the server
async function runServer() {
  console.error('Starting HelperPro Code Analyzer MCP server...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP server connected and ready to receive requests');
}

runServer().catch(error => {
  console.error('Error starting MCP server:', error);
  process.exit(1);
});