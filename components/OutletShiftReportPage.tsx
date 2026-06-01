import React, { useMemo } from 'react';
import { usePosStore } from '../store/posStore';
import { Card } from './ui/card';

interface OutletShiftReportPageProps {
  mode: 'x' | 'z';
}

export default function OutletShiftReportPage({ mode }: OutletShiftReportPageProps) {
  const { transactions, businessSetup } = usePosStore(state => ({
    transactions: state.transactions,
    businessSetup: state.businessSetup
  }));

  const report = useMemo(() => {
    const todayKey = new Date().toDateString();
    const relevant = transactions.filter(t => {
      const d = new Date(t.timestamp || t.createdAt || 0);
      return mode === 'z' ? d.toDateString() === todayKey : true;
    });

    const total = relevant.reduce((sum, t) => sum + Number(t.total || 0), 0);
    const cash = relevant.filter(t => t.paymentMethod === 'cash').reduce((s, t) => s + Number(t.total || 0), 0);
    const mpesa = relevant.filter(t => t.paymentMethod === 'mpesa').reduce((s, t) => s + Number(t.total || 0), 0);
    const credit = relevant.filter(t => t.paymentMethod === 'credit').reduce((s, t) => s + Number(t.total || 0), 0);

    return { count: relevant.length, total, cash, mpesa, credit };
  }, [transactions, mode]);

  const title = mode === 'x' ? 'X-Report (Mid-Shift Summary)' : 'Z-Report (Daily Closing)';

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500">{businessSetup?.outletName || businessSetup?.businessName}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6">
            <p className="text-sm text-slate-500">Transactions</p>
            <p className="text-3xl font-bold">{report.count}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-slate-500">Total Sales</p>
            <p className="text-3xl font-bold">KES {report.total.toFixed(2)}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-slate-500">Cash</p>
            <p className="text-2xl font-bold">KES {report.cash.toFixed(2)}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-slate-500">M-Pesa</p>
            <p className="text-2xl font-bold">KES {report.mpesa.toFixed(2)}</p>
          </Card>
          <Card className="p-6 md:col-span-2">
            <p className="text-sm text-slate-500">Credit</p>
            <p className="text-2xl font-bold">KES {report.credit.toFixed(2)}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
