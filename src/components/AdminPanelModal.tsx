import React, { useState, useEffect } from 'react';
import {
  X, ShieldCheck, Users, CheckCircle2, XCircle, Clock, Search,
  RefreshCw, Bot, CreditCard, DollarSign, Settings, AlertTriangle,
  Play, Square, RotateCw, Trash2, Check, Copy, ExternalLink, ShieldAlert
} from 'lucide-react';
import { PlanRequest, AuthUser, HostedBot, PaymentSettings } from '../types';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  lang: 'bn' | 'en';
  onBotAction?: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  lang,
  onBotAction
}) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'payments' | 'bots'>('requests');
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<{
    totalUsers: number;
    totalBots: number;
    runningBots: number;
    pendingRequestsCount: number;
    approvedRequestsCount: number;
    totalRevenueBdt: number;
  } | null>(null);

  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [allBots, setAllBots] = useState<HostedBot[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    bkashNumber: '',
    nagadNumber: '',
    rocketNumber: '',
    binanceId: '',
    instructionsBn: '',
    instructionsEn: ''
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAllAdminData();
    }
  }, [isOpen]);

  const loadAllAdminData = async () => {
    setLoading(true);
    const token = localStorage.getItem('bot_auth_token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // 1. Overview
      const ovRes = await fetch('/api/admin/overview', { headers });
      if (ovRes.ok) {
        const ovData = await ovRes.json();
        setOverview(ovData);
      }

      // 2. Plan requests
      const reqRes = await fetch('/api/admin/plan-requests', { headers });
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequests(reqData.requests || []);
      }

      // 3. Users
      const uRes = await fetch('/api/admin/users', { headers });
      if (uRes.ok) {
        const uData = await uRes.json();
        setUsers(uData.users || []);
      }

      // 4. Payment settings
      const payRes = await fetch('/api/payment-settings');
      if (payRes.ok) {
        const payData = await payRes.json();
        if (payData.settings) setPaymentSettings(payData.settings);
      }

      // 5. Bots
      const bRes = await fetch('/api/admin/all-bots', { headers });
      if (bRes.ok) {
        const bData = await bRes.json();
        setAllBots(bData.bots || []);
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error loading admin data' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApproveRequest = async (requestId: string) => {
    setActionLoadingId(requestId);
    const token = localStorage.getItem('bot_auth_token');
    try {
      const res = await fetch(`/api/admin/plan-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Approval failed');
      }
      setNotification({ type: 'success', message: 'প্লান সফলভাবে অনুমোদন করা হয়েছে (Plan approved successfully)!' });
      loadAllAdminData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const reason = window.prompt('বাতিলের কারণ লিখুন (Reason for rejection):', 'ভুয়া বা অননুমোদিত TrxID');
    if (reason === null) return;

    setActionLoadingId(requestId);
    const token = localStorage.getItem('bot_auth_token');
    try {
      const res = await fetch(`/api/admin/plan-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Rejection failed');
      }
      setNotification({ type: 'success', message: 'অনুরোধ বাতিল করা হয়েছে (Request rejected)' });
      loadAllAdminData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoadingId('save_payments');
    const token = localStorage.getItem('bot_auth_token');
    try {
      const res = await fetch('/api/admin/payment-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(paymentSettings)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Save failed');
      setNotification({ type: 'success', message: 'পেমেন্ট নাম্বার ও সেটিংস সফলভাবে আপডেট করা হয়েছে!' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUserPlanUpdate = async (userId: string, plan: string, durationDays: number, maxBots: number, role: string) => {
    const token = localStorage.getItem('bot_auth_token');
    try {
      const res = await fetch(`/api/admin/users/${userId}/update-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan, durationDays, maxBots, role })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Update failed');
      setNotification({ type: 'success', message: 'ইউজার প্লান সফলভাবে আপডেট করা হয়েছে!' });
      loadAllAdminData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.userName?.toLowerCase().includes(q) ||
      r.userEmail?.toLowerCase().includes(q) ||
      r.senderNumber?.includes(q) ||
      r.transactionId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#050811]/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#111927] border border-[#1f2c42] shadow-2xl rounded-3xl max-w-5xl w-full p-5 sm:p-7 text-white relative overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1f2c42] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{lang === 'bn' ? 'এডমিন কন্ট্রোল প্যানেল' : 'Admin Control Panel'}</span>
                <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {lang === 'bn' ? 'এডমিন মোড' : 'Admin Mode'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'bn'
                  ? 'ইউজার প্লান অনুমোদন, পেমেন্ট নাম্বার পরিবর্তন ও সার্বিক বট নিয়ন্ত্রণ করুন'
                  : 'Approve user plans, update payment settings, and control platform bots'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Stats Bar */}
        {overview && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-4">
            <div className="p-3 rounded-2xl bg-[#0d1524] border border-[#1f2d48]">
              <p className="text-[10px] font-bold text-slate-400 uppercase">{lang === 'bn' ? 'মোট ইউজার' : 'Total Users'}</p>
              <p className="text-base sm:text-lg font-black text-white mt-0.5">{overview.totalUsers}</p>
            </div>
            <div className="p-3 rounded-2xl bg-[#0d1524] border border-[#1f2d48]">
              <p className="text-[10px] font-bold text-slate-400 uppercase">{lang === 'bn' ? 'লাইভ বট' : 'Live Bots'}</p>
              <p className="text-base sm:text-lg font-black text-emerald-400 mt-0.5">{overview.runningBots} / {overview.totalBots}</p>
            </div>
            <div className="p-3 rounded-2xl bg-[#0d1524] border border-[#1f2d48]">
              <p className="text-[10px] font-bold text-amber-400 uppercase">{lang === 'bn' ? 'অপেক্ষমান রিকোয়েস্ট' : 'Pending Requests'}</p>
              <p className="text-base sm:text-lg font-black text-amber-300 mt-0.5">{overview.pendingRequestsCount}</p>
            </div>
            <div className="p-3 rounded-2xl bg-[#0d1524] border border-[#1f2d48]">
              <p className="text-[10px] font-bold text-emerald-400 uppercase">{lang === 'bn' ? 'অনুমোদিত রিকোয়েস্ট' : 'Approved Requests'}</p>
              <p className="text-base sm:text-lg font-black text-emerald-300 mt-0.5">{overview.approvedRequestsCount}</p>
            </div>
            <div className="p-3 rounded-2xl bg-[#0d1524] border border-[#1f2d48] col-span-2 sm:col-span-1">
              <p className="text-[10px] font-bold text-sky-400 uppercase">{lang === 'bn' ? 'মোট আয় (টাকা)' : 'Total Revenue'}</p>
              <p className="text-base sm:text-lg font-black text-sky-300 mt-0.5">৳{overview.totalRevenueBdt}</p>
            </div>
          </div>
        )}

        {/* Notification Toast */}
        {notification && (
          <div className={`p-3 rounded-xl mb-4 text-xs flex items-center justify-between gap-2 animate-in fade-in ${
            notification.type === 'success' ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300' : 'bg-rose-950/60 border border-rose-500/50 text-rose-300'
          }`}>
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="cursor-pointer text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-b border-[#1f2d48] pb-2 mb-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'requests'
                ? 'bg-[#0088cc] text-white shadow-md'
                : 'bg-[#0d1524] text-slate-400 hover:text-white hover:bg-[#16233b]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'পেলান রিকোয়েস্ট ও অনুমোদন' : 'Plan Requests & Approval'}</span>
            {overview && overview.pendingRequestsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black flex items-center justify-center">
                {overview.pendingRequestsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-[#0088cc] text-white shadow-md'
                : 'bg-[#0d1524] text-slate-400 hover:text-white hover:bg-[#16233b]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'ইউজার ও সাবস্ক্রিপশন' : 'Users & Subscriptions'}</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'payments'
                ? 'bg-[#0088cc] text-white shadow-md'
                : 'bg-[#0d1524] text-slate-400 hover:text-white hover:bg-[#16233b]'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'পেমেন্ট নাম্বার সেটিংস' : 'Payment Settings'}</span>
          </button>

          <button
            onClick={() => setActiveTab('bots')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'bots'
                ? 'bg-[#0088cc] text-white shadow-md'
                : 'bg-[#0d1524] text-slate-400 hover:text-white hover:bg-[#16233b]'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'সকল বট নিয়ন্ত্রণ' : 'All Bots Control'}</span>
          </button>

          <button
            onClick={loadAllAdminData}
            title={lang === 'bn' ? 'রিফ্রেশ' : 'Refresh'}
            className="p-2 ml-auto rounded-xl bg-[#0d1524] hover:bg-[#16233b] text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0088cc]' : ''}`} />
          </button>
        </div>

        {/* Tab 1: Plan Requests Queue */}
        {activeTab === 'requests' && (
          <div className="overflow-y-auto space-y-3 pr-1">
            {/* Filter & Search */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5">
                {(['pending', 'approved', 'rejected', 'all'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize cursor-pointer transition-colors ${
                      filterStatus === st
                        ? 'bg-[#1f2d48] text-white border border-[#0088cc]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st === 'pending' ? (lang === 'bn' ? 'অপেক্ষমান' : 'Pending') :
                     st === 'approved' ? (lang === 'bn' ? 'অনুমোদিত' : 'Approved') :
                     st === 'rejected' ? (lang === 'bn' ? 'বাতিল' : 'Rejected') : (lang === 'bn' ? 'সবগুলো' : 'All')}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'bn' ? 'নাম, TrxID বা নাম্বার খুঁজুন...' : 'Search Name, TrxID, Phone...'}
                  className="bg-[#090e18] border border-[#1f2d48] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0088cc]"
                />
              </div>
            </div>

            {/* Requests Table / Cards */}
            {filteredRequests.length === 0 ? (
              <div className="p-8 text-center bg-[#0d1524] border border-[#1f2d48] rounded-2xl">
                <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">
                  {lang === 'bn' ? 'কোনো অনুরোধ পাওয়া যায়নি।' : 'No plan requests found.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl bg-[#0d1524] border border-[#1f2d48] flex flex-wrap items-center justify-between gap-3 text-xs hover:border-slate-600 transition-colors"
                  >
                    <div className="space-y-1 max-w-md">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{req.userName}</span>
                        <span className="text-slate-400 text-[11px]">({req.userEmail})</span>
                        <span className="px-2 py-0.5 rounded-md bg-[#0088cc]/20 text-[#0088cc] font-bold text-[11px]">
                          {req.planName}
                        </span>
                        <span className="font-black text-emerald-400 text-[12px]">
                          ৳{req.amount}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-300 flex-wrap">
                        <span>মেথড: <strong className="uppercase text-amber-300">{req.method}</strong></span>
                        <span>প্রেরক: <strong className="font-mono">{req.senderNumber}</strong></span>
                        <span className="flex items-center gap-1">
                          TrxID: <strong className="font-mono text-pink-400">{req.transactionId}</strong>
                          <button
                            type="button"
                            onClick={() => handleCopy(req.transactionId, req.id)}
                            className="p-1 hover:text-white cursor-pointer"
                          >
                            {copiedId === req.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-500">
                        তারিখ: {new Date(req.createdAt).toLocaleString()} {req.note ? `• নোট: ${req.note}` : ''}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {req.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleApproveRequest(req.id)}
                            disabled={actionLoadingId === req.id}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer disabled:opacity-50 transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{lang === 'bn' ? 'অনুমোদন (Approve)' : 'Approve'}</span>
                          </button>

                          <button
                            onClick={() => handleRejectRequest(req.id)}
                            disabled={actionLoadingId === req.id}
                            className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-all"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{lang === 'bn' ? 'বাতিল' : 'Reject'}</span>
                          </button>
                        </>
                      ) : req.status === 'approved' ? (
                        <div className="px-3 py-1 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{lang === 'bn' ? 'অনুমোদিত (Approved)' : 'Approved'}</span>
                        </div>
                      ) : (
                        <div className="px-3 py-1 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-400 text-xs font-semibold">
                          {lang === 'bn' ? 'বাতিলকৃত' : 'Rejected'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Users Management */}
        {activeTab === 'users' && (
          <div className="overflow-y-auto space-y-2.5 pr-1">
            {users.map((u) => (
              <div
                key={u.id}
                className="p-3.5 rounded-2xl bg-[#0d1524] border border-[#1f2d48] flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{u.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      u.role === 'admin' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {u.role || 'user'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold uppercase text-[10px]">
                      {u.activePlan || 'free'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs">{u.email}</p>
                  <p className="text-[11px] text-slate-500">
                    বট সংখ্যা: <strong className="text-white">{u.botsCount || 0}</strong> • সীমা: <strong className="text-[#0088cc]">{u.maxBots || 1}টি</strong> • মেয়াদ: {u.expiresAtFormatted}
                  </p>
                </div>

                {/* Quick upgrade buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => handleUserPlanUpdate(u.id, '1_month', 30, 3, u.role)}
                    className="px-2.5 py-1 rounded-lg bg-[#16233b] hover:bg-[#0088cc] text-slate-300 hover:text-white text-[11px] font-medium border border-[#1f2d48] cursor-pointer transition-colors"
                  >
                    +১ মাস (৩ বট)
                  </button>
                  <button
                    onClick={() => handleUserPlanUpdate(u.id, '1_year', 365, 999, u.role)}
                    className="px-2.5 py-1 rounded-lg bg-[#16233b] hover:bg-emerald-600 text-slate-300 hover:text-white text-[11px] font-medium border border-[#1f2d48] cursor-pointer transition-colors"
                  >
                    +১ বছর (আনলিমিটেড)
                  </button>
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => handleUserPlanUpdate(u.id, u.plan || '1_year', 365, 999, 'admin')}
                      className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[11px] font-semibold cursor-pointer transition-colors"
                    >
                      মেক এডমিন
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Payment Settings */}
        {activeTab === 'payments' && (
          <form onSubmit={handleSavePaymentSettings} className="overflow-y-auto space-y-4 pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  bKash (বিকাশ) একাউন্ট নাম্বার:
                </label>
                <input
                  type="text"
                  value={paymentSettings.bkashNumber}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, bkashNumber: e.target.value })}
                  placeholder="01711223344 (Personal - Send Money)"
                  className="w-full bg-[#090e18] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#0088cc]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Nagad (নগদ) একাউন্ট নাম্বার:
                </label>
                <input
                  type="text"
                  value={paymentSettings.nagadNumber}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, nagadNumber: e.target.value })}
                  placeholder="01811223344 (Personal - Send Money)"
                  className="w-full bg-[#090e18] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#0088cc]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Rocket (রকেট) একাউন্ট নাম্বার:
                </label>
                <input
                  type="text"
                  value={paymentSettings.rocketNumber}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, rocketNumber: e.target.value })}
                  placeholder="01911223344 (Personal - Send Money)"
                  className="w-full bg-[#090e18] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#0088cc]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Binance USDT Wallet (TRC20):
                </label>
                <input
                  type="text"
                  value={paymentSettings.binanceId}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, binanceId: e.target.value })}
                  placeholder="TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE"
                  className="w-full bg-[#090e18] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#0088cc]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1 text-xs">
                পেমেন্ট নির্দেশাবলী (Payment Instructions):
              </label>
              <textarea
                rows={3}
                value={paymentSettings.instructionsBn || ''}
                onChange={(e) => setPaymentSettings({ ...paymentSettings, instructionsBn: e.target.value })}
                className="w-full bg-[#090e18] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#0088cc]"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={actionLoadingId === 'save_payments'}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold text-xs shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                {actionLoadingId === 'save_payments' ? 'সংরক্ষণ হচ্ছে...' : 'পেমেন্ট নাম্বার সংরক্ষণ করুন'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 4: All Bots Control */}
        {activeTab === 'bots' && (
          <div className="overflow-y-auto space-y-2.5 pr-1">
            {allBots.map((bot) => (
              <div
                key={bot.id}
                className="p-3.5 rounded-2xl bg-[#0d1524] border border-[#1f2d48] flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{bot.name}</span>
                    <span className={`w-2 h-2 rounded-full ${bot.status === 'running' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className="text-[11px] font-semibold text-slate-400">({bot.id})</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    মালিক: <span className="text-slate-300 font-medium">{bot.ownerName || bot.ownerId || 'System'}</span> • PID: {bot.pid || 'None'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {bot.status === 'running' ? (
                    <button
                      onClick={async () => {
                        await fetch(`/api/bots/${bot.id}/stop`, { method: 'POST' });
                        loadAllAdminData();
                        if (onBotAction) onBotAction();
                      }}
                      className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900 border border-rose-800 text-rose-300 cursor-pointer"
                      title="Stop Bot"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        await fetch(`/api/bots/${bot.id}/start`, { method: 'POST' });
                        loadAllAdminData();
                        if (onBotAction) onBotAction();
                      }}
                      className="p-2 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white cursor-pointer"
                      title="Start Bot"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      await fetch(`/api/bots/${bot.id}/restart`, { method: 'POST' });
                      loadAllAdminData();
                      if (onBotAction) onBotAction();
                    }}
                    className="p-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-slate-300 cursor-pointer border border-[#334155]"
                    title="Restart Bot"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`Are you sure you want to delete '${bot.name}'?`)) {
                        await fetch(`/api/bots/${bot.id}`, { method: 'DELETE' });
                        loadAllAdminData();
                        if (onBotAction) onBotAction();
                      }
                    }}
                    className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900 border border-rose-800 text-rose-400 cursor-pointer"
                    title="Delete Bot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
