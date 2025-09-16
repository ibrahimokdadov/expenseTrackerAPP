const fs = require('fs');
const path = require('path');

// Function to remove styleText calls from a file
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace styleText calls with plain text
    content = content.replace(/\(0, _util\.styleText\)\([^)]*,\s*([^)]+)\)/g, '$1');
    content = content.replace(/\$\{?\(0, _util\.styleText\)\([^}]+\}\)/g, '');

    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
}

// Files to fix
const files = [
  'node_modules/@react-native/community-cli-plugin/dist/commands/start/runServer.js',
  'node_modules/@react-native/community-cli-plugin/dist/commands/start/attachKeyHandlers.js',
  'node_modules/@react-native/community-cli-plugin/dist/commands/start/OpenDebuggerKeyboardHandler.js'
];

files.forEach(file => {
  fixFile(path.join(__dirname, file));
});

console.log('Metro compatibility fix applied!');