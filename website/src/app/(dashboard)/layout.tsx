'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  Package,
  Users,
  User,
  TrendingUp,
  Settings,
  Menu,
  X,
  LogOut,
  Tag
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [business, setBusiness] = useState<any>(null);
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/transactions', label: 'Transactions', icon: Receipt },
    { href: '/inventory', label: 'Inventory', icon: Package },
    { href: '/categories', label: 'Categories', icon: Tag },
    { href: '/users', label: 'Users & Perms', icon: Users },
    { href: '/customers', label: 'Credit Customers', icon: User },
    { href: '/expenses', label: 'Expenses', icon: TrendingUp },
    { href: '/reports', label: 'Reports', icon: TrendingUp },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  const getPageTitle = () => {
    const item = navItems.find(i => i.href === pathname);
    return item?.label || 'Dashboard';
  };

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const res = await fetch('/api/business');
        if (res.ok) {
          const data = await res.json();
          setBusiness(data.business);
        }
      } catch (e) {
        console.error('Failed to fetch business:', e);
      }
    };
    fetchBusiness();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST'
      });
      router.push('/auth/login');
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Whizpoint</h2>
              <p className="text-xs text-slate-500">Business Portal</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-500 hover:text-slate-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${
                isActive 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <item.icon className={`w-5 h-5 transition-colors ${
                isActive 
                  ? 'text-blue-600' 
                  : 'text-slate-400 group-hover:text-blue-600'
              }`} />
              <span className={`font-medium ${
                isActive ? 'font-semibold' : ''
              }`}>{item.label}</span>
            </Link>
          )})}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors group"
          >
            <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-600 transition-colors" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-slate-500 hover:text-slate-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{business?.name || 'Loading...'}</p>
              <p className="text-xs text-slate-500">Admin</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
              {business ? getInitials(business.name) : 'DB'}
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
