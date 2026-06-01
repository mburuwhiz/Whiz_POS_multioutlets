const path = require('path');
const fs = require('fs');
const os = require('os');

const appName = 'whiz-pos';
const dataPaths = [];

if (process.platform === 'win32') {
    const programData = process.env.PROGRAMDATA || 'C:\\ProgramData';
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');

    dataPaths.push(
        path.join(programData, appName),
        path.join(appData, appName),
        path.join(localAppData, appName)
    );
} else {
    dataPaths.push(
        path.join(os.homedir(), '.config', appName),
        path.join(os.homedir(), 'Library', 'Application Support', appName)
    );
}

console.log('Whiz POS dev reset');
for (const targetPath of [...new Set(dataPaths)]) {
    console.log(`Checking: ${targetPath}`);
    if (!fs.existsSync(targetPath)) {
        console.log('  Already clean.');
        continue;
    }

    try {
        fs.rmSync(targetPath, { recursive: true, force: true });
        console.log('  Removed.');
    } catch (err) {
        console.error(`  Failed: ${err.message}`);
        process.exitCode = 1;
    }
}
