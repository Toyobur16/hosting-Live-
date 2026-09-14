import React, { useState, useEffect } from 'react';
import {
  Headphones,
  Mail,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Save,
  Server,
  RefreshCw,
  Zap,
  BellRing,
  ShieldCheck
} from 'lucide-react';
import { SupportSettings, SupportMessage } from '../../types';

export function AdminSupportManager() {
  const [settings, setSettings] = useState<SupportSettings>({
    email: 'toyoburrahman560@gmail.com',
    whatsapp: '01304104492',
    telegram: 'toyoburrahman',
    workingHours: '24/7 Live Support'
  });

  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState<{ [id: string]: string }>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // SMTP Service State
  const [smtpStatus, setSmtpStatus] = useState<any>(null);
  const [checkingSmtp, setCheckingSmtp] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [scanningPlans, setScanningPlans] = useState(false);

  useEffect(() => {
    fetchData();
    fetchSmtpStatus();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('bot_auth_token');
      const [setRes, msgRes] = await Promise.all([
        fetch('/api/support/settings'),
        fetch('/api/admin/support-messages', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (setRes.ok) {
        const sData = await setRes.json();
        if (sData.settings) setSettings(sData.settings);
      }
      if (msgRes.ok) {
        const mData = await msgRes.json();
        setMessages(mData.messages || []);
      }
    } catch {}
  };

  const fetchSmtpStatus = async () => {
    try {
      setCheckingSmtp(true);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/smtp-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSmtpStatus(data);
      }
    } catch {
    } finally {
      setCheckingSmtp(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      setNotification({ type: 'error', text: 'অনুগ্রহ করে সঠিক ইমেইল এড্রেস লিখুন।' });
      return;
    }

    try {
      setSendingTestEmail(true);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/smtp-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: testEmailAddress.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', text: data.message || 'টেস্ট ইমেইল সফলভাবে পাঠানো হয়েছে!' });
        setTimeout(() => setNotification(null), 4000);
      } else {
        setNotification({ type: 'error', text: data.error || 'ইমেইল পাঠাতে ব্যর্থ হয়েছে।' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleScanExpiringPlans = async () => {
    try {
      setScanningPlans(true);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/scan-expiring-plans', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', text: data.message });
        setTimeout(() => setNotification(null), 5000);
      } else {
        setNotification({ type: 'error', text: data.error || 'স্ক্যান ব্যর্থ হয়েছে।' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setScanningPlans(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/admin/support-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        setNotification({ type: 'success', text: 'সাপোর্ট তথ্য সফলভাবে আপডেট হয়েছে!' });
        setTimeout(() => setNotification(null), 2500);
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleReplyMessage = async (msgId: string) => {
    const text = replyText[msgId];
    if (!text || !text.trim()) return;

    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch(`/api/admin/support-messages/${msgId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reply: text.trim(), status: 'replied' })
      });

      if (res.ok) {
        setNotification({ type: 'success', text: 'রিপ্লাই সফলভাবে পাঠানো হয়েছে!' });
        fetchData();
        setTimeout(() => setNotification(null), 2500);
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Headphones className="w-5 h-5 text-[#00d293]" />
            <span>সাপোর্ট সেন্টার সেটিংস ও ইনবক্স (Support Control)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            সাপোর্ট ইমেইল, হোয়াটসঅ্যাপ ও টেলিগ্রাম নাম্বার নিয়ন্ত্রণ করুন এবং ইউজারদের মেসেজ দেখুন
          </p>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border border-rose-800 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* SMTP Email Notification Service Card */}
      <div className="p-5 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e293b]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00d293]/10 border border-[#00d293]/30 flex items-center justify-center text-[#00d293]">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white flex items-center gap-2">
                <span>ইমেইল নোটিফিকেশন সার্ভিস (SMTP Service)</span>
                {smtpStatus?.configured ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-[#00d293] border border-emerald-500/20">
                    সক্রিয় (Active)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    .env কনফিগারেশন বাকি
                  </span>
                )}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ডিপোজিট অ্যাপ্রুভাল এবং হোস্টিং প্ল্যানের মেয়াদ শেষ হওয়ার সতর্কবার্তা স্বয়ংক্রিয়ভাবে ইমেইলে পৌঁছে দেওয়া হয়
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={fetchSmtpStatus}
              disabled={checkingSmtp}
              className="px-3 py-1.5 rounded-xl bg-[#070b14] border border-[#1e293b] hover:border-slate-600 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingSmtp ? 'animate-spin text-[#00d293]' : ''}`} />
              <span>{checkingSmtp ? 'যাচাই হচ্ছে...' : 'রিলোড'}</span>
            </button>
          </div>
        </div>

        {/* Server & Config Info Box */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-[#070b14] border border-[#1e293b]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">SMTP হোস্ট (Host)</span>
            <span className="text-xs font-mono font-bold text-white truncate block">
              {smtpStatus?.config?.host || 'None'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#070b14] border border-[#1e293b]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">পোর্ট (Port)</span>
            <span className="text-xs font-mono font-bold text-white block">
              {smtpStatus?.config?.port || 587} {smtpStatus?.config?.secure ? '(SSL)' : '(TLS)'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#070b14] border border-[#1e293b]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">প্রেরক ইউজার (User)</span>
            <span className="text-xs font-mono font-bold text-emerald-400 truncate block">
              {smtpStatus?.config?.user || 'Not set'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#070b14] border border-[#1e293b]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">কানেকশন স্ট্যাটাস</span>
            <span className={`text-xs font-bold flex items-center gap-1 ${smtpStatus?.connected ? 'text-[#00d293]' : 'text-amber-400'}`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{smtpStatus?.connected ? 'কানেক্টেড' : smtpStatus?.configured ? 'ভেরিফাই হচ্ছে' : 'অফলাইন'}</span>
            </span>
          </div>
        </div>

        {/* Tools: Send Test Email & Manual Expiration Check */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
          {/* Test Email Form */}
          <form onSubmit={handleSendTestEmail} className="p-3.5 rounded-xl bg-[#070b14] border border-[#1e293b] space-y-2.5">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-[#00d293]" />
              <span className="text-xs font-bold text-white">টেস্ট ইমেইল পাঠিয়ে যাচাই করুন (Send Test Alert)</span>
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="আপনার ইমেইল লিখুন..."
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-[#0f172a] border border-[#1e293b] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00d293]"
              />
              <button
                type="submit"
                disabled={sendingTestEmail}
                className="px-4 py-2 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingTestEmail ? 'পাঠানো হচ্ছে...' : 'পাঠান'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              এই অপশন দিয়ে সরাসরি আপনার ইনবক্সে একটি টেস্ট নোটিফিকেশন পাঠিয়ে SMTP ভেরিফাই করতে পারবেন।
            </p>
          </form>

          {/* Expiring Plans Manual Trigger */}
          <div className="p-3.5 rounded-xl bg-[#070b14] border border-[#1e293b] flex flex-col justify-between space-y-2.5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BellRing className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold text-white">মেয়াদ শেষ হওয়ার সতর্কবার্তা স্ক্যান (Expiry Scanner)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                সকল ইউজারের একাউন্ট স্ক্যান করে যাদের হোস্টিং প্ল্যানের মেয়াদ ৩ দিন বা তার কম বাকি আছে তাদের সাথে সাথে ইমেইল ও ইন-অ্যাপ সতর্কবার্তা পাঠানো হবে।
              </p>
            </div>
            <button
              onClick={handleScanExpiringPlans}
              disabled={scanningPlans}
              className="w-full px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] border border-slate-700 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <Clock className={`w-3.5 h-3.5 text-[#00d293] ${scanningPlans ? 'animate-spin' : ''}`} />
              <span>{scanningPlans ? 'স্ক্যান চলছে...' : 'সব একাউন্ট স্ক্যান করে এলার্ট পাঠান (Scan & Alert Now)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Support Settings Card */}
      <div className="p-5 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-4">
        <h4 className="text-xs font-black text-[#00d293] uppercase">যোগাযোগ তথ্য পরিবর্তন</h4>
        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">সাপোর্ট ইমেইল (Email)</label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">হোয়াটসঅ্যাপ নাম্বার (WhatsApp)</label>
            <input
              type="text"
              value={settings.whatsapp}
              onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">টেলিগ্রাম ইউজারনেম (Telegram)</label>
            <input
              type="text"
              value={settings.telegram}
              onChange={(e) => setSettings({ ...settings, telegram: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">কাজের সময় (Working Hours)</label>
            <input
              type="text"
              value={settings.workingHours}
              onChange={(e) => setSettings({ ...settings, workingHours: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingSettings ? 'সেভ হচ্ছে...' : 'সেটিংস আপডেট করুন'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* User Inquiries Inbox */}
      <div className="space-y-3">
        <h4 className="text-xs font-black text-white uppercase">
          ইউজারদের সাপোর্ট মেসেজসমূহ ({messages.length})
        </h4>

        {messages.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[#0f172a] border border-[#1e293b] text-xs text-slate-400">
            কোনো মেসেজ জমা নেই।
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-2xl bg-[#0f172a] border border-[#1e293b] space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-black text-white block">{m.subject}</span>
                    <span className="text-[11px] text-slate-400">
                      From: {m.userName} ({m.userEmail}) • {new Date(m.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                      m.status === 'replied' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {m.status.toUpperCase()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-slate-300">
                  {m.message}
                </div>

                {m.reply && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300">
                    <span className="font-bold block mb-1">এডমিন রিপ্লাই:</span>
                    {m.reply}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={replyText[m.id] || ''}
                    onChange={(e) => setReplyText({ ...replyText, [m.id]: e.target.value })}
                    placeholder="ইউজারকে রিপ্লাই লিখুন..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs text-white"
                  />
                  <button
                    onClick={() => handleReplyMessage(m.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs cursor-pointer flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
