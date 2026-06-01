import React, { useState } from 'react';
import { usePosStore } from '../store/posStore';
import { Search, Package, AlertTriangle, CheckCircle2, Filter, ArrowUpDown } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import defaultProductImage from '../assets/cart.png';

export default function InventoryPage() {
  const { products, categories } = usePosStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price'>('name');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Filter products
  let filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? product.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  // Sort products
  filteredProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'stock') return (b.stock || 0) - (a.stock || 0);
    if (sortBy === 'price') return b.price - a.price;
    return 0;
  });

  // Get stock status
  const getStockStatus = (stock: number) => {
    if (stock <= 0) return { text: 'Out of Stock', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    if (stock <= 5) return { text: 'Low Stock', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    return { text: 'In Stock', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  };

  return (
    <div className="h-screen flex bg-slate-100">
      {/* Left: Products List */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 border-b border-slate-200 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-orange-600" />
              <h1 className="text-2xl font-bold text-slate-900">Inventory Lookup</h1>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {/* Category Filters */}
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                    !selectedCategory
                      ? 'bg-orange-600 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                      selectedCategory === category
                        ? 'bg-orange-600 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 border border-slate-200 rounded-xl bg-white font-semibold"
              >
                <option value="name">Sort by Name</option>
                <option value="stock">Sort by Stock</option>
                <option value="price">Sort by Price</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Package className="w-24 h-24 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-600">No Products Found</h3>
                <p className="text-slate-500 mt-2">Try adjusting your search or category filter</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product.stock || 0);
                return (
                  <div
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={`bg-white rounded-2xl p-4 border-2 shadow-sm hover:shadow-lg hover:-translate-y-1 cursor-pointer transition-all ${
                      selectedProduct?.id === product.id ? 'border-orange-500 shadow-lg' : 'border-slate-200'
                    }`}
                  >
                    <div className="aspect-square bg-slate-50 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                      <img
                        src={product.image || defaultProductImage}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-2">{product.name}</h3>
                    <p className="text-orange-600 font-bold text-lg mt-1">KES {product.price.toFixed(2)}</p>
                    <div className="mt-3">
                      <div className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${stockStatus.bg} ${stockStatus.color} ${stockStatus.border}`}>
                        {stockStatus.text === 'Out of Stock' ? (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        ) : stockStatus.text === 'In Stock' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        {stockStatus.text}
                      </div>
                      <p className="text-sm text-slate-500 mt-2">
                        Stock: <span className="font-semibold text-slate-700">{product.stock || 0} units</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Product Details */}
      <div className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-xl">
        {selectedProduct ? (
          <>
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">{selectedProduct.name}</h2>
              {selectedProduct.category && (
                <p className="text-sm text-slate-500 mt-1">{selectedProduct.category}</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Product Image */}
              <div className="aspect-square bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden">
                <img
                  src={selectedProduct.image || defaultProductImage}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
                  <p className="text-sm text-orange-700">Price</p>
                  <p className="text-3xl font-black text-orange-900 mt-1">KES {selectedProduct.price.toFixed(2)}</p>
                </div>
                <div className={`rounded-xl p-4 ${
                  (selectedProduct.stock || 0) <= 0 ? 'bg-gradient-to-br from-red-50 to-red-100' :
                  (selectedProduct.stock || 0) <= 5 ? 'bg-gradient-to-br from-orange-50 to-orange-100' :
                  'bg-gradient-to-br from-emerald-50 to-emerald-100'
                }`}>
                  <p className={`text-sm ${
                    (selectedProduct.stock || 0) <= 0 ? 'text-red-700' :
                    (selectedProduct.stock || 0) <= 5 ? 'text-orange-700' :
                    'text-emerald-700'
                  }`}>Stock</p>
                  <p className={`text-3xl font-black mt-1 ${
                    (selectedProduct.stock || 0) <= 0 ? 'text-red-900' :
                    (selectedProduct.stock || 0) <= 5 ? 'text-orange-900' :
                    'text-emerald-900'
                  }`}>{selectedProduct.stock || 0}</p>
                </div>
              </div>

              {/* Product Info */}
              {selectedProduct.description && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{selectedProduct.description}</p>
                </div>
              )}

              {selectedProduct.sku && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500">SKU</p>
                  <p className="font-mono text-slate-800 font-semibold">{selectedProduct.sku}</p>
                </div>
              )}

              {selectedProduct.barcode && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Barcode</p>
                  <p className="font-mono text-slate-800 font-semibold">{selectedProduct.barcode}</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Package className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600">Select a Product</h3>
            <p className="text-slate-400 mt-2">Click on a product from the list to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}