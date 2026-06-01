'use client';
import { useState, useEffect } from 'react';
import { Eye, EyeOff, RefreshCw, Copy, Check, Save, Building, Phone, Mail, Receipt } from 'lucide-react';

interface BusinessData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  apiKey: string;
}

export default function SettingsPage() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    receiptFooter: '',
    taxRate: '',
    currency: 'KES'
  });

  useEffect(() => {
    async function fetchBusinessData() {
      try {
        const res = await fetch('/api/business');
        if (res.ok) {
          const data = await res.json();
          if (data.business) {
            setBusinessData(data.business);
            setFormData({
              name: data.business.name || '',
              email: data.business.email || '',
              phone: data.business.phone || '',
              address: data.business.address || '',
              receiptFooter: data.business.receiptFooter || '',
              taxRate: data.business.taxRate?.toString() || '',
              currency: data.business.currency || 'KES'
            });
          }
        }
      } catch (e) {
        console.error('Failed to fetch business data:', e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBusinessData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/business', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          receiptFooter: formData.receiptFooter,
          taxRate: parseFloat(formData.taxRate) || 0,
          currency: formData.currency
        })
      });
      if (res.ok) {
        const data = await res.json();
        setBusinessData(data.business);
      }
    } catch (e) {
      console.error('Failed to save settings:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('Are you sure you want to regenerate your API key? This will invalidate the old key!')) {
      return;
    }

    setIsRegenerating(true);
    try {
      const res = await fetch('/api/business/regenerate-key', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        if (businessData) {
          setBusinessData({ ...businessData, apiKey: data.apiKey });
        }
      }
    } catch (e) {
      console.error('Failed to regenerate API key:', e);
      alert('Failed to regenerate API key. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!businessData?.apiKey) return;
    try {
      await navigator.clipboard.writeText(businessData.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const displayApiKey = businessData?.apiKey 
    ? (showApiKey ? businessData.apiKey : (businessData.apiKey.length > 8 ? businessData.apiKey.slice(0, 8) + '*'.repeat(businessData.apiKey.length - 8) : businessData.apiKey))
    : '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent animate-spin rounded-full mx-auto mb-4"></div>
          <p className="text-slate-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage your business settings and API configuration</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-5 h-5" />
            Business Profile
          </h2>
          <p className="text-sm text-slate-500">Update your company information</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Business Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter business name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Currency</label>
              <input
                type="text"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                placeholder="KES"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter business address"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Receipt Footer
            </label>
            <input
              type="text"
              value={formData.receiptFooter}
              onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
              placeholder="Enter receipt footer text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">API Integration</h2>
          <p className="text-sm text-slate-500">Manage your connection to the POS desktop app</p>
        </div>
        <div className="p-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Current API Key</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                readOnly
                value={displayApiKey}
                className="w-full bg-slate-50 px-3 py-2 pr-20 border border-slate-300 rounded-lg text-slate-700 focus:outline-none"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-slate-500 hover:text-slate-700 p-1"
                  title="Copy API key"
                >
                  {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-slate-500 hover:text-slate-700 p-1"
                >
                  {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Keep your API key secure. Regenerate it immediately if you suspect it has been compromised.
          </p>
        </div>
      </div>
    </div>
  );
}
