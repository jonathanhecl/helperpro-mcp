// Simple test for helperpro-mcp package
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create test files with nested directories
const testDir = path.join(__dirname, 'test-samples');
fs.ensureDirSync(testDir);

// Create nested directory
const nestedDir = path.join(testDir, 'nested');
fs.ensureDirSync(nestedDir);
const deepNestedDir = path.join(nestedDir, 'deep');
fs.ensureDirSync(deepNestedDir);

// Sample JavaScript file in root test directory
const jsFilePath = path.join(testDir, 'sample.js');
const jsContent = `
// Sample JavaScript file
function testFunction1() {
  console.log('Test function 1');
}

const testFunction2 = () => {
  console.log('Test function 2');
};

class TestClass1 {
  constructor() {
    this.name = 'Test Class 1';
  }
  
  method1() {
    console.log('Method 1');
  }
}

// Another class
class TestClass2 {
  static staticMethod() {
    return 'Static method';
  }
}
`;

// Sample TypeScript file
const tsFilePath = path.join(testDir, 'sample.ts');
const tsContent = `
// Sample TypeScript file
interface TestInterface {
  name: string;
  age: number;
}

function typescriptFunction(param: string): string {
  return param.toUpperCase();
}

class TypescriptClass {
  private value: number;
  
  constructor(value: number) {
    this.value = value;
  }
  
  getValue(): number {
    return this.value;
  }
}
`;

// Sample JavaScript file in nested directory
const nestedJsFilePath = path.join(nestedDir, 'nested-sample.js');
const nestedJsContent = `
// Nested JavaScript file
function nestedFunction() {
  return 'I am in a nested directory';
}

class NestedClass {
  constructor() {
    this.name = 'Nested Class';
  }
}
`;

// Sample JavaScript file in deep nested directory
const deepNestedJsFilePath = path.join(deepNestedDir, 'deep-sample.js');
const deepNestedJsContent = `
// Deep nested JavaScript file
function deepNestedFunction() {
  return 'I am in a deep nested directory';
}

class DeepNestedClass {
  constructor() {
    this.name = 'Deep Nested Class';
  }
}
`;

// Write all the files
fs.writeFileSync(jsFilePath, jsContent);
fs.writeFileSync(tsFilePath, tsContent);
fs.writeFileSync(nestedJsFilePath, nestedJsContent);
fs.writeFileSync(deepNestedJsFilePath, deepNestedJsContent);

console.log(`Test files created at:
- ${jsFilePath}
- ${tsFilePath}
- ${nestedJsFilePath}
- ${deepNestedJsFilePath}`);

