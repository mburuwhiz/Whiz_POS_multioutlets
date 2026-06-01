import React, { useEffect, useState } from 'react';
import { Monitor, Smartphone, CheckCircle2, Sparkles, Zap, Cpu, ShoppingCart } from 'lucide-react';
import { Button } from './ui/button';

interface ModeSelectorProps {
  onSelectMode: (mode: 'server' | 'outlet') => void;
}

export default function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<'server' | 'outlet' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const savedMode = localStorage.getItem('whiz_pos_mode') as 'server' | 'outlet' | null;

  useEffect(() => {
    if (!savedMode || selectedMode || isLoading) return;

    setSelectedMode(savedMode);
    setIsLoading(true);
    const timer = window.setTimeout(() => {
      onSelectMode(savedMode);
    }, 600);

    return () => window.clearTimeout(timer);
  }, [savedMode, selectedMode, isLoading, onSelectMode]);

  const handleSelect = (mode: 'server' | 'outlet') => {
    setSelectedMode(mode);
    setIsLoading(true);
    localStorage.setItem('whiz_pos_mode', mode);
    setTimeout(() => {
      onSelectMode(mode);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-3 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-8">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span className="text-white/90 font-bold text-sm tracking-wider uppercase">Multi-Outlet System</span>
          </div>
          
          <h1 className="text-6xl lg:text-7xl font-black text-white tracking-tight mb-6 drop-shadow-2xl">
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Whiz POS
            </span>
            <span className="text-white/40 text-4xl lg:text-5xl ml-3">8.0.0</span>
          </h1>
          
          <p className="text-2xl text-white/70 max-w-2xl mx-auto font-medium">
            Select which instance you want to launch for development
          </p>
        </div>

        {/* Mode Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Main Server Card */}
          <button
            onClick={() => handleSelect('server')}
            disabled={isLoading}
            className={`group relative p-10 rounded-[3rem] border-3 transition-all duration-500 overflow-hidden ${
              selectedMode === 'server'
                ? 'border-cyan-400 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 shadow-2xl shadow-cyan-500/40 scale-105'
                : 'border-white/10 bg-white/5 hover:border-cyan-400/50 hover:bg-white/10 hover:scale-105 hover:shadow-2xl'
            }`}
          >
            {selectedMode === 'server' && (
              <div className="absolute top-6 right-6">
                <div className="bg-green-500/20 p-2 rounded-full border border-green-400/30">
                  <CheckCircle2 className="w-7 h-7 text-green-400" />
                </div>
              </div>
            )}
            
            <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-8 mx-auto transition-all duration-300 ${
              selectedMode === 'server' 
                ? 'bg-gradient-to-br from-cyan-400 to-blue-600 shadow-xl shadow-cyan-500/50' 
                : 'bg-white/10 group-hover:bg-white/20'
            }`}>
              {selectedMode === 'server' ? (
                <Zap className="w-12 h-12 text-white" />
              ) : (
                <Cpu className={`w-12 h-12 text-white/70 group-hover:text-cyan-400 transition-colors`} />
              )}
            </div>
            
            <h3 className="text-3xl font-black text-white mb-4 tracking-tight">
              Main Server
            </h3>
            
            <p className="text-white/60 text-lg mb-8 leading-relaxed">
              Centralized control with products, users, outlets, and advanced reporting
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-2xl px-4 py-3 text-center">
                <span className="text-cyan-300 font-bold text-lg">3000</span>
                <p className="text-white/50 text-xs uppercase tracking-wider">Port</p>
              </div>
              <div className="bg-white/10 rounded-2xl px-4 py-3 text-center">
                <span className="text-purple-300 font-bold text-lg">Server DB</span>
                <p className="text-white/50 text-xs uppercase tracking-wider">Storage</p>
              </div>
            </div>
          </button>

          {/* Outlet Card */}
          <button
            onClick={() => handleSelect('outlet')}
            disabled={isLoading}
            className={`group relative p-10 rounded-[3rem] border-3 transition-all duration-500 overflow-hidden ${
              selectedMode === 'outlet'
                ? 'border-pink-400 bg-gradient-to-br from-pink-500/20 to-orange-600/20 shadow-2xl shadow-pink-500/40 scale-105'
                : 'border-white/10 bg-white/5 hover:border-pink-400/50 hover:bg-white/10 hover:scale-105 hover:shadow-2xl'
            }`}
          >
            {selectedMode === 'outlet' && (
              <div className="absolute top-6 right-6">
                <div className="bg-green-500/20 p-2 rounded-full border border-green-400/30">
                  <CheckCircle2 className="w-7 h-7 text-green-400" />
                </div>
              </div>
            )}
            
            <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-8 mx-auto transition-all duration-300 ${
              selectedMode === 'outlet' 
                ? 'bg-gradient-to-br from-pink-400 to-orange-600 shadow-xl shadow-pink-500/50' 
                : 'bg-white/10 group-hover:bg-white/20'
            }`}>
              {selectedMode === 'outlet' ? (
                <ShoppingCart className="w-12 h-12 text-white" />
              ) : (
                <Smartphone className={`w-12 h-12 text-white/70 group-hover:text-pink-400 transition-colors`} />
              )}
            </div>
            
            <h3 className="text-3xl font-black text-white mb-4 tracking-tight">
              Checkout Outlet
            </h3>
            
            <p className="text-white/60 text-lg mb-8 leading-relaxed">
              POS terminal for fast in-store sales, receipts, and local operations
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-2xl px-4 py-3 text-center">
                <span className="text-pink-300 font-bold text-lg">3001</span>
                <p className="text-white/50 text-xs uppercase tracking-wider">Port</p>
              </div>
              <div className="bg-white/10 rounded-2xl px-4 py-3 text-center">
                <span className="text-orange-300 font-bold text-lg">Outlet DB</span>
                <p className="text-white/50 text-xs uppercase tracking-wider">Storage</p>
              </div>
            </div>
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center pt-8">
            <div className="inline-flex items-center space-x-4 bg-white/10 backdrop-blur-md px-8 py-4 rounded-3xl border border-white/20">
              <div className="w-10 h-10 border-4 border-white/30 border-t-cyan-400 animate-spin rounded-full" />
              <span className="text-xl font-bold text-white">
                Launching {selectedMode === 'server' ? 'Main Server' : 'Checkout Outlet'}...
              </span>
            </div>
          </div>
        )}

        {/* Saved Mode Note */}
        {savedMode && !isLoading && !selectedMode && (
          <div className="text-center pt-6">
            <p className="text-white/50 text-sm mb-2">
              Last used: <span className="font-bold text-white/80">
                {savedMode === 'server' ? 'Main Server' : 'Checkout Outlet'}
              </span>
            </p>
            <p className="text-white/30 text-xs">
              Select a mode to continue
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
