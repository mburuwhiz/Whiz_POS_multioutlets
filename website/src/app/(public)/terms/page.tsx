export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6 lg:px-8 prose prose-slate">
      <h1>Terms of Service</h1>
      <p className="lead">Last updated: {new Date().toLocaleDateString()}</p>

      <h2>1. Acceptance of Terms</h2>
      <p>By accessing or using Whiz POS (Service), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Service.</p>

      <h2>2. License and Usage</h2>
      <p>We grant you a non-exclusive, non-transferable license to use the Whiz POS system for your business operations according to your subscription plan.</p>

      <h2>3. User Responsibilities</h2>
      <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>

      <h2>4. Data Ownership</h2>
      <p>You retain all rights to the data you enter into the system. You grant us a license to host and process this data solely to provide the Service to you.</p>

      <h2>5. Limitation of Liability</h2>
      <p>Whizpoint Solutions shall not be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of the Service.</p>

      <h2>6. Contact</h2>
      <p>For support or legal inquiries, please contact us at <strong>sales@pos.whizpoint.app</strong>.</p>
    </div>
  );
}
