export type AppMode = 'server' | 'outlet';

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  localImage?: string;
  available: boolean;
  stock?: number;
  minStock?: number;
  cost?: number;
  barcode?: string;
  productId?: string | number;
  extraBarcodes?: string[];
  variants?: Array<{ name: string; price: number; sku?: string }>;
  isBundle?: boolean;
  bundleProductIds?: string[];
  createdAt?: string;
  updatedAt?: string;
  currency?: string;
  [key: string]: any;
}

export interface CartItem {
  product: Product;
  quantity: number;
  modifier?: string;
  [key: string]: any;
}

export interface Transaction {
  id: string;
  timestamp: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'mpesa' | 'credit' | 'card' | 'split';
  cashier: string;
  cashierName?: string;
  creditCustomer?: string;
  status: 'completed' | 'pending' | 'refunded';
  amountTendered?: number;
  change?: number;
  mpesaCode?: string;
  phoneNumber?: string;
  createdAt?: string;
  synced?: boolean;
  customerName?: string;
  [key: string]: any;
}

export interface CreditCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  totalCredit: number;
  paidAmount: number;
  balance: number;
  transactions: string[];
  creditSales?: Array<{ transactionId: string; amount: number; status: string }>;
  createdAt: string;
  lastUpdated: string;
  [key: string]: any;
}

export interface User {
  id: string;
  name: string;
  pin: string;
  role: 'admin' | 'manager' | 'cashier';
  isActive: boolean;
  active?: boolean;
  createdAt: string;
  email?: string;
  phone?: string;
  permissions?: string[];
  assignedOutlets?: string[];
  lastLogin?: string;
  [key: string]: any;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  timestamp: string;
  cashier: string;
  receipt?: string;
  supplierId?: string;
  supplierName?: string;
  [key: string]: any;
}

export interface BusinessSetup {
  businessName: string;
  businessId?: string;
  apiUrl?: string;
  apiKey?: string;
  backOfficeUrl?: string;
  backOfficeApiKey?: string;
  mongoDbUri?: string;
  address: string;
  phone?: string;
  email?: string;
  taxRate?: number;
  taxName?: string;
  currency?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  printerType: 'thermal' | 'standard';
  selectedPrinter?: string;
  showPrintPreview?: boolean;
  showLogoOnReceipt?: boolean;
  onScreenKeyboard?: boolean;
  printerPaperWidth?: number;
  isSetup: boolean;
  isLoggedIn: boolean;
  mode?: AppMode;
  outletName?: string;
  outletId?: string;
  outletCode?: string;
  businessShortcode?: string;
  assignedProductIds?: string[];
  assignedUserIds?: string[];
  legacyOutletIds?: string[];
  nextOutletSequence?: number;
  status?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  servedByLabel: string;
  mpesaPaybill: string;
  mpesaTill: string;
  mpesaAccountNumber: string;
  tax: number;
  subtotal: number;
  disableReceiptPrinting?: boolean;
  developerPin?: string;
  showDeveloperFooter?: boolean;
  updatedAt?: string;
  locationName?: string;
  autoLogoffEnabled?: boolean;
  autoLogoffMinutes?: number;
  [key: string]: any;
}

export interface Outlet {
  id: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected' | 'offline' | 'online' | string;
  ip?: string;
  ipAddress?: string;
  port?: number;
  lastSeen?: string;
  apiUrl?: string;
  [key: string]: any;
}
