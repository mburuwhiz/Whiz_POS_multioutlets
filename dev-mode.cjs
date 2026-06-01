#!/usr/bin/env node
const { spawn } = require('child_process');
const os = require('os');
const networkInterfaces = os.networkInterfaces();

const spawnNpm = (scriptArgs, options = {}) => {
  if (process.platform === 'win32') {
    return spawn('cmd.exe', ['/d', '/s', '/c', `npm ${scriptArgs.join(' ')}`], {
      stdio: 'inherit',
      ...options
    });
  }

  return spawn('npm', scriptArgs, {
    stdio: 'inherit',
    ...options
  });
};

// Function to get local IP address
const getLocalIP = () => {
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
};

// Check if mode is specified via command line arg
const args = process.argv.slice(2);
let mode = args[0];
const localIP = getLocalIP();

if (!mode || (mode !== 'server' && mode !== 'outlet')) {
  console.log('=== Whiz POS Development Mode ===\n');
  console.log('Usage: npm run dev [server|outlet]\n');
  console.log('Or use these direct commands:\n');
  console.log('  npm run dev:server   - Launch Main Server (Port 3000)');
  console.log('  npm run dev:outlet   - Launch Checkout Outlet (Port 3001)\n');
  console.log('Falling back to interactive React Mode Selector...\n');
  
  // Just start vite without specific port, let the React Mode Selector handle it
  const vite = spawnNpm(['run', 'dev:vite'], {
    env: { ...process.env, PORT: '5174' },
  });
  
  const electron = spawnNpm(['run', 'dev:electron', '--', 'http://localhost:5174']);
  
  vite.on('close', (code) => {
    electron.kill();
    process.exit(code);
  });
  
  electron.on('close', (code) => {
    vite.kill();
    process.exit(code);
  });
  
  return;
}

let port;
let dbName;
let rendererPort;

if (mode === 'server') {
  port = 3000;
  dbName = 'instance-server.db';
  rendererPort = 5174;
} else {
  port = 3001;
  dbName = 'instance-outlet.db';
  rendererPort = 5175;
}

console.log(`=== Whiz POS Development Mode ===\n`);
console.log(`Starting ${mode === 'server' ? 'Main Server' : 'Checkout Outlet'}...`);
console.log(`Port: ${port}`);
console.log(`Database: ${dbName}`);
console.log(`Local IP: ${localIP}`);
if (mode === 'server') {
  console.log(`\n🔗 Connection Link for Outlets: http://${localIP}:3000\n`);
}

// Set environment variables
process.env.WHIZ_POS_MODE = mode;
process.env.WHIZ_POS_PORT = port;
process.env.WHIZ_POS_DB_NAME = dbName;

// Run the dev commands
const vite = spawnNpm(['run', 'dev:vite'], {
  env: { ...process.env, PORT: rendererPort },
});

const electron = spawnNpm(['run', 'dev:electron', '--', `http://localhost:${rendererPort}`], {
  env: { ...process.env },
});

vite.on('close', (code) => {
  electron.kill();
  process.exit(code);
});

electron.on('close', (code) => {
  vite.kill();
  process.exit(code);
});
