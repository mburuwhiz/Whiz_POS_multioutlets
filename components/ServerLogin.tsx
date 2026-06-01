import React, { useState } from 'react';
import { Lock, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { usePosStore } from '../store/posStore';
import { Shield } from 'lucide-react';
import { useNavigate as useReactRouterNavigate } from 'react-router-dom';

function useSafeNavigate() {
  try {
    return useReactRouterNavigate();
  } catch {
    return undefined;
  }
}

interface ServerLoginProps {
  onLoginSuccess: () => void;
}

export default function ServerLogin({ onLoginSuccess }: ServerLoginProps) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useSafeNavigate();

  const users = usePosStore(state => state.users);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const adminUser = users.find(u => 
        (u.role === 'admin' || u.role === 'manager') && u.pin === pin
      );

      if (adminUser) {
        onLoginSuccess();
      } else {
        setError('Invalid PIN. Please try again.');
        setPin('');
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <ShieldAlert className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            Server Login
          </h1>
          <p className="text-slate-500">
            Enter your admin PIN to access the server
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Admin PIN
              </label>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter your PIN"
                  className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all duration-200 text-lg font-mono text-center tracking-widest"
                  autoFocus
                  maxLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  <ShieldAlert className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-5 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              disabled={isLoading || pin.length < 4}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent animate-spin rounded-full mx-auto" />
              ) : (
                'Login to Server'
              )}
            </Button>
          </form>

            <div className="text-center mt-6 text-xs text-slate-400">
              Only admins and managers can access the server
            </div>
        </div>
      </div>

      {navigate && (
        <button
          type="button"
          onClick={() => navigate('/developer')}
          className="fixed bottom-6 left-6 z-50 rounded-full border border-slate-200 bg-white/90 p-3 text-slate-600 shadow-lg backdrop-blur-md transition hover:bg-white hover:text-slate-900"
          title="Developer Mode"
        >
          <Shield className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
