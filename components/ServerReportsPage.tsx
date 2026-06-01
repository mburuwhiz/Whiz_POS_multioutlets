import React, { useMemo, useState } from 'react';
import { BarChart3, CreditCard, Search } from 'lucide-react';
import { usePosStore } from '../store/posStore';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';

export default function ServerReportsPage() {
  const [query, setQuery] = useState('');
  const transactions = usePosStore(state => state.transactions);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t: any) => {
      const hay = `${t.id} ${t.cashierName || ''} ${t.paymentMethod || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [transactions, query]);

  const totalRevenue = useMemo(() => transactions.reduce((sum: number, t: any) => sum + Number(t.total || 0), 0), [transactions]);
  const todayKey = new Date().toDateString();
  const todayTx = useMemo(
    () => transactions.filter((t: any) => new Date(t.timestamp || t.createdAt || 0).toDateString() === todayKey),
    [transactions, todayKey]
  );
  const todayRevenue = useMemo(() => todayTx.reduce((sum: number, t: any) => sum + Number(t.total || 0), 0), [todayTx]);
  const avgOrderValue = transactions.length > 0 ? totalRevenue / transactions.length : 0;

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Reports & Analytics</h1>
            <p className="text-slate-500">Key performance metrics and recent transactions</p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search transactions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-600 rounded-xl">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold text-blue-700">Today’s Revenue</span>
            </div>
            <div className="text-3xl font-black text-slate-900">KES {todayRevenue.toFixed(2)}</div>
            <p className="text-sm text-blue-700 mt-2">{todayTx.length} transactions</p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-600 rounded-xl">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold text-green-700">Total Revenue</span>
            </div>
            <div className="text-3xl font-black text-slate-900">KES {totalRevenue.toFixed(2)}</div>
            <p className="text-sm text-green-700 mt-2">{transactions.length} total transactions</p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-600 rounded-xl">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold text-purple-700">Avg Order Value</span>
            </div>
            <div className="text-3xl font-black text-slate-900">KES {avgOrderValue.toFixed(2)}</div>
            <p className="text-sm text-purple-700 mt-2">Per transaction</p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-600 rounded-xl">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold text-orange-700">Units Sold</span>
            </div>
            <div className="text-3xl font-black text-slate-900">
              {transactions.reduce((sum: number, t: any) => sum + (Array.isArray(t.items) ? t.items.length : 0), 0)}
            </div>
            <p className="text-sm text-orange-700 mt-2">Line items</p>
          </Card>
        </div>

        <Card>
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Recent Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Transaction ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cashier</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filtered.slice(0, 50).map((transaction: any) => (
                  <tr key={transaction.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm text-slate-600">{transaction.id}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(transaction.timestamp || transaction.createdAt || Date.now()).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {transaction.cashierName || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className="bg-slate-100 text-slate-700">
                        {(transaction.items?.length || 0)} item{(transaction.items?.length || 0) !== 1 ? 's' : ''}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className="bg-blue-100 text-blue-700">{transaction.paymentMethod || '—'}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-slate-900">
                      KES {Number(transaction.total || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">No Transactions Yet</h3>
                      <p className="text-slate-500">Transactions will appear here once sales are made</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

