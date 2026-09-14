import React, { useState, useEffect, useRef } from 'react';
import {
  X, ShieldCheck, Users, CheckCircle2, XCircle, Clock, Search,
  RefreshCw, Bot, CreditCard, DollarSign, Settings, AlertTriangle,
  Play, Square, RotateCw, Trash2, Check, Copy, ExternalLink, ShieldAlert,
  Plus, Wallet, ArrowRight, Link, ShoppingBag, Sparkles, Folder, Headphones, BellRing,
  Mail, ArrowUp, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, BarChart3, Layers
} from 'lucide-react';
import { PlanRequest, AuthUser, HostedBot, PaymentSettings, HostingPlan } from '../types';
import { AdminBannersManager } from './admin/AdminBannersManager';
import { AdminSupportManager } from './admin/AdminSupportManager';
import { AdminNoticesManager } from './admin/AdminNoticesManager';
import { AdminSmtpManager } from './admin/AdminSmtpManager';
import { AdminStoreManager } from './admin/AdminStoreManager';
import { AdminCategoriesManager } from './admin/AdminCategoriesManager';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  lang: 'bn' | 'en';
  onBotAction?: () => void;
}

export type AdminTabType = 'requests' | 'users' | 'pricing' | 'store' | 'categories' | 'banners' | 'notices' | 'support' | 'payments' | 'bots' | 'smtp';

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  lang,
  onBotAction
}) => {
  const [activeTab, setActiveTab] = useState<AdminTabType>('requests');
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<{
    totalUsers: number;
    totalBots: number;
    runningBots: number;
    pendingRequestsCount: number;
    approvedRequestsCount: number;
    totalRevenueUsd?: number;
    totalRevenueBdt?: number;
  } | null>(null);

  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<HostingPlan[]>([]);
  const [allBots, setAllBots] = useState<HostedBot[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    bkashNumber: '',
    nagadNumber: '',
    rocketNumber: '',
    binanceId: '',
    binanceUid: '',
    binancePayId: '',
    instructionsBn: '',
    instructionsEn: ''
  });

  // Add Plan Form State
  const [showAddPlanForm, setShowAddPlanForm] = useState(false);
  const [newPlanData, setNewPlanData] = useState({
    id: '',
    nameBn: '',
    nameEn: '',
    durationDays: 30,
    maxBots: 3,
    priceBdt: 200,
    priceUsd: 2.0,
    popular: false,
    featuresBn: '২৪/৭ সার্বক্ষণিক লাইভ বট\nস্বয়ংক্রিয় ক্র্যাশ রিস্টার্ট\nলাইভ কনসোল ও লগস',
    featuresEn: '24/7 Priority Bot Uptime\nAuto Crash Recovery\nLive Console & Logs'
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const adminDirectUrl = `${window.location.origin}/?admin=true`;

  // UI, Scrolling and Viewport state
  const [showStatsExpanded, setShowStatsExpanded] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const tabsNavRef = useRef<HTMLDivElement | null>(null);
  const tabButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const scrollToTop = () => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectTab = (tabId: AdminTabType) => {
    setActiveTab(tabId);
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setTimeout(() => {
      tabButtonRefs.current[tabId]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }, 50);
  };

  const scrollTabsNav = (direction: 'left' | 'right') => {
    if (tabsNavRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      tabsNavRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0;
    }
  }, [activeTab]);

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

      // 6. Hosting Plans
      const plRes = await fetch('/api/plans');
      if (plRes.ok) {
        const plData = await plRes.json();
        setPlans(plData.plans || []);
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
      setNotification({
        type: 'success',
        message: 'অনুরোধ সফলভাবে অনুমোদন করা হয়েছে (Approved successfully) এবং ইউজারের একাউন্টে ব্যালেন্স/প্ল্যান যুক্ত হয়েছে!'
      });
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
      setNotification({ type: 'success', message: 'অনুরোধ বাতিল করা হয়েছে (Request rejected).' });
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
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save settings');
      setNotification({ type: 'success', message: 'পেমেন্ট সেটিংস সফলভাবে সংরক্ষিত হয়েছে!' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSavePlans = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoadingId('save_plans');
    const token = localStorage.getItem('bot_auth_token');
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plans })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save plans');
      setNotification({ type: 'success', message: 'প্লান ও প্রাইসিং সফলভাবে সংরক্ষিত হয়েছে!' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAddNewPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoadingId('add_new_plan');
    const token = localStorage.getItem('bot_auth_token');
    try {
      const res = await fetch('/api/admin/plans/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newPlanData)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'প্যাকেজ যোগ করতে ব্যর্থ');
      
      setNotification({ type: 'success', message: '🎉 নতুন হোস্টিং প্যাকেজ সফলভাবে যোগ করা হয়েছে!' });
      setShowAddPlanForm(false);
      setNewPlanData({
        id: '',
        nameBn: '',
        nameEn: '',
        durationDays: 30,
        maxBots: 3,
        priceBdt: 200,
        priceUsd: 2.0,
        popular: false,
        featuresBn: '২৪/৭ সার্বক্ষণিক লাইভ বট\nস্বয়ংক্রিয় ক্র্যাশ রিস্টার্ট\nলাইভ কনসোল ও লগস',
        featuresEn: '24/7 Priority Bot Uptime\nAuto Crash Recovery\nLive Console & Logs'
      });
      loadAllAdminData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (planId === 'free') {
      alert('ফ্রি প্যাকেজ ডিলিট করা যাবে না।');
      return;
    }
    if (!confirm(`আপনি কি নিশ্চিত যে এই প্যাকেজটি (${planId}) ডিলিট করতে চান?`)) return;

    setActionLoadingId(`del_${planId}`);
    const token = localStorage.getItem('bot_auth_token');
    try {
      const res = await fetch(`/api/admin/plans/${planId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'ডিলিট করতে ব্যর্থ');
      setNotification({ type: 'success', message: 'প্যাকেজ ডিলিট করা হয়েছে।' });
      loadAllAdminData();
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
      r.transactionId?.toLowerCase().includes(q) ||
      (r.type && r.type.includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-4 bg-[#030712]/92 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1120] border border-[#1e2e48] shadow-2xl rounded-2xl sm:rounded-3xl max-w-6xl w-full p-3 sm:p-5 text-white relative h-[95vh] max-h-[95vh] flex flex-col overflow-hidden">
        
        {/* Pinned Header (shrink-0) */}
        <div className="flex items-center justify-between border-b border-[#1f2c42] pb-3 mb-2.5 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10 shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                <span>{lang === 'bn' ? 'এডমিন কন্ট্রোল প্যানেল' : 'Admin Control Panel'}</span>
                <span className="text-[9px] sm:text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {lang === 'bn' ? 'এডমিন মোড' : 'Admin Mode'}
                </span>
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 line-clamp-1">
                {lang === 'bn'
                  ? 'ডিপোজিট ও প্যাকেজ অনুমোদন, স্টোর ফাইল, ক্যাটাগরি, ব্যানার, নোটিশ ও ইউজার কন্ট্রোল'
                  : 'Approve deposits, manage packages, store files, categories, banners, notices & users'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 bg-[#09101d] p-1 rounded-xl border border-[#1d2d47]">
            {/* Direct URL Copy Button */}
            <button
              type="button"
              onClick={() => handleCopy(adminDirectUrl, 'admin_url')}
              title={adminDirectUrl}
              className="h-8 px-2.5 rounded-lg bg-[#121d30] hover:bg-[#0088cc]/20 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-[#223554] transition-all"
            >
              {copiedId === 'admin_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{copiedId === 'admin_url' ? 'কপি হয়েছে' : 'এডমিন লিংক'}</span>
            </button>

            {/* Overview Stats Toggle */}
            <button
              type="button"
              onClick={() => setShowStatsExpanded(!showStatsExpanded)}
              className={`h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer border transition-all ${
                showStatsExpanded
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-[#121d30] border-[#223554] text-slate-300 hover:text-white hover:bg-[#192740]'
              }`}
              title="পরিসংখ্যান দেখুন / লুকান"
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">পরিসংখ্যান</span>
              {showStatsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Reload Data Button */}
            <button
              onClick={loadAllAdminData}
              title={lang === 'bn' ? 'ডাটা রিফ্রেশ করুন' : 'Refresh Data'}
              className="h-8 w-8 rounded-lg bg-[#121d30] hover:bg-[#192740] border border-[#223554] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0088cc]' : ''}`} />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg bg-[#121d30] hover:bg-rose-900/50 border border-[#223554] hover:border-rose-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Overview Stats (shrink-0) */}
        {overview && (
          <div className="shrink-0 mb-2.5">
            {showStatsExpanded ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 p-2.5 rounded-2xl bg-[#080e1a] border border-[#1e2d48] animate-in fade-in duration-150">
                <div className="p-2 sm:p-2.5 rounded-xl bg-[#0e1726] border border-[#1f2e46]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{lang === 'bn' ? 'মোট ইউজার' : 'Total Users'}</p>
                  <p className="text-sm sm:text-base font-black text-white mt-0.5">{overview.totalUsers}</p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-[#0e1726] border border-[#1f2e46]">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{lang === 'bn' ? 'লাইভ বট' : 'Live Bots'}</p>
                  <p className="text-sm sm:text-base font-black text-emerald-400 mt-0.5">{overview.runningBots} / {overview.totalBots}</p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-[#0e1726] border border-[#1f2e46]">
                  <p className="text-[10px] font-bold text-amber-400 uppercase">{lang === 'bn' ? 'অপেক্ষমান রিকোয়েস্ট' : 'Pending Requests'}</p>
                  <p className="text-sm sm:text-base font-black text-amber-300 mt-0.5">{overview.pendingRequestsCount}</p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-[#0e1726] border border-[#1f2e46]">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase">{lang === 'bn' ? 'অনুমোদিত' : 'Approved'}</p>
                  <p className="text-sm sm:text-base font-black text-emerald-300 mt-0.5">{overview.approvedRequestsCount}</p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-[#0e1726] border border-[#1f2e46] col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase">{lang === 'bn' ? 'মোট আয়' : 'Revenue'}</p>
                  <p className="text-sm sm:text-base font-black text-emerald-300 mt-0.5">${Number(overview.totalRevenueUsd ?? overview.totalRevenueBdt ?? 0).toFixed(2)} USDT</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#080e1a] border border-[#1e2d48] text-[11px] text-slate-300">
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                  <span>👥 ইউজার: <strong className="text-white">{overview.totalUsers}</strong></span>
                  <span>🤖 লাইভ বট: <strong className="text-emerald-400">{overview.runningBots}</strong>/{overview.totalBots}</span>
                  <span>⏰ পেন্ডিং: <strong className={overview.pendingRequestsCount > 0 ? 'text-amber-400 font-black' : 'text-slate-400'}>{overview.pendingRequestsCount}</strong></span>
                  <span className="hidden sm:inline">💰 মোট আয়: <strong className="text-emerald-400 font-bold">${Number(overview.totalRevenueUsd ?? overview.totalRevenueBdt ?? 0).toFixed(2)} USDT</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStatsExpanded(true)}
                  className="text-amber-400 hover:text-amber-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                >
                  <span>পূর্ণ ভিউ</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Notification Toast */}
        {notification && (
          <div className={`p-2.5 rounded-xl mb-2 text-xs flex items-center justify-between gap-2 shrink-0 animate-in fade-in ${
            notification.type === 'success' ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300' : 'bg-rose-950/60 border border-rose-500/50 text-rose-300'
          }`}>
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="cursor-pointer text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Unified Tabs Navigation Bar (Fixed / shrink-0) */}
        <div className="shrink-0 mb-3 bg-[#080e1a] p-1.5 rounded-2xl border border-[#182740]">
          <div className="relative flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollTabsNav('left')}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#0f192b] hover:bg-[#18263f] border border-[#1f304d] text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 shadow-sm"
              title={lang === 'bn' ? 'বামে স্ক্রোল করুন' : 'Scroll left'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div
              ref={tabsNavRef}
              className="flex items-center gap-1.5 overflow-x-auto py-0.5 scroll-smooth no-scrollbar flex-1"
            >
              {[
                { id: 'requests' as AdminTabType, labelBn: 'অনুরোধ ও ডিপোজিট', labelEn: 'Requests & Deposits', icon: Clock, iconColor: 'text-sky-400', badge: overview?.pendingRequestsCount },
                { id: 'users' as AdminTabType, labelBn: 'ইউজার ও ওয়ালেট', labelEn: 'Users & Wallets', icon: Users, iconColor: 'text-indigo-400' },
                { id: 'pricing' as AdminTabType, labelBn: 'প্যাকেজ ও প্রাইসিং', labelEn: 'Packages & Pricing', icon: DollarSign, iconColor: 'text-amber-400' },
                { id: 'store' as AdminTabType, labelBn: 'স্টোর ও ফাইলসমূহ', labelEn: 'Store & Files', icon: ShoppingBag, iconColor: 'text-emerald-400' },
                { id: 'categories' as AdminTabType, labelBn: 'ক্যাটাগরি সমূহ', labelEn: 'Categories', icon: Folder, iconColor: 'text-yellow-400' },
                { id: 'banners' as AdminTabType, labelBn: 'ব্যানার স্লাইডার', labelEn: 'Banners', icon: Sparkles, iconColor: 'text-pink-400' },
                { id: 'notices' as AdminTabType, labelBn: 'জরুরি নোটিশ', labelEn: 'Notices', icon: BellRing, iconColor: 'text-teal-400' },
                { id: 'support' as AdminTabType, labelBn: 'সাপোর্ট ইনবক্স', labelEn: 'Support Inbox', icon: Headphones, iconColor: 'text-cyan-400' },
                { id: 'payments' as AdminTabType, labelBn: 'পেমেন্ট নাম্বার', labelEn: 'Payment Numbers', icon: CreditCard, iconColor: 'text-purple-400' },
                { id: 'bots' as AdminTabType, labelBn: 'সকল বট নিয়ন্ত্রণ', labelEn: 'All Bots Control', icon: Bot, iconColor: 'text-blue-400' },
                { id: 'smtp' as AdminTabType, labelBn: 'SMTP সেটিংস', labelEn: 'SMTP Email', icon: Mail, iconColor: 'text-orange-400' },
              ].map((tab) => {
                const IconComp = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    ref={(el) => (tabButtonRefs.current[tab.id] = el)}
                    onClick={() => handleSelectTab(tab.id)}
                    className={`h-9 px-3.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 border ${
                      isActive
                        ? 'bg-gradient-to-r from-[#0088cc] to-[#0072ad] border-sky-400 text-white shadow-md shadow-[#0088cc]/25'
                        : 'bg-[#0e1728] border-[#1b2b45] text-slate-300 hover:text-white hover:bg-[#15233c] hover:border-slate-600'
                    }`}
                  >
                    <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-white' : tab.iconColor}`} />
                    <span>{lang === 'bn' ? tab.labelBn : tab.labelEn}</span>
                    {typeof tab.badge === 'number' && tab.badge > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse leading-none shadow-sm">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => scrollTabsNav('right')}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#0f192b] hover:bg-[#18263f] border border-[#1f304d] text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 shadow-sm"
              title={lang === 'bn' ? 'ডানে স্ক্রোল করুন' : 'Scroll right'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MASTER SCROLLABLE CONTENT VIEWPORT (flex-1 min-h-0 overflow-y-auto) */}
        <div
          ref={contentScrollRef}
          onScroll={(e) => {
            const target = e.currentTarget;
            setShowBackToTop(target.scrollTop > 180);
          }}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 sm:pr-2 pb-24 space-y-4 focus:outline-none custom-scrollbar"
          tabIndex={0}
        >
          {/* Tab 1: Requests & Deposits Queue */}
          {activeTab === 'requests' && (
            <div className="space-y-3 pr-1">
            {/* Filter & Search */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#09101d] p-2 rounded-2xl border border-[#1a2942]">
              <div className="flex items-center gap-1 bg-[#060b14] p-1 rounded-xl border border-[#16243b]">
                {(['pending', 'approved', 'rejected', 'all'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`h-7 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterStatus === st
                        ? 'bg-[#0088cc] text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-[#121c2e]'
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
                  className="bg-[#060b14] border border-[#16243b] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0088cc]"
                />
              </div>
            </div>

            {/* Requests Cards */}
            {filteredRequests.length === 0 ? (
              <div className="p-8 text-center bg-[#0d1524] border border-[#1f2d48] rounded-2xl">
                <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">
                  {lang === 'bn' ? 'কোনো অনুরোধ পাওয়া যায়নি।' : 'No requests found.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredRequests.map((req) => {
                  const isDeposit = req.type === 'deposit';

                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-[#0d1524] border border-[#1f2d48] flex flex-wrap items-center justify-between gap-3 text-xs hover:border-slate-600 transition-colors"
                    >
                      <div className="space-y-1.5 max-w-md">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            isDeposit ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}>
                            {isDeposit ? '💰 ওয়ালেট ডিপোজিট' : '📦 প্যাকেজ সাবস্ক্রিপশন'}
                          </span>
                          <span className="font-bold text-white text-sm">{req.userName}</span>
                          <span className="text-slate-400 text-[11px]">({req.userEmail})</span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-[#0088cc]/20 text-[#0088cc] font-bold text-[11px]">
                            {req.planName}
                          </span>
                          <span className="font-black text-emerald-400 text-sm">
                            ${req.amount} USDT
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-bold text-[10px]">
                            {req.method}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-300 flex-wrap">
                          <span>প্রেরক: <strong className="font-mono text-white">{req.senderNumber || req.senderIdentifier}</strong></span>
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
                          তারিখ: {new Date(req.createdAt).toLocaleString('bn-BD')} {req.note ? `• নোট: ${req.note}` : ''}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {req.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleApproveRequest(req.id)}
                              disabled={actionLoadingId === req.id}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer disabled:opacity-50 transition-all"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{isDeposit ? (lang === 'bn' ? 'ডিপোজিট অনুমোদন করুন' : 'Approve Deposit') : (lang === 'bn' ? 'প্লান অনুমোদন করুন' : 'Approve Plan')}</span>
                            </button>

                            <button
                              onClick={() => handleRejectRequest(req.id)}
                              disabled={actionLoadingId === req.id}
                              className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-all"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{lang === 'bn' ? 'বাতিল' : 'Reject'}</span>
                            </button>
                          </>
                        ) : req.status === 'approved' ? (
                          <div className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{lang === 'bn' ? 'অনুমোদিত (Approved)' : 'Approved'}</span>
                          </div>
                        ) : (
                          <div className="px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-400 text-xs font-semibold">
                            {lang === 'bn' ? 'বাতিলকৃত' : 'Rejected'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Users & Wallets */}
        {activeTab === 'users' && (
          <div className="space-y-2.5 pr-1">
            {users.map((u) => (
              <div
                key={u.id}
                className="p-3.5 rounded-2xl bg-[#0d1524] border border-[#1f2d48] flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
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
                  
                  {/* Balance Display */}
                  <div className="flex items-center gap-2 text-xs flex-wrap pt-0.5">
                    <span className="text-slate-400">ওয়ালেট ব্যালেন্স:</span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold font-mono">
                      ${Number(u.balanceUsd ?? 0).toFixed(2)} USDT
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    বট সংখ্যা: <strong className="text-white">{u.botsCount || 0}</strong> • সীমা: <strong className="text-[#0088cc]">{u.maxBots || 1}টি</strong> • মেয়াদ: {u.expiresAtFormatted}
                  </p>
                </div>

                {/* Actions */}
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

        {/* Tab 3: Packages & Pricing */}
        {activeTab === 'pricing' && (
          <div className="space-y-4 pr-1">
            {/* Header with Add Plan Button */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="font-extrabold text-sm text-white">
                    {lang === 'bn' ? 'প্যাকেজ ও প্রাইসিং কনফিগারেশন' : 'Packages & Pricing Management'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'bn'
                      ? 'নতুন হোস্টিং প্যাকেজ যোগ করুন বা বিদ্যমান প্যাকেজের মূল্য ও বট লিমিট পরিবর্তন করুন।'
                      : 'Add new hosting plans or adjust prices and bot limits for existing ones.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddPlanForm(!showAddPlanForm)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddPlanForm ? 'ফর্ম বন্ধ করুন' : '+ নতুন প্যাকেজ যোগ করুন'}</span>
              </button>
            </div>

            {/* Expandable Add Plan Form */}
            {showAddPlanForm && (
              <form onSubmit={handleAddNewPlan} className="p-4 rounded-2xl bg-[#090f1a] border border-emerald-500/40 space-y-3.5 text-xs animate-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-[#1f2d48] pb-2">
                  <span className="font-black text-emerald-400 text-xs uppercase tracking-wider">
                    নতুন প্যাকেজের তথ্য দিন (Add New Hosting Package)
                  </span>
                  <button type="button" onClick={() => setShowAddPlanForm(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">প্যাকেজ আইডি (Unique ID):</label>
                    <input
                      type="text"
                      value={newPlanData.id}
                      onChange={(e) => setNewPlanData({ ...newPlanData, id: e.target.value })}
                      placeholder="e.g. 2_months_special"
                      className="w-full bg-[#0d1627] border border-[#1f2d48] rounded-xl p-2 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">নাম (বাংলা):</label>
                    <input
                      type="text"
                      value={newPlanData.nameBn}
                      onChange={(e) => setNewPlanData({ ...newPlanData, nameBn: e.target.value })}
                      placeholder="e.g. ২ মাস স্পেশাল"
                      className="w-full bg-[#0d1627] border border-[#1f2d48] rounded-xl p-2 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">নাম (English):</label>
                    <input
                      type="text"
                      value={newPlanData.nameEn}
                      onChange={(e) => setNewPlanData({ ...newPlanData, nameEn: e.target.value })}
                      placeholder="e.g. 2 Months Special"
                      className="w-full bg-[#0d1627] border border-[#1f2d48] rounded-xl p-2 text-xs text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-emerald-400 mb-1">মূল্য ($ USDT):</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={newPlanData.priceUsd}
                      onChange={(e) => {
                        const p = parseFloat(e.target.value) || 0;
                        setNewPlanData({ ...newPlanData, priceUsd: p, priceBdt: Math.round(p * 120) });
                      }}
                      className="w-full bg-[#0d1627] border border-emerald-500/40 rounded-xl p-2 text-xs text-white font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">মেয়াদ (দিন):</label>
                    <input
                      type="number"
                      min="1"
                      value={newPlanData.durationDays}
                      onChange={(e) => setNewPlanData({ ...newPlanData, durationDays: parseInt(e.target.value, 10) || 30 })}
                      className="w-full bg-[#0d1627] border border-[#1f2d48] rounded-xl p-2 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">বট সীমা (Max Bots):</label>
                    <input
                      type="number"
                      min="1"
                      value={newPlanData.maxBots}
                      onChange={(e) => setNewPlanData({ ...newPlanData, maxBots: parseInt(e.target.value, 10) || 1 })}
                      className="w-full bg-[#0d1627] border border-[#1f2d48] rounded-xl p-2 text-xs text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">সুবিধাসমূহ (বাংলা - প্রতি লাইনে একটি):</label>
                    <textarea
                      rows={2}
                      value={newPlanData.featuresBn}
                      onChange={(e) => setNewPlanData({ ...newPlanData, featuresBn: e.target.value })}
                      className="w-full bg-[#0d1627] border border-[#1f2d48] rounded-xl p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Features (English - one per line):</label>
                    <textarea
                      rows={2}
                      value={newPlanData.featuresEn}
                      onChange={(e) => setNewPlanData({ ...newPlanData, featuresEn: e.target.value })}
                      className="w-full bg-[#0d1627] border border-[#1f2d48] rounded-xl p-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={newPlanData.popular}
                      onChange={(e) => setNewPlanData({ ...newPlanData, popular: e.target.checked })}
                      className="rounded text-pink-500"
                    />
                    <span>⭐ পপুলার বা বেস্ট চয়েস ব্যাজ দেখান</span>
                  </label>

                  <button
                    type="submit"
                    disabled={actionLoadingId === 'add_new_plan'}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {actionLoadingId === 'add_new_plan' ? 'যুক্ত হচ্ছে...' : 'প্যাকেজ সেভ করুন'}
                  </button>
                </div>
              </form>
            )}

            {/* Existing Plans Form Grid */}
            <form onSubmit={handleSavePlans} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {plans.map((p, idx) => (
                  <div key={p.id} className="p-4 rounded-2xl bg-[#0d1524] border border-[#1f2d48] space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-white">{p.nameBn} ({p.nameEn})</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#0088cc]/20 text-[#0088cc] border border-[#0088cc]/30">
                          {p.id}
                        </span>
                        {p.id !== 'free' && (
                          <button
                            type="button"
                            onClick={() => handleDeletePlan(p.id)}
                            className="p-1 rounded-lg text-rose-400 hover:text-white hover:bg-rose-950/60 transition-colors cursor-pointer"
                            title="Delete Plan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-400 mb-1">
                          মূল্য ($ USDT):
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={p.priceUsd}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const updated = [...plans];
                            updated[idx] = { ...updated[idx], priceUsd: val, priceBdt: Math.round(val * 120) };
                            setPlans(updated);
                          }}
                          className="w-full bg-[#090e18] border border-[#1f2d48] focus:border-emerald-400 rounded-xl p-2 text-xs text-white font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          সর্বোচ্চ বট (Max Bots):
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={p.maxBots}
                          onChange={(e) => {
                            const updated = [...plans];
                            updated[idx] = { ...updated[idx], maxBots: parseInt(e.target.value, 10) || 1 };
                            setPlans(updated);
                          }}
                          className="w-full bg-[#090e18] border border-[#1f2d48] focus:border-[#0088cc] rounded-xl p-2 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          মেয়াদ (Days):
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={p.durationDays}
                          onChange={(e) => {
                            const updated = [...plans];
                            updated[idx] = { ...updated[idx], durationDays: parseInt(e.target.value, 10) || 1 };
                            setPlans(updated);
                          }}
                          className="w-full bg-[#090e18] border border-[#1f2d48] focus:border-[#0088cc] rounded-xl p-2 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={actionLoadingId === 'save_plans'}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-slate-950 font-black text-xs shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  {actionLoadingId === 'save_plans' ? 'সংরক্ষণ হচ্ছে...' : 'প্ল্যান ও প্রাইসিং সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 4: Payment Settings */}
        {activeTab === 'payments' && (
          <form onSubmit={handleSavePaymentSettings} className="space-y-4 pr-1">
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

              <div>
                <label className="block font-bold text-amber-400 mb-1">
                  Binance UID (বাইন্যান্স ইউজার আইডি):
                </label>
                <input
                  type="text"
                  value={paymentSettings.binanceUid || ''}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, binanceUid: e.target.value })}
                  placeholder="849201948 (Personal Binance UID)"
                  className="w-full bg-[#090e18] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-bold text-amber-400 mb-1">
                  Binance Pay ID (বাইন্যান্স পে আইডি):
                </label>
                <input
                  type="text"
                  value={paymentSettings.binancePayId || ''}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, binancePayId: e.target.value })}
                  placeholder="849201948 (Binance Pay ID)"
                  className="w-full bg-[#090e18] border border-[#1f2d48] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
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

        {/* Tab 5: All Bots Control */}
        {activeTab === 'bots' && (
          <div className="space-y-2.5 pr-1">
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

        {/* Store Items & Files Tab */}
        {activeTab === 'store' && <AdminStoreManager />}

        {/* Categories Tab */}
        {activeTab === 'categories' && <AdminCategoriesManager />}

        {/* Hero Banners Control Tab */}
        {activeTab === 'banners' && <AdminBannersManager />}

        {/* Notices & Broadcasts Tab */}
        {activeTab === 'notices' && <AdminNoticesManager />}

        {/* Support Inbox & Settings Tab */}
        {activeTab === 'support' && <AdminSupportManager />}

        {/* SMTP Email Settings Tab */}
        {activeTab === 'smtp' && <AdminSmtpManager lang={lang} />}

        </div>

        {/* Floating Quick Scroll to Top button */}
        {showBackToTop && (
          <button
            type="button"
            onClick={scrollToTop}
            className="absolute bottom-5 right-5 z-20 p-2.5 rounded-full bg-[#0088cc] hover:bg-[#0077b5] text-white shadow-xl flex items-center justify-center cursor-pointer transition-all hover:scale-105 border border-sky-400/30 animate-in fade-in"
            title={lang === 'bn' ? 'উপরে স্ক্রোল করুন' : 'Scroll to top'}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}

      </div>
    </div>
  );
};
