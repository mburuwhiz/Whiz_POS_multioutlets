import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Package, 
  CheckCircle2, 
  ArrowLeft, 
  Search, 
  Plus, 
  Minus, 
  Trash2,
  ShoppingBag,
  UserCheck
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useToast } from './ui/use-toast';
import { usePosStore } from '../store/posStore';
import defaultProductImage from '../assets/cart.png';

interface OutletStockPageProps {
  outlet: any;
  onBack: () => void;
  onOutletUpdated?: () => void;
}

type Step = 'products' | 'users' | 'review';

export default function OutletStockPage({ outlet, onBack, onOutletUpdated }: OutletStockPageProps) {
  const products = usePosStore(state => state.products);
  const users = usePosStore(state => state.users);
  const { toast } = useToast();

  const [activeStep, setActiveStep] = useState<Step>('products');
  const [editProductIds, setEditProductIds] = useState<Set<string>>(new Set(outlet.assignedProductIds || []));
  const [editUserIds, setEditUserIds] = useState<Set<string>>(new Set(outlet.assignedUserIds || []));
  const [editInitialStock, setEditInitialStock] = useState<Record<string, number>>(() => {
    const existingStock = outlet.currentStock || outlet.initialStock || {};
    const initialStockValues: Record<string, number> = {};
    (outlet.assignedProductIds || []).forEach(id => {
      initialStockValues[id] = Number(existingStock[id] ?? 0);
    });
    return initialStockValues;
  });
  const [editProductSearch, setEditProductSearch] = useState('');
  const [editUserSearch, setEditUserSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filteredEditProducts = useMemo(() => {
    const q = editProductSearch.toLowerCase().trim();
    if (!q) return products;
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, editProductSearch]);

  const filteredEditUsers = useMemo(() => {
    const q = editUserSearch.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u => (u.name || u.email || '').toLowerCase().includes(q));
  }, [users, editUserSearch]);

  const handleSaveEdit = async () => {
    if (!outlet || !window.electron?.updateOutletAssignment) {
      toast('Error: Could not save changes', 'error');
      return;
    }
    setIsSaving(true);
    const currentStock = outlet.currentStock || outlet.initialStock || {};
    const assignment = {
      productIds: Array.from(editProductIds),
      userIds: Array.from(editUserIds),
      initialStock: Object.fromEntries(
        Array.from(editProductIds).map(id => [
          id,
          Number(editInitialStock[id] ?? currentStock[id] ?? 0)
        ])
      )
    };
    try {
      const result = await (window.electron.updateOutletAssignment as any)(outlet.id, assignment);
      if (result.success) {
        toast('Outlet assignments saved successfully!', 'success');
        if (onOutletUpdated) onOutletUpdated();
        onBack();
      } else {
        toast('Failed to save outlet assignments', 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Error saving changes', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const adjustStock = (productId: string, delta: number) => {
    setEditInitialStock(prev => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] ?? 0) + delta)
    }));
  };

  const toggleProduct = (p: any) => {
    const pid = String(p.id ?? p.productId);
    const isSelected = editProductIds.has(String(p.id)) || editProductIds.has(String(p.productId ?? ''));
    const currentStock = outlet.currentStock?.[String(p.id)] ?? outlet.currentStock?.[String(p.productId ?? '')] ?? outlet.initialStock?.[String(p.id)] ?? outlet.initialStock?.[String(p.productId ?? '')] ?? 0;
    
    const newIds = new Set(editProductIds);
    if (isSelected) {
      if (p.id) newIds.delete(String(p.id));
      if (p.productId) newIds.delete(String(p.productId));
      const newStock = { ...editInitialStock };
      if (p.id) delete newStock[String(p.id)];
      if (p.productId) delete newStock[String(p.productId)];
      setEditInitialStock(newStock);
    } else {
      newIds.add(pid);
      if (p.id) newIds.add(String(p.id));
      if (p.productId) newIds.add(String(p.productId));
      setEditInitialStock(prev => ({ 
        ...prev, 
        [String(p.id)]: prev[String(p.id)] ?? currentStock,
        [String(p.productId ?? '')]: prev[String(p.productId ?? '')] ?? currentStock
      }));
    }
    setEditProductIds(newIds);
  };

  const toggleUser = (u: any) => {
    const userId = String(u.id);
    const newIds = new Set(editUserIds);
    if (newIds.has(userId)) {
      newIds.delete(userId);
    } else {
      newIds.add(userId);
    }
    setEditUserIds(newIds);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-2 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack} className="h-10 w-10 p-0 rounded-full bg-white shadow-sm hover:shadow-md transition-shadow">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">Manage Outlet</h1>
            <p className="text-slate-500 mt-0.5 text-sm md:text-base">{outlet.name}</p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          {(['products', 'users', 'review'] as Step[]).map((step) => (
            <button
              key={step}
              onClick={() => setActiveStep(step)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                activeStep === step
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {step === 'products' && <ShoppingBag className="w-4 h-4" />}
              {step === 'users' && <UserCheck className="w-4 h-4" />}
              {step === 'review' && <CheckCircle2 className="w-4 h-4" />}
              {step.charAt(0).toUpperCase() + step.slice(1)}
              {step === 'products' && (
                <Badge variant="default" className={`ml-1 ${activeStep === 'products' ? 'bg-white/20' : 'bg-slate-100'}`}>
                  {editProductIds.size}
                </Badge>
              )}
              {step === 'users' && (
                <Badge variant="default" className={`ml-1 ${activeStep === 'users' ? 'bg-white/20' : 'bg-slate-100'}`}>
                  {editUserIds.size}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <Card className="p-4 md:p-6 shadow-lg bg-white border-0 overflow-hidden">
          {activeStep === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    className="pl-9 h-10 text-sm bg-slate-50 border-slate-200 focus-visible:ring-blue-500" 
                    placeholder="Search products by name..." 
                    value={editProductSearch} 
                    onChange={(e) => setEditProductSearch(e.target.value)} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredEditProducts.map((p) => {
                  const productId = String(p.id ?? p.productId);
                  const isSelected = editProductIds.has(String(p.id)) || editProductIds.has(String(p.productId ?? ''));
                  const currentStockVal = 
                    outlet.currentStock?.[String(p.id)] ?? 
                    outlet.currentStock?.[String(p.productId ?? '')] ?? 
                    outlet.initialStock?.[String(p.id)] ?? 
                    outlet.initialStock?.[String(p.productId ?? '')] ?? 0;
                  
                  return (
                    <div 
                      key={productId} 
                      onClick={() => toggleProduct(p)}
                      className={`group relative bg-gradient-to-br from-white to-slate-50 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                        isSelected ? 'border-blue-500 ring-1 ring-blue-100' : 'border-slate-100 hover:border-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-10">
                          <div className="h-5 w-5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-sm">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}

                      <div className="p-3">
                        <div className="relative mb-2">
                          <div className="w-full aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                            <img 
                              src={p.image || defaultProductImage} 
                              alt={p.name} 
                              className="max-w-[75%] max-h-[75%] object-contain"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-0.5">
                          <h3 className="font-bold text-slate-900 text-xs line-clamp-2 leading-tight">{p.name}</h3>
                          <p className="text-xs text-emerald-600 font-semibold">KES {p.price?.toFixed(2) || '0.00'}</p>
                          <p className="text-[10px] text-slate-400">
                            Store: <span className="text-slate-600 font-medium">{p.stock}</span>
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-100 rounded-b-xl">
                          <p className="text-[10px] text-slate-500 font-semibold mb-1.5">Outlet Stock</p>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); adjustStock(productId, -1); }}
                              className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                            >
                              <Minus className="w-3 h-3 text-slate-700" />
                            </button>
                            <Input
                              type="number"
                              value={editInitialStock[productId] ?? currentStockVal}
                              onChange={(e) => {
                                e.stopPropagation();
                                setEditInitialStock(prev => ({
                                  ...prev,
                                  [productId]: Math.max(0, Number(e.target.value) || 0)
                                }));
                              }}
                              onClick={(e) => e.stopPropagation()}
                              min="0"
                              className="text-center text-sm font-bold text-slate-900 bg-white border-slate-200 h-7"
                            />
                            <button
                              onClick={(e) => { e.stopPropagation(); adjustStock(productId, 1); }}
                              className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                            >
                              <Plus className="w-3 h-3 text-slate-700" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {filteredEditProducts.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No products found</p>
                </div>
              )}

              <div className="pt-3 flex justify-end">
                <Button 
                  onClick={() => setActiveStep('users')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md px-6 py-2.5 rounded-xl text-sm"
                >
                  Next: Assign Users
                </Button>
              </div>
            </div>
          )}

          {activeStep === 'users' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  className="pl-9 h-10 text-sm bg-slate-50 border-slate-200 focus-visible:ring-blue-500" 
                  placeholder="Search users by name or email..." 
                  value={editUserSearch} 
                  onChange={(e) => setEditUserSearch(e.target.value)} 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredEditUsers.map((u) => {
                  const userId = String(u.id);
                  const isSelected = editUserIds.has(userId);
                  
                  return (
                    <div 
                      key={userId} 
                      onClick={() => toggleUser(u)}
                      className={`group bg-gradient-to-br from-white to-slate-50 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                        isSelected ? 'border-emerald-500 ring-1 ring-emerald-100' : 'border-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                            isSelected ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white' : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600'
                          }`}>
                            {(u.name?.[0] || u.email?.[0] || 'U').toUpperCase()}
                          </div>
                          
                          {isSelected && (
                            <div className="flex-1 text-right">
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 inline" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <h3 className="font-bold text-slate-900 text-sm line-clamp-1 leading-tight">{u.name || u.email}</h3>
                          <p className="text-[10px] text-slate-500">{(u as any).email || ''}</p>
                          <div className="mt-1.5">
                            <Badge variant="outline" className="capitalize bg-slate-50 text-xs">
                              {(u as any).role || 'Cashier'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredEditUsers.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No users found</p>
                </div>
              )}

              <div className="pt-3 flex gap-2 justify-end">
                <Button 
                  variant="ghost"
                  onClick={() => setActiveStep('products')}
                  className="px-4 py-2 rounded-xl text-sm"
                >
                  Back
                </Button>
                <Button 
                  onClick={() => setActiveStep('review')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md px-6 py-2.5 rounded-xl text-sm"
                >
                  Review & Save
                </Button>
              </div>
            </div>
          )}

          {activeStep === 'review' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-4 border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                    <h3 className="text-base font-bold text-slate-900">Products ({editProductIds.size})</h3>
                  </div>
                  <div className="space-y-1.5">
                    {Array.from(editProductIds).slice(0, 6).map(id => {
                      const product = products.find(p => String(p.id) === id || String(p.productId) === id);
                      return product && (
                        <div key={id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100">
                          <span className="font-medium text-slate-700 text-xs truncate max-w-[70%]">{product.name}</span>
                          <span className="font-bold text-slate-900 text-xs">
                            {editInitialStock[id]} in stock
                          </span>
                        </div>
                      );
                    })}
                    {editProductIds.size > 6 && (
                      <p className="text-center text-xs text-slate-500 pt-1">+{editProductIds.size - 6} more product(s)</p>
                    )}
                  </div>
                </Card>

                <Card className="p-4 border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2 mb-3">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-base font-bold text-slate-900">Users ({editUserIds.size})</h3>
                  </div>
                  <div className="space-y-1.5">
                    {Array.from(editUserIds).slice(0, 6).map(id => {
                      const user = users.find(u => String(u.id) === id);
                      return user && (
                        <div key={id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100">
                          <span className="font-medium text-slate-700 text-xs truncate">{user.name || user.email}</span>
                          <Badge variant="outline" className="capitalize text-[10px]">{(user as any).role || 'Cashier'}</Badge>
                        </div>
                      );
                    })}
                    {editUserIds.size > 6 && (
                      <p className="text-center text-xs text-slate-500 pt-1">+{editUserIds.size - 6} more user(s)</p>
                    )}
                  </div>
                </Card>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-2 justify-end">
                <Button 
                  variant="ghost"
                  onClick={() => setActiveStep('users')}
                  className="px-4 py-2 rounded-xl text-sm"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-md px-8 py-2.5 rounded-xl font-bold text-sm"
                >
                  {isSaving ? 'Saving...' : 'Save All Changes'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
