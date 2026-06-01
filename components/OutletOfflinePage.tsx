import React, { useState } from 'react';
import { usePosStore } from '../store/posStore';
import { resolveSyncTarget } from '../store/posStore';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useToast } from './ui/use-toast';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Database,
  RefreshCw,
  ShieldAlert,
  Wifi,
  WifiOff
} from 'lucide-react';

export default function OutletOfflinePage() {
  const { toast } = useToast();
  const {
    isOnline,
    realtimeSyncStatus,
    syncQueue,
    syncFromServer,
    processSyncQueue,
    lastSyncTime,
    products,
    businessSetup
  } = usePosStore(state => ({
    isOnline: state.isOnline,
    realtimeSyncStatus: state.realtimeSyncStatus,
    syncQueue: state.syncQueue,
    syncFromServer: state.syncFromServer,
    processSyncQueue: state.processSyncQueue,
    lastSyncTime: state.lastSyncTime,
    products: state.products,
    businessSetup: state.businessSetup
  })); 
  const connectionState = businessSetup?.mode === 'outlet'
    ? realtimeSyncStatus === 'connected'
    : isOnline;

  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [rawServerData, setRawServerData] = useState<any>(null);

  const handlePullFromServer = async () => {
    setIsPulling(true);
    try {
      await syncFromServer();
      if (businessSetup?.outletId) {
        const { baseUrl } = await resolveSyncTarget(businessSetup);
        if (baseUrl) {
          const response = await fetch(`${baseUrl}/api/outlet-sync/${businessSetup.outletId}`);
          if (response.ok) {
            setRawServerData(await response.json());
          }
        }
      }
      toast('Outlet data refreshed from server.', 'success');
    } catch (e) {
      console.error('Pull from server failed:', e);
      toast('Failed to refresh outlet data.', 'error');
    } finally {
      setIsPulling(false);
    }
  };

  const handlePushQueue = async () => {
    setIsPushing(true);
    try {
      await processSyncQueue();
      toast('Pending operations sent to the server.', 'success');
    } catch (e) {
      console.error('Push queue failed:', e);
      toast('Failed to send queued changes.', 'error');
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-6 text-white md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
              <ShieldAlert className="h-4 w-4" />
              Sync Control
            </div>
            <h1 className="mt-3 text-3xl font-black md:text-5xl">Outlet Sync Center</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 md:text-base">
              This panel shows whether the outlet is online, what is waiting in the queue, and whether the server is returning fresh stock and user data.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={handlePullFromServer} disabled={isPulling}>
              <ArrowDownToLine className={`mr-2 h-4 w-4 ${isPulling ? 'animate-spin' : ''}`} />
              Pull Latest
            </Button>
            <Button variant="ghost" className="border border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={handlePushQueue} disabled={isPushing}>
              <ArrowUpFromLine className={`mr-2 h-4 w-4 ${isPushing ? 'animate-spin' : ''}`} />
              Push Queue
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Connection</p>
                <p className="mt-2 text-2xl font-bold">{connectionState ? 'Online' : 'Offline'}</p>
              </div>
              {connectionState ? <Wifi className="h-8 w-8 text-emerald-300" /> : <WifiOff className="h-8 w-8 text-orange-300" />}
            </div>
          </Card>

          <Card className="border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-300">Pending Operations</p>
            <p className="mt-2 text-3xl font-black text-white">{syncQueue.length}</p>
          </Card>

          <Card className="border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-300">Last Sync</p>
            <p className="mt-2 text-base font-semibold text-white">
              {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never'}
            </p>
          </Card>

          <Card className="border-white/10 bg-white/5 p-5">
            <p className="text-sm text-slate-300">Products Loaded</p>
            <p className="mt-2 text-3xl font-black text-white">{products.length}</p>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="border-white/10 bg-white p-6 text-slate-900 lg:col-span-7">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-bold">Server Snapshot</h2>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              This is the latest response returned by the server. It helps verify whether the outlet is receiving assigned users, products, and stock correctly.
            </p>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {rawServerData ? (
                <pre className="max-h-72 overflow-auto text-xs text-slate-700">{JSON.stringify(rawServerData, null, 2)}</pre>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <RefreshCw className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                  Pull from the server to inspect the returned outlet payload.
                </div>
              )}
            </div>
          </Card>

          <Card className="border-white/10 bg-white p-6 text-slate-900 lg:col-span-5">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold">Recovery Actions</h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>Pull the latest outlet assignment and live stock from the server</li>
              <li>Push queued offline operations as soon as the network returns</li>
              <li>Confirm whether the sync payload includes the right products and users</li>
            </ul>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handlePullFromServer} disabled={isPulling}>
                <ArrowDownToLine className={`mr-2 h-4 w-4 ${isPulling ? 'animate-spin' : ''}`} />
                Refresh From Server
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reload App
              </Button>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-100 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Queue Status</p>
              <p className="mt-2 text-sm text-slate-700">
                {syncQueue.length > 0
                  ? `${syncQueue.length} operation(s) are waiting to be pushed.`
                  : 'There are no queued changes right now.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className="bg-slate-900 text-white">{connectionState ? 'Network Ready' : 'Offline Mode'}</Badge>
                <Badge variant="secondary">{businessSetup?.mode || 'outlet'}</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
