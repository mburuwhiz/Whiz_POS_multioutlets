import React, { useMemo, useState } from 'react';
import { Truck, Search, Plus } from 'lucide-react';
import { usePosStore } from '../store/posStore';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card } from './ui/card';

export default function ServerSuppliersPage() {
  const { suppliers, addSupplier, deleteSupplier } = usePosStore(s => ({
    suppliers: s.suppliers,
    addSupplier: s.addSupplier,
    deleteSupplier: s.deleteSupplier
  }));
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ name: '', contact: '', location: '' });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(s => `${s.name} ${s.contact} ${s.location}`.toLowerCase().includes(q));
  }, [suppliers, query]);

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addSupplier({
      id: `SUP${Date.now()}`,
      name: form.name,
      contact: form.contact,
      location: form.location,
      active: true,
      createdAt: new Date().toISOString()
    });
    setForm({ name: '', contact: '', location: '' });
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Truck className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900">Suppliers</h1>
        </div>
        <Card className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Contact" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
          <Input placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAdd}><Plus className="w-4 h-4 mr-2" />Add</Button>
        </Card>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input className="pl-10" placeholder="Search suppliers..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(s => (
            <Card key={s.id} className="p-4 flex justify-between items-start">
              <div>
                <p className="font-bold">{s.name}</p>
                <p className="text-sm text-slate-500">{s.contact}</p>
                <p className="text-sm text-slate-500">{s.location}</p>
              </div>
              <Button variant="ghost" className="text-red-600" onClick={() => deleteSupplier(s.id)}>Delete</Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
