'use client';
import { useEffect, useState } from 'react';
import { TrendingUp, Package, DollarSign, AlertCircle, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface DashboardStats {
  todaySales: number;
  weeklySales: number;
  monthlySales: number;
  stockValue: number;
  lowStockItems: number;
}

interface Transaction {
  _id: string;
  transactionId: string;
  total: number;
  createdAt: string;
  timestamp?: string;
  items?: Array<{ name: string }>;
}

interface TopSellingItem {
  item: string;
  sold: number;
  percentage: number;
  totalRevenue?: number;
}

export default function BusinessDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topSellingItems, setTopSellingItems] = useState<TopSellingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const res = await fetch('/api/business', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setTransactions(data.transactions || []);
          setTopSellingItems(data.topSellingItems || []);
        } else {
          console.error('Failed to fetch dashboard data:', res.statusText);
        }
      } catch (e: any) {
        if (e.name === 'AbortError') {
          console.error('Request timed out');
        } else {
          console.error('Failed to fetch dashboard data:', e);
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  // Generate chart data for last 7 days
  const getLast7DaysChartData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayName = date.toLocaleDateString('en-KE', { weekday: 'short' });
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const daySales = transactions
        .filter(tx => {
          const txDate = new Date(tx.timestamp || tx.createdAt);
          return txDate >= dayStart && txDate <= dayEnd;
        })
        .reduce((sum, tx) => sum + (tx.total || 0), 0);
      
      data.push({
        name: dayName,
        sales: daySales
      });
    }
    return data;
  };

  const dashboardStats = [
    {
      label: "Today's Sales",
      value: stats ? formatCurrency(stats.todaySales) : "KES 0.00",
      change: "+12.5%",
      changeType: "up",
      icon: DollarSign,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      label: "Weekly Sales",
      value: stats ? formatCurrency(stats.weeklySales) : "KES 0.00",
      change: "+8.2%",
      changeType: "up",
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      label: "Monthly Sales",
      value: stats ? formatCurrency(stats.monthlySales) : "KES 0.00",
      change: "+15.3%",
      changeType: "up",
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50"
    },
    {
      label: "Stock Value",
      value: stats ? formatCurrency(stats.stockValue) : "KES 0.00",
      change: "0.5%",
      changeType: "neutral",
      icon: Package,
      color: "text-slate-600",
      bg: "bg-slate-50"
    },
    {
      label: "Low Stock Items",
      value: stats ? stats.lowStockItems.toString() : "0",
      change: stats && stats.lowStockItems > 0 ? "Need restock" : "All good",
      changeType: stats && stats.lowStockItems > 0 ? "down" : "up",
      icon: AlertCircle,
      color: stats && stats.lowStockItems > 0 ? "text-red-600" : "text-green-600",
      bg: stats && stats.lowStockItems > 0 ? "bg-red-50" : "bg-green-50"
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {isLoading ? (
          Array(5).fill(0).map((_, index) => (
            <div key={index} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-lg animate-pulse" />
                <div className="w-16 h-5 bg-slate-100 rounded-full animate-pulse" />
              </div>
              <div className="w-24 h-4 bg-slate-100 rounded mb-2 animate-pulse" />
              <div className="w-32 h-8 bg-slate-100 rounded animate-pulse" />
            </div>
          ))
        ) : (
          dashboardStats.map((stat, index) => (
            <div key={index} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bg} p-3 rounded-lg`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${
                  stat.changeType === 'up' ? 'bg-emerald-100 text-emerald-700' :
                  stat.changeType === 'down' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {stat.changeType === 'up' && <TrendingUp className="w-3 h-3" />}
                  {stat.changeType === 'down' && <TrendingDown className="w-3 h-3" />}
                  {stat.change}
                </span>
              </div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">{stat.label}</h3>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Sales Trend (Last 7 Days)</h3>
            {isLoading && <div className="w-20 h-4 bg-slate-100 rounded animate-pulse" />}
          </div>
          <div className="h-80">
            {isLoading ? (
              <div className="w-full h-full bg-slate-50 rounded-lg animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getLast7DaysChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value: any) => `KES ${(value || 0).toLocaleString()}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [formatCurrency(value || 0), 'Sales']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Selling Items */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Top Selling Items</h3>
            {isLoading && <div className="w-20 h-4 bg-slate-100 rounded animate-pulse" />}
          </div>
          <div className="h-80">
            {isLoading ? (
              <div className="w-full h-full bg-slate-50 rounded-lg animate-pulse" />
            ) : (
              topSellingItems.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  No sales data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSellingItems.slice(0, 5)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={12} />
                    <YAxis dataKey="item" type="category" stroke="#64748b" fontSize={11} width={100} />
                    <Tooltip 
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="sold" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Recent Transactions</h3>
          {isLoading && <div className="w-20 h-4 bg-slate-100 rounded animate-pulse" />}
        </div>
        <div className="space-y-4">
          {isLoading ? (
            Array(5).fill(0).map((_, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="space-y-2">
                    <div className="w-32 h-4 bg-slate-100 rounded animate-pulse" />
                    <div className="w-20 h-3 bg-slate-100 rounded animate-pulse" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="w-24 h-5 bg-slate-100 rounded animate-pulse" />
                  <div className="w-16 h-3 bg-slate-100 rounded animate-pulse ml-auto" />
                </div>
              </div>
            ))
          ) : (
            transactions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No transactions yet</div>
            ) : (
              transactions.slice(0, 5).map((txn) => (
                <div key={txn._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{txn.transactionId}</p>
                      <p className="text-xs text-slate-500">{timeAgo(txn.timestamp || txn.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{formatCurrency(txn.total)}</p>
                    <p className="text-xs text-slate-500">{txn.items?.length || 0} items</p>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}
