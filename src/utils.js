import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import ignore from 'ignore';

/**
 * Read .gitignore file and create an ignore filter
 * @param {string} basePath - Base path to look for .gitignore
 * @returns {Promise<string[]>} - List of patterns that should be ignored
 */
export async function createIgnoreFilter(basePath) {
  const ignoredPatterns = [];
  const gitignorePath = path.join(basePath, '.gitignore');
  
  try {
    if (await fs.pathExists(gitignorePath)) {
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
      // Parse the .gitignore content and extract patterns
      const patterns = gitignoreContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      
      ignoredPatterns.push(...patterns);
    }
  } catch (error) {
    console.error(`Error reading .gitignore: ${error.message}`);
  }
  
  return ignoredPatterns;
}

/**
 * Extract functions from a file
 * @param {string} filePath - Path to the file
 * @param {string} basePath - Base path for relative path calculation
 * @returns {Promise<FunctionInfo[]>} - Array of function information
 */
export async function extractFunctions(filePath, basePath) {
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
          const prevLine = lines[i-1];
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
export async function extractClasses(filePath, basePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split('\n');
  const results = [];
  const foundClasses = new Set(); // To avoid duplicates in the same file
  
  // Regular expressions for different class patterns
  const patterns = [
    // JavaScript/TypeScript classes
    { regex: /^\s*(?:export\s+)?class\s+(\w+)/, nameGroup: 1 },
    // Java/C#/C++ classes
    { regex: /^\s*(?:public|private|protected)?\s*class\s+(\w+)/, nameGroup: 1 },
    // Python classes
    { regex: /^\s*class\s+(\w+)/, nameGroup: 1 },
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
 * @param {string[]} ignoredPatterns - List of patterns that should be ignored
 * @returns {Promise<string[]>} - Array of file paths
 */
export async function getFilesRecursively(absolutePath, maxDepth, ignoredPatterns) {
  // Ensure the path exists
  if (!await fs.pathExists(absolutePath)) {
    console.error(`Path does not exist: ${absolutePath}`);
    return [];
  }
  
  // Create a simpler glob pattern that uses forward slashes
  let globPattern = absolutePath.replace(/\\/g, '/'); // Convert to forward slashes
  if (!globPattern.endsWith('/')) {
    globPattern += '/';
  }
  globPattern += '**'; // Match all files and directories recursively
  
  console.error(`Using glob pattern: ${globPattern}`);
  
  try {
    // Use glob with more explicit options
    const allFiles = await glob(globPattern, { 
      nodir: true,      // Only return files, not directories
      dot: true,        // Include dotfiles
      absolute: true,   // Return absolute paths
      follow: true      // Follow symlinks
    });
    
    console.error(`Found ${allFiles.length} files with glob`);
    
    // Log some of the files for debugging
    if (allFiles.length > 0) {
      console.error('First few files:');
      allFiles.slice(0, 5).forEach(file => console.error(` - ${file}`));
    }
    
    // Create an ignore filter using the patterns
    const ignoreFilter = ignore().add(ignoredPatterns);
    
    // Filter files based on .gitignore patterns
    return allFiles.filter(file => {
      const relativePath = path.relative(absolutePath, file).replace(/\\/g, '/');
      return !ignoreFilter.ignores(relativePath);
    });
  } catch (error) {
    console.error(`Error in glob: ${error}`);
    return [];
  }
}
