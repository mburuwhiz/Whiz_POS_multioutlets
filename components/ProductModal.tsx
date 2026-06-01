import React, { useState, useEffect, useRef } from 'react';
import { Plus, Download, Upload } from 'lucide-react';
import { Modal } from './ui/modal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import defaultProductImage from '../assets/cart.png';
import { usePosStore } from '../store/posStore';
import { logAudit } from '../lib/auditLog';
import * as XLSX from 'xlsx';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: any;
}

type VariantRow = { name: string; price: number; sku?: string };

const createProductId = (seed = 0) => Date.now() + seed;

export default function ProductModal({ isOpen, onClose, product }: ProductModalProps) {
  const addProduct = usePosStore(state => state.addProduct);
  const updateProduct = usePosStore(state => state.updateProduct);
  const categories = usePosStore(state => state.categories);
  const addCategory = usePosStore(state => state.addCategory);
  const products = usePosStore(state => state.products);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState({
    name: '',
    category: '',
    price: 0,
    cost: 0,
    stock: 0,
    barcode: '',
    image: '',
    extraBarcodes: [] as string[],
    variants: [] as VariantRow[],
    isBundle: false,
    bundleProductIds: [] as string[]
  });
  const [extraBarcodeInput, setExtraBarcodeInput] = useState('');

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        category: product.category || '',
        price: product.price || 0,
        cost: product.cost || 0,
        stock: product.stock || 0,
        barcode: product.barcode || '',
        image: product.image || '',
        extraBarcodes: product.extraBarcodes || [],
        variants: product.variants || [],
        isBundle: !!product.isBundle,
        bundleProductIds: product.bundleProductIds || []
      });
    } else {
      setForm({
        name: '',
        category: '',
        price: 0,
        cost: 0,
        stock: 0,
        barcode: '',
        image: '',
        extraBarcodes: [],
        variants: [],
        isBundle: false,
        bundleProductIds: []
      });
    }
  }, [product, isOpen]);

  const handleSave = () => {
    if (!form.name) return;
    
    if (form.cost > 0 && form.price <= form.cost) {
      alert('Selling price must be greater than cost price to ensure positive margin!');
      return;
    }
    
    const payload = { ...form };
    
    if (product) {
      updateProduct(product.id, payload);
      logAudit('product.updated', { productId: product.id, name: form.name });
    } else {
      addProduct({
        id: createProductId(),
        ...payload,
        available: true,
        createdAt: new Date().toISOString()
      });
      logAudit('product.created', { name: form.name });
    }
    onClose();
  };

  const addVariant = () => {
    setForm({ ...form, variants: [...form.variants, { name: '', price: form.price, sku: '' }] });
  };

  const exportCsv = () => {
    const rows = products.map(p => [
      p.id,
      p.name,
      p.category || '',
      p.price,
      p.cost || 0,
      p.stock || 0,
      (p as any).barcode || ''
    ]);
    const csv = ['id,name,category,price,cost,stock,barcode', ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const data = products.map(p => ({
      ID: p.id,
      Name: p.name,
      Category: p.category || '',
      Price: p.price,
      Cost: p.cost || 0,
      Stock: p.stock || 0,
      Barcode: (p as any).barcode || ''
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, 'products-export.xlsx');
  };

  const handleCsvImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return;
      lines.slice(1).forEach((line, idx) => {
        const [id, name, category, price, cost, stock] = line.split(',');
        if (!name?.trim()) return;
        const cleanCategory = category?.trim() || 'Imported';
        
        if (cleanCategory && cleanCategory !== 'Imported' && !categories.includes(cleanCategory)) {
          addCategory(cleanCategory);
        }
        
        const parsedId = Number(id?.trim());
        addProduct({
          id: Number.isFinite(parsedId) && parsedId > 0 ? parsedId : createProductId(idx),
          name: name.trim(),
          category: cleanCategory,
          price: Number(price) || 0,
          cost: Number(cost) || 0,
          stock: Number(stock) || 0,
          image: '',
          available: true,
          createdAt: new Date().toISOString()
        });
      });
      logAudit('products.imported', { count: lines.length - 1 });
    };
    reader.readAsText(file);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Edit Product' : 'Add Product'}
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={exportCsv}><Download className="w-4 h-4 mr-1" />Export CSV</Button>
          <Button variant="ghost" size="sm" onClick={exportExcel}><Download className="w-4 h-4 mr-1" />Export Excel</Button>
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-1" />Import CSV</Button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleCsvImport(f);
            e.target.value = '';
          }} />
        </div>

        <div className="flex items-center gap-4">
          <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden">
            {form.image ? (
              <img src={form.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <img src={defaultProductImage} alt="" className="w-12 h-12 object-contain" />
            )}
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">Product Image URL</label>
            <Input value={form.image} onChange={(e) => setForm({...form, image: e.target.value})} placeholder="https://..." />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Product Name *</label>
            <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({...form, category: e.target.value})}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl"
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Selling Price *</label>
            <Input type="number" value={form.price} onChange={(e) => setForm({...form, price: Number(e.target.value)})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Cost Price</label>
            <Input type="number" value={form.cost} onChange={(e) => setForm({...form, cost: Number(e.target.value)})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Stock Quantity</label>
            <Input type="number" value={form.stock} onChange={(e) => setForm({...form, stock: Number(e.target.value)})} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Primary Barcode</label>
          <Input value={form.barcode} onChange={(e) => setForm({...form, barcode: e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Additional Barcodes</label>
          <div className="flex gap-2 mb-2">
            <Input value={extraBarcodeInput} onChange={e => setExtraBarcodeInput(e.target.value)} placeholder="Scan or type barcode" />
            <Button type="button" variant="ghost" onClick={() => {
              if (!extraBarcodeInput.trim()) return;
              setForm({ ...form, extraBarcodes: [...form.extraBarcodes, extraBarcodeInput.trim()] });
              setExtraBarcodeInput('');
            }}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.extraBarcodes.map((bc, i) => (
              <span key={i} className="text-xs bg-slate-100 px-2 py-1 rounded-lg">{bc}</span>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <label className="font-medium text-slate-700">Variants</label>
            <Button type="button" variant="ghost" size="sm" onClick={addVariant}><Plus className="w-4 h-4 mr-1" />Add variant</Button>
          </div>
          {form.variants.map((v, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 mb-2">
              <Input placeholder="Name" value={v.name} onChange={e => {
                const variants = [...form.variants];
                variants[i] = { ...v, name: e.target.value };
                setForm({ ...form, variants });
              }} />
              <Input type="number" placeholder="Price" value={v.price} onChange={e => {
                const variants = [...form.variants];
                variants[i] = { ...v, price: Number(e.target.value) };
                setForm({ ...form, variants });
              }} />
              <Input placeholder="SKU" value={v.sku || ''} onChange={e => {
                const variants = [...form.variants];
                variants[i] = { ...v, sku: e.target.value };
                setForm({ ...form, variants });
              }} />
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.isBundle} onChange={e => setForm({ ...form, isBundle: e.target.checked })} />
            This is a bundle product
          </label>
          {form.isBundle && (
            <select
              multiple
              className="w-full mt-2 border rounded-lg p-2 h-28"
              value={form.bundleProductIds}
              onChange={e => {
                const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                setForm({ ...form, bundleProductIds: selected });
              }}
            >
              {products.filter(p => !product || p.id !== product.id).map(p => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
          <Plus className="w-4 h-4 mr-2" />
          {product ? 'Update Product' : 'Add Product'}
        </Button>
      </div>
    </Modal>
  );
}
