#!/usr/bin/env node
const { spawn } = require('child_process');
const os = require('os');

const mode = process.argv[2];
if (mode !== 'server' && mode !== 'outlet') {
  console.error('Usage: node dev-launcher.cjs <server|outlet>');
  process.exit(1);
}

const rendererPort = mode === 'server' ? 5174 : 5175;
const whizPort = mode === 'server' ? 3000 : 3001;
const dbName = mode === 'server' ? 'instance-server.db' : 'instance-outlet.db';
const rendererUrls = [
  `http://localhost:${rendererPort}`,
  `http://127.0.0.1:${rendererPort}`,
  `http://[::1]:${rendererPort}`
];
const localIP = (() => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
})();

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

process.env.WHIZ_POS_MODE = mode;
process.env.WHIZ_POS_PORT = String(whizPort);
process.env.WHIZ_POS_DB_NAME = dbName;

console.log('=== Whiz POS Development Mode ===');
console.log(`Starting ${mode === 'server' ? 'Main Server' : 'Checkout Outlet'}...`);
console.log(`Port: ${whizPort}`);
console.log(`Database: ${dbName}`);
console.log(`Local IP: ${localIP}`);
if (mode === 'server') {
  console.log(`Connection Link for Outlets: http://${localIP}:3000`);
}

const vite = spawnNpm(['run', 'dev:vite', '--', '--port', String(rendererPort)], {
  env: { ...process.env, PORT: String(rendererPort) },
});

let electron = null;
let shuttingDown = false;

const stopAll = (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  try { if (electron && !electron.killed) electron.kill(); } catch {}
  try { if (vite && !vite.killed) vite.kill(); } catch {}
  process.exit(code);
};

const waitForRenderer = async () => {
  const timeoutMs = 60000;
  const timeoutAt = Date.now() + 60000;
  console.log(`[Launcher] Waiting for renderer at ${rendererUrls.join(', ')}...`);

  const probeUrl = async (url) => {
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(2000)
      });
      return response.ok || response.status === 200 || response.status === 304;
    } catch {
      return false;
    }
  };

  while (Date.now() < timeoutAt) {
    for (const url of rendererUrls) {
      if (await probeUrl(url)) {
        return url;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 400));
  }

  throw new Error(`Renderer did not become ready at any of: ${rendererUrls.join(', ')} within ${timeoutMs / 1000}s`);
};

vite.on('close', (code) => {
  console.log(`[Launcher] Vite exited with code ${code}`);
  stopAll(code ?? 0);
});

(async () => {
  try {
    const rendererUrl = await waitForRenderer();
    console.log(`[Launcher] Renderer ready at ${rendererUrl}, starting Electron...`);
    electron = spawnNpm(['run', 'dev:electron', '--', rendererUrl], {
      env: { ...process.env },
    });

    electron.on('close', (code) => {
      console.log(`[Launcher] Electron exited with code ${code}`);
      stopAll(code ?? 0);
    });
  } catch (error) {
    console.error('[Launcher] Failed to start Electron:', error.message || error);
    stopAll(1);
  }
})();

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
