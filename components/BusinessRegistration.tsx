import React, { useState, useEffect } from 'react';
import { usePosStore } from '../store/posStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, User, Mail, Phone, MapPin,
  Tag, CreditCard, Lock, CheckCircle2,
  ChevronRight, ChevronLeft, Printer, LogIn,
  Sparkles, PartyPopper, HardDrive, Database,
  Navigation, Clock, Monitor, Smartphone
} from 'lucide-react';
import Swal from 'sweetalert2';
import { soundManager } from '../lib/soundUtils';
import setupBg from '../assets/setup_install_bg.png';
import type { BusinessSetup } from '../types';

const steps = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'modeSelection', title: 'App Mode' },
  { id: 'businessName', title: 'Business Name' },
  { id: 'ownerName', title: 'Owner Name' },
  { id: 'contact', title: 'Contact Info' },
  { id: 'address', title: 'Business Address' },
  { id: 'servedBy', title: 'Served By' },
  { id: 'mpesa', title: 'M-Pesa Setup' },
  { id: 'pin', title: '4-digit PIN' },
  { id: 'completion', title: 'Completion' }
];

export default function BusinessRegistration() {
  const [currentStep, setCurrentStep] = useState(0);
  const { finishSetup, businessSetup } = usePosStore();

  const [discoveredServers, setDiscoveredServers] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState<any>(null);

  useEffect(() => {
    if (window.electron && window.electron.onDiscoveredServers) {
        window.electron.onDiscoveredServers((event, servers) => {
            setDiscoveredServers(servers);
        });
        window.electron.startDiscovery();
    }
  }, []);

  const [formData, setFormData] = useState({
    mode: 'server' as 'server' | 'outlet',
    outletName: '',
    businessName: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    servedByLabel: 'Cashier',
    mpesaPaybill: '',
    mpesaTill: '',
    mpesaAccountNumber: '',
    pin: '',
    confirmPin: '',
    apiUrl: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const currentInstancePort = Number(import.meta.env.VITE_WHIZ_POS_PORT || 3001);


  const handleSearchData = async () => {
    if (window.electron && window.electron.readData) {
      const result = await window.electron.readData('business-setup.json');
      const existingSetup = result?.success ? result.data : null;

      if (existingSetup?.isSetup) {
        Swal.fire({
          title: 'Data Found!',
          text: 'Business data has been found successfully. The application will now restart to apply it.',
          icon: 'success',
          confirmButtonText: 'Restart Now',
          confirmButtonColor: '#3085d6',
          background: '#1e293b',
          color: '#ffffff'
        }).then(() => {
          window.location.reload();
        });
      } else {
        Swal.fire({
          title: 'No Data Found',
          text: 'Sorry, no valid business data was found. Please proceed to create an account.',
          icon: 'error',
          confirmButtonText: 'Create Account',
          confirmButtonColor: '#d33',
          background: '#1e293b',
          color: '#ffffff'
        }).then(() => {
          setCurrentStep(1);
        });
      }
    } else {
        Swal.fire({
          title: 'Error',
          text: 'Unable to access local storage mechanism.',
          icon: 'error',
          background: '#1e293b',
          color: '#ffffff'
        });
    }
  };

  const handleNext = async () => {
    if (formData.mode === 'outlet' && steps[currentStep].id === 'modeSelection') {
      // For outlets, skip all business steps and go straight to handleSubmit
      await handleSubmit();
      return;
    }
    
    if (currentStep < steps.length - 1) {
      soundManager.playPop();
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      soundManager.playClick();
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitWithApiUrl = async (apiUrl: string) => {
    setIsSubmitting(true);
    soundManager.playClick();

    const businessData: Omit<BusinessSetup, 'createdAt'> = {
      businessName: '',
      address: '',
      phone: '',
      email: '',
      servedByLabel: 'Cashier',
      mpesaPaybill: '',
      mpesaTill: '',
      mpesaAccountNumber: '',
      tax: 0,
      subtotal: 0,
      isSetup: true,
      isLoggedIn: false,
      printerType: 'thermal' as const,
      mode: 'outlet',
      outletName: formData.outletName,
      status: 'pending',
      outletId: undefined as string | undefined,
      rejectionReason: undefined as string | undefined,
      apiUrl: apiUrl,
    };

    try {
      const stableOutletId = crypto.randomUUID();
      businessData.outletId = stableOutletId;

      // Handshake (stable outletId prevents re-registration ID drift)
      const response = await fetch(`${apiUrl}/api/register-outlet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            outletName: formData.outletName,
            outletId: stableOutletId,
            port: currentInstancePort
          })
      });
      const result = await response.json();
      businessData.status = result.status || 'pending';
      businessData.outletId = result.outletId;
      businessData.rejectionReason = result.reason;
      
      // For outlets, just save business setup without admin user
      const { saveBusinessSetup } = usePosStore.getState();
      saveBusinessSetup(businessData);
      soundManager.playSuccess();
      setIsFinished(true);
      // Don't change step, because pending screen is shown via businessSetup.status check in renderStep()
    } catch (error) {
      console.error('Setup failed:', error);
      soundManager.playError();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (formData.mode !== 'outlet') {
      if (formData.pin !== formData.confirmPin) {
        soundManager.playError();
        alert("PINs do not match!");
        return;
      }
      if (formData.pin.length !== 4) {
        soundManager.playError();
        alert("PIN must be exactly 4 digits!");
        return;
      }
    }

    setIsSubmitting(true);
    soundManager.playClick();

    const businessData: Omit<BusinessSetup, 'createdAt'> = {
      businessName: formData.businessName || '',
      address: formData.address || '',
      phone: formData.phone || '',
      email: formData.email || '',
      servedByLabel: formData.servedByLabel || 'Cashier',
      mpesaPaybill: formData.mpesaPaybill || '',
      mpesaTill: formData.mpesaTill || '',
      mpesaAccountNumber: formData.mpesaAccountNumber || '',
      tax: 0,
      subtotal: 0,
      isSetup: true,
      isLoggedIn: false,
      printerType: 'thermal' as const,
      mode: formData.mode,
      outletName: formData.mode === 'outlet' ? formData.outletName : 'Main Server',
      status: formData.mode === 'outlet' ? 'pending' : 'approved',
      outletId: undefined as string | undefined,
      rejectionReason: undefined as string | undefined,
      apiUrl: formData.mode === 'outlet' ? formData.apiUrl : '',
    };

    const adminUser = formData.mode !== 'outlet' ? {
      id: `USR${Date.now()}`,
      name: formData.ownerName,
      pin: formData.pin,
      role: 'admin' as const,
    } : undefined;

    try {
      if (formData.mode === 'outlet') {
        const stableOutletId = crypto.randomUUID();
        businessData.outletId = stableOutletId;

        // Handshake (stable outletId prevents re-registration ID drift)
        const response = await fetch(`${formData.apiUrl}/api/register-outlet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              outletName: formData.outletName,
              outletId: stableOutletId,
              port: currentInstancePort
            })
        });
        const result = await response.json();
        businessData.status = result.status || 'pending';
        businessData.outletId = result.outletId;
        businessData.rejectionReason = result.reason;
        
        // For outlets, just save business setup without admin user
        const { saveBusinessSetup } = usePosStore.getState();
        saveBusinessSetup(businessData);
        soundManager.playSuccess();
        setIsFinished(true);
        // Don't change step, because pending screen is shown via businessSetup.status check in renderStep()
      } else {
        await finishSetup(businessData, adminUser!);
        soundManager.playSuccess();
        setIsFinished(true);
        setCurrentStep(steps.length - 1);
      }
    } catch (error) {
      console.error('Setup failed:', error);
      soundManager.playError();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!window.electron) {
      alert('Restore is only supported in Desktop mode');
      return;
    }

    if (!window.confirm('WARNING: Restoring will overwrite all current local data with the backup archive. Are you sure you want to proceed?')) {
      return;
    }

    setIsSubmitting(true);
    soundManager.playClick();

    try {
      const result = await window.electron.restoreData();
      if (result.success) {
        soundManager.playSuccess();
        alert('Restore successful. Restarting application...');
        // Clear persisted zustand state to force reload from restored files
        localStorage.removeItem('pos-storage');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        if (result.error !== 'User cancelled restore') {
          soundManager.playError();
          alert(result.error);
        }
      }
    } catch (e: any) {
      soundManager.playError();
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 }
  };

  const renderStep = () => {
    if (businessSetup?.status === 'pending') {
      return (
        <motion.div key="pending" variants={stepVariants} initial="enter" animate="center" exit="exit" className="text-center space-y-6">
          <div className="w-24 h-24 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
            <Clock className="w-12 h-12 text-orange-400" />
          </div>
          <h1 className="text-4xl font-bold text-white">Pending Server Approval...</h1>
          <p className="text-xl text-blue-100">Waiting for the Main Server to approve this Outlet: <span className="font-bold text-white">{businessSetup.outletName}</span></p>
          <div className="bg-white/10 rounded-2xl p-6 mt-8 border border-white/20 backdrop-blur-md">
            <p className="text-white/60 text-sm">Once approved, this terminal will automatically sync and take you to the login screen.</p>
          </div>
        </motion.div>
      );
    }

    switch (steps[currentStep].id) {
      case 'welcome':
        return (
          <motion.div key="welcome" variants={stepVariants} initial="enter" animate="center" exit="exit" className="text-center space-y-6">
            <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
              <Sparkles className="w-12 h-12 text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold text-white">Hi, Thank you for choosing Whiz Pos</h1>
            <p className="text-xl text-blue-100">Let's get you started. We are so excited to help you grow your business today. 👋</p>
            <div className="flex flex-col gap-4 mt-8 w-full max-w-md mx-auto">
              <button
                onClick={handleRestoreBackup}
                disabled={isSubmitting}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white px-6 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div> : <HardDrive className="w-6 h-6" />}
                1. Restore Backup
              </button>

              <button
                onClick={handleNext}
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <Navigation className="w-6 h-6" />
                2. Begin Registration
              </button>
            </div>
          </motion.div>
        );

      case 'modeSelection':
        return (
          <motion.div key="modeSelection" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
            <div className="flex items-center space-x-4 mb-8">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Monitor className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-3xl font-bold text-white">Choose App Mode</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleInputChange('mode', 'server')}
                className={`p-6 rounded-2xl border-2 transition-all text-left ${
                  formData.mode === 'server'
                  ? 'border-blue-500 bg-blue-500/20 text-white'
                  : 'border-white/10 bg-white/5 text-white/60 hover:border-white/30'
                }`}
              >
                <Database className="w-8 h-8 mb-4" />
                <div className="text-xl font-bold mb-2">Main Server (Hub)</div>
                <p className="text-sm opacity-80">Central management, inventory orchestration, and staff control.</p>
              </button>

              <button
                onClick={() => handleInputChange('mode', 'outlet')}
                className={`p-6 rounded-2xl border-2 transition-all text-left ${
                  formData.mode === 'outlet'
                  ? 'border-blue-500 bg-blue-500/20 text-white'
                  : 'border-white/10 bg-white/5 text-white/60 hover:border-white/30'
                }`}
              >
                <Smartphone className="w-8 h-8 mb-4" />
                <div className="text-xl font-bold mb-2">Outlet Terminal</div>
                <p className="text-sm opacity-80">Sales execution terminal. Simplified interface for cashiers.</p>
              </button>
            </div>

            {formData.mode === 'outlet' && (
              <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">Outlet Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Westlands Branch"
                    value={formData.outletName}
                    onChange={(e) => handleInputChange('outletName', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">Select Server</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {discoveredServers.length === 0 ? (
                      <p className="text-sm text-white/40 italic">Searching for servers...</p>
                    ) : (
                      discoveredServers.map(server => (
                        <button
                          key={server.ip}
                          onClick={() => setSelectedServer(server)}
                          className={`w-full p-4 rounded-xl border text-left transition-all ${
                            selectedServer?.ip === server.ip
                            ? 'border-blue-500 bg-blue-500/20 text-white'
                            : 'border-white/10 bg-white/5 text-white/60 hover:border-white/30'
                          }`}
                        >
                          <div className="font-bold">{server.name}</div>
                          <div className="text-xs opacity-60">{server.ip}:{server.port}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-sm font-medium text-white/60 mb-2">Or enter Server IP/URL manually</label>
                  <input
                    type="text"
                    placeholder="e.g. http://192.168.1.10:3000"
                    value={formData.apiUrl}
                    onChange={(e) => handleInputChange('apiUrl', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-md"
                  />
                  <p className="text-xs text-white/40 mt-2">
                    Tip: If discovery doesn’t find your server, enter the server’s IP and port (default 3000).
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-8">
              <button onClick={handleBack} className="text-white/60 hover:text-white font-medium flex items-center space-x-1">
                <ChevronLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <button
                disabled={formData.mode === 'outlet' && (!formData.outletName || (!selectedServer && !formData.apiUrl))}
                onClick={async () => {
                  let apiUrlToUse = formData.apiUrl;
                  if (formData.mode === 'outlet' && selectedServer) {
                    apiUrlToUse = `http://${selectedServer.ip}:${selectedServer.port}`;
                    setFormData(prev => ({
                      ...prev,
                      apiUrl: apiUrlToUse
                    }));
                  }
                  
                  if (formData.mode === 'outlet') {
                    // Call handleSubmit directly with the correct apiUrl
                    await handleSubmitWithApiUrl(apiUrlToUse);
                  } else {
                    handleNext();
                  }
                }}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-8 py-4 rounded-xl font-bold flex items-center space-x-2 transition-all"
              >
                <span>Continue</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        );

      case 'businessName':
        return (
          <motion.div key="bizName" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
            <div className="flex items-center space-x-4 mb-8">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Building2 className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-3xl font-bold text-white">Business Name</h2>
            </div>
            <p className="text-lg text-blue-100 mb-6">Every great venture needs a name. What should we call your amazing business? 🏢</p>
            <input
              autoFocus
              type="text"
              placeholder="Enter your business name"
              value={formData.businessName}
              onChange={(e) => handleInputChange('businessName', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && formData.businessName && handleNext()}
              className="w-full bg-white/10 border border-white/20 rounded-2xl p-6 text-2xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-md"
            />
            <div className="flex justify-end pt-8">
              <button
                disabled={!formData.businessName}
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-8 py-4 rounded-xl font-bold flex items-center space-x-2 transition-all"
              >
                <span>Continue</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        );

      case 'ownerName':
        return (
          <motion.div key="ownerName" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
            <div className="flex items-center space-x-4 mb-8">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <User className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-3xl font-bold text-white">Owner Name</h2>
            </div>
            <p className="text-lg text-blue-100 mb-6">It is time to meet the boss. Please enter your full name so we know who is running the show. 👑</p>
            <input
              autoFocus
              type="text"
              placeholder="Business owner name"
              value={formData.ownerName}
              onChange={(e) => handleInputChange('ownerName', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && formData.ownerName && handleNext()}
              className="w-full bg-white/10 border border-white/20 rounded-2xl p-6 text-2xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 backdrop-blur-md"
            />
            <div className="flex justify-between pt-8">
              <button onClick={handleBack} className="text-white/60 hover:text-white font-medium flex items-center space-x-1">
                <ChevronLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <button
                disabled={!formData.ownerName}
                onClick={handleNext}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-8 py-4 rounded-xl font-bold flex items-center space-x-2 transition-all"
              >
                <span>Looks Good</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        );

      case 'contact':
        return (
          <motion.div key="contact" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
            <div className="flex items-center space-x-4 mb-8">
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <Mail className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-bold text-white">Contact Info</h2>
            </div>
            <p className="text-lg text-blue-100 mb-6">How can we stay in touch? Please provide your email address and phone number. 📱</p>
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-white/40" />
                <input
                  type="email"
                  placeholder="business@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl p-6 pl-14 text-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 backdrop-blur-md"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-white/40" />
                <input
                  type="tel"
                  placeholder="+254 XXX XXX XXX"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl p-6 pl-14 text-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 backdrop-blur-md"
                />
              </div>
            </div>
            <div className="flex justify-between pt-8">
              <button onClick={handleBack} className="text-white/60 hover:text-white font-medium flex items-center space-x-1">
                <ChevronLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <button
                disabled={!formData.email || !formData.phone}
                onClick={handleNext}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-8 py-4 rounded-xl font-bold flex items-center space-x-2 transition-all"
              >
                <span>Save Contact</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        );

      case 'address':
        return (
          <motion.div key="address" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
            <div className="flex items-center space-x-4 mb-8">
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <MapPin className="w-8 h-8 text-orange-400" />
              </div>
              <h2 className="text-3xl font-bold text-white">Business Address</h2>
            </div>
            <p className="text-lg text-blue-100 mb-6">Where is the magic happening? Enter your address to help us put you on the map. 🗺️</p>
            <textarea
              autoFocus
              placeholder="123 Business Street, City, Country"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={3}
              className="w-full bg-white/10 border border-white/20 rounded-2xl p-6 text-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500 backdrop-blur-md resize-none"
            />
            <div className="flex justify-between pt-8">
              <button onClick={handleBack} className="text-white/60 hover:text-white font-medium flex items-center space-x-1">
                <ChevronLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <button
                disabled={!formData.address}
                onClick={handleNext}
                className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white px-8 py-4 rounded-xl font-bold flex items-center space-x-2 transition-all"
              >
                <span>Set Location</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        );

      case 'servedBy':
        return (
          <motion.div key="servedBy" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
            <div className="flex items-center space-x-4 mb-8">
              <div className="p-3 bg-pink-500/20 rounded-xl">
                <Tag className="w-8 h-8 text-pink-400" />
              </div>
              <h2 className="text-3xl font-bold text-white">Served By</h2>
            </div>
            <p className="text-lg text-blue-100 mb-6">Who is serving your customers? Enter the "Served By" Label name that will appear on every receipt. 🏷️</p>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Cashier, Server, Budtender"
              value={formData.servedByLabel}
              onChange={(e) => handleInputChange('servedByLabel', e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-2xl p-6 text-2xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500 backdrop-blur-md"
            />
            <div className="flex justify-between pt-8">
              <button onClick={handleBack} className="text-white/60 hover:text-white font-medium flex items-center space-x-1">
                <ChevronLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <button
                disabled={!formData.servedByLabel}
                onClick={handleNext}
                className="bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white px-8 py-4 rounded-xl font-bold flex items-center space-x-2 transition-all"
              >
                <span>Set Label</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        );

      case 'mpesa':
        return (
          <motion.div key="mpesa" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-6">
            <div className="flex items-center space-x-4 mb-8">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <CreditCard className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-3xl font-bold text-white">M-Pesa Setup</h2>
            </div>
            <p className="text-lg text-blue-100 mb-6">Let us get you paid. Please enter your Paybill, and Account Number, or your Safaricom Till Number. 💰</p>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Paybill Number"
                value={formData.mpesaPaybill}
                onChange={(e) => handleInputChange('mpesaPaybill', e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-2xl p-5 text-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-green-500 backdrop-blur-md"
              />
              <input
                type="text"
                placeholder="Till Number"
                value={formData.mpesaTill}
                onChange={(e) => handleInputChange('mpesaTill', e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-2xl p-5 text-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-green-500 backdrop-blur-md"
              />
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Account Number (If using Paybill)"
                  value={formData.mpesaAccountNumber}
                  onChange={(e) => handleInputChange('mpesaAccountNumber', e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl p-5 text-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-green-500 backdrop-blur-md"
                />
              </div>
            </div>
            <div className="flex justify-between pt-8">
              <button onClick={handleBack} className="text-white/60 hover:text-white font-medium flex items-center space-x-1">
                <ChevronLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <button
                onClick={handleNext}
                className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-xl font-bold flex items-center space-x-2 transition-all"
              >
                <span>Save Payments</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        );

      case 'pin':
        return (
          <motion.div key="pin" variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-6 text-center">
            <div className="w-20 h-20 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-cyan-400" />
            </div>
            <h2 className="text-3xl font-bold text-white">4-digit PIN</h2>
            <p className="text-lg text-blue-100 mb-6">Safety first. Choose a secure code to keep your business data locked up tight. 🔐</p>

            <div className="flex flex-col items-center space-y-6">
              <div className="space-y-2">
                <label className="text-sm text-white/60">Choose your PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={formData.pin}
                  onChange={(e) => handleInputChange('pin', e.target.value.replace(/\D/g, ''))}
                  className="w-48 bg-white/10 border border-white/20 rounded-2xl p-4 text-center text-4xl tracking-[1em] text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 backdrop-blur-md"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/60">Confirm your PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={formData.confirmPin}
                  onChange={(e) => handleInputChange('confirmPin', e.target.value.replace(/\D/g, ''))}
                  className="w-48 bg-white/10 border border-white/20 rounded-2xl p-4 text-center text-4xl tracking-[1em] text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 backdrop-blur-md"
                />
              </div>
            </div>

            <div className="flex justify-between pt-8 w-full">
              <button onClick={handleBack} className="text-white/60 hover:text-white font-medium flex items-center space-x-1">
                <ChevronLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <button
                disabled={formData.pin.length !== 4 || formData.pin !== formData.confirmPin || isSubmitting}
                onClick={handleSubmit}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-10 py-4 rounded-xl font-bold flex items-center space-x-2 transition-all shadow-lg shadow-cyan-900/40"
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                ) : (
                  <>
                    <span>Finish Setup</span>
                    <CheckCircle2 className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        );

      case 'completion':
        return (
          <motion.div key="completion" variants={stepVariants} initial="enter" animate="center" exit="exit" className="text-center space-y-6">
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
              <PartyPopper className="w-12 h-12 text-green-400" />
            </div>
            <h1 className="text-4xl font-bold text-white">You are all set</h1>
            <p className="text-xl text-blue-100">Your business is officially registered and ready for big things. 🎉</p>

            <div className="bg-white/10 rounded-2xl p-6 mt-8 border border-white/20 backdrop-blur-md">
              <div className="flex items-center justify-center space-x-3 text-white mb-2">
                <Printer className="w-5 h-5 text-green-400" />
                <span className="font-medium text-lg">Startup Invoice Printed</span>
              </div>
              <p className="text-white/60">Check the printed startup for your login details and business configuration.</p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="mt-12 bg-white text-blue-900 px-12 py-5 rounded-2xl font-black text-xl transition-all hover:scale-105 active:scale-95 shadow-2xl flex items-center justify-center space-x-3 mx-auto"
            >
              <span>Go to Login Screen</span>
              <LogIn className="w-6 h-6" />
            </button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center font-sans selection:bg-blue-500/30">
      {/* Background Image with Overlay */}
      <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat hover:scale-110"
            style={{ backgroundImage: `url(${setupBg})`, transitionDuration: '10000ms', transitionProperty: 'transform' }}
          />
      <div className="absolute inset-0 z-10 bg-gradient-to-br from-black/80 via-black/40 to-blue-900/40 backdrop-blur-[2px]" />

      {/* Main Content Card */}
      <div className="relative z-20 w-full max-w-2xl px-6">
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] shadow-2xl backdrop-blur-2xl p-10 md:p-14 overflow-hidden relative group">
          {/* Decorative Elements */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl transition-all group-hover:bg-blue-500/30" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl transition-all group-hover:bg-purple-500/30" />

          {/* Progress Indicator */}
          {!isFinished && (
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/5">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}

          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>

          {/* Footer Page Counter - Hidden as per user requirement to not mention steps */}
        </div>

        {/* Brand Footer */}
        <div className="mt-8 text-center">
          <p className="text-white/40 font-medium">
            Whiz Pos v2024.1 • Secure & Efficient
          </p>
        </div>
      </div>
    </div>
  );
}
