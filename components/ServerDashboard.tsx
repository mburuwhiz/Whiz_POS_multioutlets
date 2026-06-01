import React, { useEffect, useState } from 'react';
import { usePosStore } from '../store/posStore';
import {
  Users,
  Smartphone,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  LayoutDashboard,
  Package,
  Settings,
  ChevronRight,
  Database,
  CreditCard,
  BarChart3,
  Send,
  MessageSquare
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { serverOutletCommService } from '../services/ServerOutletCommunicationService';
import OutletApprovalWizard from './OutletApprovalWizard';

export default function ServerDashboard() {
  const [pendingOutlets, setPendingOutlets] = useState<any[]>([]);
  const [approvedOutlets, setApprovedOutlets] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [wizardOutlet, setWizardOutlet] = useState<any | null>(null);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const { 
    businessSetup, 
    products,
    users,
    transactions
  } = usePosStore(state => ({
    businessSetup: state.businessSetup,
    products: state.products,
    users: state.users,
    transactions: state.transactions
  }));
  
  // Calculate dashboard stats
  const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
  const today = new Date().toDateString();
  const todayTransactions = transactions.filter(t => new Date(t.timestamp || t.createdAt || 0).toDateString() === today);
  const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.total, 0);
  const lowStockProducts = products.filter(p => p.stock <= 10);
  const outOfStockProducts = products.filter(p => p.stock === 0);

  const loadOutlets = async () => {
    if (window.electron) {
        const pending = await window.electron.getPendingOutlets();
        const approved = await window.electron.getApprovedOutlets();
      setPendingOutlets(pending || []);
      setApprovedOutlets(approved || []);
    }
  };

  useEffect(() => {
    loadOutlets();
    if (window.electron && window.electron.onPendingOutletsUpdate) {
        window.electron.onPendingOutletsUpdate((event, outlets) => {
            setPendingOutlets(outlets);
        });
    }

    // Initialize Server communication
    serverOutletCommService.setInstanceType('server');
    serverOutletCommService.setOnMessage((msg) => {
      setMessages(prev => [...prev, msg]);
    });
  }, []);

  const handleSendPingToOutlet = () => {
    serverOutletCommService.sendPing('outlet');
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'ping',
      from: 'server',
      to: 'outlet',
      timestamp: new Date(),
      outgoing: true
    }]);
  };

  const navigateToServerPage = (page: 'products' | 'users' | 'settings') => {
    window.dispatchEvent(new CustomEvent('server:navigate', { detail: page }));
  };

  const handleApprove = (outlet: any) => {
    setWizardOutlet(outlet);
  };

  const handleReject = async () => {
    if (!rejectTarget || !window.electron?.rejectOutlet) return;
    const result = await window.electron.rejectOutlet(
      rejectTarget.id,
      rejectReason.trim() || 'Rejected from server dashboard'
    );
    if (result.success) {
      await loadOutlets();
      setRejectTarget(null);
      setRejectReason('');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Management Hub</h1>
          <p className="text-slate-500">Central orchestration and outlet monitoring</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-slate-700">Server Online</span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-slate-500">Today's Revenue</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            KES {todayRevenue.toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-2">{todayTransactions.length} transactions</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <BarChart3 className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-slate-500">Total Revenue</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            KES {totalRevenue.toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-2">{transactions.length} total</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
              <Package className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-slate-500">Low Stock Items</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{lowStockProducts.length}</div>
          {outOfStockProducts.length > 0 && (
            <p className="text-xs text-red-600 mt-2">
              {outOfStockProducts.length} out of stock!
            </p>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-slate-500">Active Users</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {users.filter(u => u.isActive !== false).length}
          </div>
          <p className="text-xs text-slate-500 mt-2">{users.length} total</p>
        </Card>
      </div>
      
      {/* Outlet Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Smartphone className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-slate-500">Total Outlets</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{approvedOutlets.length}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-slate-500">Pending Approval</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{pendingOutlets.length}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Outlets List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Connected Outlets</h2>
              <Button variant="ghost" size="sm" onClick={loadOutlets}>
                <Activity className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="divide-y divide-slate-50">
              {pendingOutlets.map(outlet => (
                <div key={outlet.id} className="p-6 flex items-center justify-between bg-orange-50/30">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <Smartphone className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{outlet.name}</div>
                      <div className="text-xs text-slate-500">{outlet.ip} • Pending Approval</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleApprove(outlet)}
                    >
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-red-600 border-red-100 hover:bg-red-50"
                      onClick={() => { setRejectTarget(outlet); setRejectReason(''); }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}

              {approvedOutlets.length === 0 && pendingOutlets.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                  <Smartphone className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No outlets connected yet.</p>
                </div>
              )}

              {approvedOutlets.map(outlet => (
                <div key={outlet.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-100 rounded-xl">
                      <Smartphone className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{outlet.name}</div>
                      <div className="text-xs text-slate-500">{outlet.ip} • Online</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    View Details
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-200">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-blue-400" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => navigateToServerPage('products')}
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-blue-400" />
                  <span className="font-medium">Master Catalog</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
              </button>

              <button
                onClick={() => navigateToServerPage('users')}
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-purple-400" />
                  <span className="font-medium">User Directory</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
              </button>

              <button
                onClick={() => navigateToServerPage('settings')}
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-orange-400" />
                  <span className="font-medium">System Settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>

          {/* Communication Panel */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              Outlet Communication
            </h3>
            <div className="space-y-4">
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleSendPingToOutlet}
              >
                <Send className="w-4 h-4 mr-2" />
                Send Ping to Outlet
              </Button>
              
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <p className="text-xs font-semibold text-slate-500">Message Log</p>
                </div>
                <div className="h-48 overflow-y-auto p-4 space-y-2">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">No messages yet</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`p-3 rounded-lg text-xs ${
                          msg.from === 'server' 
                            ? 'bg-blue-50 border border-blue-100' 
                            : 'bg-emerald-50 border border-emerald-100'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className={`font-semibold ${
                            msg.from === 'server' ? 'text-blue-700' : 'text-emerald-700'
                          }`}>
                            {msg.from === 'server' ? 'Server' : 'Outlet'}
                          </span>
                          <span className="text-slate-500">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-slate-700 font-mono">
                          {msg.type.toUpperCase()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-slate-500" />
              Auto-Backup Console
            </h3>
            <div className="space-y-4">
              <div className="text-xs text-slate-500 leading-relaxed">
                Automated 2-hour database pulls are active. Storage path:
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-[10px] font-mono text-slate-600 break-all border border-slate-100">
                Documents/WhizPOS/Outlets/
              </div>
              <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Next backup: in 1h 45m
              </div>
            </div>
          </div>
        </div>
      </div>

      <OutletApprovalWizard
        isOpen={!!wizardOutlet}
        outlet={wizardOutlet}
        onClose={() => setWizardOutlet(null)}
        onApproved={loadOutlets}
      />

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Reject Outlet</h3>
            <p className="text-sm text-slate-600">Reason for rejecting <strong>{rejectTarget.name}</strong>:</p>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2"
              placeholder="Rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setRejectTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject}>Confirm Reject</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
