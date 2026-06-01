'use client';
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, User, CreditCard } from 'lucide-react';

interface CreditCustomer {
  _id: string;
  name: string;
  phone: string;
  email: string;
  totalCredit: number;
  paidAmount: number;
  balance: number;
  transactions: string[];
}

export default function CreditCustomersPage() {
  const [customers, setCustomers] = useState<CreditCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CreditCustomer | null>(null);
  const [paymentCustomer, setPaymentCustomer] = useState<CreditCustomer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [paymentAmount, setPaymentAmount] = useState('');

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch (e) {
      console.error('Failed to fetch customers:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingCustomer ? 'PUT' : 'POST';
      const url = editingCustomer ? `/api/customers/${editingCustomer._id}` : '/api/customers';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingCustomer(null);
        setFormData({ name: '', phone: '', email: '' });
        fetchCustomers();
      }
    } catch (e) {
      console.error('Failed to save customer:', e);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer) return;
    try {
      const res = await fetch(`/api/customers/${paymentCustomer._id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(paymentAmount) })
      });

      if (res.ok) {
        setIsPaymentModalOpen(false);
        setPaymentCustomer(null);
        setPaymentAmount('');
        fetchCustomers();
      }
    } catch (e) {
      console.error('Failed to record payment:', e);
    }
  };

  const handleEdit = (customer: CreditCustomer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      try {
        const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchCustomers();
        }
      } catch (e) {
        console.error('Failed to delete customer:', e);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getBalanceStatus = (balance: number) => {
    if (balance <= 0) return 'bg-green-100 text-green-800';
    if (balance <= 5000) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-slate-500">Loading customers...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Credit Customers</h1>
          <p className="text-slate-600">Manage your credit customers and payments</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      <div className="grid gap-4">
        {customers.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No credit customers yet</h3>
            <p className="text-slate-500 mb-4">Add your first customer to get started</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Add Customer
            </button>
          </div>
        ) : (
          customers.map((customer) => (
            <div key={customer._id} className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{customer.name}</h3>
                    <div className="flex flex-wrap items-center gap-4 mt-1">
                      {customer.phone && <p className="text-sm text-slate-500">{customer.phone}</p>}
                      {customer.email && <p className="text-sm text-slate-500">{customer.email}</p>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Total Credit</p>
                    <p className="text-lg font-semibold text-slate-900">{formatCurrency(customer.totalCredit)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Paid</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(customer.paidAmount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Balance</p>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${getBalanceStatus(customer.balance)}`}>
                      {formatCurrency(customer.balance)}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setPaymentCustomer(customer);
                      setPaymentAmount('');
                      setIsPaymentModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    <CreditCard className="w-4 h-4" />
                    Record Payment
                  </button>
                  <button onClick={() => handleEdit(customer)} className="p-2 text-slate-500 hover:text-slate-700">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(customer._id)} className="p-2 text-red-600 hover:text-red-700">
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
              <h2 className="text-xl font-bold text-slate-900">{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h2>
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                    {editingCustomer ? 'Update Customer' : 'Add Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isPaymentModalOpen && paymentCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Record Payment for {paymentCustomer.name}</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handlePayment} className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Current Balance</span>
                    <span className="font-bold text-slate-900">{formatCurrency(paymentCustomer.balance)}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment Amount</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter payment amount"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
