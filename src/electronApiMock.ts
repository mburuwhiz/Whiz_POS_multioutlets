// src/electronApiMock.ts

/**
 * Mocks the Electron `window.electron` API for browser-based testing (Playwright).
 * This allows the Zustand store to "load" data from the public folder by fetching it,
 * mimicking the behavior of the Electron main process reading files from disk.
 */
export const setupElectronMock = () => {
  if (process.env.NODE_ENV === 'development' && !window.electron) {
    console.log('Setting up mock Electron API for browser environment.');
    let mockAppMode: 'server' | 'outlet' = 'server';

    window.electron = {
      saveData: async (fileName, data) => {
        console.log(`[Mock] saveData(${fileName}):`, data);
        return { success: true };
      },
      readData: async (fileName) => {
        try {
          const response = await fetch(`/data/${fileName}`);
          if (!response.ok) {
            // Mock file not found by returning undefined data, which store handles
            console.log(`[Mock] Data file not found: ${fileName}, returning empty.`);
            return { success: true, data: undefined };
          }
          const data = await response.json();
          console.log(`[Mock] readData(${fileName}):`, data);
          return { success: true, data };
        } catch (error) {
          console.error(`[Mock] Error reading data ${fileName}:`, error);
          return { success: true, data: undefined };
        }
      },
      printReceipt: (transaction, businessSetup, isReprint) => {
        console.log('[Mock] printReceipt:', { transaction, businessSetup, isReprint });
      },
      saveImage: async (tempPath) => {
        console.log('[Mock] saveImage:', tempPath);
        return { success: true, path: `mock/path/to/${tempPath}`, fileName: tempPath };
      },
      printClosingReport: (reportData, businessSetup) => {
        console.log('[Mock] printClosingReport:', { reportData, businessSetup });
      },
      printBusinessSetup: (businessSetup, adminUser) => {
        console.log('[Mock] printBusinessSetup:', { businessSetup, adminUser });
      },
      getApiConfig: async () => {
        console.log('[Mock] getApiConfig');
        return {
          apiUrl: 'http://localhost:3001/api',
          apiKey: 'mock-api-key',
          qrCodeDataUrl: 'mock-qr-code-data-url',
        };
      },
      uploadImage: async (filePath, apiUrl, apiKey) => {
        console.log('[Mock] uploadImage:', { filePath, apiUrl, apiKey });
        return { success: true, imageUrl: 'https://via.placeholder.com/150' };
      },
      onMobileDataSync: (callback) => {
         console.log('[Mock] onMobileDataSync listener registered');
      },
      onNewMobileReceipt: (callback) => {
         console.log('[Mock] onNewMobileReceipt listener registered');
      },
      getPrinters: async () => {
         console.log('[Mock] getPrinters');
         return [
             { name: 'Mock Printer 1', isDefault: true },
             { name: 'Mock Printer 2', isDefault: false }
         ];
      },
      savePrinterSettings: async (settings) => {
         console.log('[Mock] savePrinterSettings:', settings);
         return { success: true };
      },
      getPrinterSettings: async () => {
         console.log('[Mock] getPrinterSettings');
         return { defaultPrinter: 'Mock Printer 1' };
      },
      toggleFullscreen: () => {
         console.log('[Mock] toggleFullscreen');
      },
      checkForUpdate: () => {
         console.log('[Mock] checkForUpdate');
      },
      onUpdateAvailable: (callback) => {
         console.log('[Mock] onUpdateAvailable listener registered');
      },
      onUpdateDownloaded: (callback) => {
         console.log('[Mock] onUpdateDownloaded listener registered');
      },
      getDeveloperConfig: async () => {
          console.log('[Mock] getDeveloperConfig');
          return { developerPin: null, mongoUri: '', backOfficeUrl: '', backOfficeApiKey: '' };
      },
      saveDeveloperConfig: async (config) => {
          console.log('[Mock] saveDeveloperConfig:', config);
          return { success: true };
      },
      backupData: async () => ({ success: true }),
      restoreData: async () => ({ success: true }),
      getLogs: async () => '',
      auth: {
          login: async (userId, pin, deviceId, scope) => {
              console.log('[Mock] login:', { userId, pin, deviceId, scope });
              return { success: true, token: 'mock-token', user: { id: userId, name: userId, role: 'admin' } };
          },
          logout: async (token) => {
              console.log('[Mock] logout:', token);
              return { success: true };
          },
          verify: async (token) => {
              console.log('[Mock] verify:', token);
              return { success: true, user: { id: 'USR123', name: 'Mock Admin', role: 'admin' } };
          }
      },
      userManagement: {
          addUser: async (userData) => {
              console.log('[Mock] addUser:', userData);
              return { success: true };
          },
          updateUser: async (userId, updates) => {
              console.log('[Mock] updateUser:', { userId, updates });
              return { success: true };
          },
          deleteUser: async (userId) => {
              console.log('[Mock] deleteUser:', userId);
              return { success: true };
          }
      },
      devReset: async () => {
          console.log('[Mock] devReset');
          return { success: true };
      },
      startDiscovery: async () => {
          console.log('[Mock] startDiscovery');
          return true;
      },
      getDiscoveredServers: async () => {
          console.log('[Mock] getDiscoveredServers');
          return [];
      },
      onDiscoveredServers: (callback) => {
          console.log('[Mock] onDiscoveredServers listener registered');
      },
      onPendingOutletsUpdate: (callback) => {
          console.log('[Mock] onPendingOutletsUpdate listener registered');
      },
      onSyncPushUpdate: (callback) => {
          console.log('[Mock] onSyncPushUpdate listener registered');
      },
      approveOutlet: async (outletId, assignment) => {
          console.log('[Mock] approveOutlet:', outletId, assignment);
          return { success: true };
      },
      getStockMovements: async () => [],
      createStockTransfer: async (transferData) => ({ success: true, transfer: transferData }),
      rejectOutlet: async (outletId, reason) => {
          console.log('[Mock] rejectOutlet:', { outletId, reason });
          return { success: true };
      },
      getPendingOutlets: async () => {
          console.log('[Mock] getPendingOutlets');
          return [];
      },
      getApprovedOutlets: async () => {
          console.log('[Mock] getApprovedOutlets');
          return [];
      },
      multiOutlet: {
          getAppMode: async () => {
              console.log('[Mock] multiOutlet.getAppMode');
              return mockAppMode;
          },
          setAppMode: async (mode) => {
              console.log('[Mock] multiOutlet.setAppMode:', mode);
              mockAppMode = mode;
              return { success: true };
          },
          getOutlets: async () => {
              console.log('[Mock] multiOutlet.getOutlets');
              return [];
          },
          approveOutlet: async (outletId) => {
              console.log('[Mock] multiOutlet.approveOutlet:', outletId);
              return { outlet: { id: outletId }, initialData: {} };
          },
          deleteOutlet: async (outletId) => {
              console.log('[Mock] multiOutlet.deleteOutlet:', outletId);
              return { success: true };
          }
      }
    };
  }
};
