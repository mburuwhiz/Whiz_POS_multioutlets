export interface StockLocation {
  id: string;
  name: string;
  type: 'store' | 'outlet';
}

export interface StockTransfer {
  id: string;
  fromLocationId: string;
  toLocationId: string;
  items: StockTransferItem[];
  status: 'pending' | 'in-transit' | 'completed' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
  notes?: string;
}

export interface StockTransferItem {
  productId: string;
  productName: string;
  quantity: number;
}

export class StockDistributionService {
  private locations: StockLocation[] = [
    { id: 'store-1', name: 'Main Store', type: 'store' }
  ];
  
  private transfers: StockTransfer[] = [];
  private onTransferUpdateCallback?: (transfer: StockTransfer) => void;

  constructor() {
    console.log('[StockDistribution] Service initialized');
  }

  setOnTransferUpdate(callback: (transfer: StockTransfer) => void) {
    this.onTransferUpdateCallback = callback;
  }

  getLocations(): StockLocation[] {
    return [...this.locations];
  }

  addOutletLocation(name: string): StockLocation {
    const location: StockLocation = {
      id: 'outlet-' + Date.now(),
      name,
      type: 'outlet'
    };
    
    this.locations.push(location);
    console.log('[StockDistribution] Added outlet location:', name);
    return location;
  }

  createTransfer(
    fromLocationId: string,
    toLocationId: string,
    items: StockTransferItem[],
    notes?: string
  ): StockTransfer {
    const transfer: StockTransfer = {
      id: 'transfer-' + Date.now(),
      fromLocationId,
      toLocationId,
      items,
      status: 'pending',
      createdAt: new Date(),
      notes
    };

    this.transfers.push(transfer);
    console.log('[StockDistribution] Created transfer:', transfer.id);
    
    if (this.onTransferUpdateCallback) {
      this.onTransferUpdateCallback(transfer);
    }

    return transfer;
  }

  completeTransfer(transferId: string): StockTransfer | null {
    const transfer = this.transfers.find(t => t.id === transferId);
    
    if (!transfer) {
      console.error('[StockDistribution] Transfer not found:', transferId);
      return null;
    }

    transfer.status = 'completed';
    transfer.completedAt = new Date();
    
    console.log('[StockDistribution] Completed transfer:', transferId);
    
    if (this.onTransferUpdateCallback) {
      this.onTransferUpdateCallback(transfer);
    }

    return transfer;
  }

  cancelTransfer(transferId: string): StockTransfer | null {
    const transfer = this.transfers.find(t => t.id === transferId);
    
    if (!transfer) {
      console.error('[StockDistribution] Transfer not found:', transferId);
      return null;
    }

    transfer.status = 'cancelled';
    
    console.log('[StockDistribution] Cancelled transfer:', transferId);
    
    if (this.onTransferUpdateCallback) {
      this.onTransferUpdateCallback(transfer);
    }

    return transfer;
  }

  getTransfers(): StockTransfer[] {
    return [...this.transfers];
  }

  getTransferById(id: string): StockTransfer | null {
    return this.transfers.find(t => t.id === id) || null;
  }
}

export const stockDistributionService = new StockDistributionService();
