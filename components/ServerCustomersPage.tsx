import React, { useMemo, useState } from 'react';
import { Users, Search, Plus } from 'lucide-react';
import { usePosStore } from '../store/posStore';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card } from './ui/card';

export default function ServerCustomersPage() {
  const creditCustomers = usePosStore(s => s.creditCustomers);
  const loyaltyCustomers = usePosStore(s => s.loyaltyCustomers);
  const saveCreditCustomer = usePosStore(s => s.saveCreditCustomer);
  const addLoyaltyCustomer = usePosStore(s => s.addLoyaltyCustomer);
  const [query, setQuery] = useState('');
  const [addMode, setAddMode] = useState<'credit' | 'loyalty' | null>(null);
  const [form, setForm] = useState({ name: '', phone: '' });

  const customers = useMemo(() => {
    const merged = [
      ...creditCustomers.map(c => ({ ...c, type: 'credit' as const })),
      ...loyaltyCustomers.map(c => ({ ...c, type: 'loyalty' as const, balance: c.points }))
    ];
    const q = query.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter((c: any) => `${c.name} ${c.phone || ''}`.toLowerCase().includes(q));
  }, [creditCustomers, loyaltyCustomers, query]);

  const handleAdd = () => {
    if (!form.name.trim()) return;
    if (addMode === 'credit') {
      saveCreditCustomer({
        id: `CREDIT${Date.now()}`,
        name: form.name,
        phone: form.phone,
        totalCredit: 0,
        paidAmount: 0,
        balance: 0,
        transactions: [],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
    } else if (addMode === 'loyalty') {
      addLoyaltyCustomer({
        id: `LOYALTY${Date.now()}`,
        name: form.name,
        phone: form.phone,
        points: 0,
        tier: 'Bronze',
        totalSpent: 0,
        visitsCount: 0,
        lastVisit: new Date().toISOString(),
        rewards: []
      });
    }
    setForm({ name: '', phone: '' });
    setAddMode(null);
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
          </div>
          <div className="flex gap-3">
            {!addMode ? (
              <>
                <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setAddMode('credit')}>
                  <Plus className="w-4 h-4 mr-2" /> Add Credit Customer
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setAddMode('loyalty')}>
                  <Plus className="w-4 h-4 mr-2" /> Add Loyalty Customer
                </Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => setAddMode(null)}>Cancel</Button>
            )}
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input className="pl-10" placeholder="Search customers..." value={query} onChange={e => setQuery(e.target.value)} />
            </div>
          </div>
        </div>

        {addMode && (
          <Card className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <div className="col-span-2 flex gap-3">
              <Button className="bg-purple-600 hover:bg-purple-700 flex-1" onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />Add {addMode === 'credit' ? 'Credit' : 'Loyalty'} Customer
              </Button>
              <Button variant="ghost" onClick={() => setAddMode(null)}>Cancel</Button>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c: any) => (
            <Card key={`${c.type}-${c.id}`} className="p-4">
              <p className="font-bold text-slate-900">{c.name}</p>
              <p className="text-sm text-slate-500">{c.phone || '—'}</p>
              <p className="text-xs text-purple-600 mt-2 uppercase">{c.type}</p>
              <p className="text-lg font-semibold mt-2">
                {c.type === 'loyalty' ? `${c.points || 0} pts` : `KES ${Number(c.balance || 0).toLocaleString()}`}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
