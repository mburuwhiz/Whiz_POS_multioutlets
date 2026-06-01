import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from './ui/modal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { usePosStore } from '../store/posStore';
import { logAudit } from '../lib/auditLog';

const PERMISSION_OPTIONS = [
  { id: 'products', label: 'Manage products' },
  { id: 'sales', label: 'View sales' },
  { id: 'reports', label: 'View reports' },
  { id: 'outlets', label: 'Manage outlets' },
  { id: 'users', label: 'Manage users' },
  { id: 'settings', label: 'Change settings' },
];

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
}

export default function UserModal({ isOpen, onClose, user }: UserModalProps) {
  const addUser = usePosStore(state => state.addUser);
  const updateUser = usePosStore(state => state.updateUser);
  const [approvedOutlets, setApprovedOutlets] = useState<{ id: string; name: string }[]>([]);
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'cashier' as 'admin' | 'manager' | 'cashier',
    pin: '',
    isActive: true,
    permissions: [] as string[],
    assignedOutlets: [] as string[]
  });

  useEffect(() => {
    const loadOutlets = async () => {
      if (window.electron?.getApprovedOutlets) {
        const outlets = await window.electron.getApprovedOutlets();
        setApprovedOutlets((outlets || []).map((o: any) => ({ id: o.id, name: o.name })));
      }
    };
    if (isOpen) loadOutlets();
  }, [isOpen]);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'cashier',
        pin: user.pin || '',
        isActive: user.isActive ?? user.active !== false,
        permissions: user.permissions || [],
        assignedOutlets: user.assignedOutlets || []
      });
    } else {
      setForm({
        name: '',
        email: '',
        phone: '',
        role: 'cashier',
        pin: '',
        isActive: true,
        permissions: [],
        assignedOutlets: []
      });
    }
  }, [user, isOpen]);

  const togglePermission = (id: string) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(id)
        ? prev.permissions.filter(p => p !== id)
        : [...prev.permissions, id]
    }));
  };

  const toggleOutlet = (outletId: string) => {
    setForm(prev => ({
      ...prev,
      assignedOutlets: prev.assignedOutlets.includes(outletId)
        ? prev.assignedOutlets.filter(id => id !== outletId)
        : [...prev.assignedOutlets, outletId]
    }));
  };

  const handleSave = () => {
    if (!form.name) return;
    
    if (user) {
      updateUser(user.id, form);
      logAudit('user.updated', { userId: user.id, name: form.name });
    } else {
      addUser({
        id: `USER${Date.now()}`,
        ...form,
        createdAt: new Date().toISOString()
      });
      logAudit('user.created', { name: form.name, role: form.role });
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Edit User' : 'Add User'}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Full Name *</label>
            <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
            <Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
            <Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Role *</label>
            <select
              value={form.role}
              onChange={(e) => setForm({...form, role: e.target.value as any})}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            >
              <option value="cashier">Cashier</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">PIN *</label>
          <Input type="password" value={form.pin} onChange={(e) => setForm({...form, pin: e.target.value})} maxLength={4} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Permissions</label>
          <div className="grid grid-cols-2 gap-2">
            {PERMISSION_OPTIONS.map(p => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.permissions.includes(p.id)}
                  onChange={() => togglePermission(p.id)}
                />
                {p.label}
              </label>
            ))}
          </div>
        </div>

        {approvedOutlets.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Assigned Outlets</label>
            <div className="flex flex-wrap gap-2">
              {approvedOutlets.map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggleOutlet(o.id)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    form.assignedOutlets.includes(o.id)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {o.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="userActive"
            checked={form.isActive}
            onChange={(e) => setForm({...form, isActive: e.target.checked})}
          />
          <label htmlFor="userActive" className="text-sm text-slate-700">User is active</label>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
          <Plus className="w-4 h-4 mr-2" />
          {user ? 'Update User' : 'Add User'}
        </Button>
      </div>
    </Modal>
  );
}
