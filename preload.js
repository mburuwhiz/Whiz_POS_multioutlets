const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script executed');

/**
 * Exposes protected methods from the Electron main process to the renderer process via the `window.electron` object.
 * This ensures security by checking context isolation and preventing direct access to Node.js APIs in the renderer.
 */
contextBridge.exposeInMainWorld('electron', {
  /**
   * Saves data to a local JSON file.
   * @param {string} fileName - The name of the file to save.
   * @param {any} data - The data to save.
   * @returns {Promise<{success: boolean, error?: any}>}
   */
  saveData: (fileName, data) => ipcRenderer.invoke('save-data', fileName, data),

  /**
   * Reads data from a local JSON file.
   * @param {string} fileName - The name of the file to read.
   * @returns {Promise<{success: boolean, data?: any, error?: any}>}
   */
  readData: (fileName) => ipcRenderer.invoke('read-data', fileName),

  /**
   * Prints a transaction receipt.
   * @param {Transaction} transaction - The transaction details.
   * @param {BusinessSetup} businessSetup - The business configuration.
   * @param {boolean} isReprint - Whether this is a reprint.
   */
  printReceipt: (transaction, businessSetup, isReprint) => ipcRenderer.send('print-receipt', transaction, businessSetup, isReprint),

  /**
   * Saves a temporary image file to the persistent application storage.
   * @param {string} tempPath - The path to the temporary image file.
   * @returns {Promise<{success: boolean, path?: string, fileName?: string, error?: any}>}
   */
  saveImage: (tempPath) => ipcRenderer.invoke('save-image', tempPath),

  /**
   * Prints the daily closing report.
   * @param {ClosingReportData} reportData - The aggregated report data.
   * @param {BusinessSetup} businessSetup - The business configuration.
   * @param {boolean} detailed - Whether to print detailed transaction/expense lists.
   */
  printClosingReport: (reportData, businessSetup, detailed) => ipcRenderer.send('print-closing-report', reportData, businessSetup, detailed),

  /**
   * Retrieves a list of available system printers.
   * @returns {Promise<any[]>}
   */
  getPrinters: () => ipcRenderer.invoke('get-printers'),

  /**
   * Retrieves the local API configuration (URL, API Key, QR Code).
   * @returns {Promise<{apiKey: string, apiUrl: string, qrCodeDataUrl: string}>}
   */
  getApiConfig: () => ipcRenderer.invoke('get-api-config'),

  /**
   * Prints the initial business setup invoice.
   * @param {BusinessSetup} businessSetup - The business configuration.
   * @param {User} adminUser - The admin user details.
   */
  printBusinessSetup: (businessSetup, adminUser) => ipcRenderer.send('print-business-setup', businessSetup, adminUser),

  /**
   * Uploads an image to the Back Office server.
   * Uses `node-fetch` within the secure preload context to avoid exposing it to the renderer.
   *
   * @param {string} filePath - The local path of the image to upload.
   * @param {string} apiUrl - The Back Office API URL.
   * @param {string} apiKey - The Back Office API Key.
   * @returns {Promise<{success: boolean, imageUrl: string}>}
   */
  uploadImage: async (filePath, apiUrl, apiKey) => {
    const fetch = require('node-fetch');
    const fs = require('fs');
    const FormData = require('form-data');
    const path = require('path');

    const form = new FormData();
    form.append('image', fs.createReadStream(filePath), {
      filename: path.basename(filePath)
    });

    const response = await fetch(`${apiUrl}/api/upload`, {
      method: 'POST',
      body: form,
      headers: {
        'x-api-key': apiKey,
        ...form.getHeaders()
      }
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.statusText}`);
    }

    return await response.json();
  },

  /**
   * Listen for sync updates from the mobile app.
   */
  onMobileDataSync: (callback) => ipcRenderer.on('mobile-data-sync', callback),

  /**
   * Listen for new receipt requests from the mobile app.
   */
  onNewMobileReceipt: (callback) => ipcRenderer.on('new-mobile-receipt', callback),

  onSyncPushUpdate: (callback) => ipcRenderer.on('sync-push-update', callback),

  onDiscoveredServers: (callback) => ipcRenderer.on('discovered-servers', callback),
  onPendingOutletsUpdate: (callback) => ipcRenderer.on('pending-outlets-update', callback),
  onDataRestored: (callback) => ipcRenderer.on('data-restored', callback),

  /**
   * Saves printer settings.
   */
  savePrinterSettings: (settings) => ipcRenderer.invoke('save-printer-settings', settings),

  /**
   * Gets printer settings.
   */
  getPrinterSettings: () => ipcRenderer.invoke('get-printer-settings'),

  /**
   * Toggles fullscreen mode.
   */
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),

  /**
   * Checks for application updates.
   */
  checkForUpdate: () => ipcRenderer.send('check-for-update'),

  /**
   * Listen for update available event.
   */
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),

  /**
   * Listen for update downloaded event.
   */
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),

  // --- Developer Tools ---

  getDeveloperConfig: () => ipcRenderer.invoke('get-developer-config'),

  saveDeveloperConfig: (config) => ipcRenderer.invoke('save-developer-config', config),



  backupData: () => ipcRenderer.invoke('backup-data'),

  restoreData: () => ipcRenderer.invoke('restore-data'),

  getConnectedDevices: () => ipcRenderer.invoke('get-connected-devices'),

  pingOutlet: (outletId) => ipcRenderer.invoke('ping-outlet', outletId),
  deleteOutlet: (outletId) => ipcRenderer.invoke('delete-outlet', outletId),

  getLogs: () => ipcRenderer.invoke('get-logs'),

  // --- Auth & User Management ---

  auth: {
      login: (userId, pin, deviceId, scope) => ipcRenderer.invoke('auth-login', userId, pin, deviceId, scope),
      logout: (token) => ipcRenderer.invoke('auth-logout', token),
      verify: (token) => ipcRenderer.invoke('auth-verify', token)
  },

  userManagement: {
      addUser: (userData) => ipcRenderer.invoke('user-add', userData),
      updateUser: (userId, updates) => ipcRenderer.invoke('user-update', userId, updates),
      deleteUser: (userId) => ipcRenderer.invoke('user-delete', userId)
  },

  devReset: () => ipcRenderer.invoke('dev-reset'),

  startDiscovery: () => ipcRenderer.invoke('start-discovery'),
  getDiscoveredServers: () => ipcRenderer.invoke('get-discovered-servers'),
  multiOutlet: {
      getAppMode: () => ipcRenderer.invoke('get-app-mode'),
      setAppMode: (mode) => ipcRenderer.invoke('set-app-mode', mode),
      getOutlets: async () => {
          const [pending, approved] = await Promise.all([
              ipcRenderer.invoke('get-pending-outlets'),
              ipcRenderer.invoke('get-approved-outlets')
          ]);
          return [...(pending || []), ...(approved || [])];
      },
      approveOutlet: (outletId) => ipcRenderer.invoke('approve-outlet', outletId, {}),
      deleteOutlet: (outletId) => ipcRenderer.invoke('delete-outlet', outletId)
  },
  approveOutlet: (outletId, assignment) => ipcRenderer.invoke('approve-outlet', outletId, assignment),
  rejectOutlet: (outletId, reason) => ipcRenderer.invoke('reject-outlet', outletId, reason),
    getPendingOutlets: () => ipcRenderer.invoke('get-pending-outlets'),
    getApprovedOutlets: () => ipcRenderer.invoke('get-approved-outlets'),
    updateOutletAssignment: (outletId, assignment) => ipcRenderer.invoke('update-outlet-assignment', outletId, assignment),
  getStockMovements: () => ipcRenderer.invoke('get-stock-movements'),
  createStockTransfer: (transferData) => ipcRenderer.invoke('create-stock-transfer', transferData)
});
