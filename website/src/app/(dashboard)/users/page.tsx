'use client';
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, User, Shield, Lock, CheckCircle2, XCircle } from 'lucide-react';

interface POSUser {
  _id: string;
  name: string;
  username: string;
  email?: string;
  role: 'admin' | 'cashier' | 'manager';
  isActive: boolean;
  passwordChangeRequired?: boolean;
  pin?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<POSUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<POSUser | null>(null);
  const [resettingUser, setResettingUser] = useState<POSUser | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    role: 'cashier' as 'admin' | 'cashier' | 'manager',
    pin: '',
    isActive: true
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingUser ? 'PUT' : 'POST';
      const url = editingUser ? `/api/users/${editingUser._id}` : '/api/users';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingUser(null);
        setFormData({ name: '', username: '', email: '', role: 'cashier', pin: '', isActive: true });
        fetchUsers();
      }
    } catch (e) {
      console.error('Failed to save user:', e);
    }
  };

  const handleEdit = (user: POSUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email || '',
      role: user.role,
      pin: '',
      isActive: user.isActive
    });
    setIsModalOpen(true);
  };

  const handleResetPassword = async (user: POSUser) => {
    setResettingUser(user);
    setTempPassword(null);
    setIsResetModalOpen(true);
  };

  const confirmResetPassword = async () => {
    if (!resettingUser) return;
    setIsResetting(true);
    try {
      const res = await fetch(`/api/users/${resettingUser._id}/reset-password`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setTempPassword(data.tempPassword);
        fetchUsers();
      }
    } catch (e) {
      console.error('Failed to reset password:', e);
    } finally {
      setIsResetting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchUsers();
        }
      } catch (e) {
        console.error('Failed to delete user:', e);
      }
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Users & Permissions</h2>
          <p className="text-slate-500">Manage your POS users and their permissions</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add User
        </button>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          Array(3).fill(0).map((_, index) => (
            <div key={index} className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-full animate-pulse" />
                  <div className="space-y-2">
                    <div className="w-32 h-5 bg-slate-100 rounded animate-pulse" />
                    <div className="w-20 h-4 bg-slate-100 rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-5 bg-slate-100 rounded-full animate-pulse" />
                  <div className="w-16 h-5 bg-slate-100 rounded-full animate-pulse" />
                  <div className="w-32 h-8 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          ))
        ) : (
          users.map((user) => (
            <div key={user._id} className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{user.name}</h3>
                    <p className="text-sm text-slate-500">@{user.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${getRoleColor(user.role)}`}>
                    <Shield className="w-3 h-3" />
                    {user.role}
                  </span>
                  {user.isActive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                      <XCircle className="w-3 h-3" />
                      Inactive
                    </span>
                  )}
                  {user.passwordChangeRequired && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                      <Lock className="w-3 h-3" />
                      Password Change Required
                    </span>
                  )}
                  <button 
                    onClick={() => handleResetPassword(user)} 
                    className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    <Lock className="w-4 h-4" />
                    Reset Password
                  </button>
                  <button onClick={() => handleEdit(user)} className="p-2 text-slate-500 hover:text-slate-700">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(user._id)} className="p-2 text-red-600 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">{editingUser ? 'Edit User' : 'Add User'}</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
                  <input
                    required
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Enter username"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email (for password resets)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    PIN {editingUser && '(leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    placeholder="Enter 4-digit PIN"
                    maxLength={4}
                    required={!editingUser}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="text-sm text-slate-700">Active</label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingUser ? 'Update User' : 'Add User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isResetModalOpen && resettingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Reset Password for {resettingUser.name}</h2>
            </div>
            <div className="p-6">
              {tempPassword ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Password Reset Successfully!</h3>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm text-slate-600 mb-2">Temporary Password:</p>
                    <p className="text-2xl font-mono font-bold text-blue-600">{tempPassword}</p>
                  </div>
                  <p className="text-sm text-slate-500">
                    {resettingUser.email 
                      ? 'A copy of this password has been sent to the user\'s email.' 
                      : 'Please provide this password to the user.'}
                  </p>
                  <button
                    onClick={() => setIsResetModalOpen(false)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-slate-600">
                    Are you sure you want to reset the password for <strong>{resettingUser.name}</strong>?
                  </p>
                  <p className="text-sm text-slate-500">
                    A temporary password will be generated, and the user will be required to change it on their next login.
                  </p>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsResetModalOpen(false)}
                      className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmResetPassword}
                      disabled={isResetting}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isResetting ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
