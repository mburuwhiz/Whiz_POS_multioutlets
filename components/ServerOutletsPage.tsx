import React, { useState, useEffect } from 'react';
import { Store, Search, Wifi, WifiOff, AlertCircle, Edit2, Trash2, RefreshCw, Users, Package, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import OutletStockPage from './OutletStockPage';
import { usePosStore } from '../store/posStore';

export default function ServerOutletsPage({ onBack, onOutletUpdated }: { onBack: () => void; onOutletUpdated?: () => void }) {
  const [outlets, setOutlets] = useState<any[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'pending' | 'offline'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const businessSetup = usePosStore(state => state.businessSetup);

  const loadOutlets = async () => {
    if (window.electron?.getApprovedOutlets) {
      const data = await window.electron.getApprovedOutlets();
      setOutlets(data);
    }
  };

  useEffect(() => {
    loadOutlets();
  }, []);

  const handleOutletUpdated = () => {
    loadOutlets();
    if (onOutletUpdated) onOutletUpdated();
  };

  const handleDelete = async (outlet: any) => {
    if (window.confirm(`Are you sure you want to delete outlet "${outlet.name}"?`)) {
      if (window.electron?.deleteOutlet) {
        await window.electron.deleteOutlet(outlet.id);
        await loadOutlets();
      }
    }
  };

  const handlePing = async (outlet: any) => {
    if (window.electron?.pingOutlet) {
      setIsLoading(true);
      await window.electron.pingOutlet(outlet.id);
      await loadOutlets();
      setIsLoading(false);
    }
  };

  const filteredOutlets = outlets.filter(outlet => {
    const matchesSearch = outlet.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'online' && outlet.isOnline) ||
      (filter === 'offline' && !outlet.isOnline) ||
      (filter === 'pending' && !outlet.isApproved);
    return matchesSearch && matchesFilter;
  });

  if (selectedOutlet) {
    return (
      <OutletStockPage 
        outlet={selectedOutlet} 
        onBack={() => setSelectedOutlet(null)} 
        onOutletUpdated={handleOutletUpdated}
      />
    );
  }

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="flex-1 flex flex-col">
        <div className="bg-white p-3 md:p-4 border-b border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" onClick={onBack} className="h-10 w-10 p-0 rounded-full bg-slate-50 hover:bg-slate-100">
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </Button>
            <div className="flex items-center gap-2">
              <Store className="w-7 h-7 text-indigo-600" />
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">Outlets Management</h1>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <div className="relative flex-1 w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search outlets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-slate-50 border-slate-200"
              />
            </div>
            <div className="flex gap-1.5">
              {(['all', 'online', 'pending', 'offline'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filter === f
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          {filteredOutlets.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Store className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-600">No outlets found</h3>
                <p className="text-slate-500 mt-1 text-sm">Configure outlets from the setup wizard</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredOutlets.map((outlet) => {
                const isOnline = outlet.isOnline;
                const status = {
                  text: isOnline ? 'Online' : 'Offline',
                  color: isOnline ? 'text-emerald-600' : 'text-red-600',
                  bg: isOnline ? 'bg-emerald-50' : 'bg-red-50',
                  border: isOnline ? 'border-emerald-200' : 'border-red-200'
                };
                const StatusIcon = isOnline ? Wifi : WifiOff;
                const stockCount = Object.keys(outlet.currentStock || {}).length;
                const userCount = (outlet.assignedUserIds || []).length;

                return (
                  <div
                    key={outlet.id}
                    onClick={() => setSelectedOutlet(outlet)}
                    className={`bg-white rounded-xl p-4 border-2 shadow-sm hover:shadow-lg hover:-translate-y-0.5 cursor-pointer transition-all duration-300 ${
                      selectedOutlet?.id === outlet.id ? 'border-indigo-500 ring-1 ring-indigo-100 shadow-lg' : 'border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                        <Store className="w-6 h-6 text-white" />
                      </div>
                      <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${status.bg} ${status.color} ${status.border}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.text}
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm mb-0.5 truncate">{outlet.name}</h3>
                    <p className="text-slate-500 text-xs mb-2 truncate">
                      {outlet.ip ? `${outlet.ip}${outlet.port ? `:${outlet.port}` : ''}` : 'No address yet'}
                    </p>

                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                      <div className="bg-slate-50 rounded-lg p-2 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs font-medium text-slate-700">{stockCount} products</span>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs font-medium text-slate-700">{userCount} users</span>
                      </div>
                    </div>

                    {outlet.lastSeen && (
                      <div className="text-[10px] text-slate-400 mb-3 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Last seen: {new Date(outlet.lastSeen).toLocaleString()}
                      </div>
                    )}

                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1 h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePing(outlet);
                        }}
                        disabled={isLoading}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                        Ping
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(outlet);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
