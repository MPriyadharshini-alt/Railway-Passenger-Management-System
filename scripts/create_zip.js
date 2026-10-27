// Script to package the Railway Passenger Digital Platform into a clean, lightweight ZIP file
// Excludes node_modules, logs, and temporary lock files to keep storage under 250 KB!

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const zipFileName = 'railway-passenger-digital-platform.zip';
const zipFilePath = path.resolve(rootDir, zipFileName);

console.log('📦 Generating space-efficient project ZIP package...');

if (fs.existsSync(zipFilePath)) {
  fs.unlinkSync(zipFilePath);
}

// Clean up any sqlite temporary files if present
const dbDir = path.resolve(rootDir, 'server/database');
['railway.db-shm', 'railway.db-wal'].forEach(tmpFile => {
  const p = path.resolve(dbDir, tmpFile);
  if (fs.existsSync(p)) {
    try { fs.unlinkSync(p); } catch (e) {}
  }
});

// Windows native tar command supports standard .zip output via -a -c -f
try {
  execSync(`tar -a -c -f "${zipFileName}" --exclude="node_modules" --exclude=".git" --exclude="*.zip" --exclude="*.log" --exclude="*.db-shm" --exclude="*.db-wal" *`, {
    cwd: rootDir,
    stdio: 'inherit'
  });
  
  const stats = fs.statSync(zipFilePath);
  const sizeKb = (stats.size / 1024).toFixed(1);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`\n🎉 Success! Clean ZIP archive generated:`);
  console.log(`📁 File: ${zipFileName}`);
  console.log(`⚖️  Size: ${sizeKb} KB (${sizeMb} MB)`);
  console.log(`🚀 Anyone can extract this ZIP on their laptop, run 'npm install' and 'npm start' to test!`);
} catch (tarErr) {
  console.error('ZIP generation error:', tarErr.message);
}

