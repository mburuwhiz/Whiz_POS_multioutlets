import React, { useMemo, useState } from 'react';
import { usePosStore } from '../store/posStore';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { useToast } from './ui/use-toast';
import {
  ArrowRightLeft,
  ClipboardCopy,
  RefreshCw,
  Server,
  ShieldCheck,
  Settings,
  Signal,
  Store,
  Wifi,
  WifiOff,
  Receipt
} from 'lucide-react';

export default function OutletSettingsPage() {
  const { toast } = useToast();
  const { businessSetup, syncFromServer, lastSyncTime, isOnline, products, users, saveBusinessSetup } = usePosStore(state => ({
    businessSetup: state.businessSetup,
    syncFromServer: state.syncFromServer,
    lastSyncTime: state.lastSyncTime,
    isOnline: state.isOnline,
    products: state.products,
    users: state.users,
    saveBusinessSetup: state.saveBusinessSetup
  }));

  const [isSyncing, setIsSyncing] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [receiptHeader, setReceiptHeader] = useState(businessSetup?.receiptHeader || '');
  const [receiptFooter, setReceiptFooter] = useState(businessSetup?.receiptFooter || '');
  const [showLogoOnReceipt, setShowLogoOnReceipt] = useState(businessSetup?.showLogoOnReceipt !== false);

  const assignedProductCount = useMemo(() => businessSetup?.assignedProductIds?.length || products.length, [businessSetup?.assignedProductIds, products.length]);
  const assignedUserCount = useMemo(() => businessSetup?.assignedUserIds?.length || users.length, [businessSetup?.assignedUserIds, users.length]);

  if (!businessSetup) return null;

  const handleSyncNow = async () => {
    if (!isOnline) {
      toast('Connect to the network first, then sync again.', 'error');
      return;
    }

    setIsSyncing(true);
    try {
      await syncFromServer();
      toast('Outlet synced successfully.', 'success');
    } catch (error) {
      toast('Sync failed. Please try again.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyOutletId = async () => {
    const outletCode = businessSetup.outletCode || businessSetup.outletId;
    if (!outletCode) return;
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(outletCode);
      toast('Outlet ID copied to clipboard.', 'success');
    } catch {
      toast('Could not copy Outlet ID.', 'error');
    } finally {
      setIsCopying(false);
    }
  };

  const handleSaveReceiptSettings = () => {
    if (!businessSetup) return;
    saveBusinessSetup({
      ...businessSetup,
      receiptHeader,
      receiptFooter,
      showLogoOnReceipt
    });
    toast('Receipt settings saved successfully!', 'success');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
              <Settings className="h-4 w-4" />
              Outlet Management
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">Outlet Settings</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 md:text-base">
                Keep this terminal aligned with the server, review its assignment, and quickly recover if the connection drops.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={handleSyncNow} disabled={isSyncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing' : 'Sync Now'}
            </Button>
            <Button variant="ghost" className="border border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={handleCopyOutletId} disabled={isCopying || !(businessSetup.outletCode || businessSetup.outletId)}>
              <ClipboardCopy className="mr-2 h-4 w-4" />
              {isCopying ? 'Copying' : 'Copy Outlet ID'}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="border-white/10 bg-white/5 p-6 lg:col-span-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Store className="h-5 w-5" />
                  <span className="text-sm font-medium">Active Outlet</span>
                </div>
                <h2 className="mt-3 text-2xl font-bold text-white">{businessSetup.outletName || businessSetup.businessName}</h2>
                <p className="mt-1 text-sm text-slate-300">{businessSetup.locationName || businessSetup.address || 'Location not set'}</p>
              </div>

              <Badge className="bg-emerald-500/15 text-emerald-300">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                {businessSetup.status || 'approved'}
              </Badge>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <Signal className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-[0.2em]">Connection</span>
                </div>
                <p className="mt-3 text-lg font-bold">{isOnline ? 'Online' : 'Offline'}</p>
                <p className="mt-1 text-sm text-slate-400">{businessSetup.backOfficeUrl || businessSetup.apiUrl || 'Server URL not configured'}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <Server className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-[0.2em]">Outlet ID</span>
                </div>
                <p className="mt-3 break-all text-lg font-bold text-white">{businessSetup.outletCode || businessSetup.outletId || 'Not assigned'}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">Business shortcode: {businessSetup.businessShortcode || 'ws'}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <Wifi className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-[0.2em]">Last Sync</span>
                </div>
                <p className="mt-3 text-lg font-bold text-white">{lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never'}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Assigned products: {assignedProductCount}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Assigned users: {assignedUserCount}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Terminal mode: {businessSetup.mode || 'outlet'}
              </span>
            </div>
          </Card>

          <Card className="border-white/10 bg-white/5 p-6 lg:col-span-4">
            <div className="flex items-center gap-2 text-slate-300">
              <WifiOff className={`h-5 w-5 ${isOnline ? 'text-emerald-300' : 'text-orange-300'}`} />
              <span className="text-sm font-medium">Sync Health</span>
            </div>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
                <p className="mt-2 text-2xl font-black">{isOnline ? 'Ready' : 'Waiting for network'}</p>
                <p className="mt-2 text-sm text-slate-300">
                  Pulls from the server and saves locally when the connection returns.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Configured Receipts</p>
                <p className="mt-2 text-sm text-slate-300">
                  Footer: {businessSetup.receiptFooter ? 'Custom' : 'Default'}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Printer: {businessSetup.selectedPrinter || businessSetup.printerType || 'thermal'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-1">
          <Card className="border-white/10 bg-white p-6 text-slate-900">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-bold">Receipt Settings</h3>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Customize how receipts look for this specific outlet.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Receipt Header</label>
                <Input 
                  value={receiptHeader} 
                  onChange={(e) => setReceiptHeader(e.target.value)} 
                  placeholder="Enter receipt header text"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Receipt Footer</label>
                <Input 
                  value={receiptFooter} 
                  onChange={(e) => setReceiptFooter(e.target.value)} 
                  placeholder="Enter receipt footer text"
                />
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="showLogoOutlet" 
                  className="w-4 h-4 text-blue-600" 
                  checked={showLogoOnReceipt}
                  onChange={(e) => setShowLogoOnReceipt(e.target.checked)} 
                />
                <label htmlFor="showLogoOutlet" className="text-sm text-slate-700">Show business logo on receipt</label>
              </div>
              <div className="pt-2">
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveReceiptSettings}>
                  Save Receipt Settings
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="border-white/10 bg-white p-6 text-slate-900">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-bold">Quick Sync Actions</h3>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Use these actions when the outlet needs to rejoin the server or refresh its assignment snapshot.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSyncNow} disabled={isSyncing || !isOnline}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                Pull Latest Data
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reload App
              </Button>
            </div>
          </Card>

          <Card className="border-white/10 bg-white p-6 text-slate-900">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-bold">What This Page Controls</h3>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>Server connectivity status and last successful sync time</li>
              <li>Outlet identity and assignment snapshot for audits</li>
              <li>Receipt and printer preferences for the terminal</li>
              <li>Fast recovery buttons for offline or stale data situations</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
