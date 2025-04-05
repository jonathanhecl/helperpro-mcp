import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure build directory exists
const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) {
  console.log('Creating build directory...');
  fs.mkdirSync(buildDir);
}

// Copy index.js and add shebang line
const srcIndexPath = path.join(__dirname, 'src', 'index.js');
const destIndexPath = path.join(buildDir, 'index.js');
console.log(`Copying ${srcIndexPath} to ${destIndexPath} with shebang...`);

// Read the source file
const indexContent = fs.readFileSync(srcIndexPath, 'utf8');

// Add shebang line if it doesn't exist
const contentWithShebang = indexContent.startsWith('#!/usr/bin/env node') 
  ? indexContent 
  : `#!/usr/bin/env node\n${indexContent}`;

// Write the file with shebang
fs.writeFileSync(destIndexPath, contentWithShebang);

// Make the file executable
fs.chmodSync(destIndexPath, '755');

// Copy utils.js
const srcUtilsPath = path.join(__dirname, 'src', 'utils.js');
const destUtilsPath = path.join(buildDir, 'utils.js');
console.log(`Copying ${srcUtilsPath} to ${destUtilsPath}...`);
fs.copyFileSync(srcUtilsPath, destUtilsPath);

console.log('Build completed successfully!');
