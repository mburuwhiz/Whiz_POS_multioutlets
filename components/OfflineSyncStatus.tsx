import React, { useState, useEffect } from 'react';
import { usePosStore } from '../store/posStore';
import { Wifi, WifiOff, CheckCircle, AlertCircle, RefreshCw, Database, Activity, Clock, ArrowUpCircle, ArrowDownCircle, Server, Smartphone } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

interface SyncQueueItem {
  id: string;
  type: 'transaction' | 'expense' | 'product' | 'customer';
  data: any;
  timestamp: string;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  retryCount: number;
}

export default function OfflineSyncStatus() {
  const { syncQueue, isOnline, realtimeSyncStatus, businessSetup, processSyncQueue, syncFromServer, pushDataToServer, lastSyncTime } = usePosStore();
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isFullSyncing, setIsFullSyncing] = useState(false);
  const connectionOnline = businessSetup?.mode === 'outlet'
    ? realtimeSyncStatus === 'connected'
    : true;

  // Confirm State
  const [showFullSyncConfirm, setShowFullSyncConfirm] = useState(false);

  // Derived stats from actual store queue
  const syncStats = {
    total: syncQueue.length,
    pending: syncQueue.length, // All items in queue are technically pending until processed
    completed: 0, // We don't keep completed items in queue in the store logic (they are removed)
    failed: 0 // Store retries internally but doesn't flag 'failed' in the queue array same way
  };

  const handlePushSync = async () => {
    if (!connectionOnline) {
        alert("The local sync link is not ready yet.");
        return;
    }
    setIsPushing(true);
    try {
      await processSyncQueue();
      // alert('Push sync completed.');
    } catch (error) {
      console.error('Push sync failed:', error);
      alert('Push sync failed. Check console for details.');
    } finally {
      setIsPushing(false);
    }
  };

  const handlePullSync = async () => {
     if (!connectionOnline) {
        alert("The local sync link is not ready yet.");
        return;
    }
    setIsPulling(true);
    try {
      await syncFromServer();
      // alert('Pull sync completed.');
    } catch (error) {
      console.error('Pull sync failed:', error);
      alert('Pull sync failed. Check console for details.');
    } finally {
      setIsPulling(false);
    }
  };

  const executeFullSync = async () => {
    setIsFullSyncing(true);
    try {
      await pushDataToServer();
      alert('Full sync completed successfully.');
    } catch (error) {
      console.error('Full sync failed:', error);
      alert('Full sync failed. Check console for details.');
    } finally {
      setIsFullSyncing(false);
    }
  };

  const handleFullSyncClick = () => {
     if (!connectionOnline) {
        alert("The local sync link is not ready yet.");
        return;
    }
    setShowFullSyncConfirm(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Database className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Sync Status</h1>
                <p className="text-gray-600">Manage data synchronization with Back Office</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
                connectionOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {connectionOnline ? (
                  <>
                    <Wifi className="w-4 h-4" />
                    <span className="font-medium">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4" />
                    <span className="font-medium">Offline</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Queue Status</p>
                <p className="text-xl font-bold text-gray-800">{syncQueue.length} Items Pending</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Last Sync</p>
                <p className="text-xl font-bold text-gray-800">
                  {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never'}
                </p>
              </div>
              <RefreshCw className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Server Status</p>
                <p className="text-xl font-bold text-gray-800">{connectionOnline ? 'Reachable' : 'Unreachable'}</p>
              </div>
              <Server className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Manual Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
             {/* Sync Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Manual Sync Actions</h2>
                <div className="space-y-4">
                    <button
                    onClick={handlePushSync}
                    disabled={isPushing || !connectionOnline || syncQueue.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                    <ArrowUpCircle className={`w-5 h-5 ${isPushing ? 'animate-bounce' : ''}`} />
                    <span>{isPushing ? 'Pushing Data...' : 'Push Pending Data (Desktop → Server)'}</span>
                    </button>

                    <button
                    onClick={handlePullSync}
                    disabled={isPulling || !connectionOnline}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                    <ArrowDownCircle className={`w-5 h-5 ${isPulling ? 'animate-bounce' : ''}`} />
                    <span>{isPulling ? 'Checking Updates...' : 'Pull Updates (Server → Desktop)'}</span>
                    </button>

                    <div className="pt-4 border-t border-gray-100">
                        <button
                        onClick={handleFullSyncClick}
                        disabled={isFullSyncing || !connectionOnline}
                        className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                        >
                        <Database className={`w-5 h-5 ${isFullSyncing ? 'animate-pulse' : ''}`} />
                        <span>{isFullSyncing ? 'Syncing...' : 'Full Cloud Synchronization (Overwrite Server)'}</span>
                        </button>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            Use "Full Sync" to force push all local data (Products, Users, Customers, Transactions) to the Back Office.
                        </p>
                    </div>
                </div>
            </div>

             {/* Sync Info */}
             <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Sync Frequency</h2>
                 <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-start space-x-3">
                        <Clock className="w-5 h-5 text-blue-600 mt-1" />
                        <div>
                                <p className="font-medium text-blue-900">Auto-Sync Interval: 10 Seconds</p>
                                <p className="text-sm text-blue-700 mt-1">
                                When the local sync link is ready, the system automatically pushes changes and checks for updates every 10 seconds.
                                </p>
                        </div>
                    </div>
                </div>
             </div>
        </div>

        {/* Queue Details */}
        {syncQueue.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-200">
             <h2 className="text-lg font-semibold text-gray-800">Pending Operations ({syncQueue.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Summary</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {syncQueue.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       {item.data.id || item.data.name || 'Unknown Data'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        <ConfirmDialog
          isOpen={showFullSyncConfirm}
          onCancel={() => setShowFullSyncConfirm(false)}
          onConfirm={executeFullSync}
          title="Full Synchronization"
          description="This will force push all your Desktop data to the Back Office, potentially overwriting data there. Are you sure you want to continue?"
          confirmLabel="Start Full Sync"
          variant="warning"
        />

      </div>
    </div>
  );
}
