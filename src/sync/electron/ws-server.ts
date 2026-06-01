import { WebSocketServer, WebSocket } from 'ws';
import { readJsonFile, writeJsonFile } from './utils'; // We'll create utils next

interface ClientConnection {
  ws: WebSocket;
  outletId?: string;
  isAuthenticated: boolean;
}

export class WhizSyncServer {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private dataDir: string;

  constructor(port: number, dataDir: string) {
    this.dataDir = dataDir;
    this.wss = new WebSocketServer({ port });
    console.log(`[WS-SERVER] Listening on port ${port}`);
    this.init();
  }

  private init() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[WS-SERVER] New client connected');
      
      let clientConn: ClientConnection = { ws, isAuthenticated: false };
      
      ws.on('message', async (data: string) => {
        try {
          const { type, payload } = JSON.parse(data);
          console.log(`[WS-SERVER] Received message: ${type}`);
          await this.handleMessage(ws, clientConn, type, payload);
        } catch (e) {
          console.error('[WS-SERVER] Error handling message:', e);
        }
      });

      ws.on('close', () => {
        console.log('[WS-SERVER] Client disconnected');
        // Remove from clients map
        for (let [id, conn] of this.clients) {
          if (conn.ws === ws) {
            this.clients.delete(id);
          }
        }
      });
    });
  }

  private async handleMessage(ws: WebSocket, client: ClientConnection, type: string, payload: any) {
    switch (type) {
      case 'authenticate':
        this.handleAuth(ws, client, payload);
        break;
      case 'sync_request':
        this.handleSyncRequest(ws, client, payload);
        break;
      case 'transaction_send':
        this.handleNewTransaction(ws, client, payload);
        break;
      case 'stock_update':
        this.handleStockUpdate(ws, client, payload);
        break;
      case 'heartbeat':
        ws.send(JSON.stringify({ type: 'heartbeat_ack', timestamp: Date.now() }));
        break;
    }
  }

  private handleAuth(ws: WebSocket, client: ClientConnection, payload: any) {
    // In real app, you'd verify API key here
    client.outletId = payload.outletId;
    client.isAuthenticated = true;
    this.clients.set(payload.outletId, client);
    console.log(`[WS-SERVER] Outlet ${payload.outletId} authenticated`);
    ws.send(JSON.stringify({ type: 'auth_success', payload: { outletId: payload.outletId } }));
  }

  private async handleSyncRequest(ws: WebSocket, client: ClientConnection, payload: any) {
    if (!client.isAuthenticated || !client.outletId) return;

    // Get full outlet, product, user data
    const outlets = await readJsonFile(this.dataDir, 'approved-outlets.json');
    const products = await readJsonFile(this.dataDir, 'products.json');
    const users = await readJsonFile(this.dataDir, 'users.json');
    const categories = await readJsonFile(this.dataDir, 'categories.json');

    // Find this specific outlet
    const outlet = outlets.find((o: any) => o.id === client.outletId || o.outletCode === client.outletId);
    
    ws.send(JSON.stringify({
      type: 'sync_response',
      payload: {
        outlet,
        products,
        users,
        categories
      }
    }));
  }

  private async handleNewTransaction(ws: WebSocket, client: ClientConnection, payload: any) {
    if (!client.isAuthenticated || !client.outletId) return;
    const transaction = payload.transaction;
    
    // Save transaction locally
    let transactions = await readJsonFile(this.dataDir, 'transactions.json');
    transactions = [transaction, ...transactions]; // Add new to front
    await writeJsonFile(this.dataDir, 'transactions.json', transactions);

    // Update outlet current stock!
    const outlets = await readJsonFile(this.dataDir, 'approved-outlets.json');
    const updatedOutlets = outlets.map((o: any) => {
      if (o.id === client.outletId || o.outletCode === client.outletId) {
        const newCurrentStock = { ...o.currentStock };
        for (const item of transaction.items) {
          const productId = String(item.productId);
          newCurrentStock[productId] = (newCurrentStock[productId] || 0) - item.quantity;
        }
        return {
          ...o,
          currentStock: newCurrentStock,
          lastSync: new Date().toISOString()
        };
      }
      return o;
    });
    await writeJsonFile(this.dataDir, 'approved-outlets.json', updatedOutlets);
    
    console.log(`[WS-SERVER] Transaction saved from ${client.outletId}`);

    // Send confirmation back to outlet
    ws.send(JSON.stringify({ type: 'transaction_saved', payload: { transactionId: transaction.id } }));
  }

  private async handleStockUpdate(ws: WebSocket, client: ClientConnection, payload: any) {
    if (!client.isAuthenticated || !client.outletId) return;
    const { initialStock, currentStock } = payload;

    const outlets = await readJsonFile(this.dataDir, 'approved-outlets.json');
    const updatedOutlets = outlets.map((o: any) => {
      if (o.id === client.outletId || o.outletCode === client.outletId) {
        return {
          ...o,
          initialStock: initialStock || o.initialStock,
          currentStock: currentStock || o.currentStock,
          lastSync: new Date().toISOString()
        };
      }
      return o;
    });
    await writeJsonFile(this.dataDir, 'approved-outlets.json', updatedOutlets);
    
    console.log(`[WS-SERVER] Stock updated for ${client.outletId}`);

    ws.send(JSON.stringify({ type: 'stock_updated', timestamp: Date.now() }));
  }
}
