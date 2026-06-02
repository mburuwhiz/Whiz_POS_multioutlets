const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const crypto = require('crypto');
const os = require('os');
const { WebSocketServer } = require('ws');
const bonjour = require('bonjour')();
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const { initDB, getDbPath, migrateLegacyData, readJsonFileFallback, writeJsonFileFallback, backupDB, closeDB } = require('./sqlite-db.cjs');
const { generateReceipt, generateClosingReport, generateBusinessSetup } = require(path.join(__dirname, 'print-jobs.cjs'));
const { MongoClient } = require('mongodb');
const { dialog } = require('electron'); // For file dialogs

const store = new Store();
const runtimeApiPort = Number(process.env.WHIZ_POS_PORT) || 3000;
const DEFAULT_BUSINESS_SHORTCODE = 'ws';
const OUTLET_CODE_PATTERN = /^[a-z]{2,8}o\d{3,}$/i;

/**
 * Main Electron Process Script.
 * Handles application lifecycle, window management, IPC communication, and a local API server for mobile printing.
 */

// Fix GPU cache and permission issues with Electron command-line switches
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-setuid-sandbox');
// Disable GPU cache entirely
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
// Set cache directory to our own path
const cacheDir = path.join(os.tmpdir(), 'whiz-pos-cache');
app.commandLine.appendSwitch('disk-cache-dir', cacheDir);
// Prevent renderer process from accessing cache issues
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-site-isolation-trials');

app.commandLine.appendSwitch('disable-features', 'BlockInsecurePrivateNetworkRequests');
// Create cache directory to prevent missing dir errors
fs.mkdir(cacheDir, { recursive: true }).catch(() => {});

// Define paths for storing user data and assets.
// Switch to a more secure/stable directory on Windows (e.g., C:\ProgramData) to prevent crashes on first launch or user-specific permissions issues.
let baseDataPath;
if (process.platform === 'win32') {
    // Safely get commonAppData or fallback to environment variable / hardcoded C:\ProgramData
    let commonAppData;
    try {
        commonAppData = app.getPath('commonAppData');
    } catch (e) {
        commonAppData = process.env.PROGRAMDATA || 'C:\\ProgramData';
    }
    baseDataPath = path.join(commonAppData, 'whiz-pos');

    // Override userData globally so internal modules use this path too
    try {
        app.setPath('userData', baseDataPath);
    } catch (e) {
        // Ignore if we can't set it
    }
} else {
    baseDataPath = app.getPath('userData');
}

// Custom Logger Setup
let logBasePath = baseDataPath;
const logFilePath = path.join(logBasePath, 'logs.txt');

function logToFile(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    fs.appendFile(logFilePath, logLine).catch(err => console.error('Failed to write to log file:', err));
}

// Override console methods to capture logs
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
    const message = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
    logToFile(`INFO: ${message}`);
    originalLog.apply(console, args);
};

console.error = (...args) => {
    const message = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');
    logToFile(`ERROR: ${message}`);
    originalError.apply(console, args);
};

const userDataPath = path.join(baseDataPath, 'data');
const productImagesPath = path.join(baseDataPath, 'assets', 'product_images');

/**
 * Optimizes data on startup.
 * - Dedupes users
 * - Cleans expired sessions
 * - Ensures data integrity
 */
async function optimizeData() {
    try {
        console.log('[Data Optimization] Starting...');

        // 1. Optimize Users (Dedupe by ID or Name)
        const users = await readJsonFile('users.json');
        if (users.length > 0) {
            const uniqueUsers = [];
            const seenIds = new Set();
            const seenNames = new Set();

            users.forEach(u => {
                if (!u.id || !u.name) return; // Skip invalid
                // Prefer keeping the one with most recent updatedAt?
                // Simple dedupe: First wins, but we should probably sort by updatedAt desc first if we want latest.
                // Assuming append-only history might exist, but we read the whole file which is the current state.

                if (!seenIds.has(u.id) && !seenNames.has(u.name.toLowerCase())) {
                    seenIds.add(u.id);
                    seenNames.add(u.name.toLowerCase());
                    uniqueUsers.push(u);
                }
            });

            if (uniqueUsers.length !== users.length) {
                console.log(`[Data Optimization] Removed ${users.length - uniqueUsers.length} duplicate/invalid users.`);
                await writeJsonFile('users.json', uniqueUsers);
            }
        }

        // 2. Clean Sessions
        const sessions = await readJsonFile('sessions.json');
        if (Array.isArray(sessions) && sessions.length > 0) {
            const now = new Date();
            const validSessions = sessions.filter(s => {
                if (!s.createdAt) return false;
                const diffDays = (now - new Date(s.createdAt)) / (1000 * 60 * 60 * 24);
                return diffDays < 7;
            });

            if (validSessions.length !== sessions.length) {
                console.log(`[Data Optimization] Pruned ${sessions.length - validSessions.length} expired sessions.`);
                await writeJsonFile('sessions.json', validSessions);
            }
        }

        console.log('[Data Optimization] Complete.');
    } catch (e) {
        console.error('[Data Optimization] Failed:', e);
    }
}

async function optimizeBusinessIdentityData() {
    try {
        const businessSetup = await readJsonFile('business-setup.json').then(data => (Array.isArray(data) ? data[0] : data)) || {};
        const businessShortcode = normalizeBusinessShortcode(businessSetup.businessName || businessSetup.outletName || businessSetup.locationName);
        let setupChanged = false;

        if (businessSetup.businessShortcode !== businessShortcode) {
            businessSetup.businessShortcode = businessShortcode;
            setupChanged = true;
        }

        const serverConfig = await readServerConfig();
        const approvedOutlets = Array.isArray(await readJsonFile('approved-outlets.json')) ? await readJsonFile('approved-outlets.json') : [];
        const pendingOutlets = Array.isArray(await readJsonFile('pending-outlets.json')) ? await readJsonFile('pending-outlets.json') : [];
        const rejectedOutlets = Array.isArray(await readJsonFile('rejected-outlets.json')) ? await readJsonFile('rejected-outlets.json') : [];

        const allOutletRecords = [...approvedOutlets, ...pendingOutlets, ...rejectedOutlets];
        let highestSequence = Number(serverConfig.nextOutletSequence || 1);

        for (const outlet of allOutletRecords) {
            highestSequence = Math.max(
                highestSequence,
                extractOutletSequence(outlet.outletCode, businessShortcode),
                extractOutletSequence(outlet.id, businessShortcode)
            );
        }

        let nextSequence = Math.max(highestSequence, 1);
        const normalizeOutletRecord = (outlet) => {
            if (!outlet || typeof outlet !== 'object') return outlet;

            const canonicalId = isCanonicalOutletCode(outlet.id, businessShortcode) ? String(outlet.id).toLowerCase() : '';
            const canonicalOutletCode = isCanonicalOutletCode(outlet.outletCode, businessShortcode) ? String(outlet.outletCode).toLowerCase() : '';
            const resolvedCode = canonicalOutletCode || canonicalId || buildOutletCode(businessShortcode, nextSequence++);
            const legacyOutletIds = new Set([
                ...(Array.isArray(outlet.legacyOutletIds) ? outlet.legacyOutletIds : []),
                outlet.id,
                outlet.outletCode,
            ].filter(Boolean).map(value => String(value).trim()).filter(Boolean));

            return {
                ...outlet,
                businessShortcode,
                outletCode: resolvedCode,
                legacyOutletIds: Array.from(legacyOutletIds).filter(value => value !== resolvedCode),
            };
        };

        const normalizedApproved = approvedOutlets.map(normalizeOutletRecord);
        const normalizedPending = pendingOutlets.map(normalizeOutletRecord);
        const normalizedRejected = rejectedOutlets.map(normalizeOutletRecord);

        const writeIfChanged = async (filename, original, updated) => {
            if (JSON.stringify(original) !== JSON.stringify(updated)) {
                await writeJsonFile(filename, updated);
            }
        };

        await writeIfChanged('approved-outlets.json', approvedOutlets, normalizedApproved);
        await writeIfChanged('pending-outlets.json', pendingOutlets, normalizedPending);
        await writeIfChanged('rejected-outlets.json', rejectedOutlets, normalizedRejected);

        serverConfig.businessShortcode = businessShortcode;
        serverConfig.nextOutletSequence = Math.max(nextSequence, highestSequence + 1, Number(serverConfig.nextOutletSequence || 1));
        await writeServerConfig(serverConfig);

        if (setupChanged) {
            await writeJsonFile('business-setup.json', businessSetup);
        }
    } catch (error) {
        console.error('[Business Identity Optimization] Failed:', error);
    }
}

const STARTUP_CONNECTIVITY_OPTIMIZATION_VERSION = 1;

async function resolveHealthyLocalServerBaseUrl(preferredUrl = '') {
    const candidates = [];
    const pushCandidate = (value) => {
        if (!value) return;
        const normalized = String(value).trim().replace(/\/$/, '').replace(/\/api$/, '');
        if (normalized) candidates.push(normalized);
    };

    pushCandidate(preferredUrl);
    for (const server of discoveredServers.values()) {
        pushCandidate(server?.ip ? `http://${server.ip}:${server.port || 3000}` : '');
    }

    const uniqueCandidates = Array.from(new Set(candidates));
    for (const baseUrl of uniqueCandidates) {
        try {
            const response = await fetch(`${baseUrl}/api/heartbeat`, { method: 'GET' });
            if (!response.ok) continue;
            const payload = await response.json().catch(() => ({}));
            if (payload?.mode !== 'outlet') {
                return baseUrl;
            }
        } catch (error) {
            continue;
        }
    }

  return '';
}

function normalizeBusinessShortcode(businessName = '') {
    const parts = String(businessName)
        .trim()
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);

    if (parts.length >= 2) {
        const shortcode = `${parts[0][0]}${parts[parts.length - 1][0]}`.replace(/[^a-z0-9]/g, '');
        return shortcode || DEFAULT_BUSINESS_SHORTCODE;
    }

    if (parts.length === 1) {
        const shortcode = parts[0].slice(0, 2).replace(/[^a-z0-9]/g, '');
        return shortcode || DEFAULT_BUSINESS_SHORTCODE;
    }

    return DEFAULT_BUSINESS_SHORTCODE;
}

function buildOutletCode(businessShortcode, sequence) {
    return `${String(businessShortcode || DEFAULT_BUSINESS_SHORTCODE).toLowerCase()}o${String(sequence).padStart(3, '0')}`;
}

function isCanonicalOutletCode(value, businessShortcode = '') {
    if (!value) return false;
    const normalized = String(value).trim().toLowerCase();
    if (!OUTLET_CODE_PATTERN.test(normalized)) return false;
    if (!businessShortcode) return true;
    return normalized.startsWith(String(businessShortcode).toLowerCase());
}

function extractOutletSequence(value, businessShortcode = '') {
    if (!value) return 0;
    const normalized = String(value).trim().toLowerCase();
    const prefix = String(businessShortcode || '').toLowerCase();
    if (prefix && !normalized.startsWith(prefix)) return 0;
    const match = normalized.match(/o(\d+)$/i);
    return match ? Number(match[1]) || 0 : 0;
}

function getOutletAliases(outlet = {}) {
    const aliases = new Set();
    const push = (value) => {
        if (value === undefined || value === null) return;
        const normalized = String(value).trim();
        if (normalized) aliases.add(normalized);
    };

    push(outlet.id);
    push(outlet.outletCode);
    for (const legacyId of outlet.legacyOutletIds || []) {
        push(legacyId);
    }

    return Array.from(aliases);
}

function findOutletRecordById(outletId) {
    const normalized = String(outletId || '').trim();
    if (!normalized) return null;

    for (const outlet of global.outletsMap.values()) {
        if (getOutletAliases(outlet).includes(normalized)) return outlet;
    }

    for (const outlet of global.pendingOutletsMap.values()) {
        if (getOutletAliases(outlet).includes(normalized)) return outlet;
    }

    for (const outlet of global.rejectedOutletsMap.values()) {
        if (getOutletAliases(outlet).includes(normalized)) return outlet;
    }

    return null;
}

function findOutletEntryById(outletMap, outletId) {
    const normalized = String(outletId || '').trim();
    if (!normalized || !outletMap) return null;

    for (const [key, outlet] of outletMap.entries()) {
        if (getOutletAliases(outlet).includes(normalized)) {
            return { key, outlet };
        }
    }

    return null;
}

function getServerConfigPath() {
    return path.join(userDataPath, 'server-config.json');
}

async function readServerConfig() {
    try {
        const data = await fs.readFile(getServerConfigPath(), 'utf-8');
        return JSON.parse(data || '{}');
    } catch {
        return {};
    }
}

async function writeServerConfig(config) {
    await fs.writeFile(getServerConfigPath(), JSON.stringify(config, null, 2));
}

