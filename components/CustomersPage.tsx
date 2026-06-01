import React, { useMemo, useState } from 'react';
import { Search, Users, Plus, Phone, Mail, Edit, Trash2, UserPlus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { usePosStore } from '../store/posStore';

export default function CustomersPage() {
  const creditCustomers = usePosStore(state => state.creditCustomers);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return creditCustomers;
    return creditCustomers.filter((customer: any) => {
      const hay = `${customer.name || ''} ${customer.phone || ''} ${customer.email || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [creditCustomers, searchQuery]);

  return (
    <div className="h-screen flex bg-slate-100">
      {/* Left: Customers List */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 border-b border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-600" />
              <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
            </div>
            <div className="flex gap-3 flex-1 md:flex-none">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button className="bg-purple-600 hover:bg-purple-700" disabled title="Customer creation will be wired next">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </div>
          </div>
        </div>

        {/* Customers List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredCustomers.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Users className="w-24 h-24 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-600">No Customers Yet</h3>
                <p className="text-slate-500 mt-2">Add your first customer to get started</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map((customer: any) => (
                <div
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`bg-white rounded-2xl p-5 border border-slate-200 hover:shadow-lg hover:border-purple-300 cursor-pointer transition-all ${selectedCustomer?.id === customer.id ? 'border-purple-500 shadow-lg' : ''}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                      {customer.name.charAt(0)}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-slate-500 hover:text-purple-600">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{customer.name || 'Unnamed Customer'}</h3>
                  <div className="space-y-1 mt-2">
                    <p className="text-sm text-slate-600 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {customer.phone || '—'}
                    </p>
                    {customer.email && (
                      <p className="text-sm text-slate-600 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {customer.email}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Balance</span>
                      <span className="font-semibold text-emerald-600">KES {Number(customer.balance || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Customer Details */}
      <div className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-xl">
        {selectedCustomer ? (
          <>
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
                  {(selectedCustomer.name || '?').charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedCustomer.name || 'Unnamed Customer'}</h2>
                  <p className="text-sm text-slate-500">Credit customer record</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Contact Info */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Contact Information</h3>
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-slate-500">Phone</p>
                      <p className="font-semibold text-slate-800">{selectedCustomer.phone || '—'}</p>
                    </div>
                  </div>
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-xs text-slate-500">Email</p>
                        <p className="font-semibold text-slate-800">{selectedCustomer.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Account */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Account</h3>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                  <div className="text-center">
                    <p className="text-sm text-purple-700">Balance</p>
                    <p className="text-3xl font-black text-purple-900 mt-1">KES {Number(selectedCustomer.balance || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Users className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600">Select a Customer</h3>
            <p className="text-slate-400 mt-2">Click on a customer from the list to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
