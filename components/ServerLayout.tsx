import React, { useState, ReactNode, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  CreditCard, 
  BarChart3, 
  Settings, 
  Store, 
  LogOut,
  Bell,
  Search,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  ArrowRight,
  ArrowLeftRight,
  Warehouse,
  RefreshCw,
  Tags,
  Users as UsersIcon,
  Truck,
  Receipt,
  Shield,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import ServerDashboard from './ServerDashboard';
import ProductModal from './ProductModal';
import UserModal from './UserModal';
import { usePosStore } from '../store/posStore';
import defaultProductImage from '../assets/cart.png';
import ServerOutletsPage from './ServerOutletsPage';
import ServerSalesPage from './ServerSalesPage';
import ServerReportsPage from './ServerReportsPage';
import ServerCustomersPage from './ServerCustomersPage';
import ServerSuppliersPage from './ServerSuppliersPage';
import ServerExpensesPage from './ServerExpensesPage';
import ServerAuditLogsPage from './ServerAuditLogsPage';
import OutletStockPage from './OutletStockPage';

interface ServerLayoutProps {
  children?: ReactNode;
  onLogout?: () => void;
}

type ServerPage = 'dashboard' | 'products' | 'categories' | 'stock' | 'users' | 'sales' | 'reports' | 'outlets' | 'outlet-stock' | 'customers' | 'suppliers' | 'expenses' | 'audit' | 'settings';

export default function ServerLayout({ children, onLogout }: ServerLayoutProps) {
  // First, get all posStore state at the top
  const products = usePosStore(state => state.products);
  const users = usePosStore(state => state.users);
  const transactions = usePosStore(state => state.transactions);
  const businessSetup = usePosStore(state => state.businessSetup);
  const saveBusinessSetup = usePosStore(state => state.saveBusinessSetup);
  const categories = usePosStore(state => state.categories);
  const addCategory = usePosStore(state => state.addCategory);
  const deleteCategory = usePosStore(state => state.deleteCategory);
  const logout = usePosStore(state => state.logout);
  const currentCashier = usePosStore(state => state.currentCashier);
  
  const [activePage, setActivePage] = useState<ServerPage>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [outletStockValue, setOutletStockValue] = useState(0);
  const [selectedOutletForStock, setSelectedOutletForStock] = useState<any>(null);
  const [refreshOutletsKey, setRefreshOutletsKey] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleBackup = async () => {
    if (!window.electron) return;
    setIsBackingUp(true);
    try {
      const result = await window.electron.backupData();
      if (result?.success) {
        alert(`Backup saved to ${result.filePath}`);
      }
    } catch (e) {
      console.error('Backup failed:', e);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (!window.electron) return;
    if (!window.confirm('WARNING: Restoring will overwrite all current local data with the backup archive. Are you sure you want to proceed?')) {
      return;
    }
    setIsRestoring(true);
    try {
      const result = await window.electron.restoreData();
      if (result?.success) {
        alert('Restore successful. Restarting application...');
        localStorage.removeItem('pos-storage');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (e) {
      console.error('Restore failed:', e);
    } finally {
      setIsRestoring(false);
    }
  };

  React.useEffect(() => {
    const loadStockLayers = async () => {
      if (!window.electron?.getStockMovements) return;
      try {
        const movements = await window.electron.getStockMovements();
        const outletVal = (movements || [])
          .filter((m: any) => m.type === 'outlet_allocation' || m.type === 'transfer_to_outlet')
          .reduce((sum: number, m: any) => sum + (Number(m.quantity) || 0) * (Number(m.unitCost) || 0), 0);
        setOutletStockValue(outletVal);
      } catch {
        setOutletStockValue(0);
      }
    };
    if (activePage === 'stock') loadStockLayers();
  }, [activePage, products]);

  React.useEffect(() => {
    const handleServerNavigation = (event: Event) => {
      const customEvent = event as CustomEvent<ServerPage>;
      if (customEvent.detail) {
        setActivePage(customEvent.detail);
      }
    };

    window.addEventListener('server:navigate', handleServerNavigation as EventListener);
    return () => window.removeEventListener('server:navigate', handleServerNavigation as EventListener);
  }, []);
  
  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    businessName: '',
    email: '',
    phone: '',
    currency: '',
    address: '',
    taxRate: 0,
    taxName: '',
    receiptHeader: '',
    receiptFooter: '',
    showLogoOnReceipt: true
  });
  
  // Initialize form when businessSetup changes
  React.useEffect(() => {
    if (businessSetup) {
      setSettingsForm({
        businessName: businessSetup.businessName || '',
        email: businessSetup.email || '',
        phone: businessSetup.phone || '',
        currency: businessSetup.currency || 'KES',
        address: businessSetup.address || '',
        taxRate: businessSetup.taxRate || 0,
        taxName: businessSetup.taxName || 'VAT',
        receiptHeader: businessSetup.receiptHeader || '',
        receiptFooter: businessSetup.receiptFooter || '',
        showLogoOnReceipt: businessSetup.showLogoOnReceipt !== false
      });
    }
  }, [businessSetup]);
  
  const handleSaveSettings = () => {
    if (businessSetup && saveBusinessSetup) {
      saveBusinessSetup({
        ...businessSetup,
        businessName: settingsForm.businessName,
        email: settingsForm.email,
        phone: settingsForm.phone,
        currency: settingsForm.currency,
        address: settingsForm.address,
        taxRate: settingsForm.taxRate,
        taxName: settingsForm.taxName,
        receiptHeader: settingsForm.receiptHeader,
        receiptFooter: settingsForm.receiptFooter,
        showLogoOnReceipt: settingsForm.showLogoOnReceipt
      });
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'stock', label: 'Stock', icon: Package },
    { id: 'sales', label: 'Sales', icon: CreditCard },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'outlets', label: 'Outlets', icon: Store },
    { id: 'customers', label: 'Customers', icon: UsersIcon },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'audit', label: 'Audit Logs', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;
  
  const renderActivePage = () => {
    switch (activePage) {
      case 'categories':
        return (
          <div className="p-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8 flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">Product Categories</h1>
                  <p className="text-slate-500">Manage your product categories</p>
                </div>
                <div className="flex gap-3">
                  <Input
                    placeholder="Add new category..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-64"
                  />
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                    if (newCategoryName.trim()) {
                      addCategory(newCategoryName.trim());
                      setNewCategoryName('');
                    }
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                  </Button>
                </div>
              </div>
              <Card>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <Tags className="w-5 h-5 text-blue-500" />
                          <span className="font-semibold text-slate-800">{category}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteCategory(category)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  {categories.length === 0 && (
                    <div className="text-center py-12">
                      <Tags className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-slate-700 mb-2">No Categories Yet</h3>
                      <p className="text-slate-500 mb-6">Start by adding your first product category</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        );
      case 'dashboard':
        return <ServerDashboard />;
      case 'outlets':
        return <ServerOutletsPage 
          onBack={() => setActivePage('dashboard')}
          key={refreshOutletsKey}
          onOutletUpdated={() => setRefreshOutletsKey(prev => prev + 1)}
        />;
      case 'outlet-stock':
        if (!selectedOutletForStock) {
          setActivePage('outlets');
          return null;
        }
        return (
          <OutletStockPage 
            outlet={selectedOutletForStock} 
            onBack={() => { setActivePage('outlets'); setSelectedOutletForStock(null); }} 
            onOutletUpdated={() => setRefreshOutletsKey(prev => prev + 1)}
          />
        );
      case 'sales':
        return <ServerSalesPage />;
      case 'reports':
        return <ServerReportsPage />;
      case 'customers':
        return <ServerCustomersPage />;
      case 'suppliers':
        return <ServerSuppliersPage />;
      case 'expenses':
        return <ServerExpensesPage />;
      case 'audit':
        return <ServerAuditLogsPage />;
      case 'stock':
        const totalStockValue = products.reduce((sum, p) => sum + (p.cost || 0) * (p.stock || 0), 0);
        const storeStockValue = totalStockValue;
        
        return (
          <div className="p-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">Stock Management</h1>
                  <p className="text-slate-500">Manage your store stock</p>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      const outOfStockProducts = products.filter(p => p.stock === 0);
                      if (outOfStockProducts.length === 0) {
                        alert('No out-of-stock products to export!');
                        return;
                      }
                      const csvContent = [
                        ['Product Name', 'Category', 'Cost', 'Product ID'].join(','),
                        ...outOfStockProducts.map(p => [
                          `"${p.name}"`,
                          `"${p.category || '-'}"`,
                          p.cost || 0,
                          p.id
                        ].join(','))
                      ].join('\n');
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.setAttribute('href', url);
                      link.setAttribute('download', `out-of-stock-products-${new Date().toISOString().split('T')[0]}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export Out-of-Stock (CSV)
                  </Button>
                </div>
              </div>
              
              {/* Stock Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <Warehouse className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium text-slate-500">Store Stock Value</span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900">KES {storeStockValue.toFixed(2)}</div>
                </Card>
                
                <Card className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <Store className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium text-slate-500">Outlet Stock Value</span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900">KES {outletStockValue.toFixed(2)}</div>
                </Card>
                
                <Card className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium text-slate-500">Total Business Stock</span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900">KES {(storeStockValue + outletStockValue).toFixed(2)}</div>
                </Card>
              </div>

              {/* Store Stock Table */}
              <Card className="mb-8">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Warehouse className="w-5 h-5 text-blue-600" />
                    Store Stock (Central Warehouse)
                  </h3>
                  <Button variant="ghost" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Stock Qty
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Cost
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Value
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {products.map((product) => (
                        <tr key={product.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mr-3">
                                <img src={product.image || defaultProductImage} alt="" className="w-6 h-6 object-contain" />
                              </div>
                              <span className="font-semibold text-slate-900">{product.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {product.category || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={
                              product.stock === 0 ? 'bg-red-500' :
                              product.stock <= 10 ? 'bg-orange-500' :
                              'bg-green-500'
                            }>
                              {product.stock} units
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            KES {(product.cost || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                            KES {((product.cost || 0) * product.stock).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4 mr-1" />
                              Adjust
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        );
      case 'products':
        return (
          <div className="p-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8 flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">Products</h1>
                  <p className="text-slate-500">Manage your master product catalog</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                  setSelectedProduct(null);
                  setIsProductModalOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card className="p-6">
                  <div className="text-sm font-medium text-slate-500 mb-1">Total Products</div>
                  <div className="text-3xl font-bold text-slate-900">{products.length}</div>
                </Card>
                <Card className="p-6">
                  <div className="text-sm font-medium text-slate-500 mb-1">In Stock</div>
                  <div className="text-3xl font-bold text-green-600">
                    {products.filter(p => p.stock > 0).length}
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="text-sm font-medium text-slate-500 mb-1">Low Stock</div>
                  <div className="text-3xl font-bold text-orange-600">
                    {products.filter(p => p.stock > 0 && p.stock <= 10).length}
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="text-sm font-medium text-slate-500 mb-1">Out of Stock</div>
                  <div className="text-3xl font-bold text-red-600">
                    {products.filter(p => p.stock === 0).length}
                  </div>
                </Card>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <img src={defaultProductImage} alt={product.name} className="w-16 h-16 object-contain" />
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-slate-900 truncate flex-1 mr-2">{product.name}</h3>
                        <Badge className={
                          product.stock === 0 ? 'bg-red-500' :
                          product.stock <= 10 ? 'bg-orange-500' :
                          'bg-green-500'
                        }>
                          {product.stock} in stock
                        </Badge>
                      </div>
                      {product.category && (
                        <p className="text-sm text-slate-500 mb-3">{product.category}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-slate-900">
                            {(product as any).currency || 'KES'} {product.price.toFixed(2)}
                          </p>
                          {product.cost && (
                            <p className="text-xs text-slate-400">Cost: {(product as any).currency || 'KES'} {product.cost.toFixed(2)}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            setSelectedProduct(product);
                            setIsProductModalOpen(true);
                          }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                {products.length === 0 && (
                  <div className="col-span-full">
                    <Card className="p-12 text-center">
                      <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-slate-700 mb-2">No Products Yet</h3>
                      <p className="text-slate-500 mb-6">Start by adding your first product</p>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                      </Button>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      // NOTE: sales/reports/outlets pages are handled by the primary cases above.
      case 'users':
        return (
          <div className="p-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8 flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">Users</h1>
                  <p className="text-slate-500">Manage users, roles, and permissions</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                  setSelectedUser(null);
                  setIsUserModalOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card className="p-6">
                  <div className="text-sm font-medium text-slate-500 mb-1">Total Users</div>
                  <div className="text-3xl font-bold text-slate-900">{users.length}</div>
                </Card>
                <Card className="p-6">
                  <div className="text-sm font-medium text-slate-500 mb-1">Admins</div>
                  <div className="text-3xl font-bold text-purple-600">
                    {users.filter(u => u.role === 'admin').length}
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="text-sm font-medium text-slate-500 mb-1">Managers</div>
                  <div className="text-3xl font-bold text-blue-600">
                    {users.filter(u => u.role === 'manager').length}
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="text-sm font-medium text-slate-500 mb-1">Cashiers</div>
                  <div className="text-3xl font-bold text-green-600">
                    {users.filter(u => u.role === 'cashier').length}
                  </div>
                </Card>
              </div>

              {/* Users Table */}
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Last Login
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">{user.name}</div>
                                {user.email && (
                                  <div className="text-sm text-slate-500">{user.email}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={
                              user.role === 'admin' ? 'bg-purple-600' :
                              user.role === 'manager' ? 'bg-blue-600' :
                              'bg-green-600'
                            }>
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`w-2 h-2 rounded-full mr-2 ${user.isActive !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className="text-sm text-slate-600">
                                {user.isActive !== false ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <Button variant="ghost" size="sm" className="mr-2" onClick={() => {
                              setSelectedUser(user);
                              setIsUserModalOpen(true);
                            }}>
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Users Yet</h3>
                            <p className="text-slate-500 mb-6">Start by adding your first user</p>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                              <Plus className="w-4 h-4 mr-2" />
                              Add User
                            </Button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="p-8">
            <div className="max-w-5xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Settings</h1>
                <p className="text-slate-500">Configure your server and business settings</p>
              </div>

              {/* Settings Sections */}
              <div className="space-y-6">
                {/* Business Profile */}
                <Card>
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">Business Profile</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Business Name</label>
                        <Input 
                          value={settingsForm.businessName} 
                          onChange={(e) => setSettingsForm({...settingsForm, businessName: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                        <Input 
                          value={settingsForm.email} 
                          onChange={(e) => setSettingsForm({...settingsForm, email: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                        <Input 
                          value={settingsForm.phone} 
                          onChange={(e) => setSettingsForm({...settingsForm, phone: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Currency</label>
                        <Input 
                          value={settingsForm.currency} 
                          onChange={(e) => setSettingsForm({...settingsForm, currency: e.target.value})} 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                      <Input 
                        value={settingsForm.address} 
                        onChange={(e) => setSettingsForm({...settingsForm, address: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="p-6 pt-0">
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveSettings}>Save Changes</Button>
                  </div>
                </Card>

                {/* Tax Settings */}
                <Card>
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">Tax Settings</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Tax Rate (%)</label>
                        <Input 
                          value={settingsForm.taxRate} 
                          type="number" 
                          onChange={(e) => setSettingsForm({...settingsForm, taxRate: Number(e.target.value)})} 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Tax Name</label>
                        <Input 
                          value={settingsForm.taxName} 
                          onChange={(e) => setSettingsForm({...settingsForm, taxName: e.target.value})} 
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-6 pt-0">
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveSettings}>Save Changes</Button>
                  </div>
                </Card>

                {/* Receipt Settings */}
                <Card>
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">Receipt Settings</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Receipt Header</label>
                      <Input 
                        value={settingsForm.receiptHeader} 
                        onChange={(e) => setSettingsForm({...settingsForm, receiptHeader: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Receipt Footer</label>
                      <Input 
                        value={settingsForm.receiptFooter} 
                        onChange={(e) => setSettingsForm({...settingsForm, receiptFooter: e.target.value})} 
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="showLogo" 
                        className="w-4 h-4 text-blue-600" 
                        checked={settingsForm.showLogoOnReceipt}
                        onChange={(e) => setSettingsForm({...settingsForm, showLogoOnReceipt: e.target.checked})} 
                      />
                      <label htmlFor="showLogo" className="text-sm text-slate-700">Show business logo on receipt</label>
                    </div>
                  </div>
                  <div className="p-6 pt-0">
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveSettings}>Save Changes</Button>
                  </div>
                </Card>

                {/* Users Management */}
                <Card>
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900">Users Management</h3>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setActivePage('users')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Manage Users
                    </Button>
                  </div>
                  <div className="p-6">
                    <p className="text-slate-500">Manage system users, roles, and permissions from the Users page.</p>
                  </div>
                </Card>

                {/* Backup & Restore */}
                <Card>
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">Backup & Restore</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button 
                        variant="ghost" 
                        className="h-auto py-4 border border-slate-200 hover:bg-slate-50"
                        onClick={handleBackup}
                        disabled={isBackingUp}
                      >
                        {isBackingUp ? (
                          <>
                            <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
                            Backing up...
                          </>
                        ) : (
                          <>
                            <Package className="w-5 h-5 mr-3" />
                            Create Backup
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="h-auto py-4 border border-slate-200 hover:bg-slate-50"
                        onClick={handleRestore}
                        disabled={isRestoring}
                      >
                        {isRestoring ? (
                          <>
                            <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
                            Restoring...
                          </>
                        ) : (
                          <>
                            <Edit className="w-5 h-5 mr-3" />
                            Restore Backup
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        );
      default:
        return <ServerDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-100 fixed h-screen left-0 top-0 z-10">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
              W
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">Whiz POS</h1>
              <p className="text-xs text-slate-500 font-medium">Server Console</p>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1.5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  activePage === item.id
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-red-600 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Header */}
        <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search anything..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-50 border-slate-200 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-slate-600" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  3
                </span>
              </Button>
              <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                  {currentCashier ? currentCashier.name.charAt(0).toUpperCase() : 'AD'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{currentCashier ? currentCashier.name : 'Admin User'}</p>
                  <p className="text-xs text-slate-500">{currentCashier ? `${currentCashier.role.charAt(0).toUpperCase() + currentCashier.role.slice(1)}` : 'Server Manager'}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        {children || renderActivePage()}
      </main>
      
      {/* Product Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={selectedProduct}
      />
      
      {/* User Modal */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        user={selectedUser}
      />
    </div>
  );
}
