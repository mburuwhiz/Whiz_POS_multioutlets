import Link from "next/link";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col md:flex-row gap-8">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0">
        <nav className="sticky top-24 space-y-1">
          <h3 className="font-semibold text-slate-900 mb-4 px-3 uppercase text-xs tracking-wider">Getting Started</h3>
          <Link href="/docs" className="block px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md">Installation</Link>
          <Link href="/docs#configuration" className="block px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md">Configuration</Link>

          <h3 className="font-semibold text-slate-900 mb-4 mt-8 px-3 uppercase text-xs tracking-wider">Features</h3>
          <Link href="/docs#inventory" className="block px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md">Inventory Management</Link>
          <Link href="/docs#sales" className="block px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md">Sales & Checkout</Link>
          <Link href="/docs#mpesa" className="block px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md">M-Pesa Integration</Link>

          <h3 className="font-semibold text-slate-900 mb-4 mt-8 px-3 uppercase text-xs tracking-wider">Support</h3>
          <Link href="/docs#troubleshooting" className="block px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md">Troubleshooting</Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 prose prose-slate max-w-none">
        {children}
      </div>
    </div>
  );
}
