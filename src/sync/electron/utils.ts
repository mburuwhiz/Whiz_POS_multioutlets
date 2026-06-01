const fs = require('fs').promises;
const path = require('path');

export async function readJsonFile(dataDir: string, filename: string) {
  try {
    const fullPath = path.join(dataDir, filename);
    const content = await fs.readFile(fullPath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.log(`[SYNC-UTILS] File ${filename} not found or error parsing, returning empty array/object`);
    return filename.endsWith('.json') && (filename.includes('outlet') || filename.includes('product') || filename.includes('user')) ? [] : {};
  }
}

export async function writeJsonFile(dataDir: string, filename: string, data: any) {
  const fullPath = path.join(dataDir, filename);
  await fs.writeFile(fullPath, JSON.stringify(data, null, 2));
}
