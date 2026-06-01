import React, { useState } from 'react';
import { usePosStore } from '../store/posStore';
import { Search, CreditCard, Calendar, Filter, ArrowUpDown, Download, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

export default function ServerSalesPage() {
  const { transactions } = usePosStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');

  const now = new Date();
  const rangeFilteredTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.timestamp);
    if (dateRange === 'all') return true;
    if (dateRange === 'today') return txDate.toDateString() === now.toDateString();
    if (dateRange === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return txDate >= weekAgo;
    }
    if (dateRange === 'month') {
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const filteredTransactions = rangeFilteredTransactions.filter(tx =>
    tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalSales = filteredTransactions.reduce((sum, tx) => sum + tx.total, 0);
  const totalTransactions = filteredTransactions.length;
  const averageSale = totalTransactions > 0 ? totalSales / totalTransactions : 0;

  return (
    <div className="h-screen flex bg-slate-100">
      {/* Left: Transactions List */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 border-b border-slate-200 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-emerald-600" />
                <h1 className="text-2xl font-bold text-slate-900">Sales Overview</h1>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                <p className="text-sm text-emerald-700">Total Sales</p>
                <p className="text-3xl font-black text-emerald-900 mt-1">KES {totalSales.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <p className="text-sm text-blue-700">Transactions</p>
                <p className="text-3xl font-black text-blue-900 mt-1">{totalTransactions}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <p className="text-sm text-purple-700">Average Sale</p>
                <p className="text-3xl font-black text-purple-900 mt-1">KES {averageSale.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="px-4 py-2 border border-slate-200 rounded-xl bg-white font-semibold"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredTransactions.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-24 h-24 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-600">No Transactions Yet</h3>
                <p className="text-slate-500 mt-2">Transactions will appear here once sales are made</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTransaction(tx)}
                  className={`bg-white rounded-2xl p-4 border-2 shadow-sm hover:shadow-lg cursor-pointer transition-all ${
                    selectedTransaction?.id === tx.id ? 'border-emerald-500 shadow-lg' : 'border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900">Order #{tx.id.slice(0, 8)}</h4>
                      <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(tx.timestamp)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600">KES {tx.total.toFixed(2)}</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mt-1 ${
                        tx.paymentMethod === 'cash' ? 'bg-green-100 text-green-700' :
                        tx.paymentMethod === 'mpesa' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        <CreditCard className="w-3 h-3 mr-1" />
                        {tx.paymentMethod.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-sm text-slate-600">{tx.items.reduce((sum, item) => sum + item.quantity, 0)} items</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Transaction Details */}
      <div className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-xl">
        {selectedTransaction ? (
          <>
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Order Details</h2>
              <p className="text-sm text-slate-500">{selectedTransaction.id}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Order Info */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Transaction Info</h3>
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Date</span>
                    <span className="text-slate-800 font-semibold">{formatDate(selectedTransaction.timestamp)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Payment Method</span>
                    <span className={`font-semibold ${
                      selectedTransaction.paymentMethod === 'cash' ? 'text-green-700' :
                      selectedTransaction.paymentMethod === 'mpesa' ? 'text-blue-700' :
                      'text-orange-700'
                    }`}>
                      {selectedTransaction.paymentMethod.toUpperCase()}
                    </span>
                  </div>
                  {selectedTransaction.cashier && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Cashier</span>
                      <span className="text-slate-800 font-semibold">{selectedTransaction.cashier}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Items</h3>
                <div className="space-y-3">
                  {selectedTransaction.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                        <span className="text-xl font-bold text-slate-400">{item.quantity}x</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 line-clamp-2">{item.product.name}</h4>
                        <p className="text-sm text-slate-500">KES {item.product.price.toFixed(2)} each</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">KES {(item.product.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Total Footer */}
            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <div className="space-y-2">
                <div className="flex justify-between text-lg">
                  <span className="text-slate-600">Total</span>
                  <span className="text-3xl font-bold text-emerald-600">KES {selectedTransaction.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <FileText className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600">Select a Transaction</h3>
            <p className="text-slate-400 mt-2">Click on a transaction from the list to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
