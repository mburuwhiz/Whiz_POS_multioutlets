'use client';
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MoreVertical, Building2, CheckCircle2, XCircle, X, Save, KeyRound, Mail } from 'lucide-react';

interface Business {
  id: string;
  name: string;
  emailPrefix: string;
  email: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  apiKey: string;
  dataFolder: string;
  oneTimePassword?: string;
  mustChangePassword?: boolean;
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [newBusiness, setNewBusiness] = useState<Business | null>(null);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [resettingBusiness, setResettingBusiness] = useState<Business | null>(null);
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    emailPrefix: '',
    email: '',
    status: 'Active' as 'Active' | 'Inactive'
  });

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      const res = await fetch('/api/admin/businesses');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setBusinesses(data.businesses || []);
    } catch (err) {
      console.error('Failed to fetch businesses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to create');
      const data = await res.json();
      setNewBusiness(data.business);
      setIsSuccessModalOpen(true);
      await fetchBusinesses();
      setIsAddModalOpen(false);
      setFormData({ name: '', emailPrefix: '', email: '', status: 'Active' });
    } catch (err) {
      console.error('Failed to add business:', err);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBusiness) return;
    try {
      const res = await fetch('/api/admin/businesses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, id: editingBusiness.id })
      });
      if (!res.ok) throw new Error('Failed to update');
      await fetchBusinesses();
      setIsEditModalOpen(false);
      setEditingBusiness(null);
    } catch (err) {
      console.error('Failed to edit business:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this business?')) return;
    try {
      const res = await fetch('/api/admin/businesses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchBusinesses();
    } catch (err) {
      console.error('Failed to delete business:', err);
    }
  };

  const openEditModal = (business: Business) => {
    setEditingBusiness(business);
    setFormData({
      name: business.name,
      emailPrefix: business.emailPrefix,
      email: business.email,
      status: business.status
    });
    setIsEditModalOpen(true);
  };

  const handleResetPassword = async (business: Business) => {
    try {
      const res = await fetch(`/api/admin/businesses/${business.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to reset password');
      const data = await res.json();
      setResettingBusiness(business);
      setResetPassword(data.tempPassword);
      setIsResetPasswordModalOpen(true);
      await fetchBusinesses();
    } catch (err) {
      console.error('Failed to reset password:', err);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Businesses Management</h1>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Business
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading businesses...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 mb-8">
          {businesses.map((business) => (
            <div key={business.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{business.name}</h3>
                    <p className="text-sm text-slate-500">{business.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    business.status === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {business.status === 'Active' ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {business.status}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {business.status}
                      </span>
                    )}
                  </span>
                  {business.mustChangePassword && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Password Change Required
                    </span>
                  )}
                  <button className="p-2 text-slate-400 hover:text-slate-600">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">API Key</p>
                  <p className="text-sm font-mono text-slate-700">{business.apiKey}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Email Prefix</p>
                  <p className="text-sm font-medium text-slate-700">{business.emailPrefix}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Data Folder</p>
                  <p className="text-sm font-medium text-slate-700">{business.dataFolder}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Created</p>
                  <p className="text-sm text-slate-600">
                    {new Date(business.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => openEditModal(business)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button 
                  onClick={() => handleResetPassword(business)}
                  className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  Reset Password
                </button>
                <button 
                  onClick={() => handleDelete(business.id)}
                  className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
          {businesses.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No businesses yet. Add your first business to get started!
            </div>
          )}
        </div>
      )}

      {/* Add Business Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Add New Business</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter business name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Prefix</label>
                <input
                  type="text"
                  required
                  value={formData.emailPrefix}
                  onChange={(e) => setFormData({ ...formData, emailPrefix: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., main"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Owner's Email (for login credentials)</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., owner@email.com"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Business
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {isSuccessModalOpen && newBusiness && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">Business Created Successfully!</h3>
                <button 
                  onClick={() => setIsSuccessModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-green-800">Welcome Email Sent!</h4>
                    <p className="text-green-700">A welcome email with login details has been sent to {newBusiness.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-slate-900">Business Details</h4>
                
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Business Name</p>
                      <p className="text-sm font-semibold text-slate-900">{newBusiness.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Business Email</p>
                      <p className="text-sm font-semibold text-slate-900">{newBusiness.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Username 1</p>
                      <p className="text-sm font-mono text-slate-700">{newBusiness.emailPrefix}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Username 2</p>
                      <p className="text-sm font-mono text-slate-700">{newBusiness.emailPrefix}@pos.whizpoint.app</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">One-Time Password</p>
                      <p className="text-2xl font-bold text-blue-600 font-mono">{newBusiness.oneTimePassword}</p>
                      <p className="text-xs text-yellow-700 mt-1">This password is valid for first login only - user must change it immediately!</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setIsSuccessModalOpen(false)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Business Modal */}
      {isEditModalOpen && editingBusiness && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Edit Business</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Prefix</label>
                <input
                  type="text"
                  required
                  value={formData.emailPrefix}
                  onChange={(e) => setFormData({ ...formData, emailPrefix: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Business Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Update Business
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetPasswordModalOpen && resettingBusiness && resetPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">Password Reset Successfully!</h3>
                <button 
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-green-800">Password Reset Email Sent!</h4>
                    <p className="text-green-700">A password reset email has been sent to {resettingBusiness.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-slate-900">New Login Details</h4>
                
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Business Name</p>
                      <p className="text-sm font-semibold text-slate-900">{resettingBusiness.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Business Email</p>
                      <p className="text-sm font-semibold text-slate-900">{resettingBusiness.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Username 1</p>
                      <p className="text-sm font-mono text-slate-700">{resettingBusiness.emailPrefix}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Username 2</p>
                      <p className="text-sm font-mono text-slate-700">{resettingBusiness.emailPrefix}@pos.whizpoint.app</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">New Temporary Password</p>
                      <p className="text-2xl font-bold text-blue-600 font-mono">{resetPassword}</p>
                      <p className="text-xs text-yellow-700 mt-1">This password is valid for first login only - user must change it immediately!</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setIsResetPasswordModalOpen(false)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