// Function to extract functions from a file
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
    { regex: /^\s*(?:async\s+)?(\w+)\s*\(.*\)\s*{/, nameGroup: 1, requirePrevious: /^\s*(?:public|private|protected|static|\*)/ }
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

// Function to extract classes from a file
async function extractClasses(filePath, basePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split('\n');
  const results = [];
  const foundClasses = new Set(); // To avoid duplicates in the same file
  
  // Regular expressions for different class patterns
  const patterns = [
    // JavaScript/TypeScript classes
    { regex: /^\s*(?:export\s+)?class\s+(\w+)/, nameGroup: 1 }
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

// Function to get all files in a directory recursively
async function getAllFiles(dirPath) {
  const files = await fs.readdir(dirPath, { withFileTypes: true });
  let fileList = [];
  
  for (const file of files) {
    const filePath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      fileList = [...fileList, ...(await getAllFiles(filePath))];
    } else {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

// Test the functions
async function runTest() {
  // Parte 1: Prueba de archivos individuales
  console.log('\n=== PRUEBA DE ARCHIVOS INDIVIDUALES ===');
  
  // Extract functions from individual files
  console.log('\n1. Root JavaScript functions:');
  const jsFunctions = await extractFunctions(jsFilePath, testDir);
  console.log(JSON.stringify(jsFunctions, null, 2));
  
  console.log('\n2. TypeScript functions:');
  const tsFunctions = await extractFunctions(tsFilePath, testDir);
  console.log(JSON.stringify(tsFunctions, null, 2));
  
  console.log('\n3. Root JavaScript classes:');
  const jsClasses = await extractClasses(jsFilePath, testDir);
  console.log(JSON.stringify(jsClasses, null, 2));
  
  console.log('\n4. TypeScript classes:');
  const tsClasses = await extractClasses(tsFilePath, testDir);
  console.log(JSON.stringify(tsClasses, null, 2));
  
  // Parte 2: Prueba de exploración recursiva de directorios
  console.log('\n=== PRUEBA DE EXPLORACIÓN RECURSIVA DE DIRECTORIOS ===');
  const allFiles = await getAllFiles(testDir);
  console.log(`\nEncontrados ${allFiles.length} archivos en total:`);
  allFiles.forEach(file => console.log(` - ${path.relative(testDir, file)}`));
  
  // Parte 3: Extracción de todos los archivos recursivamente
  console.log('\n=== EXTRACCIÓN DE TODOS LOS ARCHIVOS RECURSIVAMENTE ===');
  
  // Procesar los archivos secuencialmente para evitar salida desordenada
  let allFunctions = [];
  let allClasses = [];
  
  console.log('\nProcesando archivos uno por uno:');
  for (const file of allFiles) {
    console.log(`\nProcesando: ${path.relative(testDir, file)}`);
    
    console.log('- Extrayendo funciones...');
    const functions = await extractFunctions(file, testDir);
    allFunctions = [...allFunctions, ...functions];
    
    console.log('- Extrayendo clases...');
    const classes = await extractClasses(file, testDir);
    allClasses = [...allClasses, ...classes];
  }
  
  console.log('\nTodas las funciones encontradas:');
  console.log(JSON.stringify(allFunctions, null, 2));
  
  console.log('\nTodas las clases encontradas:');
  console.log(JSON.stringify(allClasses, null, 2));
  
  // Resumen
  console.log('\n=== RESUMEN ===');
  console.log(`Total de archivos: ${allFiles.length}`);
  console.log(`Total de funciones: ${allFunctions.length}`);
  console.log(`Total de clases: ${allClasses.length}`);
}

// Test MCP server directly
async function testMcpServer() {
  console.log('\n=== TESTING MCP SERVER ===');
  
  // Start the MCP server process
  console.log('Starting MCP server...');
  const mcpProcess = spawn('node', ['build/index.js'], {
    stdio: ['pipe', 'pipe', process.stderr]
  });
  
  // Function to send a request to the MCP server
  function sendRequest(request) {
    return new Promise((resolve) => {
      // Set up response handling
      const responseChunks = [];
      mcpProcess.stdout.on('data', (chunk) => {
        const data = chunk.toString();
        responseChunks.push(data);
        
        // Check if we have a complete response
        const combinedResponse = responseChunks.join('');
        if (combinedResponse.includes('"jsonrpc":"2.0"') && 
            combinedResponse.includes('"id":') && 
            (combinedResponse.includes('"result":') || combinedResponse.includes('"error":'))) {
          try {
            const response = JSON.parse(combinedResponse);
            resolve(response);
          } catch (e) {
            console.error('Error parsing response:', e);
            console.error('Response was:', combinedResponse);
            resolve({ error: { message: 'Error parsing response' } });
          }
        }
      });

      // Send the request
      mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  }
  
  // Test get_functions
  console.log('\nTesting get_functions tool...');
  const getFunctionsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tool',
    params: {
      name: 'get_functions',
      parameters: {
        path: testDir,
        maxDepth: 2
      }
    }
  };
  
  const functionsResponse = await sendRequest(getFunctionsRequest);
  if (functionsResponse.result && functionsResponse.result.content && functionsResponse.result.content[0]) {
    console.log('get_functions tool works! ✅');
  } else {
    console.log('get_functions tool failed! ❌');
    console.log(functionsResponse);
  }
  
  // Test get_classes
  console.log('\nTesting get_classes tool...');
  const getClassesRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tool',
    params: {
      name: 'get_classes',
      parameters: {
        path: testDir,
        maxDepth: 2
      }
    }
  };
  
  const classesResponse = await sendRequest(getClassesRequest);
  if (classesResponse.result && classesResponse.result.content && classesResponse.result.content[0]) {
    console.log('get_classes tool works! ✅');
  } else {
    console.log('get_classes tool failed! ❌');
    console.log(classesResponse);
  }
  
  // Clean up
  mcpProcess.stdin.end();
  setTimeout(() => {
    console.log('\nTests completed!');
    process.exit(0);
  }, 500);
}

// Solo ejecutamos la prueba de extracción
runTest().catch(console.error);