async function runStartupConnectivityOptimization() {
    const mode = process.env.WHIZ_POS_MODE || 'server';
    const storeKey = `connectivityOptimizationVersion_${mode}`;
    const currentVersion = Number(store.get(storeKey) || 0);
    if (currentVersion >= STARTUP_CONNECTIVITY_OPTIMIZATION_VERSION) {
        return;
    }

    console.log(`[Startup Optimization] Running one-time connectivity repair for ${mode} mode...`);

    try {
        if (mode === 'outlet') {
            startMdnsDiscovery();
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        const businessSetup = await readJsonFile('business-setup.json').then(data => (Array.isArray(data) ? data[0] : data)) || {};
        const approvedOutlets = await readJsonFile('approved-outlets.json');
        let changed = false;

        const optimizedSetup = {
            ...businessSetup
        };

        if (mode && optimizedSetup.mode !== mode) {
            optimizedSetup.mode = mode;
            changed = true;
        }

        if (mode === 'outlet') {
            const currentApiUrl = normalizedLocalCandidate(optimizedSetup.apiUrl) || normalizedLocalCandidate(optimizedSetup.backOfficeUrl);
            const healthyServerBaseUrl = await resolveHealthyLocalServerBaseUrl(currentApiUrl);
            if (healthyServerBaseUrl && optimizedSetup.apiUrl !== healthyServerBaseUrl) {
                optimizedSetup.apiUrl = healthyServerBaseUrl;
                changed = true;
            }

            if (optimizedSetup.backOfficeUrl && !String(optimizedSetup.backOfficeUrl).toLowerCase().startsWith('http')) {
                delete optimizedSetup.backOfficeUrl;
                changed = true;
            }
        } else {
            const localServerUrl = `http://${getLocalIpAddress()}:${runtimeApiPort}`;
            if (optimizedSetup.apiUrl !== localServerUrl) {
                optimizedSetup.apiUrl = localServerUrl;
                changed = true;
            }
        }

        if (optimizedSetup.status === 'approved' && optimizedSetup.outletId) {
            optimizedSetup.lastConnectivityOptimizationAt = new Date().toISOString();
            changed = true;
        }

        if (changed) {
            await writeJsonFile('business-setup.json', optimizedSetup);
        }

        if (Array.isArray(approvedOutlets) && approvedOutlets.length > 0) {
            let outletsChanged = false;
            const repairedOutlets = approvedOutlets.map((outlet) => {
                if (!outlet || typeof outlet !== 'object') return outlet;
                const currentStock = outlet.currentStock || outlet.initialStock || {};
                const nextOutlet = {
                    ...outlet,
                    currentStock,
                    initialStock: outlet.initialStock || currentStock,
                    lastSeen: outlet.lastSeen || new Date().toISOString()
                };
                if (JSON.stringify(nextOutlet) !== JSON.stringify(outlet)) {
                    outletsChanged = true;
                }
                return nextOutlet;
            });

            if (outletsChanged) {
                await writeJsonFile('approved-outlets.json', repairedOutlets);
            }
        }

        store.set(storeKey, STARTUP_CONNECTIVITY_OPTIMIZATION_VERSION);
        console.log(`[Startup Optimization] Connectivity repair completed for ${mode} mode.`);
    } catch (error) {
        console.error('[Startup Optimization] Failed:', error);
    }
}

function normalizedLocalCandidate(rawUrl) {
    if (!rawUrl) return '';
    const normalized = String(rawUrl).trim().replace(/\/$/, '').replace(/\/api$/, '');
    if (!normalized) return '';
    try {
        const parsed = new URL(normalized);
        const localIp = getLocalIpAddress();
        if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === localIp) {
            return normalized;
        }
        return normalized;
    } catch {
        return '';
    }
}

/**
 * Ensures that the necessary application directories exist.
 * Creates 'data' and 'assets/product_images' directories in the user data path.
 */
async function ensureAppDirs() {
  try {
    if (process.platform === 'win32') {
        await fs.mkdir(logBasePath, { recursive: true });
    }
    await fs.mkdir(userDataPath, { recursive: true });
    await fs.mkdir(productImagesPath, { recursive: true });
  } catch (error) {
    console.error('Failed to create application directories:', error);
    // Explicitly fallback if permissions to C:\ProgramData\whiz-pos fail
    if (process.platform === 'win32') {
        console.warn('Falling back to user AppData due to permission error.');
        // This is tricky to handle globally post-init, but for resilience, logging it.
    }
  }
}

/**
 * Helper to safely read from SQLite wrapper
 */
async function readJsonFile(filename) {
    try {
        const data = await readJsonFileFallback(filename);
        if (!data) return [];
        return data;
    } catch (e) {
        return [];
    }
}

/**
 * Helper to safely write to SQLite wrapper
 */
async function writeJsonFile(filename, data) {
    await writeJsonFileFallback(filename, data);
    await broadcastDataChange(filename, data);
}

function normalizeFilePayload(filename, data) {
    if (filename === 'business-setup.json') {
        return Array.isArray(data) ? data[0] : data;
    }
    return data;
}

function extractTransactionProductId(item) {
    if (!item || typeof item !== 'object') return null;
    const productCandidates = [
        item.product?.id,
        item.product?.productId,
        item.productId,
        item.product_id,
        item.id
    ];

    for (const candidate of productCandidates) {
        if (candidate !== undefined && candidate !== null && String(candidate).trim() !== '') {
            return String(candidate);
        }
    }

    return null;
}

function extractTransactionQuantity(item) {
    if (!item || typeof item !== 'object') return 0;
    const quantityCandidates = [item.quantity, item.qty, item.count];
    for (const candidate of quantityCandidates) {
        const numeric = Number(candidate);
        if (Number.isFinite(numeric) && numeric > 0) {
            return numeric;
        }
    }
    return 0;
}

function resolveOutletProductStock(outlet, product) {
    const stockMap = outlet?.currentStock || outlet?.initialStock || {};
    const productId = String(product?.id ?? product?.productId ?? '');
    // Try both id and productId to match!
    const possibleIds = [
        productId,
        String(product?.id ?? ''),
        String(product?.productId ?? '')
    ].filter(id => id.trim() !== '');
    
    console.log('[resolveOutletProductStock] Checking product:', product.name, possibleIds, 'against stockMap keys:', Object.keys(stockMap));
    
    for (const id of possibleIds) {
        if (typeof stockMap[id] !== 'undefined') {
            const mappedStock = Number(stockMap[id]);
            if (Number.isFinite(mappedStock)) {
                console.log('[resolveOutletProductStock] Found match for', product.name, 'at', id, 'stock:', mappedStock);
                return mappedStock;
            }
        }
    }

    const liveStock = Number(product?.stock);
    console.log('[resolveOutletProductStock] No match, using live stock:', liveStock, 'for product', product.name);
    return Number.isFinite(liveStock) ? liveStock : 0;
}

async function applyOutletTransactionStockDelta(outletId, transactions = []) {
    const outlet = global.outletsMap.get(outletId);
    if (!outlet || !Array.isArray(transactions) || transactions.length === 0) {
        return { success: false, updated: false };
    }

    const stockState = { ...(outlet.currentStock || outlet.initialStock || {}) };
    let hasChanges = false;
    const movementRecords = [];

    for (const transaction of transactions) {
        const items = Array.isArray(transaction?.items) ? transaction.items : [];
        for (const item of items) {
            const productId = extractTransactionProductId(item);
            const quantity = extractTransactionQuantity(item);
            if (!productId || quantity <= 0) continue;

            const currentStock = Number(stockState[productId] ?? 0);
            const nextStock = Math.max(0, currentStock - quantity);
            if (nextStock !== currentStock) {
                stockState[productId] = nextStock;
                hasChanges = true;
            }

            movementRecords.unshift({
                id: `SM${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
                type: 'outlet_sale',
                productId,
                quantity,
                fromLocation: outletId,
                toLocation: 'customer',
                referenceId: transaction?.id || null,
                outletId,
                notes: `Outlet sale synced for ${outlet.name}`,
                createdAt: transaction?.timestamp || new Date().toISOString(),
                createdBy: 'outlet'
            });
        }
    }

    if (!hasChanges) {
        return { success: true, updated: false };
    }

    const updatedOutlet = {
        ...outlet,
        initialStock: stockState,
        currentStock: stockState,
        lastSync: new Date().toISOString(),
        lastSeen: outlet.lastSeen || new Date().toISOString()
    };

    global.outletsMap.set(outletId, updatedOutlet);

    try {
        const existingMovements = await readJsonFile('stock-movements.json');
        await writeJsonFile('stock-movements.json', [...movementRecords, ...(existingMovements || [])]);
    } catch (error) {
        console.error('[Outlet Stock Delta] Failed to record stock movements:', error);
    }

    await writeJsonFile('approved-outlets.json', Array.from(global.outletsMap.values()));
    await broadcastOutletSnapshot(outletId);

    return { success: true, updated: true };
}

async function buildOutletSnapshot(outletId) {
    const outlet = global.outletsMap.get(outletId);
    if (!outlet) return null;

    const [allProducts, allUsers, businessSetup, categories, creditCustomers, expenses, suppliers] = await Promise.all([
        readJsonFile('products.json'),
        readJsonFile('users.json'),
        readJsonFile('business-setup.json').then(d => Array.isArray(d) ? d[0] : d),
        readJsonFile('categories.json'),
        readJsonFile('credit-customers.json'),
        readJsonFile('expenses.json'),
        readJsonFile('suppliers.json')
    ]);

    const assignedProductIds = new Set(outlet.assignedProductIds || []);
    const assignedUserIds = new Set(outlet.assignedUserIds || []);
    const initialStock = outlet.initialStock || {};
    const currentStock = outlet.currentStock || initialStock;

    const products = (allProducts || [])
        .filter(p => assignedProductIds.size === 0 || assignedProductIds.has(String(p.id)) || assignedProductIds.has(String(p.productId)))
        .map(p => ({
            ...p,
            stock: resolveOutletProductStock(outlet, p)
        }));

    const users = (allUsers || []).filter(u =>
        assignedUserIds.size === 0 || assignedUserIds.has(String(u.id)) || assignedUserIds.has(String(u.userId))
    );

    return {
        products,
        users,
        categories: categories || [],
        businessSetup: {
            ...businessSetup,
            apiKey: global.apiKey
        },
        creditCustomers: creditCustomers || [],
        expenses: expenses || [],
        suppliers: suppliers || [],
        assignments: {
            productIds: Array.from(assignedProductIds),
            userIds: Array.from(assignedUserIds),
            initialStock,
            currentStock
        },
        apiKey: global.apiKey,
        assignedProductIds: Array.from(assignedProductIds),
        assignedUserIds: Array.from(assignedUserIds),
        initialStock,
        currentStock
    };
}

function broadcastRealtimeMessage(message, targetOutletId = null) {
    if (!realtimeWss) return;
    const payload = JSON.stringify(message);

    for (const client of realtimeWss.clients) {
        if (client.readyState !== 1) continue;
        const meta = global.realtimeOutletsMap.get(client);
        if (targetOutletId && meta?.outletId !== targetOutletId) continue;
        client.send(payload);
    }
}

async function broadcastDataChange(filename, data) {
    if (!realtimeWss) return;
    const normalizedData = normalizeFilePayload(filename, data);
    broadcastRealtimeMessage({
        type: 'sync-event',
        filename,
        data: normalizedData,
        timestamp: new Date().toISOString()
    });
}

async function sendSnapshotToOutlet(client, outletId, lastSyncAt = null) {
    const snapshot = await buildOutletSnapshot(outletId);
    if (!snapshot) return;

    client.send(JSON.stringify({
        type: 'sync-snapshot',
        outletId,
        lastSyncAt,
        data: snapshot,
        timestamp: new Date().toISOString()
    }));
}

async function broadcastOutletSnapshot(outletId) {
    const snapshot = await buildOutletSnapshot(outletId);
    if (!snapshot) return;
    broadcastRealtimeMessage({
        type: 'sync-snapshot',
        outletId,
        lastSyncAt: new Date().toISOString(),
        data: snapshot,
        timestamp: new Date().toISOString()
    }, outletId);
}

function startRealtimeWebSocketServer(httpServer) {
    if (realtimeWss) return;

    realtimeWss = new WebSocketServer({ server: httpServer, path: '/ws' });

    realtimeWss.on('connection', (socket) => {
        const meta = {
            outletId: null,
            lastHeartbeat: Date.now(),
            lastSyncAt: null
        };

        global.realtimeOutletsMap.set(socket, meta);

        socket.on('message', async (raw) => {
            try {
                const message = JSON.parse(String(raw));

                if (message.type === 'hello') {
                    meta.outletId = message.outletId || null;
                    meta.lastSyncAt = message.lastSyncAt || null;
                    meta.lastHeartbeat = Date.now();
                    if (meta.outletId && global.outletsMap.has(meta.outletId)) {
                        const outlet = global.outletsMap.get(meta.outletId);
                        global.outletsMap.set(meta.outletId, {
                            ...outlet,
                            lastSeen: new Date().toISOString()
                        });
                        writeJsonFile('approved-outlets.json', Array.from(global.outletsMap.values())).catch(() => {});
                    }
                    await sendSnapshotToOutlet(socket, meta.outletId, meta.lastSyncAt);
                    return;
                }

                if (message.type === 'heartbeat') {
                    meta.lastHeartbeat = Date.now();
                    if (meta.outletId && global.outletsMap.has(meta.outletId)) {
                        const outlet = global.outletsMap.get(meta.outletId);
                        global.outletsMap.set(meta.outletId, {
                            ...outlet,
                            lastSeen: new Date().toISOString()
                        });
                        writeJsonFile('approved-outlets.json', Array.from(global.outletsMap.values())).catch(() => {});
                    }
                    socket.send(JSON.stringify({
                        type: 'heartbeat',
                        at: new Date().toISOString()
                    }));
                    return;
                }

                if (message.type === 'heartbeat-ack') {
                    meta.lastHeartbeat = Date.now();
                    if (meta.outletId && global.outletsMap.has(meta.outletId)) {
                        const outlet = global.outletsMap.get(meta.outletId);
                        global.outletsMap.set(meta.outletId, {
                            ...outlet,
                            lastSeen: new Date().toISOString()
                        });
                        writeJsonFile('approved-outlets.json', Array.from(global.outletsMap.values())).catch(() => {});
                    }
                    return;
                }

                if (message.type === 'sync-operations') {
                    meta.lastSyncAt = message.lastSyncAt || meta.lastSyncAt;
                    const ops = Array.isArray(message.operations) ? message.operations : [];
                    if (ops.length === 0) {
                        socket.send(JSON.stringify({ type: 'sync-ack', batchId: message.batchId || null, success: true }));
                        return;
                    }

                    const response = await fetch(`http://127.0.0.1:${runtimeApiPort}/api/sync`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            outletId: message.outletId || null,
                            operations: ops
                        })
                    });

                    if (!response.ok) {
                        const text = await response.text();
                        socket.send(JSON.stringify({
                            type: 'sync-error',
                            batchId: message.batchId || null,
                            error: text || `Sync failed with status ${response.status}`
                        }));
                        return;
                    }

                    socket.send(JSON.stringify({
                        type: 'sync-ack',
                        batchId: message.batchId || null,
                        success: true
                    }));
                }
            } catch (error) {
                socket.send(JSON.stringify({
                    type: 'sync-error',
                    error: error.message || 'Realtime sync failure'
                }));
            }
        });

        socket.on('close', () => {
            global.realtimeOutletsMap.delete(socket);
        });

        socket.on('error', () => {
            global.realtimeOutletsMap.delete(socket);
        });
    });

    setInterval(() => {
        if (!realtimeWss) return;
        const now = Date.now();
        for (const socket of realtimeWss.clients) {
            if (socket.readyState !== 1) continue;
            const meta = global.realtimeOutletsMap.get(socket);
            if (!meta) continue;

            if (now - meta.lastHeartbeat > 10000) {
                socket.close();
                continue;
            }

            socket.send(JSON.stringify({
                type: 'heartbeat',
                at: new Date().toISOString()
            }));
        }
    }, 5000);

    console.log('Realtime WebSocket server started');
}

