import React, { useMemo, useState } from 'react';
import { Receipt, Search, Plus } from 'lucide-react';
import { usePosStore } from '../store/posStore';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card } from './ui/card';

export default function OutletExpensesPage() {
  const { expenses, addExpense, currentCashier } = usePosStore(s => ({
    expenses: s.expenses,
    addExpense: s.addExpense,
    currentCashier: s.currentCashier
  }));
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ description: '', amount: 0, category: 'General' });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter(e => `${e.description} ${e.category} ${e.cashier}`.toLowerCase().includes(q));
  }, [expenses, query]);

  const handleAdd = () => {
    if (!form.description.trim() || form.amount <= 0) return;
    addExpense({
      id: `EXP${Date.now()}`,
      description: form.description,
      amount: form.amount,
      category: form.category,
      timestamp: new Date().toISOString(),
      cashier: currentCashier?.name || 'Outlet'
    });
    setForm({ description: '', amount: 0, category: 'General' });
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Receipt className="w-8 h-8 text-rose-600" />
          <h1 className="text-3xl font-bold text-slate-900">Expenses</h1>
        </div>
        <Card className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <Input type="number" placeholder="Amount" value={form.amount || ''} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
          <Input placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
          <Button className="bg-rose-600 hover:bg-rose-700" onClick={handleAdd}><Plus className="w-4 h-4 mr-2" />Add</Button>
        </Card>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input className="pl-10" placeholder="Search expenses..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="space-y-2">
          {filtered.map(e => (
            <Card key={e.id} className="p-4 flex justify-between">
              <div>
                <p className="font-semibold">{e.description}</p>
                <p className="text-sm text-slate-500">{e.category} • {new Date(e.timestamp).toLocaleString()}</p>
              </div>
              <p className="font-bold text-rose-600">KES {Number(e.amount).toFixed(2)}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
