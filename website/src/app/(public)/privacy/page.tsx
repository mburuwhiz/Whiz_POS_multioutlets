export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6 lg:px-8 prose prose-slate">
      <h1>Privacy Policy</h1>
      <p className="lead">Last updated: {new Date().toLocaleDateString()}</p>

      <h2>1. Introduction</h2>
      <p>Whizpoint Solutions respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Point of Sale system (Whiz POS) and associated website.</p>

      <h2>2. Data Collection</h2>
      <p>We collect data necessary to provide our services, including:</p>
      <ul>
        <li><strong>Business Information:</strong> Name, address, tax details, and configuration settings.</li>
        <li><strong>User Data:</strong> Names, emails, and roles of staff using the system.</li>
        <li><strong>Transaction Data:</strong> Sales records, inventory levels, and customer information.</li>
      </ul>

      <h2>3. Data Usage</h2>
      <p>We use the collected data exclusively to operate, maintain, and improve the Whiz POS system. We do not sell your data to third parties.</p>

      <h2>4. Data Storage & Security</h2>
      <p>Your local POS data is stored on your devices. Data synced to our back-office servers is encrypted in transit and at rest using industry-standard protocols.</p>

      <h2>5. Contact Us</h2>
      <p>If you have questions about this Privacy Policy, please contact us at <strong>sales@pos.whizpoint.app</strong>.</p>
    </div>
  );
}
