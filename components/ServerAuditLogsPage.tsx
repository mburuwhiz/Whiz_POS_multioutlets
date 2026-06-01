import React, { useEffect, useState } from 'react';
import { Shield, Search, User, Clock, FileText } from 'lucide-react';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

export default function ServerAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      if (window.electron?.readData) {
        const { data } = await window.electron.readData('audit-logs.json');
        setLogs(Array.isArray(data) ? data : []);
      }
    };
    load();
  }, []);

  const filtered = logs.filter(log => {
    const hay = `${log.action} ${JSON.stringify(log.details || {})}`.toLowerCase();
    return hay.includes(query.toLowerCase());
  });

  const getActionIcon = (action: string) => {
    if (action.toLowerCase().includes('transaction')) return FileText;
    if (action.toLowerCase().includes('user')) return User;
    return Clock;
  };

  const getActionBadgeColor = (action: string) => {
    if (action.toLowerCase().includes('transaction')) return 'bg-blue-100 text-blue-700';
    if (action.toLowerCase().includes('user')) return 'bg-purple-100 text-purple-700';
    if (action.toLowerCase().includes('sync')) return 'bg-emerald-100 text-emerald-700';
    if (action.toLowerCase().includes('login')) return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-slate-700" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Audit Logs</h1>
              <p className="text-slate-500">Track all system activities and changes</p>
            </div>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input className="pl-10" placeholder="Search logs by action or details..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
        </div>
        
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600">No Audit Logs Yet</h3>
              <p className="text-slate-500 mt-2">Logs will appear here as users perform actions.</p>
            </div>
          ) : (
            filtered.map(log => {
              const Icon = getActionIcon(log.action);
              return (
                <Card key={log.id} className="p-5 hover:shadow-md transition-all">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-slate-100 rounded-xl">
                        <Icon className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <Badge className={getActionBadgeColor(log.action)}>
                            {log.action}
                          </Badge>
                          {log.userId && (
                            <span className="text-sm text-slate-500 flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {log.userName || log.userId}
                            </span>
                          )}
                        </div>
                        
                        {log.details && (
                          <div className="bg-slate-50 rounded-lg p-4 mt-3">
                            {Object.entries(log.details).map(([key, value]) => (
                              <div key={key} className="flex items-start gap-2 mb-2 last:mb-0">
                                <span className="font-medium text-slate-700 capitalize min-w-[100px]">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                                </span>
                                <span className="text-slate-600 flex-1">
                                  {typeof value === 'object' 
                                    ? JSON.stringify(value, null, 2) 
                                    : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <div className="text-sm text-slate-500">
                        {new Date(log.createdAt || log.timestamp || Date.now()).toLocaleString()}
                      </div>
                      {log.id && (
                        <div className="text-xs text-slate-400 mt-1 font-mono">
                          {log.id}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