/**
 * Ensures that the initial data exists in the SQLite database.
 */
async function ensureDataFilesExist() {
  const dataFiles = {
    'business-setup.json': { isSetup: false },
    'server-config.json': { apiKey: null }, // Persist API Key
    'users.json': [],
    'products.json': [],
    'transactions.json': [],
    'expenses.json': [],
    'salaries.json': [], // New file for salaries
    'credit-customers.json': [],
    'mobile-receipts.json': [], // New file for queuing mobile receipts
    'credit-payments.json': [], // New file for credit payments
    'inventory-logs.json': [], // New file for inventory logs
    'daily-summaries.json': {}, // New file for archived daily reports
    'sessions.json': [],
    'suppliers.json': [],
    'loyalty-customers.json': [],
    'documents.json': [],
    'categories.json': [],
    'approved-outlets.json': [],
    'pending-outlets.json': [],
    'rejected-outlets.json': [],
    'sync-queue.json': []
  };

  for (const [fileName, content] of Object.entries(dataFiles)) {
      try {
          const currentData = await readJsonFileFallback(fileName);
          if ((Array.isArray(currentData) && currentData.length === 0) || (!Array.isArray(currentData) && Object.keys(currentData || {}).length === 0)) {
              if (content !== null) {
                  await writeJsonFileFallback(fileName, content);
              }
          }
      } catch (e) {
          console.error(`Error ensuring data for ${fileName}:`, e);
      }
  }
}

/**
 * Loads a URL into a BrowserWindow with retry logic.
 * Useful for development when the Vite server might not be ready immediately.
 *
 * @param {BrowserWindow} win - The window to load the URL into.
 * @param {string} url - The URL to load.
 */
const loadUrlWithRetries = (win, url) => {
  win.loadURL(url).catch(() => {
    console.log('Vite server not ready, retrying in 2 seconds...');
    setTimeout(() => {
      loadUrlWithRetries(win, url);
    }, 2000);
  });
};

/**
 * Creates the main application window.
 * Configures size, preferences, and loads the application content.
 */
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Don't show until maximized
    icon: path.join(__dirname, 'assets', 'logo.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // contextIsolation is true by default and is a security best practice.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false, // Temporarily for dev, can be adjusted
    },
  });

  // Disable caching in the main window to avoid permission issues
  mainWindow.webContents.session.clearCache();
  mainWindow.webContents.session.clearStorageData();

  // Remove the default menu bar
  mainWindow.setMenu(null);
  mainWindow.maximize();
  mainWindow.show();

  // In development, load from the Vite dev server
  if (!app.isPackaged) {
    const devPort = process.env.PORT || process.env.WHIZ_POS_VITE_PORT || '5174';
    const url = process.argv[2] || `http://localhost:${devPort}`;
    loadUrlWithRetries(mainWindow, url);
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the static build
    mainWindow.loadURL('file://' + path.join(__dirname, 'dist/index.html'));
  }
}

// Enable remote debugging for Playwright
app.commandLine.appendSwitch('remote-debugging-port', '9222');

// Global API Key variable
let apiKey = null;
let server = null;
let realtimeWss = null;
global.connectedDevicesMap = new Map();
global.outletsMap = new Map(); // Store approved outlets
global.pendingOutletsMap = new Map(); // Store outlets waiting for approval
global.rejectedOutletsMap = new Map(); // Store rejected outlets with reasons
global.realtimeOutletsMap = new Map();

// --- NEW BACKEND IMPLEMENTATION: Session & User Management ---

class SessionManager {
    constructor() {
        this.sessions = new Map(); // Token -> { user, deviceId, expiresAt }
        this.loadSessions();
    }

    async loadSessions() {
        const sessions = await readJsonFile('sessions.json');
        if (Array.isArray(sessions)) {
            sessions.forEach(s => {
                // Restore if valid (e.g., less than 7 days old)
                const createdAt = new Date(s.createdAt);
                const now = new Date();
                const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);
                if (diffDays < 7) {
                    this.sessions.set(s.token, { ...s, lastActive: new Date(s.lastActive) });
                }
            });
            console.log(`Restored ${this.sessions.size} sessions.`);
        }
    }

    async saveSessions() {
        const sessionsArray = Array.from(this.sessions.entries()).map(([token, data]) => ({ token, ...data }));
        await writeJsonFile('sessions.json', sessionsArray);
    }

    createSession(user, deviceId) {
        const token = crypto.randomUUID();
        // Session valid for 24 hours, but we can make it indefinite if needed
        // Requirement: "unique session token per device"
        this.sessions.set(token, {
            user: { ...user }, // Store copy of user data
            deviceId,
            createdAt: new Date(),
            lastActive: new Date()
        });
        this.saveSessions();
        return token;
    }

    validateSession(token) {
        if (!this.sessions.has(token)) return null;
        const session = this.sessions.get(token);
        session.lastActive = new Date(); // Update activity
        // Optimize: Don't save on every read, maybe debounce or periodic save?
        // For strict persistence, let's just save.
        // this.saveSessions();
        return session.user;
    }

    invalidateSession(token) {
        this.sessions.delete(token);
        this.saveSessions();
    }

    invalidateSessionsForUser(userId) {
        // Optional: If we wanted to force logout everywhere.
        // But prompt says: "Logging in on one device must not log out users on another"
        // So we do NOT implement this for normal login.
        // But maybe for 'Disable User'? Yes.
        for (const [token, session] of this.sessions.entries()) {
            // Strict ID check
            if (session.user.id === userId || session.user.userId === userId) {
                this.sessions.delete(token);
            }
        }
        this.saveSessions();
    }
}

const sessionManager = new SessionManager();

function hasServerAccess(user) {
    return !!user && (user.role === 'admin' || user.role === 'manager');
}

function enforceLoginScope(user, scope) {
    if (scope === 'server' && !hasServerAccess(user)) {
        return { success: false, error: 'Access denied. Server access requires Manager or Admin privileges.' };
    }
    return { success: true };
}

// --- User Management Logic (Strict) ---

