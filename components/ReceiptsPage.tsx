import React, { useMemo, useState } from 'react';
import { FileText, Printer, Search } from 'lucide-react';
import { usePosStore } from '../store/posStore';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';

export default function ReceiptsPage() {
  const [query, setQuery] = useState('');
  const { transactions, businessSetup } = usePosStore(state => ({
    transactions: state.transactions,
    businessSetup: state.businessSetup
  }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(t => {
      const hay = `${t.id} ${t.cashierName || ''} ${t.paymentMethod || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [transactions, query]);

  const handlePrint = (t: any) => {
    if (!window.electron?.printReceipt) return;
    window.electron.printReceipt(t, businessSetup as any, true);
  };

  return (
    <div className="h-screen flex bg-slate-100">
      <div className="flex-1 flex flex-col">
        <div className="bg-white p-4 border-b border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-emerald-600" />
              <h1 className="text-2xl font-bold text-slate-900">Receipts</h1>
            </div>
            <div className="relative flex-1 md:flex-none md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search by receipt ID, cashier, payment method..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-24 h-24 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-600">No Receipts Found</h3>
                <p className="text-slate-500 mt-2">Receipts will appear here once sales are made.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {filtered.map((t: any) => (
                <Card key={t.id} className="p-5 flex flex-col justify-between hover:shadow-lg transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm text-slate-600">{t.id}</span>
                      <Badge className="bg-slate-100 text-slate-700">{t.paymentMethod || 'payment'}</Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-slate-500">
                        {new Date(t.timestamp || t.createdAt || Date.now()).toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-500">
                        {t.cashierName || 'Unknown cashier'} • {t.items?.length || 0} items
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xl font-bold text-slate-900">KES {Number(t.total || 0).toFixed(2)}</div>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handlePrint(t)}
                      disabled={!window.electron?.printReceipt}
                      title={!window.electron?.printReceipt ? 'Printing only in Desktop' : 'Reprint receipt'}
                    >
                      <Printer className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

