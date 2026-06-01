import React, { useEffect, useRef, useState, ReactNode } from 'react';
import {
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
  LogOut,
  FileText,
  Receipt,
  Clock
} from 'lucide-react';
import { Button } from './ui/button';
import OutletDashboard from './OutletDashboard';
import LoginScreen from './LoginScreen';
import { usePosStore } from '../store/posStore';
import POSScreen from './POSScreen';
import CustomersPage from './CustomersPage';
import InventoryPage from './InventoryPage';
import ReceiptsPage from './ReceiptsPage';
import OutletSettingsPage from './OutletSettingsPage';
import OutletOfflinePage from './OutletOfflinePage';
import OutletExpensesPage from './OutletExpensesPage';
import { resolveSyncTarget } from '../store/posStore';

interface OutletLayoutProps {
  children?: React.ReactNode;
}

type OutletPage = 'dashboard' | 'pos' | 'receipts' | 'customers' | 'inventory' | 'expenses' | 'offline' | 'settings';

export default function OutletLayout({ children }: OutletLayoutProps) {
  const [activePage, setActivePage] = useState<OutletPage>('dashboard');
  const [isRegistering, setIsRegistering] = useState(false);
  const registrationAttemptedRef = useRef(false);
  const { currentCashier, businessSetup, logout, saveBusinessSetup } = usePosStore();

  const navItems: Array<{ id: OutletPage; label: string; icon: any; primary?: boolean }> = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'pos', label: 'New Sale', icon: ShoppingCart, primary: true },
    { id: 'receipts', label: 'Receipts', icon: FileText },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'offline', label: 'Sync Status', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <OutletDashboard />;
      case 'pos':
        return <POSScreen />;
      case 'receipts':
        return <ReceiptsPage />;
      case 'customers':
        return <CustomersPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'expenses':
        return <OutletExpensesPage />;
      case 'offline':
        return <OutletOfflinePage />;
      case 'settings':
        return <OutletSettingsPage />;
      default:
        return <OutletDashboard />;
    }
  };

  const handleRetry = async () => {
    if (!businessSetup || registrationAttemptedRef.current || isRegistering) return;
    registrationAttemptedRef.current = true;
    setIsRegistering(true);

    try {
      const { baseUrl } = await resolveSyncTarget(businessSetup);
      if (!baseUrl) {
        alert('No reachable server URL is configured. Please check Developer settings.');
        registrationAttemptedRef.current = false;
        setIsRegistering(false);
        return;
      }

      const response = await fetch(`${baseUrl}/api/register-outlet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outletName: businessSetup.outletName || businessSetup.businessName,
          outletId: businessSetup.outletId || undefined,
          businessShortcode: businessSetup.businessShortcode,
          port: Number(import.meta.env.VITE_WHIZ_POS_PORT || 3001)
        })
      });
      const result = await response.json();

      usePosStore.getState().saveBusinessSetup({
        ...businessSetup,
        status: result.status || 'pending',
        outletId: result.outletId || businessSetup.outletId,
        outletCode: result.outletId || businessSetup.outletCode,
        businessShortcode: result.businessShortcode || businessSetup.businessShortcode,
        rejectionReason: result.reason
      });
    } catch (e) {
      console.error('Retry failed', e);
      registrationAttemptedRef.current = false;
    } finally {
      setIsRegistering(false);
    }
  };

  useEffect(() => {
    if (businessSetup?.status === 'pending' && !businessSetup.outletId) {
      handleRetry();
    }
  }, [businessSetup?.status, businessSetup?.outletId, businessSetup?.businessShortcode]);

  if (businessSetup?.status === 'pending') {
    const handleCancel = () => {
      usePosStore.getState().saveBusinessSetup({
        ...businessSetup,
        isSetup: false,
        status: undefined,
        apiUrl: undefined,
        outletId: undefined,
        rejectionReason: undefined
      });
    };

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
          <Clock className="w-16 h-16 text-orange-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Waiting For Server Approval</h1>
          <p className="text-slate-600 mb-8">
            This outlet is linked to <span className="font-semibold">{businessSetup.outletName || 'the selected outlet profile'}</span> and is waiting for approval from the main server.
          </p>
          
          <div className="flex gap-4">
            <button 
              onClick={handleCancel}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-semibold transition-all"
            >
              Cancel Connection
            </button>
            <button 
              onClick={handleRetry}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold transition-all"
              disabled={isRegistering}
            >
              {isRegistering ? 'Assigning...' : businessSetup.outletId ? 'Retry Connection' : 'Assign Outlet Code'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (businessSetup?.status === 'rejected') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
          <Settings className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Outlet Request Rejected</h1>
          <p className="text-slate-600">
            {businessSetup.rejectionReason || 'The main server rejected this outlet registration request.'}
          </p>
        </div>
      </div>
    );
  }

  // If not logged in, show login screen
  if (!currentCashier || !businessSetup?.isLoggedIn) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-100 fixed h-screen left-0 top-0 z-10">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold">
              W
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">Whiz POS</h1>
              <p className="text-xs text-slate-500 font-medium">Checkout Terminal</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  item.primary 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg hover:shadow-xl hover:scale-105' 
                    : activePage === item.id
                      ? 'bg-emerald-50 text-emerald-700 font-semibold shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-red-600 transition-all duration-200">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Header */}
        <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {navItems.find(item => item.id === activePage)?.label}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                  {currentCashier.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{currentCashier.name}</p>
                  <p className="text-xs text-slate-500">{currentCashier.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        {children || renderActivePage()}
      </main>
    </div>
  );
}
