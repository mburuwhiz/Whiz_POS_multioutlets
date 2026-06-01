import React, { useEffect, useMemo, useState } from 'react';
import { Warehouse, Plus, Search, ArrowRightLeft, CheckCircle2, Clock, Package } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { usePosStore } from '../store/posStore';
import { useToast } from './ui/use-toast';

type TransferStatus = 'pending' | 'in_transit' | 'completed' | 'cancelled' | string;

interface StockTransferRecord {
  id: string;
  from?: string;
  to?: string;
  fromLocation?: string;
  toLocation?: string;
  items?: Array<{ productId?: string; productName?: string; quantity: number; productPrice?: number }>;
  status: TransferStatus;
  createdAt?: string;
  date?: string;
  notes?: string;
}

export default function ServerStockTransfersPage() {
  const { toast } = useToast();
  const { products, businessSetup, updateProduct } = usePosStore(state => ({
    products: state.products,
    businessSetup: state.businessSetup,
    updateProduct: state.updateProduct
  }));

  const [transfers, setTransfers] = useState<StockTransferRecord[]>([]);
  const [approvedOutlets, setApprovedOutlets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransferRecord | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_transit' | 'completed'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [newTransfer, setNewTransfer] = useState({
    toLocation: '',
    productId: '',
    quantity: 1,
    notes: ''
  });

  const loadTransfers = async () => {
    if (window.electron?.getStockMovements) {
      const data = await window.electron.getStockMovements();
      const normalized = (data || []).map((t: any) => ({
        id: t.id,
        from: t.from || t.fromLocation || 'store',
        to: t.to || t.toLocation || 'outlet',
        items: t.items || [{
          productId: t.productId,
          productName: t.productName,
          quantity: t.quantity,
          productPrice: 0
        }],
        status: (t.status || t.type === 'transfer_out' ? 'pending' : 'completed') as TransferStatus,
        createdAt: t.createdAt || t.date,
        notes: t.notes
      }));
      setTransfers(normalized);
      return;
    }

    const { data } = await (window.electron?.readData?.('stock-movements.json') || Promise.resolve({ data: [] }));
    setTransfers(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadTransfers();
  }, []);

  useEffect(() => {
    const loadOutlets = async () => {
      if (!window.electron?.getApprovedOutlets) return;
      const outlets = await window.electron.getApprovedOutlets();
      setApprovedOutlets(Array.isArray(outlets) ? outlets : []);
    };
    loadOutlets();
  }, []);

  const filteredTransfers = useMemo(() => {
    return transfers.filter(transfer => {
      const from = transfer.from || transfer.fromLocation || '';
      const to = transfer.to || transfer.toLocation || '';
      const haystack = `${transfer.id} ${from} ${to}`.toLowerCase();
      const matchesSearch = haystack.includes(searchQuery.toLowerCase());
      const statusKey = String(transfer.status).replace('-', '_');
      const matchesFilter = filter === 'all' ? true : statusKey === filter;
      return matchesSearch && matchesFilter;
    });
  }, [transfers, searchQuery, filter]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: 'Pending', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
      case 'in_transit':
      case 'in-transit':
        return { text: 'In Transit', icon: ArrowRightLeft, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
      case 'completed':
        return { text: 'Completed', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
      default:
        return { text: status, icon: Package, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' };
    }
  };

  const handleCreateTransfer = async () => {
    if (!window.electron?.createStockTransfer || !newTransfer.productId || !newTransfer.toLocation) return;
    const product = products.find(p => String(p.id) === newTransfer.productId);
    const transfer = {
      id: `T${Date.now()}`,
      type: 'transfer_out',
      fromLocation: 'store',
      toLocation: newTransfer.toLocation,
      productId: newTransfer.productId,
      productName: product?.name || newTransfer.productId,
      quantity: Number(newTransfer.quantity) || 1,
      status: 'pending',
      notes: newTransfer.notes,
      createdBy: businessSetup?.businessName || 'server'
    };
    const result = await window.electron.createStockTransfer(transfer);
    if (result.success) {
      setIsCreating(false);
      setNewTransfer({ toLocation: '', productId: '', quantity: 1, notes: '' });
      await loadTransfers();
      toast('Stock transfer created!', 'success');
    } else {
      toast('Failed to create stock transfer!', 'error');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="h-screen flex bg-slate-100">
      <div className="flex-1 flex flex-col">
        <div className="bg-white p-4 border-b border-slate-200 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Warehouse className="w-8 h-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-slate-900">Stock Transfers</h1>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsCreating(v => !v)}>
                <Plus className="w-4 h-4 mr-2" />
                New Transfer
              </Button>
            </div>

            {isCreating && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                <select
                  className="border rounded-lg px-3 py-2"
                  value={newTransfer.productId}
                  onChange={(e) => setNewTransfer(prev => ({ ...prev, productId: e.target.value }))}
                >
                  <option value="">Select product</option>
                  {products.map(p => (
                    <option key={p.id} value={String(p.id)}>{p.name} (store: {p.stock})</option>
                  ))}
                </select>
                <select
                  className="border rounded-lg px-3 py-2"
                  value={newTransfer.toLocation}
                  onChange={(e) => setNewTransfer(prev => ({ ...prev, toLocation: e.target.value }))}
                >
                  <option value="">Select outlet</option>
                  {approvedOutlets.map((outlet) => {
                    const outletId = String(outlet.outletId || outlet.id || outlet.businessId || '');
                    const outletName = outlet.outletName || outlet.businessName || outlet.locationName || outlet.name || outletId;
                    return (
                      <option key={outletId || outletName} value={outletId || outletName}>
                        {outletName}{outletId ? ` (${outletId})` : ''}
                      </option>
                    );
                  })}
                </select>
                <Input
                  type="number"
                  min={1}
                  placeholder="Quantity"
                  value={newTransfer.quantity}
                  onChange={(e) => setNewTransfer(prev => ({ ...prev, quantity: Number(e.target.value) || 1 }))}
                />
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateTransfer}>
                  Create Transfer
                </Button>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search transfers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                {(['all', 'pending', 'in_transit', 'completed'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                      filter === f ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {f.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredTransfers.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <Warehouse className="w-24 h-24 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600">No Transfers Found</h3>
              <p className="text-slate-500 mt-2">Create a transfer from store stock to an outlet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransfers.map((transfer) => {
                const status = getStatusConfig(String(transfer.status));
                const StatusIcon = status.icon;
                const from = transfer.from || transfer.fromLocation || 'store';
                const to = transfer.to || transfer.toLocation || 'outlet';
                const items = transfer.items || [];
                return (
                  <div
                    key={transfer.id}
                    onClick={() => setSelectedTransfer(transfer)}
                    className={`bg-white rounded-2xl p-4 border-2 shadow-sm hover:shadow-lg cursor-pointer transition-all ${
                      selectedTransfer?.id === transfer.id ? 'border-blue-500' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900">Transfer #{transfer.id}</h4>
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                          <ArrowRightLeft className="w-4 h-4" />
                          {from} → {to}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">{formatDate(transfer.createdAt || transfer.date)}</p>
                      </div>
                      <div className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${status.bg} ${status.color} ${status.border}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.text}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">
                      {items.reduce((sum, item) => sum + (item.quantity || 0), 0)} items
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-xl">
        {selectedTransfer ? (
          <div className="p-6 space-y-4 overflow-y-auto">
            <h2 className="text-xl font-bold">Transfer #{selectedTransfer.id}</h2>
            <p className="text-sm text-slate-600">
              {(selectedTransfer.from || selectedTransfer.fromLocation)} → {(selectedTransfer.to || selectedTransfer.toLocation)}
            </p>
            {selectedTransfer.notes && <p className="text-sm text-slate-500">{selectedTransfer.notes}</p>}
            <div className="space-y-2">
              {(selectedTransfer.items || []).map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg text-sm">
                  <div className="font-semibold">{item.productName || item.productId}</div>
                  <div>Qty: {item.quantity}</div>
                </div>
              ))}
            </div>
            {selectedTransfer.status === 'pending' && (
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700" 
                onClick={async () => {
                  if (!window.electron?.readData || !window.electron?.saveData) return;
                  const { data } = await window.electron.readData('stock-movements.json');
                  const updatedTransfers = (data || []).map(t => 
                    t.id === selectedTransfer.id 
                      ? { ...t, status: 'completed' } 
                      : t
                  );
                  await window.electron.saveData('stock-movements.json', updatedTransfers);
                  
                  (selectedTransfer.items || []).forEach(item => {
                    const product = products.find(p => String(p.id) === String(item.productId));
                    if (product && item.quantity) {
                      updateProduct(product.id, {
                        stock: Math.max(0, (product.stock || 0) - item.quantity)
                      });
                    }
                  });
                  
                  await loadTransfers();
                  setSelectedTransfer(null);
                  toast('Stock transfer marked as completed!', 'success');
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark as Completed
              </Button>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Warehouse className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600">Select a Transfer</h3>
          </div>
        )}
      </div>
    </div>
  );
}
