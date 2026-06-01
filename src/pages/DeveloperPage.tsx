import React, { useState, useEffect, useRef } from 'react';
import { usePosStore } from '../store/posStore';
import { useNavigate } from 'react-router-dom';
import { Shield, Save, CheckCircle, AlertTriangle, Key, Globe, Copy, RefreshCw, FileText, Download, Lock, HardDrive, Database, Printer, Smartphone, Delete, X, ArrowLeft, LogOut, Settings, Eye, EyeOff } from 'lucide-react';

const DeveloperPage = () => {
    const { businessSetup, saveBusinessSetup } = usePosStore();
    const setup = (businessSetup || {}) as any;
    const navigate = useNavigate();

    // Authentication State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState('');
    const [authError, setAuthError] = useState('');
    const [activeMenu, setActiveMenu] = useState('general');
    const inputRef = useRef<HTMLInputElement>(null);

    // Configuration State
    const [isLoading, setIsLoading] = useState(true);
    const [backOfficeUrl, setBackOfficeUrl] = useState('');
    const [backOfficeApiKey, setBackOfficeApiKey] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [error, setError] = useState('');
    const [showDevFooter, setShowDevFooter] = useState(true);
    const [isPushing, setIsPushing] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);

    // M-Pesa State
    const [mpesaConfig, setMpesaConfig] = useState({
        enabled: false,
        backendUrl: '',
        apiKey: '',
        consumerKey: '',
        consumerSecret: '',
        passkey: '',
        shortcode: '',
        partyB: '',
        callbackUrl: '',
        type: 'Till' as 'Paybill' | 'Till',
        environment: 'Production' as 'Sandbox' | 'Production'
    });

    const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
    const togglePasswordVisibility = (field: string) => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    // Logs State
    const [logs, setLogs] = useState('');
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            loadConfig();
        }
    }, [isAuthenticated, businessSetup]);

    useEffect(() => {
        if (!isAuthenticated && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isAuthenticated, pin]);

    const handleKeyPress = (key: string) => {
        const storedPin = setup.developerPin || '1410399';
        const targetLength = storedPin.length;
        if (key === 'clear') {
            setPin('');
            setAuthError('');
        } else if (key === 'delete') {
            setPin(prev => prev.slice(0, -1));
            setAuthError('');
        } else if (key === 'enter') {
            handleLogin();
        } else {
            if (pin.length < targetLength) {
                const newPin = pin + key;
                setPin(newPin);
                if (newPin.length === targetLength) { handleLogin(newPin); }
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key >= '0' && e.key <= '9') {
            handleKeyPress(e.key);
        } else if (e.key === 'Backspace') {
            handleKeyPress('delete');
        } else if (e.key === 'Enter') {
            handleKeyPress('enter');
        } else if (e.key === 'Escape') {
            handleKeyPress('clear');
        }
    };

    const handleLogin = (explicitPin?: string) => {
        const loginPin = explicitPin || pin;
        const storedPin = setup.developerPin || '1410399';
        if (loginPin === storedPin) {
            setIsAuthenticated(true);
            setAuthError('');
        } else {
            setAuthError('Invalid Access Code');
            setPin('');
        }
    };

    const loadConfig = async () => {
        try {
            let config: any = {};
            if (window.electron && window.electron.readData) {
                const configData = await window.electron.readData('business-setup.json');
                const rawConfig = typeof configData === 'string'
                    ? JSON.parse(configData || '{}')
                    : (configData?.data || configData || {});
                config = rawConfig as any;
            }
            const fallback = setup;

            setBackOfficeUrl(config.backOfficeUrl || config.apiUrl || fallback.backOfficeUrl || fallback.apiUrl || '');
            setBackOfficeApiKey(config.backOfficeApiKey || config.apiKey || fallback.backOfficeApiKey || fallback.apiKey || '');
            setShowDevFooter(config.showDeveloperFooter !== undefined ? config.showDeveloperFooter : (fallback.showDeveloperFooter !== false));

            if (config.mpesaConfig || fallback.mpesaConfig) {
                setMpesaConfig((prev) => ({ ...prev, ...(config.mpesaConfig || fallback.mpesaConfig) }));
            }
        } catch (e) {
            console.error("Failed to load developer config", e);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLogs = async () => {
        setIsLoadingLogs(true);
        try {
            if (window.electron && window.electron.readData) {
                const logData = await window.electron.readData('app-errors.log');
                setLogs(typeof logData === 'string' ? logData : JSON.stringify((logData as any)?.data || logData || 'No logs recorded.'));
            } else {
                setLogs('Logs are only available in the Desktop App environment.');
            }
        } catch (e) {
            setLogs('Failed to read logs. ' + (e instanceof Error ? e.message : String(e)));
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const copyLogs = () => {
        navigator.clipboard.writeText(logs);
        setSuccessMsg('Logs copied to clipboard');
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const downloadLogs = () => {
        const blob = new Blob([logs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `whiz-pos-logs-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleSaveSettings = async () => {
        const updatedSetup = {
            ...businessSetup,
            backOfficeUrl,
            backOfficeApiKey,
            apiUrl: backOfficeUrl,
            apiKey: backOfficeApiKey,
            showDeveloperFooter: showDevFooter,
            mpesaConfig,
            isSetup: true
        };
        // @ts-ignore
        saveBusinessSetup(updatedSetup);

        if (window.electron && window.electron.saveDeveloperConfig) {
            await window.electron.saveDeveloperConfig({
                backOfficeUrl,
                backOfficeApiKey,
                showDeveloperFooter: showDevFooter,
                mpesaConfig
            });
        }

        setSuccessMsg('Settings saved successfully');
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const handleBackup = async () => {
        if (!window.electron) {
            setError('Backup is only supported in Desktop mode');
            return;
        }
        setIsBackingUp(true);
        try {
            const result = await window.electron.backupData();
            if (result.success) {
                setSuccessMsg(`Backup saved to ${result.filePath}`);
            } else {
                if (result.error !== 'User cancelled backup') {
                    setError(result.error);
                }
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleRestore = async () => {
        if (!window.electron) {
            setError('Restore is only supported in Desktop mode');
            return;
        }

        if (!window.confirm('WARNING: Restoring will overwrite all current local data. The app will restart after a successful restore. Are you sure you want to proceed?')) {
            return;
        }

        try {
            const result = await window.electron.restoreData();
            if (result.success) {
                setSuccessMsg('Restore successful. Restarting application...');
                localStorage.removeItem('pos-storage');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                if (result.error !== 'User cancelled restore') {
                    setError(result.error);
                }
            }
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setPin('');
        setActiveMenu('general');
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden font-sans select-none">
                <button
                    onClick={() => navigate('/')}
                    className="absolute top-8 left-8 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all border border-white/20 z-50"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>

                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-black">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-transparent to-transparent" />
                </div>

                <div className="z-10 w-full max-w-5xl px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    {/* Left Side */}
                    <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
                        <div className="relative">
                             <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl transform -rotate-6 border border-white/20">
                                <Shield className="w-12 h-12 text-white" />
                             </div>
                             <div className="absolute -top-2 -right-2 w-10 h-10 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center">
                                <Lock className="w-5 h-5 text-cyan-300" />
                             </div>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-lg">
                                DEVELOPER
                            </h1>
                            <p className="text-purple-200/70 text-lg font-medium tracking-wide">
                                Restricted System Access
                            </p>
                        </div>

                        <div className="flex gap-5 py-4">
                            {Array.from({length: (setup.developerPin || '1410399').length}).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-5 h-5 rounded-full transition-all duration-300 border-2 ${
                                        pin.length > i
                                            ? "bg-white border-white scale-125 shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                                            : "bg-transparent border-white/30"
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Hidden input to allow keyboard typing */}
                        <input
                            ref={inputRef}
                            className="opacity-0 absolute -z-10"
                            onKeyDown={handleKeyDown}
                            autoFocus
                            autoComplete="off"
                        />

                        <button
                            onClick={() => handleLogin()}
                            disabled={pin.length < (setup.developerPin || '1410399').length}
                            className="group relative px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-lg hover:bg-cyan-50 transition-all shadow-2xl active:scale-95 disabled:opacity-50 flex items-center gap-3 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            AUTHORIZE
                            <Lock className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        </button>

                        {authError && (
                            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-3 animate-bounce">
                                <AlertTriangle className="w-4 h-4" /> {authError}
                            </div>
                        )}
                    </div>

                    {/* Right Side: Glass Keypad */}
                    <div className="flex justify-center lg:justify-end animate-in fade-in slide-in-from-right-8 duration-700">
                        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/20 shadow-2xl w-full max-w-[400px]">
                            <div className="grid grid-cols-3 gap-4">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => { handleKeyPress(num.toString()); inputRef.current?.focus(); }}
                                        className="aspect-square rounded-2xl text-3xl font-bold text-white bg-white/5 hover:bg-white/20 transition-all active:scale-90 border border-white/10 flex items-center justify-center"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <button
                                    onClick={() => { handleKeyPress('clear'); inputRef.current?.focus(); }}
                                    className="aspect-square rounded-2xl flex items-center justify-center bg-red-500/20 hover:bg-red-500/40 text-red-200 transition-all border border-red-500/30 active:scale-90"
                                >
                                    <X className="w-8 h-8" />
                                </button>
                                <button
                                    onClick={() => { handleKeyPress('0'); inputRef.current?.focus(); }}
                                    className="aspect-square rounded-2xl text-3xl font-bold text-white bg-white/5 hover:bg-white/20 transition-all active:scale-90 border border-white/10 flex items-center justify-center"
                                >
                                    0
                                </button>
                                <button
                                    onClick={() => { handleKeyPress('delete'); inputRef.current?.focus(); }}
                                    className="aspect-square rounded-2xl flex items-center justify-center bg-slate-500/20 hover:bg-slate-500/40 text-white transition-all border border-white/10 active:scale-90"
                                >
                                    <Delete className="w-8 h-8" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading Configuration...</div>;

    const renderMenuButton = (id: string, icon: React.ReactNode, label: string) => (
        <button
            onClick={() => setActiveMenu(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition-colors ${
                activeMenu === id
                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
            {/* Sidebar Menu */}
            <div className="w-full md:w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col flex-shrink-0">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-800 tracking-tight">DEV PORTAL</h2>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">System Settings</p>
                    </div>
                </div>

                <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {renderMenuButton('general', <Settings className="w-5 h-5" />, 'General Config')}
                    {renderMenuButton('mpesa', <Smartphone className="w-5 h-5" />, 'Backend & M-Pesa')}
                    {renderMenuButton('database', <Database className="w-5 h-5" />, 'Database & Sync')}
                    {renderMenuButton('logs', <FileText className="w-5 h-5" />, 'System Logs')}
                </div>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 hover:bg-black text-white rounded-lg font-medium transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        Secure Logout
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* Status Messages at Top */}
                    {successMsg && (
                        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
                            <CheckCircle className="w-6 h-6 flex-shrink-0" />
                            <p className="font-medium">{successMsg}</p>
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
                            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                            <p className="font-medium">{error}</p>
                        </div>
                    )}

                    {/* Menu Content: General Config */}
                    {activeMenu === 'general' && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                            {/* Cloud Connection */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center gap-3">
                                    <Globe className="w-5 h-5 text-purple-600" />
                                    <h2 className="text-lg font-bold text-gray-800">Cloud Sync API Connection</h2>
                                </div>
                                <div className="p-6 grid gap-6 md:grid-cols-2">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Back-Office API URL</label>
                                        <input
                                            type="text"
                                            value={backOfficeUrl}
                                            onChange={(e) => setBackOfficeUrl(e.target.value)}
                                            placeholder="https://your-server.com/api"
                                            className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-2 relative">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">API Auth Key</label>
                                        <input
                                            type={showPasswords['backOfficeApiKey'] ? 'text' : 'password'}
                                            value={backOfficeApiKey}
                                            onChange={(e) => setBackOfficeApiKey(e.target.value)}
                                            placeholder="Bearer token or API Key"
                                            className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => togglePasswordVisibility('backOfficeApiKey')}
                                            className="absolute right-3 top-10 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPasswords['backOfficeApiKey'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Receipt Config */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center gap-3">
                                    <Printer className="w-5 h-5 text-teal-600" />
                                    <h2 className="text-lg font-bold text-gray-800">Print Formatting</h2>
                                </div>
                                <div className="p-6 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-gray-800">Show Developer Footer</p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Append "System Designed by Whizpoint Solutions" to thermal receipts.
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={showDevFooter}
                                            onChange={(e) => setShowDevFooter(e.target.checked)}
                                        />
                                        <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-teal-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Menu Content: M-Pesa Setup */}
                    {activeMenu === 'mpesa' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <Smartphone className="w-5 h-5 text-green-600" />
                                    <h2 className="text-lg font-bold text-gray-800">Backend & M-Pesa Daraja Integration</h2>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-semibold text-gray-700">Enable M-Pesa Automation</span>
                                    <button
                                        onClick={() => setMpesaConfig({ ...mpesaConfig, enabled: !mpesaConfig.enabled })}
                                        className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${mpesaConfig.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm absolute transition-transform duration-200 ease-in-out ${mpesaConfig.enabled ? 'translate-x-[26px]' : 'translate-x-[4px]'}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 grid gap-6 md:grid-cols-2 bg-gray-50/30">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">M-Pesa Backend URL</label>
                                    <input
                                        type="url"
                                        value={mpesaConfig.backendUrl}
                                        onChange={(e) => setMpesaConfig({...mpesaConfig, backendUrl: e.target.value})}
                                        placeholder="http://localhost:3000 or https://your-backend.com"
                                        className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                </div>

                                <div className="md:col-span-2 relative">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Frontend API Key (For Backend Auth)</label>
                                    <input
                                        type={showPasswords['apiKey'] ? 'text' : 'password'}
                                        value={mpesaConfig.apiKey}
                                        onChange={(e) => setMpesaConfig({...mpesaConfig, apiKey: e.target.value})}
                                        placeholder="API_KEY from backend .env"
                                        className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility('apiKey')}
                                        className="absolute right-3 top-10 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPasswords['apiKey'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>

                                <div className="md:col-span-2 border-t pt-4">
                                    <h3 className="font-bold text-gray-800 mb-4">Safaricom Daraja Credentials</h3>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Environment</label>
                                    <select
                                        value={mpesaConfig.environment}
                                        onChange={(e) => setMpesaConfig({...mpesaConfig, environment: e.target.value as any})}
                                        className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    >
                                        <option value="Sandbox">Sandbox (Testing)</option>
                                        <option value="Production">Production (Live)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Account Type</label>
                                    <select
                                        value={mpesaConfig.type}
                                        onChange={(e) => setMpesaConfig({...mpesaConfig, type: e.target.value as any})}
                                        className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    >
                                        <option value="Till">Buy Goods (Till Number)</option>
                                        <option value="Paybill">Paybill</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Shortcode / Till No</label>
                                    <input
                                        type="text"
                                        value={mpesaConfig.shortcode}
                                        onChange={(e) => setMpesaConfig({...mpesaConfig, shortcode: e.target.value})}
                                        placeholder="e.g. 174379"
                                        className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Party B (Paybill/Store No)</label>
                                    <input
                                        type="text"
                                        value={mpesaConfig.partyB}
                                        onChange={(e) => setMpesaConfig({...mpesaConfig, partyB: e.target.value})}
                                        placeholder="e.g. 3098707"
                                        className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                </div>
                                <div className="relative">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Passkey</label>
                                    <input
                                        type={showPasswords['passkey'] ? 'text' : 'password'}
                                        value={mpesaConfig.passkey}
                                        onChange={(e) => setMpesaConfig({...mpesaConfig, passkey: e.target.value})}
                                        placeholder="bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
                                        className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility('passkey')}
                                        className="absolute right-3 top-10 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPasswords['passkey'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Callback URL</label>
                                    <input
                                        type="url"
                                        value={mpesaConfig.callbackUrl}
                                        onChange={(e) => setMpesaConfig({...mpesaConfig, callbackUrl: e.target.value})}
                                        placeholder="https://your-domain.com/callback"
                                        className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                </div>
                                <div className="md:col-span-2 relative">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Consumer Key</label>
                                    <input
                                        type={showPasswords['consumerKey'] ? 'text' : 'password'}
                                        value={mpesaConfig.consumerKey}
                                        onChange={(e) => setMpesaConfig({...mpesaConfig, consumerKey: e.target.value})}
                                        placeholder="Daraja App Consumer Key"
                                        className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility('consumerKey')}
                                        className="absolute right-3 top-10 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPasswords['consumerKey'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                <div className="md:col-span-2 relative">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Consumer Secret</label>
                                    <input
                                        type={showPasswords['consumerSecret'] ? 'text' : 'password'}
                                        value={mpesaConfig.consumerSecret}
                                        onChange={(e) => setMpesaConfig({...mpesaConfig, consumerSecret: e.target.value})}
                                        placeholder="Daraja App Consumer Secret"
                                        className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility('consumerSecret')}
                                        className="absolute right-3 top-10 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPasswords['consumerSecret'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Menu Content: Database & Sync */}
                    {activeMenu === 'database' && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                            {/* Backup & Restore */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center gap-3">
                                    <HardDrive className="w-5 h-5 text-orange-600" />
                                    <h2 className="text-lg font-bold text-gray-800">Local Snapshot Backup</h2>
                                </div>
                                <div className="p-6">
                                    <p className="text-sm text-gray-500 mb-6">
                                        Create a zip archive of all current local POS data (`business-setup.json`, `products.json`, etc.) or restore from a previous archive.
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                        <button
                                            onClick={handleBackup}
                                            disabled={isBackingUp}
                                            className="px-6 py-3 bg-orange-100 text-orange-800 hover:bg-orange-200 rounded-lg font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isBackingUp ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                                            Create Backup
                                        </button>
                                        <button
                                            onClick={handleRestore}
                                            className="px-6 py-3 bg-gray-900 text-white hover:bg-black rounded-lg font-bold transition-colors flex items-center gap-2"
                                        >
                                            <HardDrive className="w-5 h-5" />
                                            Restore Archive
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Menu Content: System Logs */}
                    {activeMenu === 'logs' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px] animate-in fade-in zoom-in-95 duration-200">
                            <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-gray-600" />
                                    <h2 className="text-lg font-bold text-gray-800">Terminal Output (app-errors.log)</h2>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={fetchLogs} className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors" title="Refresh">
                                        <RefreshCw className={`w-5 h-5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button onClick={copyLogs} disabled={!logs} className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50" title="Copy">
                                        <Copy className="w-5 h-5" />
                                    </button>
                                    <button onClick={downloadLogs} disabled={!logs} className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50" title="Download">
                                        <Download className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="bg-[#1e1e1e] flex-1 p-4 overflow-y-auto font-mono text-xs text-[#00ff00]">
                                {isLoadingLogs ? (
                                    <div className="flex items-center justify-center h-full text-gray-500">Retrieving system buffer...</div>
                                ) : logs ? (
                                    <pre className="whitespace-pre-wrap">{typeof logs === 'string' ? logs : JSON.stringify(logs, null, 2)}</pre>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-500">No buffer data available. Click refresh to poll.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Global Save Action */}
                    {(activeMenu === 'general' || activeMenu === 'mpesa') && (
                        <div className="pt-4 flex justify-end">
                            <button
                                onClick={handleSaveSettings}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-[0.98]"
                            >
                                <Save className="w-6 h-6" />
                                Save Current Configuration
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeveloperPage;
