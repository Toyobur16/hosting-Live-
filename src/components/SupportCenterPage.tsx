import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Headphones,
  Mail,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { AuthUser, SupportSettings } from '../types';

interface SupportCenterPageProps {
  user: AuthUser | null;
  onBack: () => void;
  onOpenAuthModal: () => void;
}

export function SupportCenterPage({
  user,
  onBack,
  onOpenAuthModal
}: SupportCenterPageProps) {
  const [settings, setSettings] = useState<SupportSettings>({
    email: 'toyoburrahman560@gmail.com',
    whatsapp: '01304104492',
    telegram: 'toyoburrahman',
    workingHours: '24/7 Live Support'
  });

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSupportSettings();
    if (user) {
      setSenderName(user.name || '');
      setSenderEmail(user.email || '');
    }
  }, [user]);

  const fetchSupportSettings = async () => {
    try {
      const res = await fetch('/api/support/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch {}
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setStatusMessage({ type: 'error', text: 'অনুগ্রহ করে আপনার সমস্যার বিবরণ লিখুন।' });
      return;
    }

    try {
      setSending(true);
      setStatusMessage(null);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/support/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          name: senderName || user?.name || 'Customer',
          email: senderEmail || user?.email || 'No email'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusMessage({ type: 'error', text: data.error || 'মেসেজ পাঠানো সম্ভব হয়নি।' });
        return;
      }

      setStatusMessage({
        type: 'success',
        text: '🎉 আপনার মেসেজটি সফলভাবে সাপোর্ট টিমের কাছে পৌঁছেছে! আমরা খুব শীঘ্রই যোগাযোগ করব।'
      });
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 animate-in fade-in duration-200">
      {/* Back Button matching Screenshot 5 */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-[#00d293] cursor-pointer transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Header matching Screenshot 5 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#00d293]/15 flex items-center justify-center text-[#00d293]">
            <Headphones className="w-5 h-5 stroke-[2.5]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Support Center
          </h2>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#00d293] bg-[#00d293]/10 px-3 py-1 rounded-full font-bold">
          <span className="w-2 h-2 rounded-full bg-[#00d293] animate-pulse"></span>
          <span>{settings.workingHours || '24/7 Live'}</span>
        </div>
      </div>

      {/* Contact Cards matching Screenshot 5: Email, WhatsApp, Telegram */}
      <div className="space-y-3">
        {/* Email Card matching Screenshot 5 */}
        <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black text-white block">Email</span>
              <span className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs block">
                {settings.email || 'toyoburrahman560@gmail.com'}
              </span>
            </div>
          </div>

          <a
            href={`mailto:${settings.email || 'toyoburrahman560@gmail.com'}?subject=Support%20Inquiry%20from%20App%20Store`}
            className="px-4 py-1.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition-all hover:scale-102"
          >
            <span>Send</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* WhatsApp Card matching Screenshot 5 */}
        <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black text-white block">WhatsApp</span>
              <span className="text-xs text-slate-400">
                {settings.whatsapp || '01304104492'}
              </span>
            </div>
          </div>

          <a
            href={`https://wa.me/88${(settings.whatsapp || '01304104492').replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-1.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition-all hover:scale-102"
          >
            <span>Chat</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Telegram Card matching Screenshot 5 */}
        <div className="p-4 rounded-2xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black text-white block">Telegram</span>
              <span className="text-xs text-slate-400">Message us</span>
            </div>
          </div>

          <a
            href={`https://t.me/${(settings.telegram || 'toyoburrahman').replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-1.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition-all hover:scale-102"
          >
            <span>Chat</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Send a Message Card matching Screenshot 5 */}
      <div className="p-6 rounded-3xl bg-[#0d1424] border border-[#1e2e42] shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#00d293]" />
          <h3 className="text-base font-black text-white">
            Send a Message
          </h3>
        </div>

        <form onSubmit={handleSendMessage} className="space-y-4">
          {!user && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  আপনার নাম (Your Name)
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Rahim"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f172a] border border-[#1e293b] text-xs text-white focus:border-[#00d293] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  আপনার ইমেইল (Your Email)
                </label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="e.g. rahim@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f172a] border border-[#1e293b] text-xs text-white focus:border-[#00d293] focus:outline-hidden"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Subject *
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What is the problem?"
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e293b] text-sm text-white placeholder:text-slate-500 focus:border-[#00d293] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Message *
            </label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue..."
              className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e293b] text-sm text-white placeholder:text-slate-500 focus:border-[#00d293] focus:outline-hidden resize-none"
            />
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/60 border border-rose-800 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full py-3.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#00d293]/20 transition-all hover:scale-101 active:scale-98 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? 'Sending...' : 'Send'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
