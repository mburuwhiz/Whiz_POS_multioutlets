'use client';
import { useEffect, useState } from 'react';
import { Calendar, FileText, TrendingUp, Package, DollarSign, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Transaction {
  _id: string;
  total: number;
  timestamp?: string;
  createdAt: string;
  paymentMethod?: string;
  items?: Array<any>;
}

interface Product {
  _id: string;
  name: string;
  quantity?: number;
  lowStockAlert?: number;
  price: number;
}

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/business');
        if (res.ok) {
          const data = await res.json();
          setTransactions(data.transactions || []);
          setProducts(data.products || []);
        }
      } catch (e) {
        console.error('Failed to fetch data:', e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Filter transactions for selected date
  const getDailyTransactions = () => {
    const date = new Date(selectedDate);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return transactions.filter(tx => {
      const txDate = new Date(tx.timestamp || tx.createdAt);
      return txDate >= dayStart && txDate <= dayEnd;
    });
  };

  const dailyTransactions = getDailyTransactions();
  const dailyTotal = dailyTransactions.reduce((sum, tx) => sum + (tx.total || 0), 0);

  // Calculate payment method breakdown
  const getPaymentMethodData = () => {
    const breakdown: Record<string, number> = {};
    dailyTransactions.forEach(tx => {
      const method = tx.paymentMethod || 'other';
      breakdown[method] = (breakdown[method] || 0) + (tx.total || 0);
    });
    return Object.entries(breakdown).map(([name, value]) => ({ name, value }));
  };

  const paymentMethodData = getPaymentMethodData();
  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

  // Get monthly data
  const getMonthlyData = () => {
    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-KE', { month: 'short' });
      
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthSales = transactions
        .filter(tx => {
          const txDate = new Date(tx.timestamp || tx.createdAt);
          return txDate >= monthStart && txDate <= monthEnd;
        })
        .reduce((sum, tx) => sum + (tx.total || 0), 0);
      
      data.push({ name: monthName, sales: monthSales });
    }
    return data;
  };

  const lowStockItems = products.filter(p => (p.quantity || 0) <= (p.lowStockAlert || 10));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-slate-500">Loading reports...</div>
      </div>
    );
  }

  const reportCards = [
    {
      title: 'Daily Closing Report',
      description: 'View cashier totals, payment breakdowns, and items sold for any given day.',
      icon: Calendar,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Monthly Summary',
      description: 'Aggregated data including total sales, tax, and cashier totals.',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Inventory Report',
      description: 'Stock levels, low stock items, and total inventory value.',
      icon: Package,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Tax Report',
      description: 'Total tax collected per defined period.',
      icon: FileText,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Report Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportCards.map((card, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer">
            <div className={`${card.bg} w-12 h-12 rounded-xl flex items-center justify-center mb-4`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">{card.title}</h3>
            <p className="text-sm text-slate-600">{card.description}</p>
          </div>
        ))}
      </div>

      {/* Daily Report Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Daily Closing Report</h3>
            <p className="text-sm text-slate-600">Select a date to view details</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {/* Daily Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-50 p-6 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-slate-600">Total Sales</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(dailyTotal)}</p>
            <p className="text-sm text-slate-500 mt-1">{dailyTransactions.length} transactions</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-slate-600">Items Sold</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {dailyTransactions.reduce((sum, tx) => sum + (tx.items?.length || 0), 0)}
            </p>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium text-slate-600">Avg Ticket</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {dailyTransactions.length > 0 
                ? formatCurrency(dailyTotal / dailyTransactions.length) 
                : formatCurrency(0)}
            </p>
          </div>
        </div>

        {/* Payment Breakdown & Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Method Pie Chart */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Payment Method Breakdown</h4>
            <div className="h-64">
              {paymentMethodData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  No transactions for this date
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(value || 0)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Monthly Trend */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Monthly Sales Trend</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getMonthlyData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value: any) => `KES ${(value || 0).toLocaleString()}`} />
                  <Tooltip formatter={(value: any) => formatCurrency(value || 0)} />
                  <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Low Stock Alert
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockItems.slice(0, 6).map((product) => (
              <div key={product._id} className="bg-red-50 p-4 rounded-lg border border-red-100">
                <p className="font-semibold text-red-900">{product.name}</p>
                <p className="text-sm text-red-700">
                  Only {product.quantity || 0} left (alert at {product.lowStockAlert || 10})
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
