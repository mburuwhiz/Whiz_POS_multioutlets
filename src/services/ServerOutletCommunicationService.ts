type MessageType = 'ping' | 'pong' | 'data-sync' | 'product-update' | 'outlet-status';

interface Message {
  id: string;
  type: MessageType;
  from: 'server' | 'outlet';
  to: 'server' | 'outlet';
  data?: any;
  timestamp: Date;
}

export class ServerOutletCommunicationService {
  private messageHistory: Message[] = [];
  private onMessageCallback?: (message: Message) => void;
  private instanceType: 'server' | 'outlet' | null = null;

  constructor() {
    console.log('[ServerOutletComm] Service initialized');
  }

  setInstanceType(type: 'server' | 'outlet') {
    this.instanceType = type;
    console.log(`[ServerOutletComm] Instance type set to: ${type}`);
  }

  setOnMessage(callback: (message: Message) => void) {
    this.onMessageCallback = callback;
  }

  sendMessage(to: 'server' | 'outlet', type: MessageType, data?: any) {
    if (!this.instanceType) {
      console.warn('[ServerOutletComm] Instance type not set!');
      return;
    }

    const message: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      from: this.instanceType,
      to,
      data,
      timestamp: new Date()
    };

    this.messageHistory.push(message);
    console.log(`[ServerOutletComm] ${this.instanceType} → ${to}:`, type, data);

    // Simulate message delivery after a short delay
    setTimeout(() => {
      if (this.onMessageCallback) {
        this.onMessageCallback(message);
      }
      
      // Auto-respond to ping with pong
      if (type === 'ping') {
        this.sendPong(to);
      }
    }, 300);
  }

  sendPing(to: 'server' | 'outlet') {
    this.sendMessage(to, 'ping');
  }

  private sendPong(to: 'server' | 'outlet') {
    this.sendMessage(to, 'pong');
  }

  sendDataSync(to: 'server' | 'outlet', data: any) {
    this.sendMessage(to, 'data-sync', data);
  }

  getMessageHistory(): Message[] {
    return [...this.messageHistory];
  }
}

export const serverOutletCommService = new ServerOutletCommunicationService();