const UserManager = {
    async authenticate(userId, pin) {
        const users = await readJsonFile('users.json');
        const user = users.find(u => (u.id === userId || u.userId === userId));

        if (!user) return { success: false, error: 'User not found' };
        if (!user.isActive) return { success: false, error: 'User is disabled' };

        // Strict PIN check
        if (String(user.pin) === String(pin)) {
            // Success
            return { success: true, user };
        }
        return { success: false, error: 'Invalid PIN' };
    },

    async addUser(userData) {
        try {
            console.log(`[UserManager] Adding user: ${userData.name}`);
            const users = await readJsonFile('users.json');

            // Check for duplicates
            if (users.some(u => u.name.toLowerCase() === userData.name.toLowerCase())) {
                throw new Error('User with this name already exists');
            }

            const newUser = {
                id: userData.id || `USER${Date.now()}`,
                userId: userData.id || `USER${Date.now()}`, // Ensure compatibility
                ...userData,
                isActive: true, // Default to active
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            users.push(newUser);
            await writeJsonFile('users.json', users);
            console.log(`[UserManager] User added successfully: ${newUser.id}`);
            return newUser;
        } catch (e) {
            console.error(`[UserManager] Add failed: ${e.message}`);
            throw e;
        }
    },

    async updateUser(userId, updates) {
        try {
            console.log(`[UserManager] Updating user: ${userId}`);
            const users = await readJsonFile('users.json');
            const index = users.findIndex(u => (u.id === userId || u.userId === userId));

            if (index === -1) throw new Error('User not found');

            const updatedUser = {
                ...users[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            users[index] = updatedUser;

            await writeJsonFile('users.json', users);
            console.log(`[UserManager] User updated successfully: ${userId}`);

            // If user is disabled, kill their sessions
            if (updates.isActive === false) {
                console.log(`[UserManager] Invalidating sessions for disabled user: ${userId}`);
                sessionManager.invalidateSessionsForUser(userId);
            }

            return updatedUser;
        } catch (e) {
            console.error(`[UserManager] Update failed: ${e.message}`);
            throw e;
        }
    },

    async deleteUser(userId) {
        const users = await readJsonFile('users.json');
        const filteredUsers = users.filter(u => (u.id !== userId && u.userId !== userId));

        if (users.length === filteredUsers.length) throw new Error('User not found');

        await writeJsonFile('users.json', filteredUsers);

        // Kill sessions
        sessionManager.invalidateSessionsForUser(userId);

        return true;
    }
};

/**
 * Initialize API Key from storage or create if missing
 */
async function initApiKey() {
    try {
        const configPath = path.join(userDataPath, 'server-config.json');
        let config = {};
        try {
            const data = await fs.readFile(configPath, 'utf-8');
            config = JSON.parse(data);
        } catch (e) {
            // Config might not exist yet
        }

        if (config.apiKey) {
            apiKey = config.apiKey;
        } else {
            apiKey = crypto.randomBytes(32).toString('hex');
            config.apiKey = apiKey;
            await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        }
        console.log('Server API Key initialized');
    } catch (e) {
        console.error('Failed to init API Key', e);
        apiKey = crypto.randomBytes(32).toString('hex'); // Fallback to memory
    }
}


let mdnServerService = null;
const discoveredServers = new Map();

function startMdnsBroadcast() {
    try {
        mdnServerService = bonjour.publish({
            name: `Whiz POS Server (${os.hostname()})`,
            type: 'whizpos',
            protocol: 'tcp',
            port: runtimeApiPort,
            txt: {
                ip: getLocalIpAddress(),
                name: 'Main Server'
            }
        });
        
        console.log('mDNS server advertisement started');
    } catch (e) {
        console.log('mDNS broadcast initialization failed - continuing without discovery', e);
    }
}

function startMdnsDiscovery() {
    try {
        const browser = bonjour.find({ type: 'whizpos', protocol: 'tcp' }, (service) => {
            const ip = service.txt?.ip || service.addresses?.[0] || service.host;
            const serverInfo = {
                type: 'WHIZ_POS_SERVER',
                name: service.txt?.name || service.name || 'Main Server',
                ip: ip,
                port: service.port,
                lastSeen: Date.now()
            };
            
            discoveredServers.set(ip, serverInfo);
            const mainWindow = BrowserWindow.getAllWindows()[0];
            if (mainWindow) {
                mainWindow.webContents.send('discovered-servers', Array.from(discoveredServers.values()));
            }
        });

        browser.on('up', (service) => {
            const ip = service.txt?.ip || service.addresses?.[0] || service.host;
            const serverInfo = {
                type: 'WHIZ_POS_SERVER',
                name: service.txt?.name || service.name || 'Main Server',
                ip: ip,
                port: service.port,
                lastSeen: Date.now()
            };
            
            discoveredServers.set(ip, serverInfo);
            const mainWindow = BrowserWindow.getAllWindows()[0];
            if (mainWindow) {
                mainWindow.webContents.send('discovered-servers', Array.from(discoveredServers.values()));
            }
        });

        browser.on('down', (service) => {
            const ip = service.txt?.ip || service.addresses?.[0] || service.host;
            if (discoveredServers.delete(ip)) {
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                    mainWindow.webContents.send('discovered-servers', Array.from(discoveredServers.values()));
                }
            }
        });

        console.log('mDNS discovery started');
    } catch (e) {
        console.log('mDNS discovery initialization failed - continuing without discovery', e);
    }
}

/**
 * Gets the local IPv4 address of the machine.
 * Used for generating the connection URL for the mobile app.
 *
 * @returns {string} The local IP address.
 */
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

/**
 * Starts the local Express API server.
 * This server allows the Mobile App to send print jobs to the Desktop App.
 */
function startApiServer() {
    const apiApp = express();

    // Increase body limit to support large sync payloads
    apiApp.use(express.json({ limit: '50mb' }));
    apiApp.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Enable CORS for all routes, allowing specific headers for mobile sync
    apiApp.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-KEY', 'X-DEVICE-NAME'],
    }));

    // Serve product images statically
    apiApp.use('/assets', express.static(productImagesPath));

    // Middleware to track connected devices
    apiApp.use((req, res, next) => {
        const deviceName = req.headers['x-device-name'] || req.headers['user-agent'] || 'Unknown Device';
        const ip = req.ip.replace('::ffff:', ''); // Clean IPv6 prefix

        // Update device last seen
        if (global.connectedDevicesMap) {
            global.connectedDevicesMap.set(ip, {
                ip,
                name: deviceName,
                lastSeen: new Date().toISOString()
            });
        }

        next();
    });

    // Modified Auth Middleware to support Session Tokens AND API Keys
    const authMiddleware = (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const xApiKey = req.headers['x-api-key'];

        // 1. Check Session Token (Bearer)
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            // Check if it's the static API Key (Legacy/Mobile simple auth)
            if (token === apiKey) {
                return next();
            }
            // Check Session Manager
            const user = sessionManager.validateSession(token);
            if (user) {
                req.user = user; // Attach user to request
                return next();
            }
        }

        // 2. Check X-API-KEY (Legacy/Mobile)
        if (xApiKey && xApiKey === apiKey) {
            return next();
        }

        return res.status(401).json({ error: 'Unauthorized' });
    };

    // --- NEW AUTH ENDPOINTS ---

    // POST /api/auth/login
    apiApp.post('/api/auth/login', async (req, res) => {
        const { userId, pin, deviceId, scope } = req.body;

        if (!userId || !pin) return res.status(400).json({ error: 'Missing credentials' });

        try {
            const result = await UserManager.authenticate(userId, pin);

            if (!result.success) {
                return res.status(401).json({ error: result.error });
            }

            const scopeCheck = enforceLoginScope(result.user, scope);
            if (!scopeCheck.success) {
                return res.status(403).json({ error: scopeCheck.error });
            }

            const token = sessionManager.createSession(result.user, deviceId || 'unknown-device');
            res.json({
                success: true,
                token,
                user: result.user
            });
        } catch (e) {
            console.error('Login Error:', e);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // POST /api/auth/logout
    apiApp.post('/api/auth/logout', (req, res) => {
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            sessionManager.invalidateSession(token);
        }
        res.json({ success: true });
    });

    // POST /api/auth/verify
    apiApp.post('/api/auth/verify', (req, res) => {
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const user = sessionManager.validateSession(token);
            if (user) {
                return res.json({ success: true, user });
            }
        }
        res.status(401).json({ success: false, error: 'Invalid or expired session' });
    });


    // Public Status Endpoint for Connectivity Check
    // IMPORTANT: Defined before other routes to ensure availability
    apiApp.get('/api/status', (req, res) => {
        console.log(`[API] Status check received from ${req.ip}`);
        res.json({ status: 'ok', message: 'Whiz POS Server Online' });
    });

    apiApp.get('/', (req, res) => {
        console.log(`[API] Root accessed from ${req.ip}`);
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Whiz POS Server</title>
                <style>
                    body { background: #0f172a; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .container { text-align: center; padding: 2rem; border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; background: rgba(255,255,255,0.05); }
                    h1 { color: #38bdf8; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Whiz POS Server</h1>
                    <p>Status: Online</p>
                    <p><small>Checking connections...</small></p>
                </div>
            </body>
            </html>
        `);
    });

    apiApp.get('/api/config', (req, res) => {
      // apiKey is now managed by initApiKey, but fallback if still null
      if (!apiKey) apiKey = crypto.randomBytes(32).toString('hex');

      const ipAddress = getLocalIpAddress();
      const address = server ? server.address() : null;
      const port = (address && typeof address === 'object' && address.port) ? address.port : runtimeApiPort;
      res.json({ apiKey, apiUrl: `http://${ipAddress}:${port}` });
    });

    apiApp.get('/api/heartbeat', (req, res) => {
        res.json({
            success: true,
            status: 'ok',
            timestamp: new Date().toISOString(),
            mode: process.env.WHIZ_POS_MODE || 'server'
        });
    });

    // GET /api/products - Legacy endpoint
    apiApp.get('/api/products', authMiddleware, async (req, res) => {
        const products = await readJsonFile('products.json');
        res.json(products);
    });

    // GET /api/users - For Mobile Login
    apiApp.get('/api/users', authMiddleware, async (req, res) => {
        const users = await readJsonFile('users.json');
        res.json(users);
    });

    // GET /api/sync - Full state for Mobile Pull
    apiApp.get('/api/sync', authMiddleware, async (req, res) => {
        try {
            const [products, users, expenses, salaries, creditCustomers, businessSetup, transactions] = await Promise.all([
                readJsonFile('products.json'),
                readJsonFile('users.json'),
                readJsonFile('expenses.json'),
                readJsonFile('salaries.json'),
                readJsonFile('credit-customers.json'),
                readJsonFile('business-setup.json').then(d => Array.isArray(d) ? d[0] : d), // Handle potential array wrapper
                readJsonFile('transactions.json')
            ]);

            // Filter transactions? Mobile might not need ALL history.
            // But for now, sending last 1000 might be safer to avoid huge payloads.
            // posStore handles partial updates.
            const limitedTransactions = Array.isArray(transactions) ? transactions.slice(0, 1000) : [];

            // Rewrite image URLs to be accessible via HTTP
            const ipAddress = getLocalIpAddress();
            const address = server ? server.address() : null;
            const port = (address && typeof address === 'object' && address.port) ? address.port : runtimeApiPort;
            const baseUrl = `http://${ipAddress}:${port}`;

            const productsWithUrls = products.map(p => {
                if (p.localImage && !p.image.startsWith('http')) {
                    // Assuming localImage is absolute path, we need to extract filename
                    const filename = path.basename(p.localImage);
                    return { ...p, image: `${baseUrl}/assets/${filename}` };
                }
                return p;
            });

            res.json({
                products: productsWithUrls,
                users,
                expenses,
                salaries,
                creditCustomers,
                businessSetup,
                transactions: limitedTransactions
            });
        } catch (error) {
            console.error('Sync GET error:', error);
            res.status(500).json({ error: 'Sync failed' });
        }
    });

    // POST /api/sync - Handle Push Operations
    apiApp.post('/api/sync_push', authMiddleware, async (req, res) => {
        const { type, data } = req.body;

        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
            mainWindow.webContents.send('sync-push-update', { type, data });
        }
        res.json({ success: true });
    });

    apiApp.post('/api/sync', authMiddleware, async (req, res) => {
        const operations = req.body;
        // Support wrapping operations in an object { operations: [] } or just array
        const ops = Array.isArray(operations) ? operations : operations.operations;
        const outletId = !Array.isArray(operations) && operations?.outletId ? String(operations.outletId) : null;

        if (!Array.isArray(ops)) {
            return res.status(400).json({ error: 'Invalid payload' });
        }

        try {
            // Process operations sequentially
            for (const op of ops) {
                const { type, data } = op;

                if (type === 'new-transaction' || type === 'transaction') { // Handle both type names
                    const transactions = await readJsonFile('transactions.json');
                    // Check for duplicate transaction ID
                    const isNewTransaction = !transactions.some(t => t.id === data.id);
                    if (isNewTransaction) {
                        transactions.unshift(data);
                        await writeJsonFile('transactions.json', transactions);
                        if (outletId) {
                            await applyOutletTransactionStockDelta(outletId, [data]);
                        } else if (data?.outletId) {
                            await applyOutletTransactionStockDelta(String(data.outletId), [data]);
                        }
                    }

                } else if (type === 'add-credit-customer') {
                    const customers = await readJsonFile('credit-customers.json');
                    customers.push(data);
                    await writeJsonFile('credit-customers.json', customers);

                } else if (type === 'update-credit-customer') {
                    const customers = await readJsonFile('credit-customers.json');
                    const idx = customers.findIndex(c => c.id === data.id);
                    if (idx !== -1) {
                        customers[idx] = { ...customers[idx], ...data.updates };
                        await writeJsonFile('credit-customers.json', customers);
                    }

                } else if (type === 'add-expense') {
                    const expenses = await readJsonFile('expenses.json');
                    // Ensure cashier field is set if present (Back-Office logic parity)
                    if (data.cashier && !data.recordedBy) {
                        data.recordedBy = data.cashier;
                    }
                    expenses.unshift(data);
                    await writeJsonFile('expenses.json', expenses);

                } else if (type === 'add-salary') {
                    const salaries = await readJsonFile('salaries.json');
                    salaries.unshift(data);
                    await writeJsonFile('salaries.json', salaries);

                } else if (type === 'delete-salary') {
                    const salaries = await readJsonFile('salaries.json');
                    const newSalaries = salaries.filter(s => s.id !== data.id);
                    await writeJsonFile('salaries.json', newSalaries);

                } else if (type === 'add-product') {
                    const products = await readJsonFile('products.json');
                    // Check for duplicate
                    const exists = products.find(p => p.productId === data.id || p.productId === data.productId);
                    if (!exists) {
                        const newProduct = { ...data, productId: data.id || data.productId };
                        delete newProduct.id;
                        products.push(newProduct);
                        await writeJsonFile('products.json', products);
                    }

                } else if (type === 'update-product') {
                    const products = await readJsonFile('products.json');
                    const prodId = data.id || data.productId;
                    const idx = products.findIndex(p => p.productId === prodId);
                    if (idx !== -1) {
                        const updates = data.updates || data; // Handle both wrapper and direct updates
                        delete updates.id;
                        products[idx] = { ...products[idx], ...updates };
                        await writeJsonFile('products.json', products);
                    }

                } else if (type === 'delete-product') {
                    const products = await readJsonFile('products.json');
                    const prodId = data.id || data.productId;
                    const newProducts = products.filter(p => p.productId !== prodId);
                    await writeJsonFile('products.json', newProducts);

                } else if (type === 'add-user') {
                    // Use Strict User Manager
                    try {
                        await UserManager.addUser(data);
                    } catch (e) {
                        console.error("Sync Add User Failed", e);
                    }

                } else if (type === 'update-user') {
                     // Use Strict User Manager
                    try {
                        const userId = data.id || data.userId;
                        const updates = data.updates || data;
                        delete updates.id;
                        await UserManager.updateUser(userId, updates);
                    } catch (e) {
                         console.error("Sync Update User Failed", e);
                    }

                } else if (type === 'delete-user') {
                     // Use Strict User Manager
                    try {
                        const userId = data.id || data.userId;
                        await UserManager.deleteUser(userId);
                    } catch (e) {
                         console.error("Sync Delete User Failed", e);
                    }

                } else if (type === 'delete-transaction') {
                    const transactions = await readJsonFile('transactions.json');
                    const newTransactions = transactions.filter(t => t.id !== data.id);
                    await writeJsonFile('transactions.json', newTransactions);

                } else if (type === 'update-business-setup') {
                    const currentSetup = await readJsonFile('business-setup.json');
                    await writeJsonFile('business-setup.json', { ...currentSetup, ...data });
                }
            }

            // Notify Renderer to update state and push to Cloud
            const mainWindow = BrowserWindow.getAllWindows()[0];
            if (mainWindow) {
                mainWindow.webContents.send('mobile-data-sync', ops);
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Sync POST error:', error);
            res.status(500).json({ error: 'Sync processing failed' });
        }
    });

    apiApp.post('/api/transactions', authMiddleware, async (req, res) => {
        const newTransaction = req.body;
        try {
            const transactions = await readJsonFile('transactions.json');
            if (!transactions.some(t => t.id === newTransaction.id)) {
                transactions.unshift(newTransaction);
                await writeJsonFile('transactions.json', transactions);
            }
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Failed to save transaction' });
        }
    });

    apiApp.post('/api/print-receipt', authMiddleware, async (req, res) => {
        const { transaction, businessSetup } = req.body;

        try {
            // Instead of auto-printing, save to mobile-receipts.json
            const receipts = await readJsonFile('mobile-receipts.json');
            const newReceipt = {
                ...transaction,
                _printId: Date.now().toString(), // Unique ID for the print job
                _receivedAt: new Date().toISOString()
            };
            receipts.push(newReceipt);
            await writeJsonFile('mobile-receipts.json', receipts);

            const mainWindow = BrowserWindow.getAllWindows()[0];
            if (mainWindow) {
                // Notify Renderer of new receipt
                mainWindow.webContents.send('new-mobile-receipt', newReceipt);
            }
            res.json({ success: true });
        } catch (e) {
            console.error("Failed to queue mobile receipt", e);
            res.status(500).json({ error: 'Failed to queue receipt' });
        }
    });

    server = apiApp.listen(runtimeApiPort, '0.0.0.0', () => {
        console.log(`API server started on port ${runtimeApiPort}`);
        startRealtimeWebSocketServer(server);
        if (process.env.WHIZ_POS_MODE === 'server') {
            startMdnsBroadcast();
        }
    });

    apiApp.post('/api/register-outlet', async (req, res) => {
        const { outletName, outletId: requestedOutletId, ip, port } = req.body;
        if (!outletName) return res.status(400).json({ error: 'Missing outlet name' });

        const normalizedIp = (ip || req.ip || '').replace('::ffff:', '');
        const businessSetup = await readJsonFile('business-setup.json').then(data => (Array.isArray(data) ? data[0] : data)) || {};
        const businessShortcode = businessSetup.businessShortcode || normalizeBusinessShortcode(businessSetup.businessName || outletName);
        const serverConfig = await readServerConfig();
        const requestedCode = String(requestedOutletId || '').trim().toLowerCase();
        const outletCode = isCanonicalOutletCode(requestedCode, businessShortcode)
            ? requestedCode
            : buildOutletCode(businessShortcode, Number(serverConfig.nextOutletSequence || 1));

        // Duplicate detection by name or IP among approved/pending outlets
        for (const [, existing] of global.outletsMap.entries()) {
            if (existing.name?.toLowerCase() === outletName.toLowerCase() || (normalizedIp && existing.ip === normalizedIp)) {
                const canonicalId = existing.outletCode || existing.id;
                return res.json({
                    status: 'rejected',
                    outletId: canonicalId,
                    reason: `Duplicate outlet detected: "${existing.name}" is already registered at ${existing.ip || 'this network'}.`
                });
            }
        }
        for (const [, existing] of global.pendingOutletsMap.entries()) {
            if (existing.id !== outletCode && (existing.name?.toLowerCase() === outletName.toLowerCase() || (normalizedIp && existing.ip === normalizedIp))) {
                return res.json({
                    status: 'pending',
                    outletId: existing.outletCode || existing.id,
                    reason: 'An outlet with this name or IP is already awaiting approval.'
                });
            }
        }

        // Check if already approved
        const existingApproved = findOutletRecordById(outletCode) || findOutletRecordById(requestedOutletId);
        if (existingApproved) {
            return res.json({ status: 'approved', apiKey, outletId: existingApproved.outletCode || existingApproved.id });
        }

        const existingRejected = findOutletRecordById(requestedOutletId) || findOutletRecordById(outletCode);
        if (existingRejected && existingRejected.status === 'rejected') {
            const rejectedOutlet = existingRejected;
            return res.json({
                status: 'rejected',
                outletId: rejectedOutlet.outletCode || rejectedOutlet.id,
                reason: rejectedOutlet?.reason || 'Rejected by server administrator'
            });
        }

        const registrationId = outletCode;
        const pendingOutlet = {
            id: registrationId,
            outletCode: registrationId,
            legacyOutletIds: requestedOutletId && requestedOutletId !== registrationId ? [requestedOutletId] : [],
            name: outletName,
            ip: normalizedIp,
            port: Number(port) || null,
            businessShortcode,
            status: 'pending',
            createdAt: global.pendingOutletsMap.get(registrationId)?.createdAt || new Date().toISOString(),
            lastSeen: new Date().toISOString()
        };
        global.pendingOutletsMap.set(registrationId, pendingOutlet);
        serverConfig.businessShortcode = businessShortcode;
        serverConfig.nextOutletSequence = Number(serverConfig.nextOutletSequence || 1) + 1;
        await writeServerConfig(serverConfig);
        await writeJsonFile('pending-outlets.json', Array.from(global.pendingOutletsMap.values()));

        console.log(`[Handshake] New outlet registration request: ${outletName} (${registrationId}) from ${normalizedIp}`);

        // Notify renderer
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
            mainWindow.webContents.send('pending-outlets-update', Array.from(global.pendingOutletsMap.values()));
        }

        res.json({ status: 'pending', outletId: registrationId, businessShortcode });
    });

    apiApp.get('/api/outlet-sync/:outletId', async (req, res) => {
        const { outletId } = req.params;
        const outlet = findOutletRecordById(outletId);
        if (!outlet) {
            return res.status(404).json({ error: 'Outlet not found or not approved' });
        }

        try {
            // Update lastSeen when the outlet requests sync
            const canonicalOutletId = outlet.outletCode || outlet.id;
            const updatedOutlet = {
                ...outlet,
                lastSeen: new Date().toISOString()
            };
            global.outletsMap.set(canonicalOutletId, updatedOutlet);
            await writeJsonFile('approved-outlets.json', Array.from(global.outletsMap.values()));

            const [allProducts, allUsers, businessSetup, categories, creditCustomers, expenses] = await Promise.all([
                readJsonFile('products.json'),
                readJsonFile('users.json'),
                readJsonFile('business-setup.json').then(d => Array.isArray(d) ? d[0] : d),
                readJsonFile('categories.json'),
                readJsonFile('credit-customers.json'),
                readJsonFile('expenses.json')
            ]);

            const assignedProductIds = new Set(outlet.assignedProductIds || []);
            const assignedUserIds = new Set(outlet.assignedUserIds || []);
            const initialStock = outlet.initialStock || {};

            console.log('[Outlet sync] Outlet data:', {
                id: outlet.id,
                outletCode: outlet.outletCode,
                initialStock: outlet.initialStock,
                currentStock: outlet.currentStock,
                assignedProductIds: outlet.assignedProductIds
            });
            
            const products = (allProducts || [])
                .filter(p => assignedProductIds.size === 0 || assignedProductIds.has(String(p.id)) || assignedProductIds.has(String(p.productId)))
                .map(p => ({
                    ...p,
                    stock: resolveOutletProductStock(outlet, p)
                }));
                
            console.log('[Outlet sync] Products with stock:', products.map(p => ({ name: p.name, stock: p.stock })));

            const users = (allUsers || []).filter(u =>
                assignedUserIds.size === 0 || assignedUserIds.has(String(u.id)) || assignedUserIds.has(String(u.userId))
            );

            res.json({
                products,
                users,
                categories: categories || [],
                businessSetup: {
                    ...businessSetup,
                    apiKey: global.apiKey,
                    businessShortcode: businessSetup?.businessShortcode || outlet.businessShortcode || normalizeBusinessShortcode(businessSetup?.businessName || '')
                },
                creditCustomers: creditCustomers || [],
                expenses: expenses || [],
                assignments: {
                    productIds: Array.from(assignedProductIds),
                    userIds: Array.from(assignedUserIds),
                    initialStock,
                    currentStock: outlet.currentStock || initialStock
                },
                apiKey: global.apiKey,
                outletId: outlet.outletCode || outlet.id,
                outletCode: outlet.outletCode || outlet.id,
                businessShortcode: outlet.businessShortcode || businessSetup?.businessShortcode || normalizeBusinessShortcode(businessSetup?.businessName || ''),
                assignedProductIds: Array.from(assignedProductIds),
                assignedUserIds: Array.from(assignedUserIds),
                initialStock,
                currentStock: outlet.currentStock || initialStock
            });
        } catch (error) {
            console.error('Outlet sync error:', error);
            res.status(500).json({ error: 'Outlet sync failed' });
        }
    });

    apiApp.post('/api/outlet-sync/:outletId/transactions', async (req, res) => {
        const { outletId } = req.params;
        const outlet = findOutletRecordById(outletId);
        if (!outlet) {
            return res.status(404).json({ error: 'Outlet not found or not approved' });
        }

        try {
            const { transactions, currentStock } = req.body;
            if (!Array.isArray(transactions)) {
                return res.status(400).json({ error: 'Invalid transactions data' });
            }

            const existingTransactions = await readJsonFile('transactions.json');
            const existingIds = new Set(existingTransactions.map((t) => t.id));
            const newTransactions = transactions.filter((t) => !existingIds.has(t.id));
            
            // Always update lastSeen and lastSync, and apply currentStock if provided
            const canonicalOutletId = outlet.outletCode || outlet.id;
            const updatedOutletFromStock = {
                ...outlet,
                currentStock: currentStock && typeof currentStock === 'object' 
                    ? { ...currentStock } 
                    : outlet.currentStock,
                lastSync: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            };
            global.outletsMap.set(canonicalOutletId, updatedOutletFromStock);
            await writeJsonFile('approved-outlets.json', Array.from(global.outletsMap.values()));

            if (newTransactions.length > 0) {
                const updatedTransactions = [...newTransactions, ...existingTransactions];
                await writeJsonFile('transactions.json', updatedTransactions);
                await applyOutletTransactionStockDelta(outletId, newTransactions);
                console.log(`Added ${newTransactions.length} new transactions from outlet ${outletId}`);
            }

            res.json({ success: true, addedCount: newTransactions.length });
        } catch (error) {
            console.error('Outlet transactions sync error:', error);
            res.status(500).json({ error: 'Failed to sync outlet transactions' });
        }
    });

    apiApp.post('/api/outlet-sync/:outletId/stock', async (req, res) => {
        const { outletId } = req.params;
        const outlet = findOutletRecordById(outletId);
        if (!outlet) {
            return res.status(404).json({ error: 'Outlet not found or not approved' });
        }

        try {
            const { currentStock, initialStock } = req.body;
            const canonicalOutletId = outlet.outletCode || outlet.id;
            
            const updatedOutlet = {
                ...outlet,
                currentStock: currentStock ? { ...currentStock } : outlet.currentStock,
                initialStock: initialStock ? { ...initialStock } : outlet.initialStock,
                lastSync: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            };
            global.outletsMap.set(canonicalOutletId, updatedOutlet);
            await writeJsonFile('approved-outlets.json', Array.from(global.outletsMap.values()));
            res.json({ success: true });
        } catch (error) {
            console.error('Outlet stock update error:', error);
            res.status(500).json({ error: 'Failed to update outlet stock' });
        }
    });

    apiApp.post('/api/outlet-sync/:outletId/expenses', async (req, res) => {
        const { outletId } = req.params;
        const outlet = findOutletRecordById(outletId);
        if (!outlet) {
            return res.status(404).json({ error: 'Outlet not found or not approved' });
        }

        try {
            const { expenses } = req.body;
            if (!Array.isArray(expenses)) {
                return res.status(400).json({ error: 'Invalid expenses data' });
            }

            const existingExpenses = await readJsonFile('expenses.json');
            const existingIds = new Set(existingExpenses.map((e) => e.id));
            const newExpenses = expenses.filter((e) => !existingIds.has(e.id));
            
            // Update lastSeen and lastSync
            const canonicalOutletId = outlet.outletCode || outlet.id;
            const updatedOutlet = {
                ...outlet,
                lastSync: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            };
            global.outletsMap.set(canonicalOutletId, updatedOutlet);
            await writeJsonFile('approved-outlets.json', Array.from(global.outletsMap.values()));

            if (newExpenses.length > 0) {
                const updatedExpenses = [...newExpenses, ...existingExpenses];
                await writeJsonFile('expenses.json', updatedExpenses);
                await broadcastDataChange('expenses.json', updatedExpenses);
                console.log(`Added ${newExpenses.length} new expenses from outlet ${outletId}`);
            }

            res.json({ success: true, addedCount: newExpenses.length });
        } catch (error) {
            console.error('Outlet expenses sync error:', error);
            res.status(500).json({ error: 'Failed to sync outlet expenses' });
        }
    });

    apiApp.post('/api/outlet-sync/:outletId/credit-customers', async (req, res) => {
        const { outletId } = req.params;
        const outlet = findOutletRecordById(outletId);
        if (!outlet) {
            return res.status(404).json({ error: 'Outlet not found or not approved' });
        }

        try {
            const { customers } = req.body;
            if (!Array.isArray(customers)) {
                return res.status(400).json({ error: 'Invalid customers data' });
            }

            const existingCustomers = await readJsonFile('credit-customers.json');
            const existingIds = new Set(existingCustomers.map((c) => c.id));
            const newCustomers = customers.filter((c) => !existingIds.has(c.id));
            
            // Update lastSeen and lastSync
            const canonicalOutletId = outlet.outletCode || outlet.id;
            const updatedOutlet = {
                ...outlet,
                lastSync: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            };
            global.outletsMap.set(canonicalOutletId, updatedOutlet);
            await writeJsonFile('approved-outlets.json', Array.from(global.outletsMap.values()));

            if (newCustomers.length > 0) {
                const updatedCustomers = [...newCustomers, ...existingCustomers];
                await writeJsonFile('credit-customers.json', updatedCustomers);
                await broadcastDataChange('credit-customers.json', updatedCustomers);
                console.log(`Added ${newCustomers.length} new customers from outlet ${outletId}`);
            }

            res.json({ success: true, addedCount: newCustomers.length });
        } catch (error) {
            console.error('Outlet customers sync error:', error);
            res.status(500).json({ error: 'Failed to sync outlet customers' });
        }
    });

    apiApp.get('/api/check-approval/:outletId', (req, res) => {
        const { outletId } = req.params;
        const approvedOutlet = findOutletRecordById(outletId);
        if (approvedOutlet && approvedOutlet.status === 'approved') {
            const outlet = approvedOutlet;
            res.json({
                status: 'approved',
                apiKey,
                outletId: outlet.outletCode || outlet.id,
                outletCode: outlet.outletCode || outlet.id,
                businessShortcode: outlet.businessShortcode || DEFAULT_BUSINESS_SHORTCODE,
                assignedProductIds: outlet.assignedProductIds || [],
                assignedUserIds: outlet.assignedUserIds || [],
                initialStock: outlet.initialStock || {},
                currentStock: outlet.currentStock || outlet.initialStock || {}
            });
        } else {
            const rejectedOutlet = findOutletRecordById(outletId);
            if (rejectedOutlet && rejectedOutlet.status === 'rejected') {
                res.json({
                    status: 'rejected',
                    outletId: rejectedOutlet.outletCode || rejectedOutlet.id,
                    reason: rejectedOutlet?.reason || 'Rejected by server administrator'
                });
            } else {
                res.json({ status: 'pending', outletId });
            }
        }
    });

    apiApp.get('/api/backup-raw', authMiddleware, async (req, res) => {
        try {
            const tempPath = path.join(os.tmpdir(), `backup_${Date.now()}.wpos`);
            await backupDB(tempPath);
            res.sendFile(tempPath, async () => {
                try { await fs.unlink(tempPath); } catch (e) {}
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`CRITICAL: Port ${runtimeApiPort} is already in use. The API server could not start. Please close other instances of Whiz POS.`);
            // We can't exit the whole app as the user might want to use it offline, but we should alert
            // For now, logging to console which might be seen in DevTools
        } else {
            console.error('API Server error:', err);
        }
    });
}

app.whenReady().then(async () => {
  await ensureAppDirs();
  try {
      initDB(userDataPath);
      await migrateLegacyData(userDataPath);
  } catch (error) {
      console.error('Fatal: Failed to initialize SQLite database or run migrations:', error);
      dialog.showErrorBox('Database Error', 'Failed to initialize database or migrate legacy data. Check logs for more details. Application will now close to prevent data corruption.');
      app.quit();
      return;
  }
  await ensureDataFilesExist();
  await optimizeData(); // Data Optimization on Startup
  await optimizeBusinessIdentityData(); // Canonical business/outlet identity repair
  await initApiKey(); // Init and persist API Key

  // Load approved outlets
  try {
      const pendingOutlets = await readJsonFile('pending-outlets.json');
      if (Array.isArray(pendingOutlets)) {
          pendingOutlets.forEach(o => global.pendingOutletsMap.set(o.id, o));
      }
  } catch (e) {}

  try {
      const approvedOutlets = await readJsonFile('approved-outlets.json');
      if (Array.isArray(approvedOutlets)) {
          // Deduplicate outlets when loading
          const seen = new Set();
          approvedOutlets.forEach(o => {
              const key = o.outletCode || o.id;
              if (!seen.has(key)) {
                  seen.add(key);
                  global.outletsMap.set(key, o);
              }
          });
          // If we deduplicated, rewrite the file to remove duplicates
          if (seen.size !== approvedOutlets.length) {
              await writeJsonFile('approved-outlets.json', Array.from(global.outletsMap.values()));
          }
      }
  } catch (e) {}

  try {
      const rejectedOutlets = await readJsonFile('rejected-outlets.json');
      if (Array.isArray(rejectedOutlets)) {
          rejectedOutlets.forEach(o => global.rejectedOutletsMap.set(o.id, o));
      }
  } catch (e) {}

  startApiServer();

  // Register a custom protocol to serve images from the assets directory
  protocol.registerFileProtocol('local-asset', (request, callback) => {
    const url = request.url.substr(14); // Remove 'local-asset://'
    const filePath = path.join(productImagesPath, url);
    callback({ path: path.normalize(filePath) });
  });

  createWindow();

  setTimeout(() => {
      runStartupConnectivityOptimization().catch((error) => {
          console.error('[Startup Optimization] Background repair failed:', error);
      });
  }, 1500);

  // --- NEW IPC HANDLERS FOR AUTH & USERS ---

  ipcMain.handle('auth-login', async (event, userId, pin, deviceId, scope = 'outlet') => {
      try {
          const result = await UserManager.authenticate(userId, pin);
          if (result.success) {
              const scopeCheck = enforceLoginScope(result.user, scope);
              if (!scopeCheck.success) {
                  return scopeCheck;
              }
              const token = sessionManager.createSession(result.user, deviceId || 'desktop-main');
              return { success: true, token, user: result.user };
          }
          return { success: false, error: result.error };
      } catch (e) {
          return { success: false, error: e.message };
      }
  });

  ipcMain.handle('auth-logout', async (event, token) => {
      sessionManager.invalidateSession(token);
      return { success: true };
  });

  ipcMain.handle('auth-verify', async (event, token) => {
      const user = sessionManager.validateSession(token);
      return { success: !!user, user };
  });

  ipcMain.handle('user-add', async (event, userData) => {
      try {
          await UserManager.addUser(userData);
          return { success: true };
      } catch (e) {
          return { success: false, error: e.message };
      }
  });

  ipcMain.handle('user-update', async (event, userId, updates) => {
      try {
          await UserManager.updateUser(userId, updates);
          return { success: true };
      } catch (e) {
          return { success: false, error: e.message };
      }
  });

  ipcMain.handle('user-delete', async (event, userId) => {
      try {
          await UserManager.deleteUser(userId);
          return { success: true };
      } catch (e) {
          return { success: false, error: e.message };
      }
  });

  ipcMain.handle('dev-reset', async () => {
      try {
          console.log('[Dev Reset] Triggered. Wiping data and restarting...');

          // Close DB if open
          closeDB();
          store.clear();
          global.outletsMap?.clear?.();

          // Wipe directories
          await fs.rm(baseDataPath, { recursive: true, force: true });

          // Relaunch and quit
          app.relaunch();
          app.exit();
          return { success: true };
      } catch (e) {
          console.error('[Dev Reset] Failed:', e);
          return { success: false, error: e.message };
      }
  });


  /**
   * IPC Handler: 'save-image'
   * Saves an image from a temporary path to the application's persistent storage.
   *
   * @param {Electron.IpcMainInvokeEvent} event
   * @param {string} tempPath - The path to the temporary image file.
   * @returns {Promise<{success: boolean, path?: string, fileName?: string, error?: string}>}
   */
  ipcMain.handle('save-image', async (event, tempPath) => {
    if (!tempPath || typeof tempPath !== 'string') {
      console.error('Invalid or missing tempPath for save-image');
      return { success: false, error: 'Invalid or missing file path' };
    }
    try {
      // Decode URL if it was passed as a file:// URL
      let sourcePath = tempPath;
      if (sourcePath.startsWith('file://')) {
          sourcePath = decodeURIComponent(sourcePath.replace('file://', ''));
          // On Windows, remove leading slash if present (e.g., /C:/...)
          if (process.platform === 'win32' && sourcePath.startsWith('/') && sourcePath.includes(':')) {
              sourcePath = sourcePath.substring(1);
          }
      }

      // If the path is just a filename (no directory separators), assume it's already in the product images folder
      // This happens if the user tries to "re-save" an image that is already local-asset://...
      if (!sourcePath.includes(path.sep) && !sourcePath.includes('/')) {
         const existingPath = path.join(productImagesPath, sourcePath);
         try {
             await fs.access(existingPath);
             return { success: true, path: existingPath, fileName: sourcePath };
         } catch (e) {
             // Not found, proceed to fail
         }
      }

      // Verify source file exists
      try {
          await fs.access(sourcePath);
      } catch (e) {
          console.error(`Source image not found at: ${sourcePath}`);
          return { success: false, error: `Source image not found: ${sourcePath}` };
      }

      const fileName = `${Date.now()}-${path.basename(sourcePath)}`;
      const permanentPath = path.join(productImagesPath, fileName);
      await fs.copyFile(sourcePath, permanentPath);
      return { success: true, path: permanentPath, fileName: fileName };
    } catch (error) {
      console.error('Failed to save image:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * IPC Handler: 'save-data'
   */
  ipcMain.handle('save-data', async (event, fileName, data) => {
    try {
      // Allow saving users.json only if we're in outlet mode (since outlet syncs users from server)
      const isOutletMode = process.env.WHIZ_POS_MODE === 'outlet';
      if (fileName === 'users.json' && !isOutletMode) {
          console.error("BLOCKED Legacy 'save-data' for users.json in server mode.");
          return { success: false, error: "Use userManagement IPC instead." };
      }

      await writeJsonFile(fileName, data);
      return { success: true };
    } catch (error) {
      console.error(`Failed to save data to ${fileName}:`, error);
      return { success: false, error: error.message };
    }
  });

  /**
   * IPC Handler: 'read-data'
   */
  ipcMain.handle('read-data', async (event, fileName) => {
    try {
        const data = await readJsonFileFallback(fileName);
        return { success: true, data: data || [] };
    } catch (error) {
        console.error(`Failed to read data from ${fileName}:`, error);
        return { success: false, error: error.message };
    }
  });

  // --- Printer Management Handlers ---

  ipcMain.handle('get-printers', async () => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      return await mainWindow.webContents.getPrintersAsync();
    }
    return [];
  });

  ipcMain.handle('save-printer-settings', async (event, settings) => {
    store.set('printerSettings', settings);
    return { success: true };
  });

  ipcMain.handle('get-printer-settings', async () => {
    return store.get('printerSettings', { defaultPrinter: '' });
  });

  ipcMain.handle('toggle-fullscreen', () => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
        mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  ipcMain.handle('get-connected-devices', () => {
      // Return array of connected devices (active in last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      if (!global.connectedDevicesMap) return [];

      const devices = [];
      for (const [ip, device] of global.connectedDevicesMap.entries()) {
          if (new Date(device.lastSeen) > oneHourAgo) {
              devices.push(device);
          }
      }
      return devices;
  });

  // --- Logs ---
  ipcMain.handle('start-discovery', () => {
      startMdnsDiscovery();
      return true;
  });

  ipcMain.handle('get-discovered-servers', () => {
      return Array.from(discoveredServers.values());
  });

  ipcMain.handle('approve-outlet', async (event, outletId, assignment = {}) => {
      const pendingEntry = findOutletEntryById(global.pendingOutletsMap, outletId);
      const outlet = pendingEntry?.outlet;
      if (outlet) {
          const canonicalOutletId = outlet.outletCode || outlet.id;
          const approvedOutlet = {
              ...outlet,
              status: 'approved',
              approvedAt: new Date().toISOString(),
              assignedProductIds: assignment.productIds || [],
              assignedUserIds: assignment.userIds || [],
              initialStock: assignment.initialStock || {},
              currentStock: assignment.initialStock || {},
              outletCode: canonicalOutletId,
              id: canonicalOutletId,
              legacyOutletIds: Array.from(new Set([...(outlet.legacyOutletIds || []), outlet.id])).filter(Boolean)
          };

          global.outletsMap.set(canonicalOutletId, approvedOutlet);
          if (pendingEntry?.key) {
              global.pendingOutletsMap.delete(pendingEntry.key);
          }
          global.rejectedOutletsMap.delete(canonicalOutletId);
          await writeJsonFile('pending-outlets.json', Array.from(global.pendingOutletsMap.values()));

          // Create stock movement records for initial stock assignment
          if (assignment.initialStock && Object.keys(assignment.initialStock).length > 0) {
              try {
                  const movements = await readJsonFile('stock-movements.json');
                  const products = await readJsonFile('products.json');
                  for (const [productId, quantity] of Object.entries(assignment.initialStock)) {
                      if (!quantity || Number(quantity) <= 0) continue;
                      const product = products.find(p => String(p.id) === String(productId) || String(p.productId) === String(productId));
                      movements.unshift({
                          id: `SM${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
                          type: 'transfer_out',
                          productId,
                          productName: product?.name || productId,
                          fromLocation: 'store',
                          toLocation: canonicalOutletId,
                          quantity: Number(quantity),
                          referenceId: canonicalOutletId,
                          notes: `Initial stock assignment for ${outlet.name}`,
                          createdAt: new Date().toISOString(),
                          createdBy: 'server'
                      });
                  }
                  await writeJsonFile('stock-movements.json', movements);
              } catch (e) {
                  console.error('[Approve Outlet] Failed to record stock movements:', e);
              }
          }

          // Persist approved outlets
          const outletsArr = Array.from(global.outletsMap.values());
          await writeJsonFile('approved-outlets.json', outletsArr);
          await writeJsonFile('rejected-outlets.json', Array.from(global.rejectedOutletsMap.values()));
          await broadcastOutletSnapshot(canonicalOutletId);

          const mainWindow = BrowserWindow.getAllWindows()[0];
          if (mainWindow) {
              mainWindow.webContents.send('pending-outlets-update', Array.from(global.pendingOutletsMap.values()));
          }

          return { success: true };
      }
      return { success: false, error: 'Outlet not found' };
  });

  ipcMain.handle('reject-outlet', async (event, outletId, reason = 'Rejected by server administrator') => {
      const pendingEntry = findOutletEntryById(global.pendingOutletsMap, outletId);
      const outlet = pendingEntry?.outlet;
      if (!outlet) {
          return { success: false, error: 'Outlet not found' };
      }

      const canonicalOutletId = outlet.outletCode || outlet.id;
      if (pendingEntry?.key) {
          global.pendingOutletsMap.delete(pendingEntry.key);
      }
      global.rejectedOutletsMap.set(canonicalOutletId, {
          ...outlet,
          status: 'rejected',
          reason,
          outletCode: canonicalOutletId,
          rejectedAt: new Date().toISOString()
      });

      await writeJsonFile('pending-outlets.json', Array.from(global.pendingOutletsMap.values()));
      await writeJsonFile('rejected-outlets.json', Array.from(global.rejectedOutletsMap.values()));

      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
          mainWindow.webContents.send('pending-outlets-update', Array.from(global.pendingOutletsMap.values()));
      }

      return { success: true };
  });

  ipcMain.handle('get-pending-outlets', () => {
      return Array.from(global.pendingOutletsMap.values());
  });

  ipcMain.handle('get-approved-outlets', () => {
      const outlets = Array.from(global.outletsMap.values());
      // Deduplicate by id/outletCode to prevent duplicate keys
      const seen = new Set();
      const uniqueOutlets = [];
      for (const outlet of outlets) {
          const key = outlet.outletCode || outlet.id;
          if (!seen.has(key)) {
              seen.add(key);
              // Calculate isOnline: lastSeen within last 2 minutes?
              const lastSeen = outlet.lastSeen ? new Date(outlet.lastSeen) : null;
              const now = new Date();
              const isOnline = lastSeen ? (now - lastSeen < 2 * 60 * 1000) : false;
              uniqueOutlets.push({
                  ...outlet,
                  isOnline
              });
          }
      }
      return uniqueOutlets;
  });

  ipcMain.handle('get-app-mode', async () => {
      try {
          const setup = await readJsonFileFallback('business-setup.json');
          return setup?.mode || process.env.WHIZ_POS_MODE || 'server';
      } catch (e) {
          return process.env.WHIZ_POS_MODE || 'server';
      }
  });

  ipcMain.handle('set-app-mode', async (event, mode) => {
      try {
          const setup = await readJsonFileFallback('business-setup.json');
          const updatedSetup = {
              ...(setup || {}),
              mode
          };
          await writeJsonFileFallback('business-setup.json', updatedSetup);

          const mainWindow = BrowserWindow.getAllWindows()[0];
          if (mainWindow) {
              mainWindow.webContents.send('app-mode-changed', mode);
          }

          return { success: true };
      } catch (error) {
          return { success: false, error: error.message };
      }
  });

  ipcMain.handle('update-outlet-assignment', async (event, outletId, assignment = {}) => {
      const outlet = findOutletRecordById(outletId);
      if (!outlet) {
          return { success: false, error: 'Outlet not found' };
      }

      const canonicalOutletId = outlet.outletCode || outlet.id;
      
      console.log('[update-outlet-assignment] assignment:', assignment);
      console.log('[update-outlet-assignment] existing outlet:', outlet);
      
      // Use the new assignment stock from the assignment as the new initial and current stock
      // If assignment has initialStock, use that, otherwise keep existing!
      const newStock = assignment.initialStock || outlet.currentStock || outlet.initialStock || {};
      
      console.log('[update-outlet-assignment] newStock:', newStock);
      
      const updatedOutlet = {
          ...outlet,
          assignedProductIds: assignment.productIds || [],
          assignedUserIds: assignment.userIds || [],
          initialStock: newStock,
          currentStock: newStock,
          outletCode: canonicalOutletId,
          id: canonicalOutletId,
          legacyOutletIds: Array.from(new Set([...(outlet.legacyOutletIds || []), outlet.id])).filter(Boolean),
          lastSync: new Date().toISOString() // Update last sync time!
      };

      global.outletsMap.set(canonicalOutletId, updatedOutlet);
      
      // Persist approved outlets
      const outletsArr = Array.from(global.outletsMap.values());
      await writeJsonFile('approved-outlets.json', outletsArr);
      await broadcastOutletSnapshot(canonicalOutletId);
      
      return { success: true };
  });

  ipcMain.handle('delete-outlet', async (event, outletId) => {
      const approvedEntry = findOutletEntryById(global.outletsMap, outletId);
      const pendingEntry = findOutletEntryById(global.pendingOutletsMap, outletId);
      const rejectedEntry = findOutletEntryById(global.rejectedOutletsMap, outletId);
      const removedFromApproved = approvedEntry ? global.outletsMap.delete(approvedEntry.key) : false;
      const removedFromPending = pendingEntry ? global.pendingOutletsMap.delete(pendingEntry.key) : false;
      const removedFromRejected = rejectedEntry ? global.rejectedOutletsMap.delete(rejectedEntry.key) : false;

      if (!removedFromApproved && !removedFromPending && !removedFromRejected) {
          return { success: false, error: 'Outlet not found' };
      }

      try {
          const movements = await readJsonFile('stock-movements.json');
          const filteredMovements = (movements || []).filter(m =>
              String(m.referenceId || m.toLocation || m.toLocationId || '') !== String(outletId) &&
              String(m.outletId || '') !== String(outletId)
          );
          await writeJsonFile('stock-movements.json', filteredMovements);
      } catch (e) {
          console.error('[Delete Outlet] Failed to prune stock movements:', e);
      }

      await writeJsonFile('approved-outlets.json', Array.from(global.outletsMap.values()));
      await writeJsonFile('pending-outlets.json', Array.from(global.pendingOutletsMap.values()));
      await writeJsonFile('rejected-outlets.json', Array.from(global.rejectedOutletsMap.values()));

      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
          mainWindow.webContents.send('pending-outlets-update', Array.from(global.pendingOutletsMap.values()));
      }

      return { success: true };
  });

  ipcMain.handle('ping-outlet', async (event, outletId) => {
      const outlet = findOutletRecordById(outletId);
      if (!outlet) {
          return { success: false, error: 'Outlet not found' };
      }

      const outletPort = Number(outlet.port) || Number(process.env.WHIZ_POS_PORT) || 3000;
      const outletIp = outlet.ip || outlet.ipAddress;
      if (!outletIp) {
          return { success: false, error: 'Outlet IP not configured' };
      }

      try {
          const response = await fetch(`http://${outletIp}:${outletPort}/api/heartbeat`, {
              headers: { 'X-API-KEY': apiKey }
          });

          if (!response.ok) {
              return { success: false, error: `Outlet replied with ${response.status}` };
          }

          const payload = await response.json();
          const now = new Date().toISOString();
          const updatedOutlet = {
              ...outlet,
              lastSeen: now,
              lastSync: outlet.lastSync || now
          };
          const approvedEntry = findOutletEntryById(global.outletsMap, outletId);
          const pendingEntry = findOutletEntryById(global.pendingOutletsMap, outletId);
          if (approvedEntry) {
              global.outletsMap.set(approvedEntry.key, updatedOutlet);
              await writeJsonFile('approved-outlets.json', Array.from(global.outletsMap.values()));
          } else if (pendingEntry) {
              global.pendingOutletsMap.set(pendingEntry.key, updatedOutlet);
              await writeJsonFile('pending-outlets.json', Array.from(global.pendingOutletsMap.values()));
          }
          return { success: true, data: payload };
      } catch (error) {
          return { success: false, error: error.message };
      }
  });

  ipcMain.handle('get-stock-movements', async () => {
      try {
          return await readJsonFile('stock-movements.json');
      } catch (e) {
          return [];
      }
  });

  ipcMain.handle('create-stock-transfer', async (event, transferData) => {
      try {
          const movements = await readJsonFile('stock-movements.json');
          const transfer = {
              id: transferData.id || `T${Date.now()}`,
              ...transferData,
              status: transferData.status || 'pending',
              createdAt: new Date().toISOString()
          };
          movements.unshift(transfer);
          await writeJsonFile('stock-movements.json', movements);
          return { success: true, transfer };
      } catch (e) {
          return { success: false, error: e.message };
      }
  });

  ipcMain.handle('get-logs', async () => {
      try {
          const content = await fs.readFile(logFilePath, 'utf-8');
          // Filter last 48 hours
          const lines = content.split('\n');
          const now = new Date();
          const filteredLines = lines.filter(line => {
              const match = line.match(/^\[(.*?)\]/);
              if (match && match[1]) {
                  const logTime = new Date(match[1]);
                  const hoursDiff = (now - logTime) / (1000 * 60 * 60);
                  return hoursDiff <= 48;
              }
              return false; // Filter out malformed lines or empty lines
          });
          return filteredLines.join('\n');
      } catch (e) {
          return ''; // Return empty if file missing or error
      }
  });

  // --- Developer & Direct DB Sync ---

  // --- Automated Backup Daemon ---
  setInterval(async () => {
      try {
          const businessSetup = await readJsonFileFallback('business-setup.json');
          if (businessSetup && businessSetup.mode === 'server') {
              // Server Backups
              const docsPath = path.join(app.getPath('documents'), 'WhizPOS');
              const mainServerPath = path.join(docsPath, 'MainServer');
              await fs.mkdir(mainServerPath, { recursive: true });

              const timestamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 16);
              const fileName = `${timestamp}_server_backup.wpos`;
              await backupDB(path.join(mainServerPath, fileName));

              // Pull from Outlets
              for (const [id, outlet] of global.outletsMap.entries()) {
                  try {
                      console.log(`[Daemon] Pulling backup from outlet: ${outlet.name}`);
                      const outletPort = Number(outlet.port) || 3000;
                      const response = await fetch(`http://${outlet.ip}:${outletPort}/api/backup-raw`, {
                          headers: { 'X-API-KEY': apiKey }
                      });
                      if (response.ok) {
                          const outletBackupPath = path.join(docsPath, 'Outlets', outlet.name.replace(/[^a-z0-9]/gi, '_'));
                          await fs.mkdir(outletBackupPath, { recursive: true });
                          const buffer = await response.arrayBuffer();
                          await fs.writeFile(path.join(outletBackupPath, `${timestamp}_${outlet.name}.wpos`), Buffer.from(buffer));
                      }
                  } catch (e) {
                      console.error(`[Daemon] Failed to pull from ${outlet.name}:`, e.message);
                  }
              }
          } else {
              // Legacy/Standard Backup logic
              let businessName = 'Business';
              if (businessSetup && businessSetup.businessName) {
                  businessName = businessSetup.businessName.replace(/[^a-z0-9]/gi, '_');
              }

              const timestamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 16);
              const fileName = `${timestamp}_backup_${businessName}.wpos`;
              const docsPath = path.join(app.getPath('documents'), 'WhizPOS');
              await fs.mkdir(docsPath, { recursive: true });
              await backupDB(path.join(docsPath, fileName));
          }
      } catch (error) {
          console.error('[Daemon] Automated backup failed:', error);
      }
  }, 2 * 60 * 60 * 1000); // 2 hours

  ipcMain.handle('backup-data', async () => {
    try {
        let businessName = 'Business';
        try {
            const config = await readJsonFileFallback('business-setup.json');
            if (config && config.businessName) {
                businessName = config.businessName.replace(/[^a-z0-9]/gi, '_');
            }
        } catch (e) {}

        const timestamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 16); // YYYY-MM-DD_HH-MM
        const defaultFileName = `${timestamp}_backup_${businessName}.wpos`;

        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Save Backup',
            defaultPath: defaultFileName,
            filters: [{ name: 'Whiz POS Backup', extensions: ['wpos'] }]
        });

        if (canceled || !filePath) return { success: false, error: 'Cancelled' };

        // Use proper SQLite backup mechanism to capture WAL data safely
        await backupDB(filePath);

        return { success: true, filePath };
    } catch (e) {
        console.error("Backup failed", e);
        return { success: false, error: e.message };
    }
  });

  ipcMain.handle('restore-data', async () => {
      try {
          const { canceled, filePaths } = await dialog.showOpenDialog({
              title: 'Select Backup File',
              properties: ['openFile'],
              filters: [
                  { name: 'Whiz POS Backup', extensions: ['wpos'] },
                  { name: 'Legacy JSON Backup', extensions: ['json'] }
              ]
          });

          if (canceled || filePaths.length === 0) return { success: false, error: 'Cancelled' };

          const backupPath = filePaths[0];

          if (backupPath.endsWith('.json')) {
              const backupContent = await fs.readFile(backupPath, 'utf-8');
              const backup = JSON.parse(backupContent);

              const source = backup?.data && typeof backup.data === 'object' ? backup.data : backup;
              if (!source || typeof source !== 'object') throw new Error("Invalid backup file format");

              const pick = (...keys) => {
                  for (const key of keys) {
                      if (Object.prototype.hasOwnProperty.call(source, key)) {
                          return source[key];
                      }
                  }
                  return undefined;
              };

              const normalizedPayloads = {
                  'business-setup.json': pick('business-setup.json', 'businessSetup', 'business', 'settings'),
                  'server-config.json': pick('server-config.json', 'serverConfig'),
                  'products.json': pick('products.json', 'products', 'items'),
                  'users.json': pick('users.json', 'users'),
                  'transactions.json': pick('transactions.json', 'transactions', 'sales'),
                  'expenses.json': pick('expenses.json', 'expenses'),
                  'salaries.json': pick('salaries.json', 'salaries'),
                  'credit-customers.json': pick('credit-customers.json', 'creditCustomers', 'customers'),
                  'credit-payments.json': pick('credit-payments.json', 'creditPayments'),
                  'inventory-logs.json': pick('inventory-logs.json', 'inventoryLogs'),
                  'daily-summaries.json': pick('daily-summaries.json', 'dailySummaries'),
                  'suppliers.json': pick('suppliers.json', 'suppliers'),
                  'loyalty-customers.json': pick('loyalty-customers.json', 'loyaltyCustomers'),
                  'documents.json': pick('documents.json', 'documents'),
                  'categories.json': pick('categories.json', 'categories'),
                  'approved-outlets.json': pick('approved-outlets.json', 'approvedOutlets'),
                  'rejected-outlets.json': pick('rejected-outlets.json', 'rejectedOutlets'),
                  'sync-queue.json': pick('sync-queue.json', 'syncQueue'),
                  'stock-movements.json': pick('stock-movements.json', 'stockMovements'),
                  'held-orders.json': pick('held-orders.json', 'heldOrders')
              };

              for (const [filename, content] of Object.entries(normalizedPayloads)) {
                  if (content !== undefined) {
                      await writeJsonFileFallback(filename, content);
                  }
              }
          } else if (backupPath.endsWith('.wpos')) {
              // Gracefully close connection to prevent locking or corruption during overwrite
              closeDB();

              const dbPath = getDbPath() || path.join(userDataPath, process.env.WHIZ_POS_DB_NAME || 'whizpos.db');
              const walPath = dbPath + '-wal';
              const shmPath = dbPath + '-shm';

              // Overwrite main DB file
              await fs.copyFile(backupPath, dbPath);

              // Remove previous WAL & SHM to ensure clean boot from restored file
              try { await fs.unlink(walPath); } catch(e) {}
              try { await fs.unlink(shmPath); } catch(e) {}

              // Re-initialize DB
              initDB(userDataPath);
          } else {
              throw new Error("Unsupported backup format");
          }

          // Notify all windows to reload data
          const windows = BrowserWindow.getAllWindows();
          for (const win of windows) {
              win.webContents.send('data-restored');
          }

          return { success: true };
      } catch (e) {
          console.error("Restore failed", e);
          return { success: false, error: e.message };
      }
  });

  ipcMain.handle('get-developer-config', async () => {
      try {
          const configPath = path.join(userDataPath, 'server-config.json');
          const data = await fs.readFile(configPath, 'utf-8');
          const config = JSON.parse(data);
          return {
              developerPin: config.developerPin || null,
              mongoUri: config.mongoUri || '',
              backOfficeUrl: config.backOfficeUrl || '',
              backOfficeApiKey: config.backOfficeApiKey || ''
          };
      } catch (e) {
          return { developerPin: null, mongoUri: '', backOfficeUrl: '', backOfficeApiKey: '' };
      }
  });

  ipcMain.handle('save-developer-config', async (event, newConfig) => {
      try {
          const configPath = path.join(userDataPath, 'server-config.json');
          let currentConfig = {};
          try {
              const data = await fs.readFile(configPath, 'utf-8');
              currentConfig = JSON.parse(data);
          } catch (e) {}

          const updatedConfig = { ...currentConfig, ...newConfig };
          await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
          return { success: true };
      } catch (e) {
          console.error("Failed to save developer config", e);
          return { success: false, error: e.message };
      }
  });

  ipcMain.handle('direct-db-delete', async (event, mongoUri, ops) => {
      if (!mongoUri) return { success: false, error: 'MongoDB URI is missing' };
      if (!ops || !Array.isArray(ops) || ops.length === 0) return { success: true };

      let client;
      try {
          client = new MongoClient(mongoUri);
          await client.connect();
          const db = client.db();

          // Group by type/collection
          const collectionMap = {
              'delete-user': { collection: 'users', idField: 'userId' },
              'delete-product': { collection: 'products', idField: 'productId' },
              'delete-expense': { collection: 'expenses', idField: 'expenseId' },
              'delete-salary': { collection: 'salaries', idField: 'salaryId' },
              'delete-transaction': { collection: 'transactions', idField: 'transactionId' },
              'delete-credit-customer': { collection: 'customers', idField: 'customerId' },
              'delete-supplier': { collection: 'suppliers', idField: 'supplierId' }
          };

          for (const op of ops) {
              const config = collectionMap[op.type];
              if (config) {
                  const id = op.data.id || op.data.userId || op.data.productId || op.data.expenseId || op.data.salaryId || op.data.transactionId || op.data.customerId;
                  if (id) {
                      await db.collection(config.collection).deleteOne({ [config.idField]: id });
                  }
              }
          }

          return { success: true };
      } catch (e) {
          console.error("Direct DB Delete Failed", e);
          return { success: false, error: e.message };
      } finally {
          if (client) await client.close();
      }
  });

  // --- Printing Logic ---
  /**
   * Creates a hidden BrowserWindow to render HTML content and triggers the print dialog.
   *
   * @param {string} htmlContent - The HTML string to print.
   * @param {Object} options - Electron print options.
   */
  const printHtml = async (htmlContent, options = {}) => {
    const printWindow = new BrowserWindow({ show: false, webPreferences: { contextIsolation: false, nodeIntegration: true } });

    // Check for saved printer preferences
    const printerSettings = store.get('printerSettings', {});
    if (printerSettings.defaultPrinter) {
        options.deviceName = printerSettings.defaultPrinter;
        options.silent = true; // Skip dialog if a printer is explicitly set
    }

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    printWindow.webContents.on('did-finish-load', () => {
        // Force margins to 0 for better fit on thermal printers
        // Unless specific margins were passed in options, we override them to 0
        const printOptions = {
             margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 },
             ...options
        };

        printWindow.webContents.print(printOptions, (success, errorType) => {
            if (!success) console.error('Print failed:', errorType);
            else console.log('Print job sent successfully');
            printWindow.close();
        });
    });
  };

  /**
   * IPC Listener: 'print-receipt'
   * Generates and prints a transaction receipt.
   */
  ipcMain.on('print-receipt', async (event, transaction, businessSetup, isReprint = false) => {
      const htmlContent = await generateReceipt(transaction, businessSetup, isReprint);
      printHtml(htmlContent);
  });

  /**
   * IPC Listener: 'print-receipt-from-api'
   * Generates and prints a receipt requested via the local API (e.g., from Mobile App).
   */
  ipcMain.on('print-receipt-from-api', async (event, transaction, businessSetup) => {
      const htmlContent = await generateReceipt(transaction, businessSetup, true);
      printHtml(htmlContent);
  });

  /**
   * IPC Listener: 'print-business-setup'
   * Generates and prints the initial business setup invoice.
   */
  ipcMain.on('print-business-setup', async (event, businessSetup, adminUser) => {
      const htmlContent = await generateBusinessSetup(businessSetup, adminUser);
      printHtml(htmlContent, { copies: 2 });
  });

  /**
   * IPC Listener: 'print-closing-report'
   * Generates and prints the daily closing report.
   * Now supports 'detailed' flag.
   */
  ipcMain.on('print-closing-report', async (event, reportData, businessSetup, detailed = true) => {
      const htmlContent = await generateClosingReport(reportData, businessSetup, detailed);
      printHtml(htmlContent);
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // --- Auto Updater ---

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
  });
  autoUpdater.on('update-available', (info) => {
     console.log('Update available.', info);
     const mainWindow = BrowserWindow.getAllWindows()[0];
     if (mainWindow) mainWindow.webContents.send('update-available', info);
  });
  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available.', info);
  });
  autoUpdater.on('error', (err) => {
    console.log('Error in auto-updater. ' + err);
  });
  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    console.log(log_message);
  });
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded');
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) mainWindow.webContents.send('update-downloaded', info);
  });

  ipcMain.on('check-for-update', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });

  // Check for updates immediately on startup
  autoUpdater.checkForUpdatesAndNotify();

  // Background check loop (every hour)
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 1000 * 60 * 60);

  ipcMain.on('download-update', () => {
    // electron-updater downloads automatically if autoDownload is true (default)
    // but if we set it to false, we can call downloadUpdate() here.
    // For now, checkForUpdatesAndNotify handles it.
  });
});

/**
 * IPC Handler: 'get-api-config'
 * Retrieves or generates the API Key and connection details for the local API server.
 * Returns a QR code data URL for easy mobile connection.
 *
 * @returns {Promise<{apiKey: string, apiUrl: string, qrCodeDataUrl: string}>}
 */
ipcMain.handle('get-api-config', async () => {
    if (!apiKey) {
        // Should have been init'd, but just in case
        await initApiKey();
    }
    const ipAddress = getLocalIpAddress();
    const address = server ? server.address() : null;
    const port = (address && typeof address === 'object' && address.port) ? address.port : runtimeApiPort;
    const config = {
        apiKey,
        apiUrl: `http://${ipAddress}:${port}`
    };
    const qrCodeDataUrl = await qrcode.toDataURL(JSON.stringify(config));
    return { ...config, qrCodeDataUrl };
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    if(server) server.close();
    app.quit();
  }
});
