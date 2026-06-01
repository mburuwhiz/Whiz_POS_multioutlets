export class WhizSyncClient {
  private ws: WebSocket | null = null;
  private serverUrl: string | null = null;
  private outletId: string;
  private reconnectTimeout: any = null;

  constructor(outletId: string) {
    this.outletId = outletId;
  }

  connect(url: string) {
    console.log(`[WS-CLIENT] Connecting to ${url}`);
    this.serverUrl = url;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[WS-CLIENT] Connected to server');
      this.send({
        type: 'authenticate',
        payload: { outletId: this.outletId }
      });
      // Start heartbeat
      setInterval(() => {
        this.send({ type: 'heartbeat', timestamp: Date.now() });
      }, 5000);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      const msg = JSON.parse(event.data);
      console.log('[WS-CLIENT] Received message:', msg.type);
      this.handleMessage(msg);
    };

    this.ws.onclose = () => {
      console.warn('[WS-CLIENT] Disconnected from server, reconnecting...');
      this.reconnectTimeout = setTimeout(() => {
        this.connect(this.serverUrl!);
      }, 3000);
    };
  }

  send(msg: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  handleMessage(msg: any) {
    switch (msg.type) {
      case 'auth_success':
        this.requestSync();
        break;
      case 'sync_response':
        if (this.onSyncData) {
          this.onSyncData(msg.payload);
        }
        break;
    }
  }

  requestSync() {
    console.log('[WS-CLIENT] Requesting full sync from server');
    this.send({ type: 'sync_request', payload: { outletId: this.outletId } });
  }

  sendTransaction(transaction: any) {
    console.log('[WS-CLIENT] Sending transaction to server');
    this.send({ type: 'transaction_send', payload: { transaction } });
  }

  sendStockUpdate(initialStock: any, currentStock: any) {
    this.send({ type: 'stock_update', payload: { initialStock, currentStock } });
  }

  onSyncData: (data: any) => void = () => {};

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.ws?.close();
  }
}
