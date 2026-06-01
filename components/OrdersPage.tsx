import React, { useState } from 'react';
import { usePosStore } from '../store/posStore';
import { Search, FileText, Calendar, CreditCard, Filter, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

export default function OrdersPage() {
  const { transactions } = usePosStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);

  const filteredTransactions = transactions.filter((tx) =>
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

  return (
    <div className="h-screen flex bg-slate-100">
      {/* Left: Orders List */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 border-b border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-900">Orders History</h1>
            </div>
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search by ID or payment method..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredTransactions.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-24 h-24 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-600">No Orders Yet</h3>
                <p className="text-slate-500 mt-2">Your order history will appear here once you make sales</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTransaction(tx)}
                  className={`bg-white rounded-2xl p-4 border border-slate-200 hover:shadow-lg hover:border-blue-300 cursor-pointer transition-all ${selectedTransaction?.id === tx.id ? 'border-blue-500 shadow-lg' : ''}`}
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

      {/* Right: Order Details */}
      <div className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-xl">
        {selectedTransaction ? (
          <>
            <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
              <button
                onClick={() => setSelectedTransaction(null)}
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <h2 className="text-lg font-bold text-slate-900">Order Details</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Order Info */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-3">Order Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Order ID</span>
                    <span className="font-mono text-slate-800">{selectedTransaction.id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Date</span>
                    <span className="text-slate-800">{formatDate(selectedTransaction.timestamp)}</span>
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
                      <span className="text-slate-800">{selectedTransaction.cashier}</span>
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
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <div className="space-y-2">
                <div className="flex justify-between text-lg">
                  <span className="text-slate-600">Total</span>
                  <span className="text-2xl font-bold text-emerald-600">KES {selectedTransaction.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <FileText className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600">Select an Order</h3>
            <p className="text-slate-400 mt-2">Click on an order from the list to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}