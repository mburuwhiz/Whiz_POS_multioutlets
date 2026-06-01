export default function DocsPage() {
  return (
    <>
      <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-8">Documentation</h1>

      <section id="installation" className="mb-16">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4 border-b pb-2">Installation</h2>
        <p className="text-slate-600 mb-4">
          Whizpoint POS is designed to run natively on Windows environments. The application installs into <code>C:\ProgramData\whiz-pos</code> by default to ensure all users on the machine have appropriate access and to avoid standard AppData permission issues.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-slate-600 ml-4 mb-4">
          <li>Download the latest Windows installer (<code>.exe</code>) from your provided portal link.</li>
          <li>Run the executable. Administrative privileges may be required for the initial setup.</li>
          <li>Follow the on-screen prompts. The application will automatically configure its local SQLite database in WAL mode.</li>
        </ol>
      </section>

      <section id="configuration" className="mb-16">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4 border-b pb-2">Configuration</h2>
        <p className="text-slate-600 mb-4">
          Initial setup requires configuring your business details and admin PIN. Access the Developer/Admin portal by clicking the subtle gear icon on the login screen.
        </p>
        <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
          <li><strong>Business Details:</strong> Enter your Business Name, KRA PIN, and Contact info. These appear on generated receipts.</li>
          <li><strong>Developer PIN:</strong> Ensure you set a secure custom PIN. If unset, it falls back to the default (contact support).</li>
          <li><strong>Receipt Printer:</strong> Ensure your thermal printer is set as the default Windows printer. The system uses a standard 80mm width layout.</li>
        </ul>
      </section>

      <section id="inventory" className="mb-16">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4 border-b pb-2">Inventory Management</h2>
        <p className="text-slate-600 mb-4">
          Manage your products efficiently. You can add items manually or use a barcode scanner.
        </p>
        <p className="text-slate-600 mb-4">
          When adding items without a predefined barcode, the system will automatically generate a stable, unique ID based on the product name to ensure consistent offline synchronization.
        </p>
      </section>

      <section id="sales" className="mb-16">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4 border-b pb-2">Sales &amp; Checkout</h2>
        <p className="text-slate-600 mb-4">
          The checkout interface supports dual modes: Cash and M-Pesa.
        </p>
        <ul className="list-disc list-inside space-y-2 text-slate-600 ml-4">
          <li><strong>Cash:</strong> Enter the amount tendered; the system will automatically calculate the required change.</li>
          <li><strong>Receipts:</strong> Cash receipts explicitly detail &apos;Amount Offered&apos; and &apos;Change&apos;. M-Pesa receipts display the masked phone number and M-Pesa code.</li>
        </ul>
      </section>

      <section id="mpesa" className="mb-16">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4 border-b pb-2">M-Pesa Integration</h2>
        <p className="text-slate-600 mb-4">
          Whizpoint supports automated M-Pesa STK Push. When a customer selects M-Pesa, enter their phone number. The POS will trigger a prompt on their phone.
        </p>
        <p className="text-slate-600">
          The system will automatically poll for 45 seconds to verify the transaction. If it fails or times out, you can manually enter the M-Pesa code provided by the customer.
        </p>
      </section>

      <section id="troubleshooting" className="mb-16">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4 border-b pb-2">Troubleshooting</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-slate-900">Receipts printing cut off?</h3>
            <p className="text-slate-600 text-sm">Ensure your printer driver is set to 80mm roll paper, not A4/Letter. The POS template uses a hardcoded width of 70mm to prevent stretching.</p>
          </div>
          <div>
            <h3 className="font-medium text-slate-900">Database locked errors?</h3>
            <p className="text-slate-600 text-sm">The system uses SQLite in WAL mode. Ensure the <code>C:\ProgramData\whiz-pos</code> directory has read/write permissions for the current Windows user.</p>
          </div>
          <div>
            <h3 className="font-medium text-slate-900">Cannot view certain receipts?</h3>
            <p className="text-slate-600 text-sm">For security, cashiers can only view their own receipts. You must log in as an Admin/Manager to view all historical data or delete transactions.</p>
          </div>
        </div>
      </section>
    </>
  );
}
