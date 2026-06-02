// @ts-nocheck
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logAudit } from '../lib/auditLog';

// Define the Electron API that will be exposed on the window object
declare global {
  interface Window {
    /**
     * The Electron interface exposed via `preload.js`.
     * Provides secure access to native functionality.
     */
    electron: {
      /**
       * Saves data to a local JSON file.
       */
      saveData: (fileName: string, data: any) => Promise<{ success: boolean; error?: any }>;

      /**
       * Reads data from a local JSON file.
       */
      readData: (fileName: string) => Promise<{ success: boolean; data?: any; error?: any }>;

      /**
       * Prints a transaction receipt.
       */
      printReceipt: (transaction: Transaction, businessSetup: BusinessSetup, isReprint: boolean) => void;

      /**
       * Saves a temporary image to the persistent local storage.
       */
      saveImage: (tempPath: string) => Promise<{ success: boolean; path?: string; fileName?: string; error?: any }>;

      /**
       * Prints the daily closing report.
       */
      printClosingReport: (reportData: ClosingReportData, businessSetup: BusinessSetup, detailed?: boolean) => void;

      /**
       * Prints the initial business setup sheet.
       */
      printBusinessSetup: (businessSetup: BusinessSetup, adminUser: User) => void;

      /**
       * Retrieves the local API configuration (URL, Key, QR).
       */
      getApiConfig: () => Promise<{ apiUrl: string, apiKey: string, qrCodeDataUrl: string }>;

      /**
       * Uploads an image to the remote Back Office server.
       */
      uploadImage: (filePath: string, apiUrl: string, apiKey: string) => Promise<{ imageUrl: string }>;

      /**
       * Gets list of printers.
       */
      getPrinters: () => Promise<any[]>;

      /**
       * Listen for sync updates from mobile.
       */
      onMobileDataSync: (callback: (event: any, payload: any) => void) => void;

      /**
       * Listen for new mobile receipt requests.
       */
      onNewMobileReceipt: (callback: (event: any, receipt: any) => void) => void;

      onSyncPushUpdate?: (callback: (event: any, payload: any) => void) => void;

      // Developer Tools
      getDeveloperConfig: () => Promise<{ developerPin: string | null; mongoUri: string; backOfficeUrl: string; backOfficeApiKey: string }>;
      saveDeveloperConfig: (config: { developerPin?: string; mongoUri?: string }) => Promise<{ success: boolean; error?: string }>;
      directDbPush: (mongoUri: string) => Promise<{ success: boolean; error?: string }>;
      directDbPull: (mongoUri: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      savePrinterSettings: (settings: { defaultPrinter: string }) => Promise<{ success: boolean }>;
      getPrinterSettings: () => Promise<{ defaultPrinter: string }>;
      getPrinters: () => Promise<any[]>;
      checkForUpdate: () => void;
      toggleFullscreen: () => void;
      getConnectedDevices: () => Promise<{ ip: string; name: string; lastSeen: string }[]>;
      backupData: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
      restoreData: () => Promise<{ success: boolean; error?: string }>;
      pingOutlet?: (outletId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      deleteOutlet?: (outletId: string) => Promise<{ success: boolean; error?: string }>;

      auth: {
        login: (userId: string, pin: string, deviceId?: string, scope?: 'server' | 'outlet') => Promise<{ success: boolean; token?: string; user?: any; error?: string }>;
        logout: (token: string) => Promise<{ success: boolean }>;
        verify: (token: string) => Promise<{ success: boolean; user?: any }>;
      };

      userManagement: {
        addUser: (userData: any) => Promise<{ success: boolean; error?: string }>;
        updateUser: (userId: string, updates: any) => Promise<{ success: boolean; error?: string }>;
        deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
      };
      devReset: () => Promise<{ success: boolean; error?: string }>;
      startDiscovery: () => Promise<boolean>;
      getDiscoveredServers: () => Promise<any[]>;
      onDiscoveredServers: (callback: (event: any, servers: any[]) => void) => void;
      onPendingOutletsUpdate: (callback: (event: any, outlets: any[]) => void) => void;
      approveOutlet: (outletId: string, assignment?: { productIds: string[]; userIds: string[]; initialStock: Record<string, number> }) => Promise<{ success: boolean; error?: string }>;
      updateOutletAssignment?: (outletId: string, assignment: { productIds: string[]; userIds: string[]; initialStock: Record<string, number> }) => Promise<{ success: boolean; error?: string }>;
      getStockMovements?: () => Promise<any[]>;
      createStockTransfer?: (transferData: any) => Promise<{ success: boolean; transfer?: any; error?: string }>;
      rejectOutlet: (outletId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
      getPendingOutlets: () => Promise<any[]>;
      getApprovedOutlets: () => Promise<any[]>;
    };
  }
}

// Add SessionToken to interface
interface PosState {
    // ... existing ...
    sessionToken: string | null;
    setSession: (user: User, token: string) => void;
}

// Helper function for saving data via Electron's main process
const saveDataToFile = async (fileName: string, data: any) => {
  if (window.electron) {
    try {
      const result = await window.electron.saveData(fileName, data);
      if (!result.success) {
        console.error(`Failed to save ${fileName}:`, result.error);
      } else {
        // console.debug(`Successfully saved ${fileName}`);
      }
      return result;
    } catch (e) {
      console.error(`Exception while saving ${fileName}:`, e);
      return { success: false, error: e };
    }
  } else {
    console.warn('Electron API not available. Data not saved to disk.');
    return { success: true }; // Prevent crashes in a pure web environment
  }
};

// Helper function for reading data via Electron's main process
const readDataFromFile = async (fileName: string) => {
  if (window.electron) {
    return await window.electron.readData(fileName);
  } else {
    console.error('Electron API is not available. This application is designed to run in Electron.');
    return { success: false, error: 'Electron API not available' };
  }
};

const generateRandomId = () => {
    return Math.floor(10000000 + Math.random() * 90000000);
};

// Generate a stable numeric ID from a string (e.g. product name)
const generateStableId = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

const normalizeUserRecord = (user: any): User & { active?: boolean } => {
  const isActive = user?.isActive ?? user?.active ?? true;
  return {
    ...user,
    isActive,
    active: isActive,
  };
};

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
}

export interface CartItem {
  product: Product;
  quantity: number;
  modifier?: string;
}

export interface HeldOrder {
  id: string;
  label: string;
  cart: CartItem[];
  createdAt: string;
  cashier?: string;
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
}

export interface CreditSale {
  transactionId: string;
  amount: number;
  paidAmount: number;
  status: 'unpaid' | 'partially-paid' | 'paid';
}

export interface CreditCustomer {
  id: string;
  name: string;
  phone: string;
  totalCredit: number;
  paidAmount: number;
  balance: number;
  transactions: string[]; // Store transaction IDs
  createdAt: string;
  lastUpdated: string;
}

// New Interface for Payment History
export interface CreditPayment {
    id: string;
    customerId: string;
    amount: number;
    date: string;
    cashierId?: string;
    transactionId?: string; // Linked to specific transaction
}

export interface LoyaltyCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  totalSpent: number;
  visitsCount: number;
  lastVisit: string;
  rewards: string[];
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
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  location: string;
  active: boolean;
  notes?: string;
  createdAt: string;
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
}

export interface Salary {
  id: string;
  employeeName: string;
  amount: number;
  date: string;
  type: 'advance' | 'full';
  notes?: string;
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
  printerPaperWidth?: number; // Paper width in mm
  isSetup: boolean;
  isLoggedIn: boolean; // Added for login state
  mode?: 'server' | 'outlet';
  outletName?: string;
  outletId?: string;
  outletCode?: string;
  businessShortcode?: string;
  initialStock?: Record<string, number>;
  assignedProductIds?: string[];
  assignedUserIds?: string[];
  status?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  currentStock?: Record<string, number>;
  legacyOutletIds?: string[];
  nextOutletSequence?: number;
  lastConnectivityOptimizationAt?: string;
  createdAt: string;
  servedByLabel: string;
  mpesaPaybill: string;
  mpesaTill: string;
  mpesaAccountNumber: string;
  tax: number;
  subtotal: number;
  disableReceiptPrinting?: boolean;
  locationName?: string;
  autoLogoffEnabled?: boolean;
  autoLogoffMinutes?: number;
  mpesaConfig?: {
    enabled: boolean;
    backendUrl: string;
    apiKey: string;
    consumerKey: string;
    consumerSecret: string;
    passkey: string;
    shortcode: string;
    partyB: string;
    callbackUrl: string;
    type: 'Paybill' | 'Till';
    environment: 'Sandbox' | 'Production';
  };
}

const normalizeServerBaseUrl = (rawUrl?: string | null) => {
  if (!rawUrl) return '';
  return rawUrl.trim().replace(/\/$/, '').replace(/\/api$/, '');
};

const getDeveloperServerConfig = async () => {
  if (!window.electron?.getDeveloperConfig) return null;

  try {
    return await window.electron.getDeveloperConfig();
  } catch (error) {
    console.warn('Unable to read developer config for sync resolution:', error);
    return null;
  }
};

const isLocalNetworkHost = (hostname: string) => {
  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || lower === '127.0.0.1' || lower === '::1') return true;
  if (/^10\./.test(lower)) return true;
  if (/^192\.168\./.test(lower)) return true;
  const match172 = lower.match(/^172\.(\d{1,3})\./);
  if (match172) {
    const second = Number(match172[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
};

const isLocalSyncUrl = (rawUrl?: string | null) => {
  const normalized = normalizeServerBaseUrl(rawUrl);
  if (!normalized) return false;

  try {
    const parsed = new URL(normalized);
    return isLocalNetworkHost(parsed.hostname);
  } catch {
    return false;
  }
};

const probeServerHeartbeat = async (baseUrl: string): Promise<{ ok: boolean; mode: string | null }> => {
  if (!baseUrl) return false;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${baseUrl}/api/heartbeat`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const payload = await response.json().catch(() => ({}));
    return { ok: true, mode: payload?.mode || null };
  } catch {
    return { ok: false, mode: null };
  } finally {
    window.clearTimeout(timeout);
  }
};

const resolveLocalOutletTarget = async (setup?: BusinessSetup | null) => {
  const outletPort = Number(import.meta.env.VITE_WHIZ_POS_PORT || 3001);
  let discoveredServers = window.electron?.getDiscoveredServers
    ? await window.electron.getDiscoveredServers()
    : [];
  if ((!discoveredServers || discoveredServers.length === 0) && window.electron?.startDiscovery) {
    try {
      await window.electron.startDiscovery();
      await new Promise(resolve => window.setTimeout(resolve, 500));
      discoveredServers = await window.electron.getDiscoveredServers();
    } catch (error) {
      console.warn('Outlet discovery retry failed:', error);
    }
  }
  const discoveredCandidates = (Array.isArray(discoveredServers) ? discoveredServers : [])
    .map((server: any) => normalizeServerBaseUrl(server?.ip ? `http://${server.ip}:${server.port || 3000}` : ''))
    .filter((candidate: string) => {
      try {
        const parsed = new URL(candidate);
        return Number(parsed.port || 80) !== outletPort;
      } catch {
        return true;
      }
    })
    .filter(Boolean);

  const candidates = [
    isLocalSyncUrl(setup?.apiUrl) ? normalizeServerBaseUrl(setup?.apiUrl) : '',
    isLocalSyncUrl(setup?.backOfficeUrl) ? normalizeServerBaseUrl(setup?.backOfficeUrl) : '',
    ...discoveredCandidates,
  ].filter(Boolean);

  const uniqueCandidates = Array.from(new Set(candidates));
  for (const baseUrl of uniqueCandidates) {
    const probe = await probeServerHeartbeat(baseUrl);
    if (probe.ok && probe.mode !== 'outlet') {
      return {
        baseUrl,
        apiKey: setup?.apiKey || setup?.backOfficeApiKey || '',
      };
    }
  }

  return {
    baseUrl: '',
    apiKey: setup?.apiKey || setup?.backOfficeApiKey || '',
  };
};

const resolveBackOfficeTarget = async (setup?: BusinessSetup | null) => {
  const developerConfig = await getDeveloperServerConfig();
  const candidates = [
    normalizeServerBaseUrl(setup?.backOfficeUrl),
    normalizeServerBaseUrl(developerConfig?.backOfficeUrl),
    normalizeServerBaseUrl(import.meta.env.VITE_BACK_OFFICE_URL),
  ].filter(Boolean);

  const uniqueCandidates = Array.from(new Set(candidates));
  for (const baseUrl of uniqueCandidates) {
    const probe = await probeServerHeartbeat(baseUrl);
    if (probe.ok) {
      return {
        baseUrl,
        apiKey: setup?.backOfficeApiKey || setup?.apiKey || developerConfig?.backOfficeApiKey || import.meta.env.VITE_BACK_OFFICE_API_KEY || '',
      };
    }
  }

  return {
    baseUrl: '',
    apiKey: setup?.backOfficeApiKey || developerConfig?.backOfficeApiKey || import.meta.env.VITE_BACK_OFFICE_API_KEY || '',
  };
};

export const resolveSyncTarget = async (setup?: BusinessSetup | null) => {
  if (setup?.mode === 'outlet') {
    return resolveLocalOutletTarget(setup);
  }

  return resolveBackOfficeTarget(setup);
};

let realtimeSocket: WebSocket | null = null;
let realtimeReconnectTimer: number | null = null;
let realtimeHeartbeatTimer: number | null = null;
let realtimeLastHeartbeat = 0;
let realtimePendingBatch: any[] | null = null;
let realtimePendingBatchId: string | null = null;

const toWsUrl = (httpBaseUrl: string) => {
  const base = normalizeServerBaseUrl(httpBaseUrl);
  if (!base) return '';
  return base.replace(/^https?:\/\//i, (match) => match.toLowerCase() === 'https://' ? 'wss://' : 'ws://');
};

export interface CreditTransaction {
  customerName: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'partially-paid';
}

export interface CashierReport {
  cashierName: string;
  transactions: Transaction[];
  totalSales: number;
  cashTotal: number;
  mpesaTotal: number;
  creditTotal: number;
  creditTransactions: CreditTransaction[];
}

export interface ItemSales {
    name: string;
    quantity: number;
    total: number;
}

export interface ClosingReportData {
  date: string;
  cashiers: CashierReport[];
  itemSales: ItemSales[];
  grandTotal: number;
  totalCash: number;
  totalMpesa: number;
  totalCredit: number;
}

export interface InventoryLog {
    id: string;
    productId: number;
    productName: string;
    oldStock: number;
    newStock: number;
    variance: number;
    cashierName: string;
    timestamp: string;
    reason?: string;
}

export interface DailySummary {
  date: string;
  totalSales: number;
  cashTotal: number;
  mpesaTotal: number;
  creditTotal: number;
  expenseTotal: number;
  transactionCount: number;
}

export interface SavedDocument {
  id: string;
  type: string;
  name: string;
  date: string;
  data: any; // The full state of the document editor
}

interface PosState {
  // Data
  products: Product[];
  cart: CartItem[];
  heldOrders: HeldOrder[];
  transactions: Transaction[];
  dailySummaries: Record<string, DailySummary>; // Archived data
  creditCustomers: CreditCustomer[];
  creditPayments: CreditPayment[];
  inventoryLogs: InventoryLog[];
  users: User[];
  suppliers: Supplier[];
  expenses: Expense[];
  salaries: Salary[];
  documents: SavedDocument[];
  businessSetup: BusinessSetup | null;
  mobileReceipts: any[];
  loyaltyCustomers: LoyaltyCustomer[];
  
  // UI State
  isDataLoaded: boolean;
  currentCashier: User | null;
  isCheckoutOpen: boolean;
  isSetupWizardOpen: boolean;
  isLoginOpen: boolean;
  isKeyboardOpen: boolean;
  activeInput: HTMLInputElement | HTMLTextAreaElement | null;
  keyboardInput: string;
  currentPage: 'pos' | 'reports' | 'customers' | 'settings' | 'closing' | 'dashboard' | 'inventory' | 'loyalty' | 'scanner' | 'sync' | 'register' | 'backoffice' | 'mobile-receipts';
  // Settings
  isOnline: boolean;
  syncQueue: any[];
  lastSyncTime: string | null;
  isSidebarCollapsed: boolean;
  // Transaction Success Popup
  isTransactionSuccessPopupOpen: boolean;
  lastCompletedTransaction: Transaction | null;
  
  // Enhanced features state
  inventoryProducts: Product[];
  loyaltyCustomers: any[];
  syncHistory: any[];
  categories: string[];
  // Outlet pending sync
  pendingOutletTransactions: any[];
  pendingOutletExpenses: any[];
  pendingOutletCreditCustomers: any[];
  realtimeSyncStatus: 'disconnected' | 'connecting' | 'connected' | 'error';

  // Actions
  login: (user: User) => void;
  logout: () => void;
  setProducts: (products: Product[]) => void;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  updateCartItemQuantity: (productId: number, quantity: number) => void;
  setCartItemModifier: (productId: number, modifier: string) => void;
  clearCart: () => void;
  holdCurrentOrder: (label?: string) => void;
  retrieveHeldOrder: (id: string) => void;
  deleteHeldOrder: (id: string) => void;
  
  setCurrentCashier: (user: User | null) => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  openSetupWizard: () => void;
  closeSetupWizard: () => void;
  openLogin: () => void;
  closeLogin: () => void;
  openKeyboard: (inputElement: HTMLInputElement | HTMLTextAreaElement) => void;
  closeKeyboard: () => void;
  updateKeyboardTargetValue: (value: string) => void;
  setKeyboardInput: (value: string) => void;
  setCurrentPage: (page: PosState['currentPage']) => void;

  completeTransaction: (paymentMethod: 'cash' | 'mpesa' | 'credit' | 'card' | 'split', creditCustomer?: string, additionalData?: { amountTendered?: number; change?: number; mpesaCode?: string; phoneNumber?: string; splitPayments?: { method: string; amount: number }[]; loyaltyPointsRedeemed?: number; loyaltyCustomerId?: string; cardReference?: string }) => void;
  reprintTransaction: (transactionId: string) => void;
  reverseTransaction: (transactionId: string) => void;
  saveTransaction: (transaction: Transaction) => void;
  saveCreditCustomer: (customer: CreditCustomer) => void;
  updateCreditCustomer: (id: string, updates: Partial<CreditCustomer>) => void;
  deleteCreditCustomer: (id: string) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addLoyaltyCustomer: (customer: LoyaltyCustomer) => void;
  updateLoyaltyCustomer: (id: string, updates: Partial<LoyaltyCustomer>) => void;
  deleteTransactions: (ids: string[]) => void;
  addSalary: (salary: Salary) => void;
  deleteSalary: (id: string) => void;
  saveBusinessSetup: (setup: Partial<BusinessSetup> & { createdAt?: string }) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  migrateLegacyExpenses: () => Promise<void>;
  saveDocument: (doc: SavedDocument) => void;
  deleteDocument: (id: string) => void;

  // Sync operations
  addToSyncQueue: (operation: any) => void;
  processSyncQueue: () => void;
  syncFromServer: () => void;
  setOnlineStatus: (isOnline: boolean) => void;
  handleMobileDataSync: (payload: any) => void;
  connectRealtimeSync: () => Promise<void>;
  disconnectRealtimeSync: () => void;
  realtimeSyncStatus: 'disconnected' | 'connecting' | 'connected' | 'error';

  // Mobile Receipts
  loadMobileReceipts: () => Promise<void>;
  printMobileReceipt: (receipt: any) => void;
  deleteMobileReceipt: (receipt: any) => void;
  addMobileReceipt: (receipt: any) => void;

  // Reports
  getDailySales: (date: string) => { cash: number; mpesa: number; credit: number; total: number };
  getDailyClosingReport: (date: string) => ClosingReportData;
  getTransactionsByDateRange: (startDate: string, endDate: string) => Transaction[];
  getUnpaidCredits: () => CreditCustomer[];

  // Transaction success popup
  openTransactionSuccessPopup: (transaction: Transaction) => void;
  closeTransactionSuccessPopup: () => void;
  
  // Enhanced features actions
  addProduct: (product: Product) => void;
  updateProduct: (id: number, updates: Partial<Product>) => void;
  deleteProduct: (id: number) => void;
  setCategories: (categories: string[]) => void;
  addCategory: (category: string) => void;
  deleteCategory: (category: string) => void;
  addLoyaltyCustomer: (customer: any) => void;
  updateLoyaltyCustomer: (id: string, updates: any) => void;
  addSyncHistoryItem: (item: any) => void;
  loadInitialData: () => void;
  finishSetup: (businessData: Omit<BusinessSetup, 'createdAt'>, adminUser: Omit<User, 'createdAt' | 'isActive'>) => Promise<void>;
  pushDataToServer: () => Promise<void>;
  addCreditPayment: (customerId: string, amount: number, transactionId?: string) => void;
  addInventoryLog: (log: InventoryLog) => void;
  archiveTransactions: (daysToKeep: number) => Promise<void>;
}

/**
 * Main Zustand store for the POS application.
 * Handles all state management including products, transactions, users, cart, and sync.
 * Persists data to local storage via 'zustand/middleware'.
 */
export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      // Initial state
      products: [],
      cart: [],
      heldOrders: [],
      transactions: [],
      dailySummaries: {},
      creditCustomers: [],
      creditPayments: [],
      inventoryLogs: [],
      loyaltyCustomers: [],
      users: [],
      suppliers: [],
      expenses: [],
      salaries: [],
      documents: [],
      businessSetup: null,
      currentCashier: null,
      isDataLoaded: false,
      isCheckoutOpen: false,
      isSetupWizardOpen: true,
      isLoginOpen: true,
      isKeyboardOpen: false,
      activeInput: null,
      keyboardInput: '',
      currentPage: 'pos',
      isOnline: navigator.onLine,
      syncQueue: [],
      lastSyncTime: null,
      mobileReceipts: [],
      sessionToken: null,
      isSidebarCollapsed: false,
      categories: ['Coffee', 'Tea', 'Pastries', 'Sandwiches', 'Cold Drinks', 'Others'],
      isTransactionSuccessPopupOpen: false,
      lastCompletedTransaction: null,
      pendingOutletTransactions: [],
      pendingOutletExpenses: [],
      pendingOutletCreditCustomers: [],
      realtimeSyncStatus: 'disconnected',

      /**
       * Logs in a user and updates the session state.
       */
      login: async (user) => {
        // Wait, user is passed here, but we need PIN for backend auth.
        // Actually, the LoginScreen handles the PIN input and passes the User object IF validation succeeded locally.
        // But we want STRICT BACKEND validation now.
        // So this 'login' action signature needs to change or the caller needs to handle the backend call.
        // The previous implementation was client-side only.

        // Let's assume the caller (LoginScreen) does:
        // 1. await window.electron.auth.login(userId, pin)
        // 2. if success, calls store.login(user, token)

        // Wait, I can't change the signature easily if many components use it, but only LoginScreen uses it.
        // I'll update it to accept the token too.

        // Actually, to keep it clean, let's just update the state here.
        // The LoginScreen will do the heavy lifting of calling the backend.

        // NO, the store action should probably do the backend call?
        // But 'user' argument implies we already have the user object.

        // Let's stick to: Store just updates state. LoginScreen calls Backend.
        // But I need to store the Session Token!
        // I'll add 'sessionToken' to the store state.
      },

      setSession: (user: User, token: string) => {
          set((state) => ({
              currentCashier: user,
              businessSetup: state.businessSetup ? { ...state.businessSetup, isLoggedIn: true } : null,
              sessionToken: token
          }));
      },

      /**
       * Logs out the current user.
       */
      logout: async () => {
        const state = get();
        if (state.sessionToken && window.electron && window.electron.auth) {
             await window.electron.auth.logout(state.sessionToken);
        }

        set((state) => ({
          currentCashier: null,
          businessSetup: state.businessSetup ? { ...state.businessSetup, isLoggedIn: false } : null,
          sessionToken: null
        }));
      },

      // Product operations
      setProducts: (products) => set({ products }),

      /**
       * Adds a product to the shopping cart.
       * Increments quantity if product already exists.
       */
      addToCart: (product) => {
        const state = get();
        const existingItem = state.cart.find(item => item.product.id === product.id);
        const currentStock = product.stock || 0;
        const alreadyInCart = existingItem ? existingItem.quantity : 0;
        
        if (alreadyInCart >= currentStock) {
          return; // Don't add if out of stock
        }
        
        set((state) => {
          const existingItem = state.cart.find(item => item.product.id === product.id);
          if (existingItem) {
            return {
              cart: state.cart.map(item =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              )
            };
          }
          return {
            cart: [...state.cart, { product, quantity: 1 }]
          };
        });
      },

      removeFromCart: (productId) => {
        set((state) => ({
          cart: state.cart.filter(item => item.product.id !== productId)
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }
        set((state) => ({
          cart: state.cart.map(item =>
            item.product.id === productId
              ? { ...item, quantity }
              : item
          )
        }));
      },

      clearCart: () => set({ cart: [] }),

      updateCartItemQuantity: (productId, quantity) => {
        get().updateQuantity(productId, quantity);
      },

      setCartItemModifier: (productId, modifier) => {
        set((state) => ({
          cart: state.cart.map(item =>
            item.product.id === productId ? { ...item, modifier } : item
          )
        }));
      },

      holdCurrentOrder: (label) => {
        const state = get();
        if (state.cart.length === 0) return;
        const held: HeldOrder = {
          id: `HOLD${Date.now()}`,
          label: label || `Order ${new Date().toLocaleTimeString()}`,
          cart: [...state.cart],
          createdAt: new Date().toISOString(),
          cashier: state.currentCashier?.name
        };
        const heldOrders = [held, ...state.heldOrders];
        set({ heldOrders, cart: [] });
        saveDataToFile('held-orders.json', heldOrders);
      },

      retrieveHeldOrder: (id) => {
        const state = get();
        const order = state.heldOrders.find(h => h.id === id);
        if (!order) return;
        set({
          cart: [...order.cart],
          heldOrders: state.heldOrders.filter(h => h.id !== id)
        });
        const remaining = state.heldOrders.filter(h => h.id !== id);
        saveDataToFile('held-orders.json', remaining);
      },

      deleteHeldOrder: (id) => {
        const heldOrders = get().heldOrders.filter(h => h.id !== id);
        set({ heldOrders });
        saveDataToFile('held-orders.json', heldOrders);
      },

      // User operations
      setCurrentCashier: (user) => set({ currentCashier: user }),

      // UI operations
      openCheckout: () => set({ isCheckoutOpen: true }),
      closeCheckout: () => set({ isCheckoutOpen: false }),
      openSetupWizard: () => set({ isSetupWizardOpen: true }),
      closeSetupWizard: () => set({ isSetupWizardOpen: false }),
      openLogin: () => set({ isLoginOpen: true }),
      closeLogin: () => set({ isLoginOpen: false }),
      openKeyboard: (inputElement) => set({ isKeyboardOpen: true, activeInput: inputElement }),
      closeKeyboard: () => set({ isKeyboardOpen: false, activeInput: null }),

      /**
       * Updates the value of the active input field based on on-screen keyboard input.
       * Dispatches a native 'input' event to ensure React state updates.
       */
      updateKeyboardTargetValue: (value) => {
        const { activeInput, closeKeyboard } = get();
        if (!activeInput) return;

        if (value === 'enter') {
          closeKeyboard();
          return;
        }

        const { selectionStart, selectionEnd, value: currentValue } = activeInput;
        const start = selectionStart || 0;
        const end = selectionEnd || 0;

        let newValue;
        let newCursorPos = start;

        if (value === 'backspace') {
          if (start === end && start > 0) {
            newValue = currentValue.slice(0, start - 1) + currentValue.slice(end);
            newCursorPos = start - 1;
          } else {
            newValue = currentValue.slice(0, start) + currentValue.slice(end);
            newCursorPos = start;
          }
        } else {
          newValue = currentValue.slice(0, start) + value + currentValue.slice(end);
          newCursorPos = start + value.length;
        }

        // Use the native value setter to ensure React detects the change
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;

        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value'
        )?.set;

        if (activeInput instanceof HTMLInputElement && nativeInputValueSetter) {
          nativeInputValueSetter.call(activeInput, newValue);
        } else if (activeInput instanceof HTMLTextAreaElement && nativeTextAreaValueSetter) {
          nativeTextAreaValueSetter.call(activeInput, newValue);
        } else {
          activeInput.value = newValue;
        }

        const event = new Event('input', { bubbles: true });
        activeInput.dispatchEvent(event);
        activeInput.selectionStart = activeInput.selectionEnd = newCursorPos;
      },
      setKeyboardInput: (value) => set({ keyboardInput: value }),
      setCurrentPage: (page) => set({ currentPage: page }),

      // Transaction operations
      /**
       * Completes a transaction, saves it, updates credit if needed, and prints receipt.
       */
      openTransactionSuccessPopup: (transaction: Transaction) => {
        set({ isTransactionSuccessPopupOpen: true, lastCompletedTransaction: transaction });
      },
      closeTransactionSuccessPopup: () => {
        set({ isTransactionSuccessPopupOpen: false, lastCompletedTransaction: null });
      },
      completeTransaction: (paymentMethod, creditCustomerName, additionalData) => {
        const state = get();
        if (!state.currentCashier) return;

        const subtotal = state.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        const tax = 0; // Assuming tax is handled elsewhere or is 0
        const total = subtotal + tax;

        const transaction: Transaction = {
          id: `TXN${Date.now()}`,
          timestamp: new Date().toISOString(),
          items: [...state.cart],
          subtotal,
          tax,
          total,
          paymentMethod,
          cashier: state.currentCashier.name,
          creditCustomer: creditCustomerName,
          status: 'completed',
          ...additionalData
        };

        // --- ABSOLUTELY FIRST: SHOW SUCCESS POPUP ---
        if ((state.businessSetup as any)?.disableReceiptPrinting) {
            state.openTransactionSuccessPopup(transaction);
        }

        // --- THEN CLEAR CART AND CLOSE CHECKOUT ---
        state.clearCart();
        state.closeCheckout();

        // --- THEN DO EVERYTHING ELSE ---
        state.saveTransaction(transaction);
        
        if (state.businessSetup?.mode === 'outlet') {
            set(s => {
              const newPending = [...s.pendingOutletTransactions, transaction];
              saveDataToFile('pending-outlet-transactions.json', newPending);
              return { pendingOutletTransactions: newPending };
            });
            setTimeout(() => {
              const outletState = get();
              if (outletState.businessSetup?.outletId) {
                outletState.processSyncQueue();
                outletState.syncFromServer();
              }
            }, 0);
        } else {
            state.addToSyncQueue({ type: 'new-transaction', data: transaction });
        }
        logAudit('transaction.completed', {
          transactionId: transaction.id,
          total,
          paymentMethod,
          userId: state.currentCashier?.id,
          outletId: state.businessSetup?.outletId
        });

        // Update Stock
        const currentState = get();
        // Initialize currentStock from products if not available
        const currentStockFromBusiness = currentState.businessSetup?.currentStock || {};
        const initialStockFromBusiness = currentState.businessSetup?.initialStock || {};
        const updatedCurrentStock: Record<string, number> = {};
        
        // Initialize with current or initial stock
        currentState.products.forEach(product => {
            const productId = String(product.id || product.productId);
            if (typeof currentStockFromBusiness[productId] !== 'undefined') {
                updatedCurrentStock[productId] = Number(currentStockFromBusiness[productId]);
            } else if (typeof initialStockFromBusiness[productId] !== 'undefined') {
                updatedCurrentStock[productId] = Number(initialStockFromBusiness[productId]);
            } else if (typeof product.stock !== 'undefined') {
                updatedCurrentStock[productId] = Number(product.stock);
            }
        });

        // Apply transaction stock deductions
        transaction.items.forEach(item => {
           const productId = String(item.product.id || item.product.productId);
           if (productId) {
               const product = currentState.products.find(p => 
                   String(p.id) === productId || String(p.productId) === productId
               );
               if (product) {
                   const currentStockValue = Number(updatedCurrentStock[productId] ?? product.stock ?? 0);
                   const newStock = Math.max(0, currentStockValue - item.quantity);
                   
                   // Update the product in the state
                   state.updateProduct(productId, { stock: newStock });
                   
                   // Update the businessSetup's currentStock
                   updatedCurrentStock[productId] = newStock;
               }
           }
        });
        
        // If we're in outlet mode, update the businessSetup's currentStock
        if (currentState.businessSetup?.mode === 'outlet') {
            set(s => ({
                businessSetup: {
                    ...s.businessSetup,
                    currentStock: updatedCurrentStock
                }
            }));
            // Save the updated businessSetup to file
            saveDataToFile('business-setup.json', { ...currentState.businessSetup, currentStock: updatedCurrentStock });
        }

        // Handle credit customer
        if (paymentMethod === 'credit' && creditCustomerName) {
            const existingCustomer = state.creditCustomers.find(c => c.name === creditCustomerName);

            if (existingCustomer) {
                const updatedCustomer: Partial<CreditCustomer> = {
                    totalCredit: (existingCustomer.totalCredit || 0) + total,
                    balance: (existingCustomer.balance || 0) + total,
                    transactions: [...(existingCustomer.transactions || []), transaction.id],
                    lastUpdated: new Date().toISOString(),
                };
                state.updateCreditCustomer(existingCustomer.id, updatedCustomer);
            } else {
                const newCustomer: CreditCustomer = {
                    id: `CUST${Date.now()}`,
                    name: creditCustomerName,
                    phone: '',
                    totalCredit: total,
                    paidAmount: 0,
                    balance: total,
                    transactions: [transaction.id],
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                };
                state.saveCreditCustomer(newCustomer);
            }
        }

        // Handle Loyalty Points (earn on any customer-linked sale; redeem via additionalData)
        const loyaltyId = additionalData?.loyaltyCustomerId;
        const pointsRedeemed = additionalData?.loyaltyPointsRedeemed || 0;
        if (loyaltyId) {
            const loyaltyCustomer = state.loyaltyCustomers.find(c => c.id === loyaltyId);
            if (loyaltyCustomer) {
                const newTotalSpent = loyaltyCustomer.totalSpent + total;
                let newTier: LoyaltyCustomer['tier'] = loyaltyCustomer.tier;
                if (newTotalSpent >= 10000) newTier = 'Platinum';
                else if (newTotalSpent >= 5000) newTier = 'Gold';
                else if (newTotalSpent >= 2000) newTier = 'Silver';

                const pointsEarned = Math.floor(total / 10);
                const newPoints = Math.max(0, loyaltyCustomer.points - pointsRedeemed + pointsEarned);

                state.updateLoyaltyCustomer(loyaltyCustomer.id, {
                    points: newPoints,
                    totalSpent: newTotalSpent,
                    visitsCount: loyaltyCustomer.visitsCount + 1,
                    lastVisit: new Date().toISOString(),
                    tier: newTier
                });
            }
        } else if (creditCustomerName) {
            const loyaltyCustomer = state.loyaltyCustomers.find(c => c.name === creditCustomerName);
            if (loyaltyCustomer) {
                const newTotalSpent = loyaltyCustomer.totalSpent + total;
                let newTier: LoyaltyCustomer['tier'] = loyaltyCustomer.tier;
                if (newTotalSpent >= 10000) newTier = 'Platinum';
                else if (newTotalSpent >= 5000) newTier = 'Gold';
                else if (newTotalSpent >= 2000) newTier = 'Silver';

                const pointsEarned = Math.floor(total / 10);

                state.updateLoyaltyCustomer(loyaltyCustomer.id, {
                    points: loyaltyCustomer.points + pointsEarned,
                    totalSpent: newTotalSpent,
                    visitsCount: loyaltyCustomer.visitsCount + 1,
                    lastVisit: new Date().toISOString(),
                    tier: newTier
                });
            }
        }

        // Print receipt if enabled
        if (!((state.businessSetup as any)?.disableReceiptPrinting) && window.electron && state.businessSetup) {
            window.electron.printReceipt(transaction, state.businessSetup, false);
        }
      },

      reprintTransaction: (transactionId) => {
        const state = get();
        const transaction = state.transactions.find(t => t.id === transactionId);
        if (transaction && window.electron && state.businessSetup) {
          window.electron.printReceipt(transaction, state.businessSetup, true);
        }
      },

      reverseTransaction: (transactionId) => {
         const state = get();
         if (state.businessSetup?.mode === 'outlet') {
             alert("Voiding transactions is forbidden on Outlet Terminals.");
             return;
         }

         set((state) => {
             const transaction = state.transactions.find(t => t.id === transactionId);
             if (!transaction) return {};

             // 1. Mark transaction as 'reversed' status, do NOT delete it, so we have a record.
             // Or user said "reverse... incase invalid".
             // If we delete, we lose record. If we reverse, we keep record but marked as reversed.
             // Let's mark as reversed status and filter it out in calculations/reports where necessary?
             // Actually, usually a reversal is a new negative transaction or just updating status.
             // Given the previous requirement of "deleting receipts", user might want it GONE from sales but kept for audit?
             // "ability to reverse a transaction in the old receipts incase an invalid or sale was incomplete or wrong items"
             // Best practice: Update status to 'refunded'/'reversed' and restore stock.

             const updatedTransactions = state.transactions.map(t =>
                 t.id === transactionId ? { ...t, status: 'refunded' } : t
             );

             // 2. Restore Stock
             const updatedProducts = state.products.map(p => {
                 const item = transaction.items.find(i => i.product.id === p.id);
                 if (item && typeof p.stock === 'number') {
                     return { ...p, stock: p.stock + item.quantity };
                 }
                 return p;
             });

             // 3. Handle Credit Reversal if applicable
             let updatedCreditCustomers = state.creditCustomers;
             if (transaction.paymentMethod === 'credit' && transaction.creditCustomer) {
                 updatedCreditCustomers = state.creditCustomers.map(c => {
                     if (c.name === transaction.creditCustomer) {
                         return {
                             ...c,
                             totalCredit: Math.max(0, (c.totalCredit || 0) - transaction.total),
                             balance: Math.max(0, (c.balance || 0) - transaction.total),
                             // We don't remove the transaction ID, but the balance decreases.
                             // The transaction itself is now 'refunded' so it shouldn't count towards debt?
                             // But we just subtracted the total.
                             lastUpdated: new Date().toISOString()
                         };
                     }
                     return c;
                 });
             }

             // Save changes
             saveDataToFile('transactions.json', updatedTransactions);
             saveDataToFile('products.json', updatedProducts);
             saveDataToFile('credit-customers.json', updatedCreditCustomers);

             // Sync
             state.addToSyncQueue({ type: 'update-transaction', data: { id: transactionId, updates: { status: 'refunded' } } });
             transaction.items.forEach(item => {
                if (item.product && item.product.id) {
                     const currentProduct = updatedProducts.find(p => p.id === item.product.id);
                     if (currentProduct) {
                         state.addToSyncQueue({ type: 'update-product', data: { id: item.product.id, updates: { stock: currentProduct.stock } } });
                     }
                }
             });

             return {
                 transactions: updatedTransactions,
                 products: updatedProducts,
                 creditCustomers: updatedCreditCustomers
             };
         });
      },

      saveTransaction: (transaction) => {
        const state = get();
        const updatedTransaction = {
            ...transaction,
            synced: state.businessSetup?.mode === 'server'
        };
        set((state) => {
          const updatedTransactions = [updatedTransaction, ...state.transactions];
          saveDataToFile('transactions.json', updatedTransactions);
          return { transactions: updatedTransactions };
        });
      },

      saveCreditCustomer: (customer) => {
        set((state) => {
          const updatedCustomers = [...state.creditCustomers, customer];
          saveDataToFile('credit-customers.json', updatedCustomers);
          state.addToSyncQueue({ type: 'add-credit-customer', data: customer });
          // If in outlet mode, add to pendingOutletCreditCustomers too!
          if (state.businessSetup?.mode === 'outlet') {
            const newPendingCustomers = [...state.pendingOutletCreditCustomers, customer];
            saveDataToFile('pending-outlet-credit-customers.json', newPendingCustomers);
            setTimeout(() => { get().processSyncQueue(); get().syncFromServer(); }, 0);
            return { 
              creditCustomers: updatedCustomers, 
              pendingOutletCreditCustomers: newPendingCustomers 
            };
          }
          return { creditCustomers: updatedCustomers };
        });
      },

      updateCreditCustomer: (id, updates) => {
        set((state) => {
            const updatedCustomers = state.creditCustomers.map(customer =>
                customer.id === id ? { ...customer, ...updates, lastUpdated: new Date().toISOString() } : customer
            );
            saveDataToFile('credit-customers.json', updatedCustomers);
            state.addToSyncQueue({ type: 'update-credit-customer', data: { id, updates } });
            return { creditCustomers: updatedCustomers };
        });
      },

      addLoyaltyCustomer: (customer) => {
          set((state) => {
              const updatedCustomers = [...state.loyaltyCustomers, customer];
              saveDataToFile('loyalty-customers.json', updatedCustomers);
              state.addToSyncQueue({ type: 'add-loyalty-customer', data: customer });
              return { loyaltyCustomers: updatedCustomers };
          });
      },

      updateLoyaltyCustomer: (id, updates) => {
          set((state) => {
              const updatedCustomers = state.loyaltyCustomers.map(c =>
                  c.id === id ? { ...c, ...updates } : c
              );
              saveDataToFile('loyalty-customers.json', updatedCustomers);
              state.addToSyncQueue({ type: 'update-loyalty-customer', data: { id, updates } });
              return { loyaltyCustomers: updatedCustomers };
          });
      },

      addCreditPayment: (customerId: string, amount: number, transactionId?: string) => {
        set((state) => {
            const customer = state.creditCustomers.find(c => c.id === customerId);
            if (!customer) return {};

            const newPaidAmount = (customer.paidAmount || 0) + amount;
            const newBalance = (customer.balance || 0) - amount;

            const payment: CreditPayment = {
                id: `CP${Date.now()}`,
                customerId,
                amount,
                date: new Date().toISOString(),
                cashierId: state.currentCashier?.id,
                transactionId
            };

            const updatedPayments = [...state.creditPayments, payment];
            saveDataToFile('credit-payments.json', updatedPayments); // Assuming new file
            state.addToSyncQueue({ type: 'add-credit-payment', data: payment });

            const updatedCustomers = state.creditCustomers.map(c =>
                c.id === customerId
                ? { ...c, paidAmount: newPaidAmount, balance: Math.max(0, newBalance) }
                : c
            );
            saveDataToFile('credit-customers.json', updatedCustomers);
            state.addToSyncQueue({ type: 'update-credit-customer', data: { id: customerId, updates: { paidAmount: newPaidAmount, balance: newBalance } } });

            return {
                creditPayments: updatedPayments,
                creditCustomers: updatedCustomers
            };
        });
      },

      addInventoryLog: (log: InventoryLog) => {
          set((state) => {
              const updatedLogs = [log, ...state.inventoryLogs];
              saveDataToFile('inventory-logs.json', updatedLogs);
              state.addToSyncQueue({ type: 'add-inventory-log', data: log });
              return { inventoryLogs: updatedLogs };
          });
      },

      deleteCreditCustomer: (id) => {
        set((state) => {
          const updatedCustomers = state.creditCustomers.filter(customer => customer.id !== id);
          saveDataToFile('credit-customers.json', updatedCustomers);
          state.addToSyncQueue({ type: 'delete-credit-customer', data: { id } });
          return { creditCustomers: updatedCustomers };
        });
      },

      addExpense: (expense) => {
        set((state) => {
          const updatedExpenses = [expense, ...state.expenses];
          saveDataToFile('expenses.json', updatedExpenses);
          state.addToSyncQueue({ type: 'add-expense', data: expense });
          // If in outlet mode, add to pendingOutletExpenses too!
          if (state.businessSetup?.mode === 'outlet') {
            const newPendingExpenses = [...state.pendingOutletExpenses, expense];
            saveDataToFile('pending-outlet-expenses.json', newPendingExpenses);
            setTimeout(() => { get().processSyncQueue(); get().syncFromServer(); }, 0);
            return { 
              expenses: updatedExpenses, 
              pendingOutletExpenses: newPendingExpenses 
            };
          }
          return { expenses: updatedExpenses };
        });
      },

  updateExpense: (id, updates) => {
    set((state) => {
      const updatedExpenses = state.expenses.map(expense =>
        expense.id === id ? { ...expense, ...updates } : expense
      );
      saveDataToFile('expenses.json', updatedExpenses);
      // Ensure data has the ID for the backend to identify it
      state.addToSyncQueue({ type: 'update-expense', data: { id, updates } });
      return { expenses: updatedExpenses };
    });
  },

  deleteExpense: (id) => {
    set((state) => {
      const updatedExpenses = state.expenses.filter(expense => expense.id !== id);
      saveDataToFile('expenses.json', updatedExpenses);
      state.addToSyncQueue({ type: 'delete-expense', data: { id } });
      return { expenses: updatedExpenses };
    });
  },

      addSalary: (salary) => {
        set((state) => {
          const updatedSalaries = [salary, ...state.salaries];
          saveDataToFile('salaries.json', updatedSalaries);
          state.addToSyncQueue({ type: 'add-salary', data: salary });
          return { salaries: updatedSalaries };
        });
      },

      deleteSalary: (id) => {
        set((state) => {
          const updatedSalaries = state.salaries.filter(s => s.id !== id);
          saveDataToFile('salaries.json', updatedSalaries);
          state.addToSyncQueue({ type: 'delete-salary', data: { id } });
          return { salaries: updatedSalaries };
        });
      },

      addSupplier: (supplier) => {
        set((state) => {
          const updatedSuppliers = [...state.suppliers, supplier];
          saveDataToFile('suppliers.json', updatedSuppliers);
          state.addToSyncQueue({ type: 'add-supplier', data: supplier });
          return { suppliers: updatedSuppliers };
        });
      },

      updateSupplier: (id, updates) => {
        set((state) => {
          const updatedSuppliers = state.suppliers.map(s =>
            s.id === id ? { ...s, ...updates } : s
          );
          saveDataToFile('suppliers.json', updatedSuppliers);
          state.addToSyncQueue({ type: 'update-supplier', data: { id, updates } });
          return { suppliers: updatedSuppliers };
        });
      },

      deleteSupplier: (id) => {
        set((state) => {
          const updatedSuppliers = state.suppliers.filter(s => s.id !== id);
          saveDataToFile('suppliers.json', updatedSuppliers);
          state.addToSyncQueue({ type: 'delete-supplier', data: { id } });
          return { suppliers: updatedSuppliers };
        });
      },

      migrateLegacyExpenses: async () => {
        const state = get();

        // 1. Ensure "Others" Supplier exists
        let othersSupplier = state.suppliers.find(s => s.name === 'Others');
        let updatedSuppliers = [...state.suppliers];

        if (!othersSupplier) {
            othersSupplier = {
                id: `SUP${Date.now()}`,
                name: 'Others',
                contact: '0740 841 168',
                location: '02-00223 Kagwe',
                active: true,
                notes: 'Legacy Data Container',
                createdAt: new Date().toISOString()
            };
            updatedSuppliers.push(othersSupplier);
            state.addToSyncQueue({ type: 'add-supplier', data: othersSupplier });
        }

        // 2. Find legacy expenses (missing supplierId)
        const expensesToMigrate = state.expenses.filter(e => !e.supplierId);

        if (expensesToMigrate.length === 0 && state.suppliers.length === updatedSuppliers.length) {
            return; // Nothing to do
        }

        const updatedExpenses = state.expenses.map(e => {
            if (!e.supplierId) {
                // Queue update for each expense migration
                // Note: We create a local modified object. The queue needs the ID and updates.
                const updates = { supplierId: othersSupplier!.id, supplierName: 'Others' };
                state.addToSyncQueue({ type: 'update-expense', data: { id: e.id, updates } });
                return { ...e, ...updates };
            }
            return e;
        });

        // 3. Save Changes
        set({ suppliers: updatedSuppliers, expenses: updatedExpenses });
        await saveDataToFile('suppliers.json', updatedSuppliers);
        await saveDataToFile('expenses.json', updatedExpenses);
      },

      saveDocument: (doc) => {
        set((state) => {
          const updatedDocs = [doc, ...state.documents.filter(d => d.id !== doc.id)];
          saveDataToFile('documents.json', updatedDocs);
          return { documents: updatedDocs };
        });
      },

      deleteDocument: (id) => {
        set((state) => {
          const updatedDocs = state.documents.filter(d => d.id !== id);
          saveDataToFile('documents.json', updatedDocs);
          return { documents: updatedDocs };
        });
      },

      saveBusinessSetup: (setup) => {
        saveDataToFile('business-setup.json', setup);
        set((state) => {
            state.addToSyncQueue({ type: 'update-business-setup', data: setup });
            return { businessSetup: setup };
        });
      },

      // Sync operations
      addToSyncQueue: (operation) => {
        set((state) => {
          const updatedQueue = [...state.syncQueue, operation];
          saveDataToFile('sync-queue.json', updatedQueue);
          return {
            syncQueue: updatedQueue
          };
        });
        // Trigger sync in background without blocking UI
        setTimeout(() => get().processSyncQueue(), 0);
      },

      processSyncQueue: async () => {
        const state = get();
        if (state.syncQueue.length === 0) return;

        const queue = [...state.syncQueue];
        const { baseUrl, apiKey } = await resolveSyncTarget(state.businessSetup);

        try {
          const preparedQueue = [];
          for (const operation of queue) {
            if (operation.type === 'upload-image') {
              const localPath = operation.data?.localPath;
              if (!localPath || !window.electron?.uploadImage || !baseUrl || !apiKey) {
                continue;
              }

              const { imageUrl } = await window.electron.uploadImage(localPath, baseUrl, apiKey);
              preparedQueue.push({
                type: 'update-product',
                data: {
                  id: operation.data.productId,
                  updates: { image: imageUrl, localImage: localPath }
                }
              });
              continue;
            }

            preparedQueue.push(operation);
          }

          if (preparedQueue.length === 0) {
            set({ lastSyncTime: new Date().toISOString() });
            return;
          }

          if (state.businessSetup?.mode === 'outlet') {
            // For outlets: don't use the regular /api/sync endpoint at all
            // Outlets sync transactions via syncFromServer, not processSyncQueue is not needed for them
            return;
          }

          // Server / back-office HTTP fallback
          if (!state.isOnline || !baseUrl || !apiKey) return;

          set({ syncQueue: [] });
          saveDataToFile('sync-queue.json', []);

          const response = await fetch(`${baseUrl}/api/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(preparedQueue)
          });

          if (!response.ok) {
            throw new Error(`Sync failed with status: ${response.status}`);
          }

          set({ lastSyncTime: new Date().toISOString() });
          get().syncFromServer();

        } catch (error) {
          console.error('Sync failed:', error);
          set((state) => {
            const restoredQueue = [...queue, ...state.syncQueue];
            saveDataToFile('sync-queue.json', restoredQueue);
            return {
              syncQueue: restoredQueue
            };
          });
        }
      },

      syncFromServer: async () => {
        // Fetch config from initial state, but DO NOT use data state here to avoid stale closures
        const configState = get();
        const { baseUrl: apiUrl, apiKey } = await resolveSyncTarget(configState.businessSetup);

        // Add debug logging for diagnosis
        console.log('=== syncFromServer called ===');
        console.log('configState.isOnline:', configState.isOnline);
        console.log('configState.businessSetup:', configState.businessSetup);
        console.log('apiUrl:', apiUrl);

        let currentOutletId = configState.businessSetup?.outletId || configState.businessSetup?.outletCode;
        console.log('currentOutletId:', currentOutletId);

        let serverData: any = null;

        // v8 outlet-scoped pull: outlet must only receive its assignments from the server
        const isOutlet = configState.businessSetup?.mode === 'outlet';
        
        // FIRST: Send pending outlet transactions, expenses, credit customers, and current stock to server!
        if (isOutlet && currentOutletId && apiUrl) {
            try {
                console.log('Sending outlet data to server...');
                const transactionsToSend = [...configState.pendingOutletTransactions];
                const expensesToSend = [...configState.pendingOutletExpenses];
                const customersToSend = [...configState.pendingOutletCreditCustomers];
                
                // Send transactions
                const txResponse = await fetch(`${apiUrl}/api/outlet-sync/${currentOutletId}/transactions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        transactions: transactionsToSend,
                        currentStock: configState.businessSetup?.currentStock || {} 
                    })
                });

                let allOk = true;
                if (txResponse.ok) {
                    console.log('Outlet transactions synced successfully!');
                    if (transactionsToSend.length > 0) {
                        set({ pendingOutletTransactions: [] });
                        saveDataToFile('pending-outlet-transactions.json', []);
                    }
                } else {
                    console.error(`Failed to sync outlet transactions: ${txResponse.status} ${txResponse.statusText}`);
                    allOk = false;
                }

                // Send expenses
                const expResponse = await fetch(`${apiUrl}/api/outlet-sync/${currentOutletId}/expenses`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ expenses: expensesToSend })
                });

                if (expResponse.ok) {
                    console.log('Outlet expenses synced successfully!');
                    if (expensesToSend.length > 0) {
                        set({ pendingOutletExpenses: [] });
                        saveDataToFile('pending-outlet-expenses.json', []);
                    }
                } else {
                    console.error(`Failed to sync outlet expenses: ${expResponse.status} ${expResponse.statusText}`);
                    allOk = false;
                }

                // Send credit customers
                const custResponse = await fetch(`${apiUrl}/api/outlet-sync/${currentOutletId}/credit-customers`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ customers: customersToSend })
                });

                if (custResponse.ok) {
                    console.log('Outlet customers synced successfully!');
                    if (customersToSend.length > 0) {
                        set({ pendingOutletCreditCustomers: [] });
                        saveDataToFile('pending-outlet-credit-customers.json', []);
                    }
                } else {
                    console.error(`Failed to sync outlet customers: ${custResponse.status} ${custResponse.statusText}`);
                    allOk = false;
                }

                if (allOk) {
                    set({ isOnline: true });
                } else {
                    set({ isOnline: false });
                }
            } catch (error) {
                console.error('Failed to sync outlet data:', error);
                set({ isOnline: false });
            }
        }

        // Try to sync even if we don't have outletId yet, in case businessSetup has apiUrl/outletCode
        if (isOutlet && apiUrl) {
            // Try to get outletId from either outletId or outletCode
            const outletIdToUse = currentOutletId || configState.businessSetup?.outletCode;
            
            if (outletIdToUse) {
                try {
                    console.log(`Outlet sync: ${apiUrl}/api/outlet-sync/${outletIdToUse}`);
                    const response = await fetch(`${apiUrl}/api/outlet-sync/${outletIdToUse}`);
                    if (!response.ok) {
                        console.error(`Outlet sync fetch failed: ${response.status} ${response.statusText}`);
                        set({ isOnline: false });
                    } else {
                        serverData = await response.json();
                        console.log('Outlet sync response:', serverData);
                        set({ isOnline: true });
                        
                        // If server returns outletId/outletCode, use those
                        if (serverData.outletId || serverData.outletCode) {
                            currentOutletId = serverData.outletId || serverData.outletCode;
                        }
                    }
                } catch (error) {
                    console.error('Failed to outlet-sync from server:', error);
                    set({ isOnline: false });
                }
            }
        }

        // For outlets, don't try the general /api/sync fallback at all!
        if (isOutlet) {
            if (!serverData) {
                console.log('Outlet sync: No data received, skipping fallback sync');
                return;
            }
        } else {
            // Fallback to HTTP Sync only for non-outlet modes
            if (!serverData) {
              if (!apiUrl) { console.debug("Sync skipped: No API URL"); return; }
              if (!apiKey) { console.debug("Sync skipped: No API Key"); return; }

                try {
                  console.debug(`Syncing from server: ${apiUrl}/api/sync`);
                  const response = await fetch(`${apiUrl}/api/sync`, {
                    headers: {
                      'Authorization': `Bearer ${apiKey}`
                    }
                  });

                  if (!response.ok) {
                     console.error(`Sync fetch failed: ${response.status} ${response.statusText}`);
                     return;
                  }

                  serverData = await response.json();
                } catch (error) {
                  console.error('Failed to sync from server:', error);
                  return;
                }
            }
        }

        if (!serverData) return;

        try {
          // v8 outlet scoped payload shape
          if (configState.businessSetup?.mode === 'outlet' && serverData && (serverData.products || serverData.users)) {
              const products = Array.isArray(serverData.products) ? serverData.products : [];
              const users = Array.isArray(serverData.users) ? serverData.users : [];
              const categories = Array.isArray(serverData.categories) ? serverData.categories : [];
              const creditCustomers = Array.isArray(serverData.creditCustomers) ? serverData.creditCustomers : [];
              const expenses = Array.isArray(serverData.expenses) ? serverData.expenses : [];
              const currentBusinessSetup = get().businessSetup;
              
              // Get stock from server data - currentStock is priority!
              const initialStock = serverData.initialStock || {};
              const serverCurrentStock = serverData.currentStock || serverData.assignments?.currentStock || initialStock;
              
              console.log('syncFromServer (Outlet mode): Using server currentStock', serverCurrentStock);
              
              // Update products with outlet-specific stock!
              const productsWithOutletStock = products.map(product => {
                  const id = String(product.id ?? '');
                  const productId = String(product.productId ?? '');
                  const outletStock = 
                    serverCurrentStock[id] ?? 
                    serverCurrentStock[productId] ?? 
                    initialStock[id] ?? 
                    initialStock[productId] ?? 
                    product.stock ?? 0;
                  console.log('syncFromServer (Outlet mode): Product:', product.name, 'id:', id, 'productId:', productId, 'outletStock:', outletStock);
                  return {
                      ...product,
                      stock: Number(outletStock)
                  };
              });
              
              console.log('syncFromServer (Outlet mode): Received data', {
                products: products.length,
                productsWithOutletStock,
                users: users.length,
                usersList: users,
                initialStock,
                serverCurrentStock
              });
              
              const updatedBusinessSetup = {
                  ...currentBusinessSetup,
                  apiKey: serverData.apiKey || currentBusinessSetup?.apiKey,
                  outletId: serverData.outletCode || serverData.outletId || currentBusinessSetup?.outletId,
                  outletCode: serverData.outletCode || serverData.outletId || currentBusinessSetup?.outletCode,
                  businessShortcode: serverData.businessShortcode || currentBusinessSetup?.businessShortcode,
                  assignedProductIds: serverData.assignedProductIds || serverData.assignments?.productIds || currentBusinessSetup?.assignedProductIds,
                  assignedUserIds: serverData.assignedUserIds || serverData.assignments?.userIds || currentBusinessSetup?.assignedUserIds,
                  initialStock: serverData.initialStock || currentBusinessSetup?.initialStock,
                  currentStock: serverCurrentStock,
                  status: 'approved', // IMPORTANT: Set status to approved when syncing from server!
                  ...serverData.businessSetup
              } as BusinessSetup;

              console.log('Setting users:', users);
              
              set({
                  products: productsWithOutletStock as Product[],
                  users: users.map(normalizeUserRecord) as User[],
                  categories,
                  creditCustomers,
                  expenses,
                  businessSetup: updatedBusinessSetup
              });

              saveDataToFile('products.json', productsWithOutletStock);
              saveDataToFile('categories.json', categories);
              saveDataToFile('credit-customers.json', creditCustomers);
              saveDataToFile('expenses.json', expenses);
              saveDataToFile('users.json', users);
              saveDataToFile('business-setup.json', updatedBusinessSetup);

              set({ lastSyncTime: new Date().toISOString() });
              return;
          }

          // CRITICAL FIX: Get the LATEST state right before merging.
          // This prevents overwriting new local items created while 'directDbPull' was running.
          const currentState = get();

          const sanitizeAndMerge = (local: any[], server: any[], isProducts = false) => {
             // Filter out invalid products first
             let validLocal = local;
             let validServer = server;

             if (isProducts) {
                 const isValidProduct = (p: any) => {
                     if (!p.name || p.name.trim() === '') return false;
                     const price = Number(p.price);
                     return !isNaN(price) && price > 0;
                 };
                 validLocal = local.filter(isValidProduct);
                 validServer = server.filter(isValidProduct);
             }

             // Index local items by Name for smart matching (specifically for products)
             const localMapByName = isProducts
                 ? new Map(validLocal.map(i => [i.name?.trim().toLowerCase(), i]))
                 : new Map();

             // 1. Sanitize Server Data
             let sanitizedServer = validServer.map(item => {
                 if (!item.id || String(item.id) === 'null' || String(item.id) === 'NaN') {
                     // Try to match with local item by name to prevent duplication
                     if (isProducts && item.name) {
                         const match = localMapByName.get(item.name.trim().toLowerCase());
                         if (match) {
                             // Found local match! Use local ID.
                             item.id = match.id;
                             return item;
                         }
                         // No match? Generate a STABLE ID based on name hash.
                         // This ensures "Coffee" always gets ID X, avoiding duplicates on next sync.
                         item.id = generateStableId(item.name);
                     } else {
                         item.id = isProducts ? generateRandomId() : `FIX${Date.now()}${Math.floor(Math.random() * 1000)}`;
                     }
                 }
                 if (isProducts && (!item.productId || String(item.productId) === 'null' || String(item.productId) === 'NaN')) {
                     item.productId = item.id;
                 }
                 return item;
             });

             // 2. Sanitize Local Data
             let sanitizedLocal = validLocal.map(item => {
                 if (!item.id || String(item.id) === 'null' || String(item.id) === 'NaN') {
                      if (isProducts && item.name) {
                          item.id = generateStableId(item.name);
                      } else {
                          item.id = isProducts ? generateRandomId() : `FIX${Date.now()}${Math.floor(Math.random() * 1000)}`;
                      }
                 }
                 if (isProducts && (!item.productId || String(item.productId) === 'null' || String(item.productId) === 'NaN')) {
                     item.productId = item.id;
                 }
                 return item;
             });

             // Deduplicate products by name and keep the one with the highest stock
             if (isProducts) {
                 const deduplicateByName = (items: any[]) => {
                     const uniqueMap = new Map();
                     items.forEach(item => {
                         const nameKey = item.name.trim().toLowerCase();
                         if (!uniqueMap.has(nameKey)) {
                             uniqueMap.set(nameKey, item);
                         } else {
                             const existing = uniqueMap.get(nameKey);
                             const existingStock = Number(existing.stock) || 0;
                             const newStock = Number(item.stock) || 0;
                             if (newStock > existingStock) {
                                 uniqueMap.set(nameKey, item);
                             }
                         }
                     });
                     return Array.from(uniqueMap.values());
                 };
                 sanitizedLocal = deduplicateByName(sanitizedLocal);
                 sanitizedServer = deduplicateByName(sanitizedServer);
             }

             const serverDataById = new Map(sanitizedServer.map(item => [String(item.id), item]));

             // Merge strategy: Overwrite local if server is newer
             const mergedMap = new Map<string, any>();

             sanitizedLocal.forEach(localItem => {
                 const serverItem = serverDataById.get(String(localItem.id));
                 if (serverItem) {
                     const serverTimestamp = new Date(serverItem.updatedAt || serverItem.createdAt || 0);
                     const localTimestamp = new Date(localItem.updatedAt || localItem.createdAt || 0);
                     if (serverTimestamp.getTime() > localTimestamp.getTime()) {
                         mergedMap.set(String(localItem.id), serverItem);
                     } else {
                         mergedMap.set(String(localItem.id), localItem);
                     }
                 } else {
                     mergedMap.set(String(localItem.id), localItem);
                 }
             });

             // Add new items from server
             sanitizedServer.forEach(serverItem => {
                 if (!mergedMap.has(String(serverItem.id))) {
                     mergedMap.set(String(serverItem.id), serverItem);
                 }
             });

             return Array.from(mergedMap.values());
          };

          const newProducts = sanitizeAndMerge(currentState.products, serverData.products || [], true);
          const newUsers = sanitizeAndMerge(currentState.users, serverData.users || []);
          const newExpenses = sanitizeAndMerge(currentState.expenses, serverData.expenses || []);
          const newSalaries = sanitizeAndMerge(currentState.salaries, serverData.salaries || []);
          const newCreditCustomers = sanitizeAndMerge(currentState.creditCustomers, serverData.creditCustomers || []);
          const newLoyaltyCustomers = sanitizeAndMerge(currentState.loyaltyCustomers, serverData.loyaltyCustomers || []);
          const newSuppliers = sanitizeAndMerge(currentState.suppliers, serverData.suppliers || []);
          
          let newCategories = currentState.categories;
          if (serverData.categories && Array.isArray(serverData.categories)) {
            const serverCategoryNames = serverData.categories.map((c: any) => 
              typeof c === 'string' ? c : c.name
            );
            newCategories = [...new Set([...currentState.categories, ...serverCategoryNames])];
          }

          let newBusinessSetup = currentState.businessSetup;
          if (serverData.businessSetup) {
            const serverTimestamp = new Date(serverData.businessSetup.updatedAt || serverData.businessSetup.createdAt || 0);
            const localTimestamp = currentState.businessSetup ? new Date(currentState.businessSetup.updatedAt || currentState.businessSetup.createdAt || 0) : new Date(0);
            if (serverTimestamp > localTimestamp) {
              newBusinessSetup = { ...currentState.businessSetup, ...serverData.businessSetup };
            }
          }

          set({
            products: newProducts as Product[],
            users: newUsers as User[],
            expenses: newExpenses as Expense[],
            salaries: newSalaries as Salary[],
            creditCustomers: newCreditCustomers as CreditCustomer[],
            loyaltyCustomers: newLoyaltyCustomers as LoyaltyCustomer[],
            businessSetup: newBusinessSetup as BusinessSetup,
            suppliers: newSuppliers as Supplier[],
            categories: newCategories,
          });

          saveDataToFile('products.json', newProducts);
          saveDataToFile('users.json', newUsers);
          saveDataToFile('expenses.json', newExpenses);
          saveDataToFile('salaries.json', newSalaries);
          saveDataToFile('credit-customers.json', newCreditCustomers);
          saveDataToFile('loyalty-customers.json', newLoyaltyCustomers);
          saveDataToFile('business-setup.json', newBusinessSetup);
          saveDataToFile('suppliers.json', newSuppliers);

        } catch (error) {
          console.error('Failed to process sync data:', error);
        }
      },

      connectRealtimeSync: async () => {
        const state = get();
        if (state.businessSetup?.mode !== 'outlet') return;

        const { baseUrl } = await resolveSyncTarget(state.businessSetup);
        if (!baseUrl) {
          console.warn('Realtime sync skipped: no local outlet server resolved.');
          set({ realtimeSyncStatus: 'error' });
          return;
        }

        if (realtimeSocket && (realtimeSocket.readyState === WebSocket.OPEN || realtimeSocket.readyState === WebSocket.CONNECTING)) {
          return;
        }

        set({ realtimeSyncStatus: 'connecting' });

        const wsUrl = `${toWsUrl(baseUrl)}/ws`;
        try {
          realtimeSocket = new WebSocket(wsUrl);
        } catch (error) {
          console.error('Failed to create realtime socket:', error);
          set({ realtimeSyncStatus: 'error' });
          return;
        }

        realtimeSocket.onopen = () => {
          realtimeLastHeartbeat = Date.now();
          set({ realtimeSyncStatus: 'connected', isOnline: true });
          realtimeSocket?.send(JSON.stringify({
            type: 'hello',
            outletId: get().businessSetup?.outletId || null,
            lastSyncAt: get().lastSyncTime || null
          }));
          if (realtimeHeartbeatTimer) window.clearInterval(realtimeHeartbeatTimer);
          realtimeHeartbeatTimer = window.setInterval(() => {
            if (!realtimeSocket || realtimeSocket.readyState !== WebSocket.OPEN) return;
            realtimeSocket.send(JSON.stringify({ type: 'heartbeat', at: new Date().toISOString() }));
            if (Date.now() - realtimeLastHeartbeat > 10000) {
              realtimeSocket.close();
            }
          }, 5000);
        };

        realtimeSocket.onmessage = async (event) => {
          try {
            const message = JSON.parse(String(event.data || '{}'));
            if (message.type === 'heartbeat') {
              realtimeLastHeartbeat = Date.now();
              realtimeSocket?.send(JSON.stringify({ type: 'heartbeat-ack', at: message.at || new Date().toISOString() }));
              return;
            }

            if (message.type === 'sync-snapshot' && message.data) {
              const snapshot = message.data;
              set((current) => {
                const nextBusinessSetup = snapshot.businessSetup ? { ...current.businessSetup, ...snapshot.businessSetup } : current.businessSetup;
                
                // Also update outlet-specific stock and assignments in business setup!
                if (nextBusinessSetup?.mode === 'outlet') {
                  nextBusinessSetup.initialStock = snapshot.initialStock || snapshot.assignments?.initialStock || nextBusinessSetup.initialStock;
                  nextBusinessSetup.currentStock = snapshot.currentStock || snapshot.assignments?.currentStock || nextBusinessSetup.currentStock;
                  nextBusinessSetup.assignedProductIds = snapshot.assignedProductIds || snapshot.assignments?.productIds || nextBusinessSetup.assignedProductIds;
                  nextBusinessSetup.assignedUserIds = snapshot.assignedUserIds || snapshot.assignments?.userIds || nextBusinessSetup.assignedUserIds;
                }

                let products: Product[] = Array.isArray(snapshot.products) ? snapshot.products : current.products;
                
                if (nextBusinessSetup?.mode === 'outlet') {
                  const initialStock = nextBusinessSetup.initialStock || {};
                  const serverCurrentStock = nextBusinessSetup.currentStock || initialStock;
                  
                  products = products.map(product => {
                    const id = String(product.id ?? '');
                    const productId = String(product.productId ?? '');
                    const outletStock = 
                      serverCurrentStock[id] ?? 
                      serverCurrentStock[productId] ?? 
                      initialStock[id] ?? 
                      initialStock[productId] ?? 
                      product.stock ?? 0;
                    return {
                      ...product,
                      stock: Number(outletStock)
                    };
                  });
                }
                
                const nextState: Partial<PosState> = {
                  products: products,
                  users: Array.isArray(snapshot.users) ? snapshot.users.map(normalizeUserRecord) : current.users,
                  categories: Array.isArray(snapshot.categories) ? snapshot.categories : current.categories,
                  creditCustomers: Array.isArray(snapshot.creditCustomers) ? snapshot.creditCustomers : current.creditCustomers,
                  expenses: Array.isArray(snapshot.expenses) ? snapshot.expenses : current.expenses,
                  suppliers: Array.isArray(snapshot.suppliers) ? snapshot.suppliers : current.suppliers,
                  businessSetup: nextBusinessSetup || current.businessSetup
                };
                return nextState as any;
              });
              // Update business setup with outlet-specific data before saving!
              const currentSetup = get().businessSetup;
              if (currentSetup?.mode === 'outlet') {
                const updatedSetup = {
                  ...currentSetup,
                  initialStock: snapshot.initialStock || snapshot.assignments?.initialStock || currentSetup.initialStock,
                  currentStock: snapshot.currentStock || snapshot.assignments?.currentStock || currentSetup.currentStock,
                  assignedProductIds: snapshot.assignedProductIds || snapshot.assignments?.productIds || currentSetup.assignedProductIds,
                  assignedUserIds: snapshot.assignedUserIds || snapshot.assignments?.userIds || currentSetup.assignedUserIds,
                };
                await saveDataToFile('business-setup.json', updatedSetup);
              } else if (snapshot.businessSetup) {
                await saveDataToFile('business-setup.json', snapshot.businessSetup);
              }

              if (Array.isArray(snapshot.products)) {
                let products: Product[] = snapshot.products;
                if (get().businessSetup?.mode === 'outlet') {
                  const initialStock = get().businessSetup.initialStock || {};
                  const serverCurrentStock = get().businessSetup.currentStock || initialStock;
                  products = products.map(product => {
                    const id = String(product.id ?? '');
                    const productId = String(product.productId ?? '');
                    const outletStock = 
                      serverCurrentStock[id] ?? 
                      serverCurrentStock[productId] ?? 
                      initialStock[id] ?? 
                      initialStock[productId] ?? 
                      product.stock ?? 0;
                    return { ...product, stock: Number(outletStock) };
                  });
                }
                await saveDataToFile('products.json', products);
              }
              if (Array.isArray(snapshot.users)) await saveDataToFile('users.json', snapshot.users);
              if (Array.isArray(snapshot.categories)) await saveDataToFile('categories.json', snapshot.categories);
              if (Array.isArray(snapshot.creditCustomers)) await saveDataToFile('credit-customers.json', snapshot.creditCustomers);
              if (Array.isArray(snapshot.expenses)) await saveDataToFile('expenses.json', snapshot.expenses);
              if (Array.isArray(snapshot.suppliers)) await saveDataToFile('suppliers.json', snapshot.suppliers);
              set({ lastSyncTime: new Date().toISOString() });
              return;
            }

            if (message.type === 'sync-ack') {
              if (message.batchId && message.batchId === realtimePendingBatchId) {
                set({ syncQueue: [] });
                saveDataToFile('sync-queue.json', []);
                realtimePendingBatch = null;
                realtimePendingBatchId = null;
                set({ lastSyncTime: new Date().toISOString(), realtimeSyncStatus: 'connected' });
                get().syncFromServer();
              }
              return;
            }

            if (message.type === 'sync-event' && message.filename) {
              const { filename, data } = message;
              if (filename === 'products.json') {
                let products: Product[] = Array.isArray(data) ? data : [];
                if (get().businessSetup?.mode === 'outlet') {
                  const initialStock = get().businessSetup.initialStock || {};
                  const serverCurrentStock = get().businessSetup.currentStock || initialStock || {};
                  products = products.map(product => {
                    const id = String(product.id ?? '');
                    const productId = String(product.productId ?? '');
                    const outletStock = 
                      serverCurrentStock[id] ?? 
                      serverCurrentStock[productId] ?? 
                      initialStock[id] ?? 
                      initialStock[productId] ?? 
                      product.stock ?? 0;
                    return { ...product, stock: Number(outletStock) };
                  });
                }
                set({ products });
                await saveDataToFile('products.json', products);
              } else if (filename === 'users.json') {
                const users = Array.isArray(data) ? data.map(normalizeUserRecord) : [];
                set({ users });
                await saveDataToFile('users.json', data);
              } else if (filename === 'categories.json') {
                set({ categories: Array.isArray(data) ? data : [] });
                await saveDataToFile('categories.json', data);
              } else if (filename === 'transactions.json') {
                set({ transactions: Array.isArray(data) ? data : [] });
                await saveDataToFile('transactions.json', data);
              } else if (filename === 'business-setup.json') {
                set({ businessSetup: data });
                await saveDataToFile('business-setup.json', data);
              } else if (filename === 'credit-customers.json') {
                set({ creditCustomers: Array.isArray(data) ? data : [] });
                await saveDataToFile('credit-customers.json', data);
              } else if (filename === 'expenses.json') {
                set({ expenses: Array.isArray(data) ? data : [] });
                await saveDataToFile('expenses.json', data);
              } else if (filename === 'suppliers.json') {
                set({ suppliers: Array.isArray(data) ? data : [] });
                await saveDataToFile('suppliers.json', data);
              }
              set({ lastSyncTime: new Date().toISOString() });
            }
          } catch (error) {
            console.error('Realtime sync message error:', error);
          }
        };

        realtimeSocket.onclose = () => {
          const hadPendingBatch = Boolean(realtimePendingBatchId && realtimePendingBatch);
          const outletMode = get().businessSetup?.mode === 'outlet';
          set({ realtimeSyncStatus: 'disconnected', isOnline: outletMode ? false : navigator.onLine });
          if (realtimeHeartbeatTimer) {
            window.clearInterval(realtimeHeartbeatTimer);
            realtimeHeartbeatTimer = null;
          }
          if (hadPendingBatch && realtimePendingBatch) {
            set((state) => {
              const restoredQueue = [...realtimePendingBatch!, ...state.syncQueue];
              saveDataToFile('sync-queue.json', restoredQueue);
              return { syncQueue: restoredQueue };
            });
            realtimePendingBatch = null;
            realtimePendingBatchId = null;
          }

          if (realtimeReconnectTimer) window.clearTimeout(realtimeReconnectTimer);
          realtimeReconnectTimer = window.setTimeout(() => {
            get().connectRealtimeSync();
          }, 3000);
          realtimeSocket = null;
        };

        realtimeSocket.onerror = () => {
          set({ realtimeSyncStatus: 'error' });
          realtimeSocket = null;
        };
      },

      disconnectRealtimeSync: () => {
        if (realtimeReconnectTimer) {
          window.clearTimeout(realtimeReconnectTimer);
          realtimeReconnectTimer = null;
        }
        if (realtimeHeartbeatTimer) {
          window.clearInterval(realtimeHeartbeatTimer);
          realtimeHeartbeatTimer = null;
        }
        if (realtimeSocket) {
          realtimeSocket.close();
          realtimeSocket = null;
        }
        realtimePendingBatch = null;
        realtimePendingBatchId = null;
        set({ realtimeSyncStatus: 'disconnected' });
      },

      setOnlineStatus: (isOnline) => {
        set({ isOnline });
        if (isOnline) {
          if (get().businessSetup?.mode === 'outlet') {
            get().connectRealtimeSync();
            get().syncFromServer();
          } else {
            get().processSyncQueue();
            get().syncFromServer(); // Also pull data when coming online
          }
        } else if (get().businessSetup?.mode === 'outlet') {
          get().disconnectRealtimeSync();
        }
      },

      // Handle data synced from mobile (bridge)
      handleMobileDataSync: (payload: any) => {
        if (!Array.isArray(payload)) payload = [payload];

        payload.forEach(item => {
            const { type, data } = item;

            // Add to sync queue for Back Office propagation
            get().addToSyncQueue({ type, data });

            // Update local state immediately for UI responsiveness
            if (type === 'new-transaction' || type === 'transaction') {
               set(state => {
                   if (state.transactions.some(t => t.id === data.id)) return {};
                   return { transactions: [data, ...state.transactions] };
               });
            } else if (type === 'add-expense') {
               set(state => {
                   if (state.expenses.some(e => (e.id || (e as any).expenseId) === (data.id || data.expenseId))) return {};
                   return { expenses: [data, ...state.expenses] };
               });
            } else if (type === 'add-salary') {
               set(state => {
                   if (state.salaries.some(s => s.id === data.id)) return {};
                   return { salaries: [data, ...state.salaries] };
               });
            } else if (type === 'add-credit-customer') {
               set(state => {
                   if (state.creditCustomers.some(c => c.id === data.id)) return {};
                   return { creditCustomers: [...state.creditCustomers, data] };
               });
            } else if (type === 'update-credit-customer') {
               set(state => {
                   return {
                       creditCustomers: state.creditCustomers.map(c =>
                           c.id === data.id ? { ...c, ...data.updates } : c
                       )
                   };
               });
            } else if (type === 'add-supplier') {
               set(state => {
                   if (state.suppliers.some(s => s.id === data.id)) return {};
                   return { suppliers: [...state.suppliers, data] };
               });
            } else if (type === 'update-supplier') {
               set(state => {
                   return {
                       suppliers: state.suppliers.map(s =>
                           s.id === data.id ? { ...s, ...data.updates } : s
                       )
                   };
               });
            }
        });
      },

      // Mobile Receipts Logic
      loadMobileReceipts: async () => {
        const { data } = await readDataFromFile('mobile-receipts.json');
        if (data) set({ mobileReceipts: data });
      },

      addMobileReceipt: (receipt) => {
        set(state => ({ mobileReceipts: [...state.mobileReceipts, receipt] }));
      },

      printMobileReceipt: (receipt) => {
        const state = get();
        if (window.electron) {
            // Print as Original (false)
            window.electron.printReceipt(receipt, state.businessSetup, false);

            // Save to Local Transactions (Old Receipts)
            if (!state.transactions.some(t => t.id === receipt.id)) {
                 state.saveTransaction(receipt);
            }

            state.deleteMobileReceipt(receipt);
        }
      },

      deleteMobileReceipt: (receipt) => {
        set(state => {
            const newReceipts = state.mobileReceipts.filter(r => r._printId !== receipt._printId);
            saveDataToFile('mobile-receipts.json', newReceipts);
            return { mobileReceipts: newReceipts };
        });
      },

      // Reports
      getDailySales: (date: string) => {
        const state = get();

        // Check archived summaries first
        if (state.dailySummaries && state.dailySummaries[date]) {
            const s = state.dailySummaries[date];
            return { cash: s.cashTotal, mpesa: s.mpesaTotal, credit: s.creditTotal, total: s.totalSales };
        }

        const dayTransactions = state.transactions.filter(t =>
          t.timestamp.startsWith(date) && t.status === 'completed'
        );

        const cash = dayTransactions
          .filter(t => t.paymentMethod === 'cash')
          .reduce((sum, t) => sum + t.total, 0);

        const mpesa = dayTransactions
          .filter(t => t.paymentMethod === 'mpesa')
          .reduce((sum, t) => sum + t.total, 0);

        const credit = dayTransactions
          .filter(t => t.paymentMethod === 'credit')
          .reduce((sum, t) => sum + t.total, 0);

        return { cash, mpesa, credit, total: cash + mpesa + credit };
      },

      getDailyClosingReport: (date) => {
        const state = get();
        const dayTransactions = state.transactions.filter(t =>
          t.timestamp.startsWith(date) && t.status === 'completed'
        );

        // Calculate Global Items Sold
        const globalItemSalesMap = new Map<string, { name: string; quantity: number; total: number }>();
        dayTransactions.forEach(t => {
            if (!t || !Array.isArray(t.items)) return;

            t.items.forEach(item => {
                if (!item || !item.product) return;

                const name = item.product.name || 'Unknown Product';
                const price = item.product.price || 0;

                if (!globalItemSalesMap.has(name)) {
                    globalItemSalesMap.set(name, { name, quantity: 0, total: 0 });
                }
                const record = globalItemSalesMap.get(name)!;
                record.quantity += (item.quantity || 0);
                record.total += ((item.quantity || 0) * price);
            });
        });
        const itemSales = Array.from(globalItemSalesMap.values()).sort((a, b) => b.total - a.total);

        // Group by Cashier
        const cashierNames = [...new Set(dayTransactions.map(t => t.cashier || 'Unknown'))];

        const cashiers: any[] = cashierNames.map(name => {
          const transactions = dayTransactions.filter(t => (t.cashier || 'Unknown') === name);
          const cashTotal = transactions.filter(t => t.paymentMethod === 'cash').reduce((sum, t) => sum + t.total, 0);
          const mpesaTotal = transactions.filter(t => t.paymentMethod === 'mpesa').reduce((sum, t) => sum + t.total, 0);
          const creditTotal = transactions.filter(t => t.paymentMethod === 'credit').reduce((sum, t) => sum + t.total, 0);

          // Items sold by this cashier
          const itemSalesMap = new Map<string, { name: string; quantity: number; total: number }>();
          transactions.forEach(t => {
              if (!t || !Array.isArray(t.items)) return;

              t.items.forEach(item => {
                  if (!item || !item.product) return;

                  const name = item.product.name || 'Unknown Product';
                  const price = item.product.price || 0;

                  if (!itemSalesMap.has(name)) {
                      itemSalesMap.set(name, { name, quantity: 0, total: 0 });
                  }
                  const record = itemSalesMap.get(name)!;
                  record.quantity += (item.quantity || 0);
                  record.total += ((item.quantity || 0) * price);
              });
          });
          const items = Array.from(itemSalesMap.values()).sort((a, b) => b.total - a.total);

          return {
            cashierName: name,
            items,
            transactions,
            totalSales: cashTotal + mpesaTotal + creditTotal,
            cashTotal,
            mpesaTotal,
            creditTotal,
          };
        });

        const totalCash = cashiers.reduce((sum, c) => sum + c.cashTotal, 0);
        const totalMpesa = cashiers.reduce((sum, c) => sum + c.mpesaTotal, 0);
        const totalCredit = cashiers.reduce((sum, c) => sum + c.creditTotal, 0);

        return {
          date,
          cashiers,
          itemSales,
          grandTotal: totalCash + totalMpesa + totalCredit,
          totalCash,
          totalMpesa,
          totalCredit,
        };
      },

      getTransactionsByDateRange: (startDate, endDate) => {
        const state = get();
        return state.transactions.filter(t => {
          const date = new Date(t.timestamp);
          return date >= new Date(startDate) && date <= new Date(endDate);
        });
      },

      getUnpaidCredits: () => {
        const state = get();
        return state.creditCustomers.filter(customer => (customer.balance || 0) > 0);
      },

      // New: Load Users explicitly
      loadUsers: async () => {
          if (window.electron) {
              const { data } = await window.electron.readData('users.json');
              if (data) set({ users: data.map(normalizeUserRecord) });
          }
      },

      addUser: async (user) => {
        const normalizedUser = normalizeUserRecord(user);
        // Strict IPC Only
        if (window.electron && window.electron.userManagement) {
             const result = await window.electron.userManagement.addUser(normalizedUser);
             if (result.success) {
                 await get().loadUsers(); // Re-fetch to ensure sync with backend
             }
        }
        // Do not update local state optimistically to avoid reverts
        // Do not add to sync queue here, let backend handle it or separate sync logic
      },

  deleteTransactions: (ids) => {
    set((state) => {
      const updatedTransactions = state.transactions.filter(t => !ids.includes(t.id));
      saveDataToFile('transactions.json', updatedTransactions);
      ids.forEach(id => state.addToSyncQueue({ type: 'delete-transaction', data: { id } }));
      return { transactions: updatedTransactions };
    });
  },

      addProduct: async (product) => {
        const state = get();
        if (product.image && !product.image.startsWith('http')) {
          try {
            const { path: localPath } = await window.electron.saveImage(product.image);
            product.localImage = localPath;

            if (state.isOnline) {
              const { baseUrl, apiKey } = await resolveSyncTarget(state.businessSetup);
              if (baseUrl && apiKey) {
                const { imageUrl } = await window.electron.uploadImage(product.image, baseUrl, apiKey);
                product.image = imageUrl;
              } else {
                product.image = localPath || product.image;
                state.addToSyncQueue({ type: 'upload-image', data: { productId: product.id, localPath } });
              }
            } else {
              product.image = localPath || product.image;
              state.addToSyncQueue({ type: 'upload-image', data: { productId: product.id, localPath } });
            }
          } catch (error) {
            console.error('Image handling failed:', error);
            product.image = product.localImage || product.image || '';
          }
        }

        set((state) => {
          const updatedProducts = [...state.products, product];
          saveDataToFile('products.json', updatedProducts);
          state.addToSyncQueue({ type: 'add-product', data: product });
          return { products: updatedProducts };
        });
      },

      updateProduct: async (id, updates) => {
        const state = get();
        if (updates.image && !updates.image.startsWith('http')) {
          try {
            const { path: localPath } = await window.electron.saveImage(updates.image);
            updates.localImage = localPath;

            if (state.isOnline) {
              const { baseUrl, apiKey } = await resolveSyncTarget(state.businessSetup);
              if (baseUrl && apiKey) {
                const { imageUrl } = await window.electron.uploadImage(updates.image, baseUrl, apiKey);
                updates.image = imageUrl;
              } else {
                updates.image = localPath || updates.image;
                state.addToSyncQueue({ type: 'upload-image', data: { productId: id, localPath } });
              }
            } else {
              updates.image = localPath || updates.image;
              state.addToSyncQueue({ type: 'upload-image', data: { productId: id, localPath } });
            }
          } catch (error) {
            console.error('Image handling failed:', error);
            updates.image = updates.localImage || updates.image || '';
          }
        }

        set((state) => {
          const updatedProducts = state.products.map(product =>
            product.id === id ? { ...product, ...updates } : product
          );
          saveDataToFile('products.json', updatedProducts);
          state.addToSyncQueue({ type: 'update-product', data: { id, updates } });
          return { products: updatedProducts };
        });
      },

      deleteProduct: (id) => {
        set((state) => {
          const updatedProducts = state.products.filter(product => product.id !== id);
          saveDataToFile('products.json', updatedProducts);
          state.addToSyncQueue({ type: 'delete-product', data: { id } });
          return { products: updatedProducts };
        });
      },

      setCategories: (categories) => {
        set({ categories });
        saveDataToFile('categories.json', categories);
      },

      addCategory: (category) => {
        set((state) => {
          if (state.categories.includes(category)) return {};
          const updatedCategories = [...state.categories, category];
          saveDataToFile('categories.json', updatedCategories);
          return { categories: updatedCategories };
        });
      },

      deleteCategory: (category) => {
        set((state) => {
          const updatedCategories = state.categories.filter(c => c !== category);
          saveDataToFile('categories.json', updatedCategories);
          return { categories: updatedCategories };
        });
      },

      updateUser: async (id, updates) => {
        const normalizedUpdates: Partial<User> & { active?: boolean } = {
          ...updates,
          ...(Object.prototype.hasOwnProperty.call(updates, 'active')
            ? { isActive: (updates as any).active, active: (updates as any).active }
            : {}),
        };
        // Strict IPC Only
        if (window.electron && window.electron.userManagement) {
             const result = await window.electron.userManagement.updateUser(id, normalizedUpdates);
             if (result.success) {
                 await get().loadUsers(); // Re-fetch

                  // Handle Session Updates
                  const state = get();
                  if (state.currentCashier && state.currentCashier.id === id) {
                      if (normalizedUpdates.isActive === false) {
                           set({ currentCashier: null, sessionToken: null, businessSetup: { ...state.businessSetup, isLoggedIn: false } });
                      } else {
                          set({ currentCashier: normalizeUserRecord({ ...state.currentCashier, ...normalizedUpdates }) });
                      }
                  }
             }
        }
      },

      deleteUser: async (id) => {
        // Strict IPC Only
        if (window.electron && window.electron.userManagement) {
             const result = await window.electron.userManagement.deleteUser(id);
             if (result.success) {
                 await get().loadUsers(); // Re-fetch

                 const state = get();
                 if (state.currentCashier && state.currentCashier.id === id) {
                      set({ currentCashier: null, sessionToken: null, businessSetup: { ...state.businessSetup, isLoggedIn: false } });
                 }
             }
        }
      },

      loadInitialData: async () => {
        try {
          // Prioritize loading business setup first.
          const { data: businessSetupData } = await readDataFromFile('business-setup.json');
          let isSetup = false;
          if (businessSetupData && businessSetupData.isSetup) {
            // Check if we have env vars to override/set defaults for Back Office
            const updatedBusinessSetup = { ...businessSetupData };
            if (!updatedBusinessSetup.backOfficeUrl && import.meta.env.VITE_BACK_OFFICE_URL) {
                updatedBusinessSetup.backOfficeUrl = import.meta.env.VITE_BACK_OFFICE_URL;
            }
            if (!updatedBusinessSetup.backOfficeApiKey && import.meta.env.VITE_BACK_OFFICE_API_KEY) {
                updatedBusinessSetup.backOfficeApiKey = import.meta.env.VITE_BACK_OFFICE_API_KEY;
            }

            set({ businessSetup: updatedBusinessSetup });
            isSetup = true;
          } else if (businessSetupData && !businessSetupData.isSetup) {
             // Pre-fill setup data if available from env, even if not setup
              const prefillSetup = { ...businessSetupData };
              if (import.meta.env.VITE_BACK_OFFICE_URL) prefillSetup.backOfficeUrl = import.meta.env.VITE_BACK_OFFICE_URL;
              if (import.meta.env.VITE_BACK_OFFICE_API_KEY) prefillSetup.backOfficeApiKey = import.meta.env.VITE_BACK_OFFICE_API_KEY;
              set({ businessSetup: prefillSetup });
          }

          const fileNames = ['products.json', 'users.json', 'transactions.json', 'credit-customers.json', 'expenses.json', 'salaries.json', 'credit-payments.json', 'inventory-logs.json', 'daily-summaries.json', 'loyalty-customers.json', 'suppliers.json', 'documents.json', 'sync-queue.json', 'held-orders.json', 'pending-outlet-transactions.json', 'pending-outlet-expenses.json', 'pending-outlet-credit-customers.json'];
          const dataMap = {
            'products.json': 'products',
            'users.json': 'users',
            'transactions.json': 'transactions',
            'credit-customers.json': 'creditCustomers',
            'expenses.json': 'expenses',
            'salaries.json': 'salaries',
            'credit-payments.json': 'creditPayments',
            'inventory-logs.json': 'inventoryLogs',
            'daily-summaries.json': 'dailySummaries',
            'loyalty-customers.json': 'loyaltyCustomers',
            'suppliers.json': 'suppliers',
            'documents.json': 'documents',
            'sync-queue.json': 'syncQueue',
            'held-orders.json': 'heldOrders',
            'pending-outlet-transactions.json': 'pendingOutletTransactions',
            'pending-outlet-expenses.json': 'pendingOutletExpenses',
            'pending-outlet-credit-customers.json': 'pendingOutletCreditCustomers'
          };

          // Load Categories
          const { data: catData } = await readDataFromFile('categories.json');
          if (catData && Array.isArray(catData)) {
            set({ categories: catData });
          }

          for (const fileName of fileNames) {
            const { data } = await readDataFromFile(fileName);
            if (data) {
              // Sanitize Data on Initial Load
              const key = dataMap[fileName];
              if (Array.isArray(data)) {
                  let hasChanges = false;

                  // 1. Sanitize IDs
                  let sanitizedData = data.map((item: any) => {
                      if (!item.id || String(item.id) === 'null' || String(item.id) === 'NaN') {
                          hasChanges = true;
                          // Use Stable ID for products to fix previous random ID generation issues
                          let newId;
                          if (key === 'products' && item.name) {
                              newId = generateStableId(item.name);
                          } else {
                              newId = key === 'products' ? generateRandomId() : `FIX${Date.now()}${Math.floor(Math.random() * 1000)}`;
                          }
                          return { ...item, id: newId };
                      }
                      return item;
                  });

                  // 2. Filter out products with 0 price or empty names and Deduplicate Products by Name (Emergency Cleanup for "1000 items")
                  if (key === 'products') {
                      const initialLength = sanitizedData.length;

                      // Remove products with empty names or 0 price
                      sanitizedData = sanitizedData.filter((p: any) => {
                          if (!p.name || p.name.trim() === '') return false;
                          const price = Number(p.price);
                          return !isNaN(price) && price > 0;
                      });

                      const uniqueProductsByName = new Map();

                      sanitizedData.forEach((p: any) => {
                          if (!p.productId || String(p.productId) === 'null' || String(p.productId) === 'NaN') {
                              p.productId = p.id; // ensure productId exists
                          }

                          const nameKey = p.name.trim().toLowerCase();
                          if (!uniqueProductsByName.has(nameKey)) {
                              uniqueProductsByName.set(nameKey, p);
                          } else {
                              // If duplicate exists, keep the one with higher stock
                              const existing = uniqueProductsByName.get(nameKey);
                              const existingStock = Number(existing.stock) || 0;
                              const newStock = Number(p.stock) || 0;
                              if (newStock > existingStock) {
                                  uniqueProductsByName.set(nameKey, p);
                              }
                          }
                      });

                      sanitizedData = Array.from(uniqueProductsByName.values());
                      if (sanitizedData.length !== initialLength) {
                          hasChanges = true;
                          console.log(`Deduplicated/Cleaned products: Reduced from ${initialLength} to ${sanitizedData.length}`);
                      }
                  }

                  // 3. Deduplicate by ID
                  const uniqueMap = new Map();
                  sanitizedData.forEach((item: any) => uniqueMap.set(String(item.id), item));
                  let finalData = Array.from(uniqueMap.values());

                  // 4. Extra deduplication for Credit Customers by Name and Phone
                  if (key === 'creditCustomers') {
                      const uniqueCustomersByName = new Map();
                      const initialLength = finalData.length;

                      finalData.forEach((c: any) => {
                          // Try to use name, fallback to phone, then ID
                          const nameKey = c.name ? c.name.trim().toLowerCase() : (c.phone ? c.phone.trim() : String(c.id));
                          if (!uniqueCustomersByName.has(nameKey)) {
                              uniqueCustomersByName.set(nameKey, c);
                          } else {
                              // Keep the one with highest balance, or merge details
                              const existing = uniqueCustomersByName.get(nameKey);
                              const existingBalance = Number(existing.balance) || 0;
                              const newBalance = Number(c.balance) || 0;
                              if (newBalance > existingBalance) {
                                  uniqueCustomersByName.set(nameKey, { ...existing, ...c, balance: newBalance });
                              }
                          }
                      });

                      finalData = Array.from(uniqueCustomersByName.values());
                      if (finalData.length !== initialLength) {
                          hasChanges = true;
                          console.log(`Deduplicated credit customers: Reduced from ${initialLength} to ${finalData.length}`);
                      }
                  }

                  if (finalData.length !== data.length) hasChanges = true;

                  // If data was corrected, save it back immediately to persist the fix
                  if (hasChanges) {
                      console.log(`Repaired/Deduplicated data in ${fileName}`);
                      await saveDataToFile(fileName, finalData);
                  }

                  // Update categories automatically based on unique categories from products
                   if (key === 'users') {
                       finalData = finalData.map(normalizeUserRecord);
                   }

                   if (key === 'products') {
                       const state = get();
                      const existingCategories = new Set(state.categories);
                      let newCategoriesFound = false;

                      finalData.forEach((p: any) => {
                          if (p.category && typeof p.category === 'string') {
                              const cat = p.category.trim();
                              if (cat !== '' && !existingCategories.has(cat)) {
                                  existingCategories.add(cat);
                                  newCategoriesFound = true;
                              }
                          }
                      });

                      if (newCategoriesFound) {
                          const updatedCategories = Array.from(existingCategories);
                          set({ categories: updatedCategories });
                          await saveDataToFile('categories.json', updatedCategories);
                      }
                  }

                  set({ [key]: finalData });

              } else {
                  set({ [key]: data });
              }
            }
          }

        } catch (error) {
          console.error("Failed to load initial data:", error);
          // Handle error appropriately, maybe set an error state
        } finally {
          set({ isDataLoaded: true });
        }
      },

      finishSetup: async (businessData, adminUser) => {
        const fullBusinessData: BusinessSetup = {
          ...businessData,
          receiptFooter: 'WhizPOS - Managed by Whizpoint Solutions\nsupport@whizpoint.app | https://pos.whizpoint.app',
          printerType: businessData.printerType || 'thermal', // Default to thermal
          createdAt: new Date().toISOString(),
        };

        const fullAdminUser: User = {
          ...adminUser,
          isActive: true,
          createdAt: new Date().toISOString(),
        };

        // 1. Save the business setup to file.
        await saveDataToFile('business-setup.json', fullBusinessData);

        // 2. Add the first admin user via the secure IPC channel when available.
        if (window.electron && window.electron.userManagement) {
             try {
                await window.electron.userManagement.addUser(fullAdminUser);
              } catch (e) {
                  console.error("Failed to add admin user during setup:", e);
              }
        } else {
          await saveDataToFile('users.json', [fullAdminUser]);
        }

        // 3. Trigger the business setup printout.
        if (window.electron && window.electron.printBusinessSetup) {
          window.electron.printBusinessSetup(fullBusinessData, fullAdminUser);
        }

        // 4. Update store state
        set({
          businessSetup: fullBusinessData,
          users: [normalizeUserRecord(fullAdminUser)]
        });

        // The registration page will reload and pick up the new state when the user clicks "Go to Login".
      },

      archiveTransactions: async (daysToKeep) => {
          const state = get();
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
          cutoffDate.setHours(0, 0, 0, 0);

          const toKeep: Transaction[] = [];
          const toArchive: Transaction[] = [];

          state.transactions.forEach(t => {
              const tDate = new Date(t.timestamp);
              if (tDate < cutoffDate) {
                  toArchive.push(t);
              } else {
                  toKeep.push(t);
              }
          });

          if (toArchive.length === 0) return;

          const newSummaries = { ...(state.dailySummaries || {}) };

          toArchive.forEach(t => {
              // Use local date string YYYY-MM-DD
              const date = new Date(t.timestamp).toLocaleDateString('en-CA');

              if (!newSummaries[date]) {
                  newSummaries[date] = {
                      date,
                      totalSales: 0,
                      cashTotal: 0,
                      mpesaTotal: 0,
                      creditTotal: 0,
                      expenseTotal: 0,
                      transactionCount: 0
                  };
              }
              const s = newSummaries[date];
              s.totalSales += t.total;
              s.transactionCount += 1;
              if (t.paymentMethod === 'cash') s.cashTotal += t.total;
              if (t.paymentMethod === 'mpesa') s.mpesaTotal += t.total;
              if (t.paymentMethod === 'credit') s.creditTotal += t.total;
          });

          set({ transactions: toKeep, dailySummaries: newSummaries });
          await saveDataToFile('transactions.json', toKeep);
          await saveDataToFile('daily-summaries.json', newSummaries);
      },

      pushDataToServer: async () => {
        const state = get();

        if (state.businessSetup?.mode === 'outlet') {
            const unsynced = state.transactions.filter(t => !t.synced);
            if (unsynced.length === 0) return;

            try {
                const { baseUrl, apiKey } = await resolveSyncTarget(state.businessSetup);
                if (!baseUrl || !apiKey) return;
                const response = await fetch(`${baseUrl}/api/sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(unsynced.map(t => ({ type: 'new-transaction', data: t })))
                });

                if (response.ok) {
                    const updatedTransactions = state.transactions.map(t => ({ ...t, synced: true }));
                    set({ transactions: updatedTransactions });
                    saveDataToFile('transactions.json', updatedTransactions);
                }
            } catch (e) {
                console.error("Outlet push failed", e);
            }
            return;
        }

        // Use backOfficeUrl if available, fallback to apiUrl (legacy)
        let rawUrl = state.businessSetup?.backOfficeUrl || state.businessSetup?.apiUrl;
        const apiKey = state.businessSetup?.backOfficeApiKey || state.businessSetup?.apiKey;
        const mongoDbUri = state.businessSetup?.mongoDbUri;

        if (!state.isOnline) {
            console.error("Cannot push data: App is offline");
            return;
        }

        let apiUrl = rawUrl?.replace(/\/$/, '');
        // Remove trailing /api to prevent double /api
        apiUrl = apiUrl?.replace(/\/api$/, '') || '';

        if (!apiUrl) {
            console.error("Cannot push data: No Back Office URL configured");
            return;
        }
        if (!apiKey) {
            console.error("Cannot push data: No Back Office API Key configured");
            return;
        }

        try {
            const payload = {
                products: state.products,
                users: state.users,
                expenses: state.expenses,
                salaries: state.salaries,
                customers: state.creditCustomers,
                transactions: state.transactions,
                businessSetup: state.businessSetup,
                suppliers: state.suppliers
            };

            const response = await fetch(`${apiUrl}/api/sync/full`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'X-API-KEY': apiKey
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Full sync failed');
            }
            console.log("Full sync successful");
            set({ lastSyncTime: new Date().toISOString() });
        } catch (error) {
            console.error('Full sync error:', error);
        }
      },

      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
    }),
    {
      name: 'pos-storage',
      partialize: (state) => ({
        businessSetup: state.businessSetup,
        isSidebarCollapsed: state.isSidebarCollapsed,
        currentCashier: state.currentCashier,
        transactions: state.transactions ? state.transactions.slice(-100) : [],
        dailySummaries: state.dailySummaries,
        creditCustomers: state.creditCustomers,
        creditPayments: state.creditPayments,
        inventoryLogs: state.inventoryLogs, // Persist inventory logs
        users: state.users,
        expenses: state.expenses ? state.expenses.slice(-50) : [],
        lastSyncTime: state.lastSyncTime,
        products: state.products ? state.products.slice(-100) : [],
        inventoryProducts: state.inventoryProducts,
        loyaltyCustomers: state.loyaltyCustomers,
        syncHistory: state.syncHistory ? state.syncHistory.slice(-50) : [],
        suppliers: state.suppliers,
        documents: state.documents,
        syncQueue: state.syncQueue || [],
        heldOrders: state.heldOrders || [],
        pendingOutletTransactions: state.pendingOutletTransactions || [],
        pendingOutletExpenses: state.pendingOutletExpenses || [],
        pendingOutletCreditCustomers: state.pendingOutletCreditCustomers || [],
      })
    }
  )
);

// Initial data will be loaded in the main App component.

// Sync intervals are now managed in App.tsx to ensure proper lifecycle and state access
