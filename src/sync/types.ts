// Core types for the new sync system

export type DeviceType = 'server' | 'outlet';

export interface Outlet {
  id: string; // Unique outlet ID, required
  name: string;
  ip?: string;
  port?: number;
  isOnline: boolean;
  lastSeen: Date;
  assignedProductIds: string[];
  assignedUserIds: string[];
  initialStock: Record<string, number>; // Product ID -> stock
  currentStock: Record<string, number>; // Current outlet stock (Product ID -> stock
}

export interface Product {
  id: string;
  productId?: string;
  name: string;
  price: number;
  stock: number; // Main store stock (on server
  category: string;
  image?: string;
  minStock: number;
}

export interface Transaction {
  id: string;
  timestamp: Date;
  items: TransactionItem[];
  total: number;
  paymentMethod: string;
  outletId?: string; // Which outlet it's from
  cashierId: string;
}

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface SyncMessage {
  type: 
    | 'discover'
    | 'discover_response'
    | 'sync_request'
    | 'sync_response'
    | 'stock_update'
    | 'transaction_send'
    | 'heartbeat';
  payload: any;
  timestamp: Date;
}
