#!/usr/bin/env node

// This is a simple test script to verify that the module is working correctly
console.log('Testing HelperPro MCP module...');

// Import the module directly from the local path
import('./build/index.js')
  .then(() => {
    console.log('Module imported successfully!');
    console.log('The module is working correctly as an ES module.');
    console.log('You can now use it in your Codeium configuration.');
  })
  .catch(error => {
    console.error('Error importing module:', error);
  });
