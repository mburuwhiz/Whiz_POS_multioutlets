import React, { useState, useEffect } from 'react';
import { usePosStore } from '../store/posStore';
import { Product } from '../types';
import { Package, AlertTriangle, TrendingUp, TrendingDown, Plus, Edit2, Trash2, Search, Filter, ClipboardCheck, X, Smartphone } from 'lucide-react';
import cartPlaceholder from '../assets/cart.png';

export default function InventoryManagement() {
  const { products, updateProduct, addProduct, deleteProduct, categories: storeCategories, businessSetup } = usePosStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReconcileMode, setIsReconcileMode] = useState(false);
  const [isOutletAdjustmentMode, setIsOutletAdjustmentMode] = useState(false);
  const [approvedOutlets, setApprovedOutlets] = useState<any[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: storeCategories[0] || 'Others',
    image: '',
    stock: '',
    minStock: '10',
    available: true
  });

  // State for Reconciliation
  const [reconciliationData, setReconciliationData] = useState<{ [id: number]: number }>({});
  const [adjustmentData, setAdjustmentData] = useState<{ [id: number]: string }>({});

  const categories = ['all', ...new Set([...storeCategories, ...products.map(p => p.category)])];
  const productNames = [...new Set(products.map(p => p.name).filter(Boolean))];
  const resolveProductImage = (image?: string) => {
    if (!image) return cartPlaceholder;
    if (/^(https?:|blob:|data:|local-asset:)/i.test(image)) return image;
    return `local-asset://${image}`;
  };

  useEffect(() => {
    if (businessSetup?.mode === 'server' && window.electron) {
        window.electron.getApprovedOutlets().then(setApprovedOutlets);
    }
  }, [businessSetup?.mode]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = (product.name || '').toLowerCase().includes((searchTerm || '').toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockProducts = filteredProducts.filter(product => 
    product.stock !== undefined && product.stock <= (product.minStock || 10)
  );

  const outOfStockProducts = filteredProducts.filter(product => 
    product.stock === 0
  );

  const totalStockValue = filteredProducts.reduce((sum, product) => 
    sum + (product.price * (product.stock || 0)), 0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData = {
      name: formData.name,
      price: parseFloat(formData.price),
      category: formData.category,
      image: formData.image,
      stock: parseInt(formData.stock),
      minStock: parseInt(formData.minStock),
      available: formData.available
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
    } else {
      addProduct({ ...productData, id: Date.now() });
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      category: 'Coffee',
      image: '',
      stock: '',
      minStock: '10',
      available: true
    });
    setEditingProduct(null);
    setIsFormOpen(false);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      category: product.category,
      image: product.image,
      stock: (product.stock || 0).toString(),
      minStock: (product.minStock || 10).toString(),
      available: product.available
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteProduct(id);
    }
  };

  const toggleAvailability = (product: Product) => {
    updateProduct(product.id, { available: !product.available });
  };

  const handleAdjustmentChange = (productId: number, value: string) => {
    setAdjustmentData(prev => ({ ...prev, [productId]: value }));
  };

  const submitAdjustments = async () => {
    if (!selectedOutlet) return;

    const updates = Object.entries(adjustmentData).filter(([_, val]) => val !== '' && val !== '0');
    if (updates.length === 0) return;

    if (confirm(`Apply ${updates.length} adjustments to ${selectedOutlet.name}?`)) {
        for (const [id, val] of updates) {
            const productId = parseInt(id);
            const product = products.find(p => p.id === productId);
            if (product) {
                const adjustment = parseInt(val);
                const newStock = Math.max(0, (product.stock || 0) + adjustment);

                updateProduct(productId, { stock: newStock });

                try {
                    await fetch(`http://${selectedOutlet.ip}:${selectedOutlet.port || 3000}/api/sync_push`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-KEY': businessSetup?.apiKey || ''
                        },
                        body: JSON.stringify({
                            type: 'inventory-adjustment',
                            data: { id: productId, stock: newStock }
                        })
                    });
                } catch (e) {
                    console.error(`Failed to push adjustment to ${selectedOutlet.name}`, e);
                }
            }
        }
        setAdjustmentData({});
        alert("Adjustments pushed successfully.");
    }
  };

  // Reconciliation Logic
  const handleReconcileChange = (productId: number, value: string) => {
      const count = parseInt(value);
      if (!isNaN(count)) {
          setReconciliationData(prev => ({ ...prev, [productId]: count }));
      }
  };

  const submitReconciliation = () => {
      if (confirm("This will update the stock levels for all modified items. Continue?")) {
          Object.entries(reconciliationData).forEach(([id, count]) => {
              const productId = parseInt(id) || id; // Handle string/number ID mismatch if any
              // Ideally updateProduct should handle ID type correctly.
              // Product ID in interface is number, but some logic uses string.
              // Let's assume it matches the type in store.
              // Casting id to number if product.id is number
              const product = products.find(p => p.id == productId);
              if (product) {
                  updateProduct(product.id, { stock: count });
                  // Log adjustment? For now, updating stock is sufficient for MVP.
              }
          });
          setReconciliationData({});
          setIsReconcileMode(false);
          alert("Stock levels updated successfully.");
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Inventory Management</h1>
                <p className="text-gray-600">Manage products and stock levels</p>
              </div>
            </div>
            <div className="flex space-x-3">
                {businessSetup?.mode === 'server' && (
                    <button
                        onClick={() => {
                            setIsOutletAdjustmentMode(!isOutletAdjustmentMode);
                            setIsReconcileMode(false);
                        }}
                        className={`px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors ${
                            isOutletAdjustmentMode
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                        <Smartphone className="w-5 h-5" />
                        <span>{isOutletAdjustmentMode ? 'Exit Outlet Mode' : 'Outlet Adjustments'}</span>
                    </button>
                )}
                <button
                    onClick={() => {
                        setIsReconcileMode(!isReconcileMode);
                        setIsOutletAdjustmentMode(false);
                    }}
                    className={`px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors ${
                        isReconcileMode
                        ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                >
                    <ClipboardCheck className="w-5 h-5" />
                    <span>{isReconcileMode ? 'Exit Reconciliation' : 'Stock Reconciliation'}</span>
                </button>
                {!isReconcileMode && (
                    <button
                    onClick={() => setIsFormOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                    <Plus className="w-5 h-5" />
                    <span>Add Product</span>
                    </button>
                )}
            </div>
          </div>
        </div>

        {/* Summary Cards (Hidden in Reconciliation/Outlet Mode to focus) */}
        {!isReconcileMode && !isOutletAdjustmentMode && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-600 text-sm">Total Products</p>
                    <p className="text-2xl font-bold text-gray-800">{filteredProducts.length}</p>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-600 text-sm">Low Stock</p>
                    <p className="text-2xl font-bold text-orange-600">{lowStockProducts.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-600" />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-600 text-sm">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-600">{outOfStockProducts.length}</p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-600" />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-600 text-sm">Stock Value</p>
                    <p className="text-2xl font-bold text-green-600">KES {totalStockValue.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
            </div>
            </div>
        )}

        {/* Alerts */}
        {!isReconcileMode && !isOutletAdjustmentMode && (lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-4">Stock Alerts</h3>
            {outOfStockProducts.length > 0 && (
              <div className="mb-4">
                <p className="text-red-800 font-medium mb-2">Out of Stock:</p>
                <div className="flex flex-wrap gap-2">
                  {outOfStockProducts.map(product => (
                    <span key={product.id} className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-sm">
                      {product.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {lowStockProducts.length > 0 && (
              <div>
                <p className="text-orange-800 font-medium mb-2">Low Stock:</p>
                <div className="flex flex-wrap gap-2">
                  {lowStockProducts.map(product => (
                    <span key={product.id} className="px-3 py-1 bg-orange-200 text-orange-800 rounded-full text-sm">
                      {product.name} ({product.stock})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                list="inventory-suggestions"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <datalist id="inventory-suggestions">
                  {productNames.map(name => <option key={name} value={name} />)}
              </datalist>
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Reconciliation Actions */}
        {isReconcileMode && (
            <div className="bg-purple-50 p-4 rounded-lg mb-6 flex justify-between items-center border border-purple-200">
                <div>
                    <h3 className="font-bold text-purple-900">Stock Reconciliation Mode</h3>
                    <p className="text-sm text-purple-700">Enter physical counts below. Variance will be calculated automatically.</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => { setReconciliationData({}); setIsReconcileMode(false); }}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submitReconciliation}
                        className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg font-bold"
                    >
                        Submit Adjustments
                    </button>
                </div>
            </div>
        )}

        {/* Outlet Adjustment Actions */}
        {isOutletAdjustmentMode && (
            <div className="bg-blue-50 p-6 rounded-lg mb-6 border border-blue-200 space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-blue-900 text-lg">Outlet Stock Orchestration</h3>
                        <p className="text-sm text-blue-700">Select an outlet and input relative adjustments (e.g., +5, -3).</p>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => { setAdjustmentData({}); setIsOutletAdjustmentMode(false); }}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={!selectedOutlet}
                            onClick={submitAdjustments}
                            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold disabled:opacity-50"
                        >
                            Push Adjustments
                        </button>
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {approvedOutlets.map(outlet => (
                        <button
                            key={outlet.id}
                            onClick={() => setSelectedOutlet(outlet)}
                            className={`px-4 py-2 rounded-xl border whitespace-nowrap transition-all ${
                                selectedOutlet?.id === outlet.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                            }`}
                        >
                            {outlet.name}
                        </button>
                    ))}
                    {approvedOutlets.length === 0 && (
                        <p className="text-sm text-blue-600 italic">No approved outlets found. Please approve outlets in the Management Hub first.</p>
                    )}
                </div>
            </div>
        )}

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Products</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  {!isReconcileMode && !isOutletAdjustmentMode && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isOutletAdjustmentMode ? 'Master Stock' : 'System Stock'}
                  </th>
                  {isReconcileMode ? (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Physical Count</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                      </>
                  ) : isOutletAdjustmentMode ? (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adjustment (+/-)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Outlet Total</th>
                      </>
                  ) : (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <img
                          src={resolveProductImage(product.image)}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded-lg"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          {!isReconcileMode && <div className="text-sm text-gray-500">ID: {product.id}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {product.category}
                      </span>
                    </td>
                    {!isReconcileMode && !isOutletAdjustmentMode && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        KES {product.price.toFixed(2)}
                        </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        !isReconcileMode && !isOutletAdjustmentMode && product.stock === 0 ? 'text-red-600' :
                        !isReconcileMode && !isOutletAdjustmentMode && (product.stock ?? 0) <= (product.minStock || 10) ? 'text-orange-600' :
                        'text-gray-900'
                      }`}>
                        {product.stock || 0}
                      </span>
                    </td>

                    {isReconcileMode ? (
                        <>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                    type="number"
                                    min="0"
                                    className="w-24 p-2 border rounded focus:ring-2 focus:ring-purple-500"
                                    value={reconciliationData[product.id] !== undefined ? reconciliationData[product.id] : ''}
                                    onChange={(e) => handleReconcileChange(product.id, e.target.value)}
                                    placeholder={product.stock?.toString()}
                                />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-bold">
                                {reconciliationData[product.id] !== undefined ? (
                                    <span className={reconciliationData[product.id] - (product.stock || 0) < 0 ? 'text-red-600' : 'text-green-600'}>
                                        {reconciliationData[product.id] - (product.stock || 0) > 0 ? '+' : ''}
                                        {reconciliationData[product.id] - (product.stock || 0)}
                                    </span>
                                ) : (
                                    <span className="text-gray-400">-</span>
                                )}
                            </td>
                        </>
                    ) : isOutletAdjustmentMode ? (
                        <>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                    type="text"
                                    placeholder="+X or -X"
                                    className="w-24 p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                    value={adjustmentData[product.id] || ''}
                                    onChange={(e) => handleAdjustmentChange(product.id, e.target.value)}
                                />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-bold">
                                {adjustmentData[product.id] ? (
                                    <span className="text-blue-600">
                                        {(product.stock || 0) + (parseInt(adjustmentData[product.id]) || 0)}
                                    </span>
                                ) : (
                                    <span className="text-gray-400">{(product.stock || 0)}</span>
                                )}
                            </td>
                        </>
                    ) : (
                        <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.minStock || 10}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            <button
                                onClick={() => toggleAvailability(product)}
                                className={`px-3 py-1 text-xs font-medium rounded-full ${
                                product.available
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                            >
                                {product.available ? 'Available' : 'Unavailable'}
                            </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center space-x-2">
                                <button
                                onClick={() => handleEdit(product)}
                                className="text-blue-600 hover:text-blue-800"
                                >
                                <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                onClick={() => handleDelete(product.id)}
                                className="text-red-600 hover:text-red-800"
                                >
                                <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            </td>
                        </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredProducts.length === 0 && (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No products found</p>
                <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Product Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-full overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter product name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price (KES)</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {storeCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stock Quantity</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Stock Level</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.minStock}
                      onChange={(e) => setFormData(prev => ({ ...prev, minStock: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="10"
                    />
                  </div>

                  <div>
<label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
<div className="flex items-center space-x-4">
  <img
    src={resolveProductImage(formData.image)}
    alt="Product Preview"
    className="w-20 h-20 object-cover rounded-lg"
  />
  <input
    type="file"
    accept="image/*"
    onFocus={(e) => e.target.blur()}
    onChange={async (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (window.electron) {
          const result = await window.electron.saveImage((file as any).path);
          if (result.success && result.fileName) {
            setFormData(prev => ({ ...prev, image: result.fileName || '' }));
          }
        } else {
          // Fallback for web environment
          const imageURL = URL.createObjectURL(file);
          setFormData(prev => ({ ...prev, image: imageURL }));
        }
      }
    }}
    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
  />
</div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="available"
                      checked={formData.available}
                      onChange={(e) => setFormData(prev => ({ ...prev, available: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="available" className="ml-2 block text-sm text-gray-900">
                      Product is available for sale
                    </label>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
                    >
                      {editingProduct ? 'Update Product' : 'Add Product'}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
