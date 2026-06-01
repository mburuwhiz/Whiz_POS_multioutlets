import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { usePosStore } from './store/posStore';
import CheckoutModal from './components/CheckoutModal';
import MainNavigator from './pages/MainNavigator';
import BusinessRegistrationPage from './pages/BusinessRegistrationPage';
import LoginScreen from './components/LoginScreen';
import DeveloperPage from './pages/DeveloperPage';
import OnScreenKeyboard from './components/OnScreenKeyboard';
import ChangelogModal from './components/ChangelogModal';
import ErrorBoundary from './components/ErrorBoundary';
import AutoLogoutModal from './components/AutoLogoutModal';
import { useEffect, useRef, useState } from 'react';
import { useAutoLogout } from './hooks/useAutoLogout';
import { CheckCircle2 } from 'lucide-react';
import { Modal } from './components/ui/modal';
import { Button } from './components/ui/button';
import ModeSelector from './components/ModeSelector';
import ServerLayout from './components/ServerLayout';
import OutletLayout from './components/OutletLayout';
import { resolveSyncTarget } from './store/posStore';

function App() {
  const { businessSetup, loadInitialData, isDataLoaded, logout, currentCashier, 
    isTransactionSuccessPopupOpen, lastCompletedTransaction, closeTransactionSuccessPopup 
  } = usePosStore(state => ({
    businessSetup: state.businessSetup,
    loadInitialData: state.loadInitialData,
    isDataLoaded: state.isDataLoaded,
    logout: state.logout,
    currentCashier: state.currentCashier,
    isTransactionSuccessPopupOpen: state.isTransactionSuccessPopupOpen,
    lastCompletedTransaction: state.lastCompletedTransaction,
    closeTransactionSuccessPopup: state.closeTransactionSuccessPopup
  }));

  const [showChangelog, setShowChangelog] = useState(false);
  const envMode = (import.meta.env.VITE_WHIZ_POS_MODE as 'server' | 'outlet' | undefined) || null;
  const [selectedMode, setSelectedMode] = useState<'server' | 'outlet' | null>(envMode);
  const [isServerLoggedIn, setIsServerLoggedIn] = useState(false);

  useEffect(() => {
    const lastVersion = localStorage.getItem('last_seen_version');
    const currentVersion = '8.0.0';

    if (isDataLoaded && lastVersion !== currentVersion) {
      setShowChangelog(true);
    }
  }, [isDataLoaded]);

  const handleCloseChangelog = () => {
    localStorage.setItem('last_seen_version', '8.0.0');
    setShowChangelog(false);
  };

  // Auto-logoff Logic
  // Default to 5 minutes if not set or 0. Ensure at least 1 minute to prevent immediate loops if config is bad.
  const idleMinutes = Math.max(1, Number(businessSetup?.autoLogoffMinutes) || 5);
  const idleMs = idleMinutes * 60 * 1000;

  // Use custom hook to track idle state.
  // Only enable tracking if explicitly enabled in settings AND logged in.
  const isAutoLogoffEnabled = !!(businessSetup?.isLoggedIn && businessSetup?.autoLogoffEnabled);
  const isIdle = useAutoLogout(idleMs, isAutoLogoffEnabled);

  // Debug log for auto-logoff
  useEffect(() => {
    if (isAutoLogoffEnabled) {
      console.log(`Auto-logoff configured: ${idleMinutes} minutes (${idleMs}ms)`);
    }
  }, [isAutoLogoffEnabled, idleMinutes, idleMs]);

  useEffect(() => {
    const init = async () => {
      await loadInitialData();
      if (envMode) {
        const setup = usePosStore.getState().businessSetup;
        if (setup && setup.mode !== envMode) {
          usePosStore.getState().saveBusinessSetup({ ...setup, mode: envMode });
        }
      }

      // If we're an approved outlet, trigger sync immediately on load
      const currentState = usePosStore.getState();
      if (currentState.isDataLoaded &&
          currentState.businessSetup?.mode === 'outlet' &&
          currentState.businessSetup?.status === 'approved' &&
          currentState.businessSetup?.outletId) {
        console.log('Outlet initializing: triggering immediate sync from server');
        if (window.electron?.startDiscovery) {
          window.electron.startDiscovery().catch((error) => console.warn('Discovery start failed', error));
        }
        currentState.connectRealtimeSync();
        currentState.syncFromServer();
      }
    };
    init();
  }, [loadInitialData, envMode]);

  // Setup Electron IPC Listeners
  useEffect(() => {
    if (window.electron) {
      window.electron.onMobileDataSync((event: any, payload: any) => {
        console.log('Received mobile data sync:', payload);
        usePosStore.getState().handleMobileDataSync(payload);
      });
      window.electron.onNewMobileReceipt((event: any, receipt: any) => {
        console.log('Received new mobile receipt:', receipt);
        usePosStore.getState().addMobileReceipt(receipt);
      });
      const electronAny = window.electron as any;
      if (electronAny.onSyncPushUpdate) {
        electronAny.onSyncPushUpdate((event: any, payload: any) => {
          console.log('Received sync push update:', payload);
          const { type, data } = payload;
          if (type === 'inventory-adjustment') {
            usePosStore.getState().updateProduct(data.id, { stock: data.stock });
          } else if (type === 'new-product') {
            usePosStore.getState().addProduct(data);
          }
        });
      }
      if (electronAny.onDataRestored) {
        electronAny.onDataRestored(async () => {
          console.log('Received data-restored event, clearing localStorage and reloading');
          // Clear Zustand persistence
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('persist:')) {
              localStorage.removeItem(key);
            }
          }
          // Clear all other storage
          localStorage.clear();
          sessionStorage.clear();
          // Reload the page
          setTimeout(() => {
            window.location.reload();
          }, 500);
        });
      }
    }
  }, []);

  // Poll for approval if pending
  useEffect(() => {
    // v8: outletId must be created at initial registration and persisted.
    // Do NOT keep re-posting `/api/register-outlet` while waiting for approval.

    if (businessSetup?.status === 'pending' && businessSetup.outletId) {
        const interval = setInterval(async () => {
            try {
                const { baseUrl } = await resolveSyncTarget(businessSetup);
                if (!baseUrl) return;
                const response = await fetch(`${baseUrl}/api/check-approval/${businessSetup.outletId}`);
                const result = await response.json();

                if (result.status === 'approved') {
                    usePosStore.getState().saveBusinessSetup({
                        ...businessSetup,
                        status: 'approved',
                        apiKey: result.apiKey, // Main Server's API Key for future requests
                        assignedProductIds: result.assignedProductIds,
                        assignedUserIds: result.assignedUserIds,
                        initialStock: result.initialStock,
                        rejectionReason: undefined,
                        isLoggedIn: false
                    });
                    // Trigger full sync
                    setTimeout(() => {
                        usePosStore.getState().syncFromServer();
                    }, 100);
                } else if (result.status === 'rejected') {
                    usePosStore.getState().saveBusinessSetup({
                        ...businessSetup,
                        status: 'rejected',
                        rejectionReason: result.reason || 'Rejected by server administrator',
                        isLoggedIn: false
                    });
                }
            } catch (e) {
                console.error("Approval poll failed", e);
            }
        }, 5000);
        return () => clearInterval(interval);
    }
  }, [businessSetup?.status, businessSetup?.backOfficeUrl, businessSetup?.apiUrl, businessSetup?.outletId]);

  // Periodic Sync (10s for both Server and Outlet for faster updates!)
  useEffect(() => {
    const isOutlet = usePosStore.getState().businessSetup?.mode === 'outlet';
    const intervalTime = 10000; // 10 seconds

    const syncInterval = setInterval(() => {
      const state = usePosStore.getState();
      const isOutletMode = state.businessSetup?.mode === 'outlet';
      const apiUrl = state.businessSetup?.apiUrl || state.businessSetup?.backOfficeUrl;

      if (isOutletMode && state.isOnline) {
        // 1. For outlets: only sync from server (outlet doesn't push to server)
        console.log(`Auto-sync (Outlet): Fetching updates from server...`);
        state.syncFromServer();
      } else if (!isOutletMode) {
        // For server: don't sync from/to itself, just process sync queue
        state.processSyncQueue();
      } else {
        // Debug log for outlets
        if (!state.isOnline) console.log('Auto-sync skipped: Offline');
        else if (!apiUrl) console.log('Auto-sync skipped: No API URL configured');
      }
    }, intervalTime);

    return () => clearInterval(syncInterval);
  }, []);

  useEffect(() => {
    const handleFocus = (event: FocusEvent) => {
      const { businessSetup, openKeyboard } = usePosStore.getState();
      if (businessSetup?.onScreenKeyboard && (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        if ((event.target as HTMLInputElement).type === 'file') {
          return;
        }
        openKeyboard(event.target as HTMLInputElement | HTMLTextAreaElement);
      }
    };

    window.addEventListener('focusin', handleFocus);

    return () => {
      window.removeEventListener('focusin', handleFocus);
    };
  }, []);

  if (!selectedMode) {
    return <ModeSelector onSelectMode={setSelectedMode} />;
  }

  // Server Mode Rendering
  if (selectedMode === 'server') {
    if (!isDataLoaded) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent animate-spin rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600">Loading Whiz POS Server...</p>
          </div>
        </div>
      );
    }

    if (!businessSetup || !businessSetup.isSetup) {
      return <BusinessRegistrationPage />;
    }

    if (!isServerLoggedIn) {
      return (
        <ErrorBoundary>
          <LoginScreen onLoginSuccess={() => setIsServerLoggedIn(true)} isServerMode={true} />
        </ErrorBoundary>
      );
    }

    // Server Layout
    return (
      <ErrorBoundary>
        <ServerLayout 
          onLogout={() => {
            setIsServerLoggedIn(false);
          }} 
        />
      </ErrorBoundary>
    );
  }

  // Outlet Mode Rendering
  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent animate-spin rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Loading Whiz POS Outlet...</p>
        </div>
      </div>
    );
  }

  if (!businessSetup || !businessSetup.isSetup) {
    return <BusinessRegistrationPage />;
  }

  // Outlet Layout (Checkout Terminal)
  return (
    <ErrorBoundary>
      <OutletLayout />
    </ErrorBoundary>
  );
}

export default App;
