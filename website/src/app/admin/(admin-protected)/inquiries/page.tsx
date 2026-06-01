'use client';
import { useEffect, useState } from 'react';
import { Mail, Reply, X, Send } from 'lucide-react';

interface Inquiry {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  message: string;
  createdAt: string;
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [replySubject, setReplySubject] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function fetchInquiries() {
      try {
        const res = await fetch('/api/admin/inquiries');
        if (res.ok) {
          const data = await res.json();
          setInquiries(data.inquiries);
        }
      } catch (e) {
        console.error('Failed to fetch inquiries', e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchInquiries();
  }, []);

  const openReplyModal = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setReplySubject(`Re: Your inquiry to Whizpoint POS`);
    setReplyMessage(`\n\n---\nOriginal message from ${inquiry.name}:\n${inquiry.message}`);
    setIsReplyModalOpen(true);
  };

  const handleSendReply = async () => {
    if (!selectedInquiry || !replySubject || !replyMessage) return;
    
    setIsSending(true);
    try {
      const res = await fetch('/api/admin/inquiries/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedInquiry.email,
          subject: replySubject,
          message: replyMessage
        })
      });

      if (!res.ok) throw new Error('Failed to send reply');
      setIsReplyModalOpen(false);
      setSelectedInquiry(null);
      setReplySubject('');
      setReplyMessage('');
    } catch (e) {
      console.error('Failed to send reply:', e);
      alert('Failed to send reply. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Sales Inquiries</h1>
      </div>
      
      {isLoading ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-8 text-center text-gray-500">Loading...</div>
        </div>
      ) : inquiries.length === 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-8 text-center text-gray-500">No recent inquiries.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inquiry) => (
            <div key={inquiry.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{inquiry.name}</h3>
                    <p className="text-sm text-slate-500">{inquiry.email}</p>
                    {inquiry.company && (
                      <p className="text-sm text-slate-500 mt-1">{inquiry.company}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-slate-400">
                    {new Date(inquiry.createdAt).toLocaleString()}
                  </p>
                  <button
                    onClick={() => openReplyModal(inquiry)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Reply className="w-4 h-4" />
                    Reply
                  </button>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-slate-600 whitespace-pre-wrap">{inquiry.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Modal */}
      {isReplyModalOpen && selectedInquiry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Reply to {selectedInquiry.name}</h3>
                <p className="text-sm text-slate-500">{selectedInquiry.email}</p>
              </div>
              <button 
                onClick={() => setIsReplyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setIsReplyModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  disabled={isSending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendReply}
                  disabled={isSending}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Reply
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
