export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'product' | 'user' | 'transaction' | 'customer' | 'supplier';
  data: any;
  timestamp: Date;
  retries: number;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  pendingOperations: number;
}

const STORAGE_KEY = 'whizpos_sync_engine_queue_v8';

export class SyncEngineService {
  private queue: SyncOperation[] = [];
  private status: SyncStatus = {
    isOnline: true,
    isSyncing: false,
    lastSync: null,
    pendingOperations: 0
  };
  private onStatusChangeCallback?: (status: SyncStatus) => void;

  constructor() {
    this.loadQueue();
    console.log('[SyncEngine] Service initialized');
  }

  private loadQueue() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.queue = parsed.map(op => ({
          ...op,
          timestamp: new Date(op.timestamp)
        }));
        this.updateStatus();
      }
    } catch (e) {
      console.warn('[SyncEngine] Failed to load persisted queue', e);
    }
  }

  private persistQueue() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      console.warn('[SyncEngine] Failed to persist queue', e);
    }
  }

  setOnStatusChange(callback: (status: SyncStatus) => void) {
    this.onStatusChangeCallback = callback;
  }

  enqueueOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retries'>): void {
    const syncOp: SyncOperation = {
      ...operation,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      retries: 0
    };

    this.queue.push(syncOp);
    this.persistQueue();
    this.updateStatus();
    console.log('[SyncEngine] Enqueued operation:', syncOp.type, syncOp.entity);

    if (this.status.isOnline) {
      this.processQueue();
    }
  }

  async processQueue(): Promise<void> {
    if (this.status.isSyncing || this.queue.length === 0) {
      return;
    }

    this.status.isSyncing = true;
    this.updateStatus();
    console.log('[SyncEngine] Starting sync process...');

    try {
      while (this.queue.length > 0) {
        const operation = this.queue[0];
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('[SyncEngine] Synced operation:', operation.type, operation.entity);
        this.queue.shift();
        this.persistQueue();
        this.updateStatus();
      }

      this.status.lastSync = new Date();
      console.log('[SyncEngine] Sync complete!');
    } catch (error) {
      console.error('[SyncEngine] Sync failed:', error);
      if (this.queue.length > 0) {
        this.queue[0].retries++;
        this.persistQueue();
      }
    } finally {
      this.status.isSyncing = false;
      this.updateStatus();
    }
  }

  setOnlineStatus(isOnline: boolean): void {
    this.status.isOnline = isOnline;
    console.log('[SyncEngine] Online status changed:', isOnline ? 'Online' : 'Offline');

    if (isOnline) {
      this.processQueue();
    }

    this.updateStatus();
  }

  getStatus(): SyncStatus {
    return { ...this.status };
  }

  getQueue(): SyncOperation[] {
    return [...this.queue];
  }

  private updateStatus(): void {
    this.status.pendingOperations = this.queue.length;

    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback({ ...this.status });
    }
  }
}

export const syncEngineService = new SyncEngineService();
