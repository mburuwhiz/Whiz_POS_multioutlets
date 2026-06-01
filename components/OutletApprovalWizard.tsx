import React, { useMemo, useState } from 'react';
import { Modal } from './ui/modal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { usePosStore } from '../store/posStore';
import { logAudit } from '../lib/auditLog';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

export interface OutletApprovalAssignment {
  productIds: string[];
  userIds: string[];
  initialStock: Record<string, number>;
}

interface OutletApprovalWizardProps {
  isOpen: boolean;
  outlet: { id: string; name: string; ip?: string } | null;
  onClose: () => void;
  onApproved: () => void;
}

export default function OutletApprovalWizard({ isOpen, outlet, onClose, onApproved }: OutletApprovalWizardProps) {
  const products = usePosStore(state => state.products);
  const users = usePosStore(state => state.users);

  const [step, setStep] = useState(0);
  const [productSearch, setProductSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [initialStock, setInitialStock] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p => `${p.name} ${p.category || ''}`.toLowerCase().includes(q));
  }, [products, productSearch]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => `${u.name} ${u.role}`.toLowerCase().includes(q));
  }, [users, userSearch]);

  const resetState = () => {
    setStep(0);
    setProductSearch('');
    setUserSearch('');
    setSelectedProductIds(new Set());
    setSelectedUserIds(new Set());
    setInitialStock({});
    setError('');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleUser = (id: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllProducts = () => setSelectedProductIds(new Set(products.map(p => String(p.id))));
  const deselectAllProducts = () => setSelectedProductIds(new Set());
  const selectAllUsers = () => setSelectedUserIds(new Set(users.map(u => String(u.id))));
  const deselectAllUsers = () => setSelectedUserIds(new Set());

  const handleConfirm = async () => {
    if (!outlet || !window.electron?.approveOutlet) return;
    setIsSubmitting(true);
    setError('');

    const assignment: OutletApprovalAssignment = {
      productIds: Array.from(selectedProductIds),
      userIds: Array.from(selectedUserIds),
      initialStock: Object.fromEntries(
        Array.from(selectedProductIds).map(id => [id, Number(initialStock[id] || 0)])
      )
    };

    const approveFn = window.electron.approveOutlet as (
      outletId: string,
      assignment?: OutletApprovalAssignment
    ) => Promise<{ success: boolean; error?: string }>;

    const result = await approveFn(outlet.id, assignment);
    setIsSubmitting(false);

    if (result.success) {
      logAudit('outlet.approved', {
        outletId: outlet.id,
        outletName: outlet.name,
        productCount: assignment.productIds.length,
        userCount: assignment.userIds.length
      });
      resetState();
      onApproved();
      onClose();
    } else {
      setError(result.error || 'Failed to approve outlet');
    }
  };

  if (!outlet) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Approve Outlet: ${outlet.name}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className={step === 0 ? 'font-bold text-blue-600' : ''}>1. Products</span>
          <ChevronRight className="w-4 h-4" />
          <span className={step === 1 ? 'font-bold text-blue-600' : ''}>2. Users</span>
          <ChevronRight className="w-4 h-4" />
          <span className={step === 2 ? 'font-bold text-blue-600' : ''}>3. Stock</span>
          <ChevronRight className="w-4 h-4" />
          <span className={step === 3 ? 'font-bold text-blue-600' : ''}>4. Confirm</span>
        </div>

        {step === 0 && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Search products..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
              <Button variant="ghost" onClick={selectAllProducts}>All</Button>
              <Button variant="ghost" onClick={deselectAllProducts}>None</Button>
            </div>
            <div className="max-h-64 overflow-y-auto border rounded-xl divide-y">
              {filteredProducts.map(p => (
                <label key={p.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.has(String(p.id))}
                    onChange={() => toggleProduct(String(p.id))}
                  />
                  <span className="font-medium text-slate-800">{p.name}</span>
                  <span className="text-xs text-slate-500 ml-auto">Store: {p.stock}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              <Button variant="ghost" onClick={selectAllUsers}>All</Button>
              <Button variant="ghost" onClick={deselectAllUsers}>None</Button>
            </div>
            <div className="max-h-64 overflow-y-auto border rounded-xl divide-y">
              {filteredUsers.map(u => (
                <label key={u.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.has(String(u.id))}
                    onChange={() => toggleUser(String(u.id))}
                  />
                  <span className="font-medium text-slate-800">{u.name}</span>
                  <span className="text-xs text-slate-500 ml-auto capitalize">{u.role}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-h-72 overflow-y-auto border rounded-xl divide-y">
            {Array.from(selectedProductIds).map(id => {
              const product = products.find(p => String(p.id) === id);
              return (
                <div key={id} className="flex items-center justify-between p-3 gap-3">
                  <span className="font-medium text-slate-800">{product?.name || id}</span>
                  <Input
                    type="number"
                    min={0}
                    className="w-28"
                    value={initialStock[id] ?? 0}
                    onChange={e => setInitialStock(prev => ({ ...prev, [id]: Number(e.target.value) || 0 }))}
                  />
                </div>
              );
            })}
            {selectedProductIds.size === 0 && (
              <p className="p-4 text-sm text-slate-500">Select at least one product in step 1.</p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
            <p><strong>Outlet:</strong> {outlet.name} {outlet.ip ? `(${outlet.ip})` : ''}</p>
            <p><strong>Products:</strong> {selectedProductIds.size}</p>
            <p><strong>Users:</strong> {selectedUserIds.size}</p>
            <p><strong>Initial stock lines:</strong> {Object.values(initialStock).filter(v => v > 0).length}</p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-between pt-2">
          <Button variant="ghost" onClick={() => (step === 0 ? handleClose() : setStep(s => s - 1))}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step < 3 ? (
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setStep(s => s + 1)}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleConfirm}
              disabled={isSubmitting || selectedProductIds.size === 0}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Approving...' : 'Confirm Approval'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
