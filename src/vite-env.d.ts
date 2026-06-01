/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="vite/client" />

// some global object injected by platform
declare global {
  interface Window {
    aiSdk?: Record<string, any>;
    ywConfig?: Record<string, any>;
    ywSdk?: Record<string, any>;
    electron: {
      saveData: (fileName: string, data: any) => Promise<{ success: boolean; error?: any }>;
      readData: (fileName: string) => Promise<{ success: boolean; data?: any; error?: any }>;
      printReceipt: (transaction: any, businessSetup: any, isReprint?: boolean) => void;
      saveImage: (tempPath: string) => Promise<{ success: boolean; path?: string; fileName?: string; error?: any }>;
      printClosingReport: (reportData: any, businessSetup: any, detailed?: boolean) => void;
      getApiConfig: () => Promise<{ apiKey: string; apiUrl: string; qrCodeDataUrl: string }>;
      printBusinessSetup: (businessSetup: any, adminUser: any) => void;
      uploadImage: (filePath: string, apiUrl: string, apiKey: string) => Promise<{ success?: boolean; imageUrl: string }>;
      onMobileDataSync: (callback: (event: any, data: any) => void) => void;
      onNewMobileReceipt: (callback: (event: any, data: any) => void) => void;
      onSyncPushUpdate?: (callback: (event: any, payload: any) => void) => void;
      onDiscoveredServers: (callback: (event: any, servers: any[]) => void) => void;
      onPendingOutletsUpdate: (callback: (event: any, outlets: any[]) => void) => void;
      getPrinters: () => Promise<any[]>;
      savePrinterSettings: (settings: any) => Promise<{ success: boolean }>;
      getPrinterSettings: () => Promise<any>;
      toggleFullscreen: () => void;
      checkForUpdate: () => void;
      onUpdateAvailable: (callback: (event: any, info: any) => void) => void;
      onUpdateDownloaded: (callback: (event: any, info: any) => void) => void;
      getDeveloperConfig: () => Promise<{ developerPin: string | null; mongoUri: string; backOfficeUrl: string; backOfficeApiKey: string }>;
      saveDeveloperConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
      directDbPush?: (mongoUri: string) => Promise<{ success: boolean; error?: string }>;
      directDbPull?: (mongoUri: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      getConnectedDevices?: () => Promise<any[]>;
      pingOutlet?: (outletId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      deleteOutlet?: (outletId: string) => Promise<{ success: boolean; error?: string }>;
      getLogs: () => Promise<string>;
      backupData: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
      restoreData: () => Promise<{ success: boolean; error?: string }>;
      devReset: () => Promise<{ success: boolean; error?: string }>;
      startDiscovery: () => Promise<boolean>;
      getDiscoveredServers: () => Promise<any[]>;
      approveOutlet: (outletId: string, assignment?: { productIds: string[]; userIds: string[]; initialStock: Record<string, number> }) => Promise<{ success: boolean; error?: string }>;
      rejectOutlet: (outletId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
      getPendingOutlets: () => Promise<any[]>;
      getApprovedOutlets: () => Promise<any[]>;
      getStockMovements?: () => Promise<any[]>;
      createStockTransfer?: (transferData: any) => Promise<{ success: boolean; transfer?: any; error?: string }>;
      updateOutletAssignment?: (outletId: string, assignment: { productIds: string[]; userIds: string[]; initialStock: Record<string, number> }) => Promise<{ success: boolean; error?: string }>;
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
      multiOutlet?: {
        getAppMode: () => Promise<'server' | 'outlet'>;
        setAppMode: (mode: 'server' | 'outlet') => Promise<{ success: boolean }>;
        getOutlets: () => Promise<any[]>;
        approveOutlet: (outletId: string) => Promise<{ outlet: any; initialData: any }>;
        deleteOutlet: (outletId: string) => Promise<{ success: boolean }>;
      };
    };
  }
}

export {};
