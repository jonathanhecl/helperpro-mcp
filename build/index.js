import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import ignore from 'ignore';
// Create an MCP server
const server = new McpServer({
    name: "HelperPro Code Analyzer",
    version: "1.0.0"
});
/**
 * Read .gitignore file and create an ignore filter
 * @param {string} basePath - Base path to look for .gitignore
 * @returns {Promise<Function>} - Function that checks if a path should be ignored
 */
async function createIgnoreFilter(basePath) {
    const ignoreFilter = ignore();
    const gitignorePath = path.join(basePath, '.gitignore');
    try {
        if (await fs.pathExists(gitignorePath)) {
            const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
            ignoreFilter.add(gitignoreContent);
        }
    }
    catch (error) {
        console.error(`Error reading .gitignore: ${error.message}`);
    }
    return (filePath) => {
        const relativePath = path.relative(basePath, filePath);
        return !ignoreFilter.ignores(relativePath.replace(/\\/g, '/'));
    };
}
/**
 * Extract functions from a file
 * @param {string} filePath - Path to the file
 * @param {string} basePath - Base path for relative path calculation
 * @returns {Promise<FunctionInfo[]>} - Array of function information
 */
async function extractFunctions(filePath, basePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const results = [];
    const foundFunctions = new Set(); // To avoid duplicates in the same file
    // Regular expressions for different function patterns
    const patterns = [
        // JavaScript/TypeScript function declarations
        { regex: /^\s*(async\s+)?function\s+(\w+)\s*\(/, nameGroup: 2 },
        // JavaScript/TypeScript arrow functions with name
        { regex: /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(async\s+)?\(.*\)\s*=>/, nameGroup: 1 },
        // JavaScript/TypeScript class methods
        { regex: /^\s*(?:async\s+)?(\w+)\s*\(.*\)\s*{/, nameGroup: 1, requirePrevious: /^\s*(?:public|private|protected|static|\*)/ },
        // Go functions
        { regex: /^\s*func\s+(\w+)\s*\(/, nameGroup: 1 },
        // Python functions
        { regex: /^\s*def\s+(\w+)\s*\(/, nameGroup: 1 },
        // Java/C#/C++ functions
        { regex: /^\s*(?:public|private|protected|static|\w+)?\s+(?:\w+)\s+(\w+)\s*\(/, nameGroup: 1 },
        // PHP functions
        { regex: /^\s*function\s+(\w+)\s*\(/, nameGroup: 1 }
    ];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of patterns) {
            const match = line.match(pattern.regex);
            if (match) {
                // Check if we need to verify the previous line for context
                if (pattern.requirePrevious && i > 0) {
                    const prevLine = lines[i - 1];
                    if (!prevLine.match(pattern.requirePrevious)) {
                        continue;
                    }
                }
                const functionName = match[pattern.nameGroup];
                // Skip if this is a duplicate in the same file
                if (foundFunctions.has(functionName)) {
                    continue;
                }
                foundFunctions.add(functionName);
                results.push({
                    function: functionName,
                    line: i + 1, // 1-based line number
                    file: path.relative(basePath, filePath).replace(/\\/g, '/')
                });
            }
        }
    }
    return results;
}
/**
 * Extract classes from a file
 * @param {string} filePath - Path to the file
 * @param {string} basePath - Base path for relative path calculation
 * @returns {Promise<ClassInfo[]>} - Array of class information
 */
async function extractClasses(filePath, basePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const results = [];
    const foundClasses = new Set(); // To avoid duplicates in the same file
    // Regular expressions for different class patterns
    const patterns = [
        // JavaScript/TypeScript classes
        { regex: /^\s*(?:export\s+)?class\s+(\w+)/, nameGroup: 1 },
        // Python classes
        { regex: /^\s*class\s+(\w+)/, nameGroup: 1 },
        // Java/C#/C++ classes
        { regex: /^\s*(?:public|private|protected)?\s*class\s+(\w+)/, nameGroup: 1 },
        // PHP classes
        { regex: /^\s*class\s+(\w+)/, nameGroup: 1 }
    ];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of patterns) {
            const match = line.match(pattern.regex);
            if (match) {
                const className = match[pattern.nameGroup];
                // Skip if this is a duplicate in the same file
                if (foundClasses.has(className)) {
                    continue;
                }
                foundClasses.add(className);
                results.push({
                    class: className,
                    line: i + 1, // 1-based line number
                    file: path.relative(basePath, filePath).replace(/\\/g, '/')
                });
            }
        }
    }
    return results;
}
/**
 * Get all files in a directory recursively, respecting .gitignore
 * @param {string} dirPath - Directory path to search
 * @param {number} maxDepth - Maximum directory depth to search
 * @param {Function} shouldInclude - Function to check if a file should be included
 * @returns {Promise<string[]>} - Array of file paths
 */
async function getFilesRecursively(dirPath, maxDepth, shouldInclude) {
    const absolutePath = path.resolve(dirPath);
    // Use glob to get all files with depth control
    const globPattern = path.join(absolutePath, `${"**/".repeat(maxDepth)}*`);
    const allFiles = await glob(globPattern, { nodir: true, dot: true });
    // Filter files based on .gitignore
    return allFiles.filter(shouldInclude);
}
// Add get_functions tool
server.tool("get_functions", "Get all functions in a directory", {
    path: z.string(),
    maxDepth: z.number().optional().default(4)
}, async ({ path: dirPath, maxDepth }) => {
    try {
        // Normalize and resolve the path
        const absolutePath = path.resolve(dirPath);
        // Create ignore filter from .gitignore
        const shouldInclude = await createIgnoreFilter(absolutePath);
        // Get all files
        const files = await getFilesRecursively(absolutePath, maxDepth, shouldInclude);
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
    }
    catch (error) {
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({ error: error.message }, null, 2)
                }]
        };
    }
});
// Add get_classes tool
server.tool("get_classes", "Get all classes in a directory", {
    path: z.string(),
    maxDepth: z.number().optional().default(4)
}, async ({ path: dirPath, maxDepth }) => {
    try {
        // Normalize and resolve the path
        const absolutePath = path.resolve(dirPath);
        // Create ignore filter from .gitignore
        const shouldInclude = await createIgnoreFilter(absolutePath);
        // Get all files
        const files = await getFilesRecursively(absolutePath, maxDepth, shouldInclude);
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
    }
    catch (error) {
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({ error: error.message }, null, 2)
                }]
        };
    }
});
// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
