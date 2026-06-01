import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
  Wifi,
  WifiOff,
  Clock,
  RefreshCw,
  Send,
  MessageSquare
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { usePosStore } from '../store/posStore';
import { serverOutletCommService } from '../services/ServerOutletCommunicationService';

export default function OutletDashboard() {
  const { products, transactions, users } = usePosStore(state => ({
    products: state.products,
    transactions: state.transactions,
    users: state.users
  }));

  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const today = new Date().toDateString();
  const todayTransactions = transactions.filter(t => new Date(t.timestamp).toDateString() === today);
  const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.total, 0);

  useEffect(() => {
    // Initialize Outlet communication
    serverOutletCommService.setInstanceType('outlet');
    serverOutletCommService.setOnMessage((msg) => {
      setMessages(prev => [...prev, msg]);
    });
  }, []);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSync(new Date());
    }, 1500);
  };

  const handleSendPingToServer = () => {
    serverOutletCommService.sendPing('server');
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'ping',
      from: 'outlet',
      to: 'server',
      timestamp: new Date(),
      outgoing: true
    }]);
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-slate-500">Today's Sales</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              KES {todayRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 mt-2">{todayTransactions.length} transactions</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Package className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-slate-500">Products</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{products.length}</div>
            <p className="text-xs text-slate-500 mt-2">Available</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-slate-500">Active Users</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {users.filter(u => u.isActive !== false).length}
            </div>
            <p className="text-xs text-slate-500 mt-2">{users.length} total</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-slate-500">Shift Time</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              04:25:10
            </div>
            <p className="text-xs text-slate-500 mt-2">Current shift</p>
          </Card>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Orders History */}
          <button 
            className="group relative overflow-hidden bg-white border-2 border-slate-100 rounded-2xl p-8 hover:border-slate-200 hover:shadow-lg transition-all duration-300"
          >
            <BarChart3 className="w-16 h-16 mb-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Orders History</h3>
            <p className="text-slate-500">View and manage past orders</p>
          </button>

          {/* Inventory Lookup */}
          <button 
            className="group relative overflow-hidden bg-white border-2 border-slate-100 rounded-2xl p-8 hover:border-slate-200 hover:shadow-lg transition-all duration-300"
          >
            <Package className="w-16 h-16 mb-4 text-slate-500 group-hover:text-emerald-600 transition-colors" />
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Inventory</h3>
            <p className="text-slate-500">Check product availability</p>
          </button>

          {/* X-Report */}
          <button 
            className="group relative overflow-hidden bg-white border-2 border-slate-100 rounded-2xl p-8 hover:border-slate-200 hover:shadow-lg transition-all duration-300"
          >
            <Clock className="w-16 h-16 mb-4 text-slate-500 group-hover:text-purple-600 transition-colors" />
            <h3 className="text-2xl font-bold text-slate-900 mb-2">X-Report</h3>
            <p className="text-slate-500">Mid-shift summary</p>
          </button>

          {/* Z-Report */}
          <button 
            className="group relative overflow-hidden bg-white border-2 border-slate-100 rounded-2xl p-8 hover:border-slate-200 hover:shadow-lg transition-all duration-300"
          >
            <BarChart3 className="w-16 h-16 mb-4 text-slate-500 group-hover:text-orange-600 transition-colors" />
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Z-Report</h3>
            <p className="text-slate-500">End of day closing</p>
          </button>
        </div>

        {/* Recent Transactions and Server Communication */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Transactions */}
          <Card>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Recent Transactions</h3>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </div>
            <div className="divide-y divide-slate-100">
              {[...todayTransactions].reverse().slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-100 rounded-xl">
                      <ShoppingCart className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">#{transaction.id.slice(0, 8)}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(transaction.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 text-lg">
                      KES {transaction.total.toFixed(2)}
                    </p>
                    <Badge className="bg-blue-100 text-blue-700">
                      {transaction.paymentMethod}
                    </Badge>
                  </div>
                </div>
              ))}
              {todayTransactions.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No transactions today yet.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Server Communication Panel */}
          <Card>
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-500" />
                Server Communication
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSendPingToServer}
              >
                <Send className="w-4 h-4 mr-2" />
                Send Ping to Server
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
                          msg.from === 'outlet' 
                            ? 'bg-emerald-50 border border-emerald-100' 
                            : 'bg-blue-50 border border-blue-100'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className={`font-semibold ${
                            msg.from === 'outlet' ? 'text-emerald-700' : 'text-blue-700'
                          }`}>
                            {msg.from === 'outlet' ? 'Outlet' : 'Server'}
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
          </Card>
        </div>
      </div>
    </div>
  );
}
