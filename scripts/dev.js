// Development script to start both backend API and frontend Vite server
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Railway Passenger Platform Development Environment...\n');

// 1. Start Server
const serverProcess = spawn('node', ['--watch', 'server/src/server.js'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_ENV: 'development', PORT: '5000' }
});

// 2. Start Client Vite
const clientProcess = spawn('npm', ['--prefix', 'client', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log('\n🛑 Shutting down Railway servers...');
  serverProcess.kill();
  clientProcess.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
