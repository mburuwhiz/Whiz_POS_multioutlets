const os = require('os');
const dgram = require('dgram');
const crypto = require('crypto');
const { getOutlets, saveOutlet, getSyncQueue, saveSyncQueueItem, deleteSyncQueueItem } = require('./sqlite-db.cjs');

const DISCOVERY_PORT = 54321;
const BROADCAST_INTERVAL = 5000;

class MultiOutletManager {
    constructor(appMode, businessSetup) {
        this.appMode = appMode;
        this.businessSetup = businessSetup;
        this.discoverySocket = null;
        this.broadcastInterval = null;
        this.discoveredServers = new Map();
        this.outletId = businessSetup?.outletId || crypto.randomUUID();
        this.syncInterval = null;
    }

    async init() {
        console.log(`[MultiOutlet] Initializing in ${this.appMode} mode`);
        
        if (this.appMode === 'server') {
            this.startServerDiscovery();
        } else {
            this.startOutletDiscovery();
            this.startSyncProcess();
        }
    }

    startServerDiscovery() {
        this.discoverySocket = dgram.createSocket('udp4');
        
        this.discoverySocket.on('message', (msg, rinfo) => {
            try {
                const data = JSON.parse(msg.toString());
                if (data.type === 'outlet-discovery') {
                    console.log(`[MultiOutlet] Outlet discovered: ${data.outletName} from ${rinfo.address}`);
                    this.handleOutletDiscovery(data, rinfo);
                }
            } catch (e) {
                console.error('[MultiOutlet] Error parsing discovery message:', e);
            }
        });

        this.discoverySocket.bind(DISCOVERY_PORT, '0.0.0.0', () => {
            console.log('[MultiOutlet] Server discovery service started');
        });

        this.broadcastInterval = setInterval(() => {
            this.broadcastServerPresence();
        }, BROADCAST_INTERVAL);
    }

    broadcastServerPresence() {
        const message = Buffer.from(JSON.stringify({
            type: 'server-presence',
            serverName: this.businessSetup?.businessName || 'Whiz POS Server',
            ipAddress: this.getLocalIpAddress(),
            port: 3000
        }));

        this.discoverySocket.send(message, DISCOVERY_PORT, '255.255.255.255');
    }

    handleOutletDiscovery(data, rinfo) {
        const existingOutlets = getOutlets();
        let outlet = existingOutlets.find(o => o.id === data.outletId);
        
        if (!outlet) {
            outlet = {
                id: data.outletId,
                name: data.outletName,
                ipAddress: rinfo.address,
                status: 'pending',
                createdAt: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            };
            saveOutlet(outlet);
        } else {
            outlet.lastSeen = new Date().toISOString();
            outlet.ipAddress = rinfo.address;
            saveOutlet(outlet);
        }

        const response = Buffer.from(JSON.stringify({
            type: 'server-response',
            serverName: this.businessSetup?.businessName,
            status: outlet.status,
            approvedAt: outlet.approvedAt
        }));

        this.discoverySocket.send(response, rinfo.port, rinfo.address);
    }

    startOutletDiscovery() {
        this.discoverySocket = dgram.createSocket('udp4');
        
        this.discoverySocket.on('message', (msg, rinfo) => {
            try {
                const data = JSON.parse(msg.toString());
                if (data.type === 'server-presence') {
                    console.log(`[MultiOutlet] Server discovered: ${data.serverName} at ${data.ipAddress}:${data.port}`);
                    this.handleServerDiscovery(data);
                } else if (data.type === 'server-response') {
                    console.log(`[MultiOutlet] Server response:`, data);
                    this.handleServerResponse(data);
                }
            } catch (e) {
                console.error('[MultiOutlet] Error parsing discovery message:', e);
            }
        });

        this.discoverySocket.bind(DISCOVERY_PORT + 1, '0.0.0.0', () => {
            console.log('[MultiOutlet] Outlet discovery service started');
        });

        this.broadcastInterval = setInterval(() => {
            this.broadcastOutletPresence();
        }, BROADCAST_INTERVAL);
    }

    broadcastOutletPresence() {
        const message = Buffer.from(JSON.stringify({
            type: 'outlet-discovery',
            outletId: this.outletId,
            outletName: this.businessSetup?.locationName || 'Outlet'
        }));

        this.discoverySocket.send(message, DISCOVERY_PORT, '255.255.255.255');
    }

    handleServerDiscovery(data) {
        const key = `${data.ipAddress}:${data.port}`;
        this.discoveredServers.set(key, {
            ...data,
            lastSeen: new Date().toISOString()
        });
    }

    handleServerResponse(data) {
        console.log(`[MultiOutlet] Outlet status: ${data.status}`);
    }

    startSyncProcess() {
        this.syncInterval = setInterval(() => {
            this.attemptSync();
        }, 10000);
    }

    async attemptSync() {
        const servers = Array.from(this.discoveredServers.values());
        if (servers.length === 0) return;

        for (const server of servers) {
            try {
                await this.syncWithServer(server);
                break;
            } catch (e) {
                console.error(`[MultiOutlet] Sync failed with ${server.ipAddress}:`, e);
            }
        }
    }

    async syncWithServer(server) {
        const queue = getSyncQueue();
        if (queue.length === 0) return;

        console.log(`[MultiOutlet] Syncing ${queue.length} items with server`);

        for (const item of queue) {
            try {
                const response = await fetch(`http://${server.ipAddress}:${server.port}/api/multi-outlet/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item)
                });

                if (response.ok) {
                    deleteSyncQueueItem(item.id);
                }
            } catch (e) {
                console.error(`[MultiOutlet] Failed to sync item ${item.id}:`, e);
            }
        }
    }

    queueForSync(data) {
        const item = {
            id: crypto.randomUUID(),
            data,
            timestamp: new Date().toISOString()
        };
        saveSyncQueueItem(item);
    }

    getLocalIpAddress() {
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

    shutdown() {
        if (this.broadcastInterval) clearInterval(this.broadcastInterval);
        if (this.syncInterval) clearInterval(this.syncInterval);
        if (this.discoverySocket) {
            this.discoverySocket.close();
        }
    }
}

module.exports = MultiOutletManager;
