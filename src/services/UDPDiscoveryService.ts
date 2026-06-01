export interface DiscoveredServer {
  id: string;
  name: string;
  ip: string;
  port: number;
  lastSeen: Date;
}

export class UDPDiscoveryService {
  private servers: Map<string, DiscoveredServer> = new Map();
  private isRunning = false;
  private onServerDiscoveredCallback?: (server: DiscoveredServer) => void;
  private onServerLostCallback?: (serverId: string) => void;

  constructor() {
    console.log('[UDPDiscovery] Service initialized');
  }

  setOnServerDiscovered(callback: (server: DiscoveredServer) => void) {
    this.onServerDiscoveredCallback = callback;
  }

  setOnServerLost(callback: (serverId: string) => void) {
    this.onServerLostCallback = callback;
  }

  async startServerBroadcast(serverName: string, port: number = 3000): Promise<void> {
    if (this.isRunning) {
      console.log('[UDPDiscovery] Server broadcast already running');
      return;
    }

    this.isRunning = true;
    console.log(`[UDPDiscovery] Starting server broadcast for "${serverName}" on port ${port}`);

    // In a real Electron implementation, this would use dgram module
    // For now, we'll simulate with dummy data
    this.simulateServerAnnouncement(serverName, port);
  }

  async startOutletDiscovery(): Promise<void> {
    if (this.isRunning) {
      console.log('[UDPDiscovery] Outlet discovery already running');
      return;
    }

    this.isRunning = true;
    console.log('[UDPDiscovery] Starting outlet discovery...');

    // Simulate discovering a server after 2 seconds
    setTimeout(() => {
      const dummyServer: DiscoveredServer = {
        id: 'server-123',
        name: 'Main Server',
        ip: '127.0.0.1',
        port: 3000,
        lastSeen: new Date()
      };

      this.servers.set(dummyServer.id, dummyServer);
      
      if (this.onServerDiscoveredCallback) {
        this.onServerDiscoveredCallback(dummyServer);
      }

      console.log('[UDPDiscovery] Discovered server:', dummyServer.name);
    }, 2000);
  }

  stop(): void {
    this.isRunning = false;
    console.log('[UDPDiscovery] Discovery stopped');
  }

  getDiscoveredServers(): DiscoveredServer[] {
    return Array.from(this.servers.values());
  }

  private simulateServerAnnouncement(serverName: string, port: number) {
    console.log(`[UDPDiscovery] Broadcasting server "${serverName}"...`);
    // This is where real UDP broadcast would happen
  }
}

export const udpDiscoveryService = new UDPDiscoveryService();
