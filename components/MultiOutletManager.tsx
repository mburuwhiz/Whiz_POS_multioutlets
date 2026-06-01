import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/Switch';
import { Server, Store, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { Outlet, AppMode } from '../types';

export const MultiOutletManager: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>('server');
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAppMode();
    loadOutlets();
  }, []);

  const loadAppMode = async () => {
    if (!window.electron.multiOutlet) return;
    const mode = await window.electron.multiOutlet.getAppMode();
    setAppMode(mode);
  };

  const loadOutlets = async () => {
    if (!window.electron.multiOutlet) return;
    setIsLoading(true);
    const data = await window.electron.multiOutlet.getOutlets();
    setOutlets(data);
    setIsLoading(false);
  };

  const handleAppModeChange = async (mode: AppMode) => {
    if (!window.electron.multiOutlet) return;
    await window.electron.multiOutlet.setAppMode(mode);
    setAppMode(mode);
    if (confirm('App mode changed. Restart the application to apply changes?')) {
      location.reload();
    }
  };

  const handleApproveOutlet = async (outletId: string) => {
    if (!window.electron.multiOutlet) return;
    try {
      await window.electron.multiOutlet.approveOutlet(outletId);
      await loadOutlets();
    } catch (error) {
      console.error('Failed to approve outlet:', error);
    }
  };

  const handleDeleteOutlet = async (outletId: string) => {
    if (!window.electron.multiOutlet) return;
    if (confirm('Are you sure you want to delete this outlet?')) {
      try {
        await window.electron.multiOutlet.deleteOutlet(outletId);
        await loadOutlets();
      } catch (error) {
        console.error('Failed to delete outlet:', error);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'offline':
        return <Badge className="bg-gray-500"><XCircle className="w-3 h-3 mr-1" /> Offline</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Multi-Outlet Management</h2>
        <Button onClick={loadOutlets} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          {appMode === 'server' ? <Server className="w-5 h-5 mr-2" /> : <Store className="w-5 h-5 mr-2" />}
          Application Mode
        </h3>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Server className="w-4 h-4" />
            <span>Server Mode</span>
            <Switch
              checked={appMode === 'server'}
              onChange={() => handleAppModeChange(appMode === 'server' ? 'outlet' : 'server')}
            />
            <Store className="w-4 h-4" />
            <span>Outlet Mode</span>
          </div>
        </div>
      </Card>

      {appMode === 'server' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Connected Outlets</h3>
          {isLoading ? (
            <div className="text-center py-8">Loading outlets...</div>
          ) : outlets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No outlets discovered yet</div>
          ) : (
            <div className="space-y-4">
              {outlets.map((outlet) => (
                <div key={outlet.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">{outlet.name}</h4>
                    <p className="text-sm text-gray-500">
                      {outlet.ipAddress && `IP: ${outlet.ipAddress}`}
                      {outlet.lastSeen && ` • Last seen: ${new Date(outlet.lastSeen).toLocaleString()}`}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    {getStatusBadge(outlet.status)}
                    {outlet.status === 'pending' && (
                      <Button onClick={() => handleApproveOutlet(outlet.id)}>
                        Approve
                      </Button>
                    )}
                    <Button variant="destructive" onClick={() => handleDeleteOutlet(outlet.id)}>
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {appMode === 'outlet' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Outlet Status</h3>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <p className="text-gray-600">Looking for server...</p>
              <p className="text-sm text-gray-400 mt-2">
                The outlet will automatically discover and connect to the Whiz POS Server on the local network.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
