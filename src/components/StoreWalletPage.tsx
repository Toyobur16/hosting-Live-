import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  ArrowLeft,
  Copy,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Send,
  Coins
} from 'lucide-react';
import { AuthUser, PaymentSettings, DepositRequest } from '../types';

interface StoreWalletPageProps {
  user: AuthUser | null;
  onOpenAuthModal: () => void;
  onNavigateToPlans: () => void;
  onUserUpdated?: (updatedUser: AuthUser) => void;
}

export function StoreWalletPage({
  user,
  onOpenAuthModal,
  onNavigateToPlans,
  onUserUpdated
}: StoreWalletPageProps) {
  const [view, setView] = useState<'overview' | 'deposit'>('overview');
  const [activeHistoryTab, setActiveHistoryTab] = useState<'all' | 'deposits' | 'purchases'>('all');
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    binanceUid: '922593999',
    binancePayId: '922593999',
    binanceId: '922593999',
    binanceEnabled: true,
    bkashNumber: '01614572747',
    bkashEnabled: true,
    nagadNumber: '01304104492',
    nagadEnabled: true,
    rocketNumber: '01304104492',
    rocketEnabled: true
  });

  const [selectedGateway, setSelectedGateway] = useState<'binance' | 'bkash' | 'nagad' | 'rocket'>('binance');
  const [depositAmount, setDepositAmount] = useState<string>('5');
  const [depositCurrency, setDepositCurrency] = useState<'USD' | 'BDT'>('USD');
  const [senderIdentifier, setSenderIdentifier] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [depositNote, setDepositNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [userRequests, setUserRequests] = useState<DepositRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const BDT_RATE = 120; // 1 USDT = 120 BDT

  useEffect(() => {
    fetchPaymentSettings();
    if (user) fetchUserRequests();
  }, [user]);

  const fetchPaymentSettings = async () => {
    try {
      const res = await fetch('/api/settings/payment');
      if (res.ok) {
        const data = await res.json();
        setPaymentSettings(data);
      }
    } catch {}
  };

  const fetchUserRequests = async () => {
    const token = localStorage.getItem('bot_auth_token');
    if (!token) return;
    try {
      setLoadingRequests(true);
      const res = await fetch('/api/wallet/my-deposits', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserRequests(data.deposits || []);
      }
    } catch {} finally {
      setLoadingRequests(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuthModal();
      return;
    }

    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) {
      setSubmitError('অনুগ্রহ করে সঠিক পরিমাণ লিখুন (Enter a valid amount)');
      return;
    }

    if (!transactionId.trim()) {
      setSubmitError('Transaction ID (TrxID) দেওয়া আবশ্যক');
      return;
    }

    if (!senderIdentifier.trim()) {
      setSubmitError(selectedGateway === 'binance' ? 'আপনার Binance Pay ID / UID লিখুন' : 'প্রেরক ফোন নাম্বার লিখুন');
      return;
    }

    const token = localStorage.getItem('bot_auth_token');
    try {
      setSubmitting(true);
      setSubmitError(null);
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: amt,
          currency: 'USD',
          method: selectedGateway,
          senderIdentifier: senderIdentifier.trim(),
          transactionId: transactionId.trim(),
          note: depositNote.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setSubmitError(data.error || 'ডিপোজিট রিকোয়েস্ট ব্যর্থ হয়েছে');
        return;
      }

      setSubmitSuccess('🎉 আপনার ডিপোজিট রিকোয়েস্ট সফলভাবে জমা হয়েছে! এডমিন যাচাই করে দ্রুত ব্যালেন্স যুক্ত করবেন।');
      setTransactionId('');
      setSenderIdentifier('');
      setDepositNote('');
      fetchUserRequests();

      setTimeout(() => {
        setSubmitSuccess(null);
        setView('overview');
      }, 3500);
    } catch (err: any) {
      setSubmitError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered transactions
  const filteredRequests = userRequests.filter((r) => {
    if (activeHistoryTab === 'deposits') return r.status === 'approved' || r.status === 'pending';
    if (activeHistoryTab === 'purchases') return false;
    return true;
  });

  const getGatewayNumber = () => {
    if (selectedGateway === 'binance') return paymentSettings.binancePayId || paymentSettings.binanceUid || paymentSettings.binanceId || '922593999';
    if (selectedGateway === 'bkash') return paymentSettings.bkashNumber || '01614572747';
    if (selectedGateway === 'nagad') return paymentSettings.nagadNumber || '01304104492';
    if (selectedGateway === 'rocket') return paymentSettings.rocketNumber || '01304104492';
    return '';
  };

  const getGatewayTitle = () => {
    if (selectedGateway === 'binance') return 'Binance (USDT)';
    if (selectedGateway === 'bkash') return 'bKash (বিকাশ)';
    if (selectedGateway === 'nagad') return 'Nagad (নগদ)';
    if (selectedGateway === 'rocket') return 'Rocket (রকেট)';
    return '';
  };

  const calculatedBdt = (parseFloat(depositAmount) || 0) * BDT_RATE;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 animate-in fade-in duration-200 px-2 sm:px-4">
      {view === 'overview' ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#00d293]/15 flex items-center justify-center text-[#00d293]">
                <Wallet className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                My Wallet
              </h2>
            </div>
            {user && (
              <button
                onClick={onNavigateToPlans}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
              >
                👑 হোস্টিং প্লান দেখুন
              </button>
            )}
          </div>

          {/* Gradient Balance Card strictly in USDT */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#00d293]/20 via-[#0d1c2e] to-[#070e18] border border-[#00d293]/30 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Current Balance
                </span>
                <div className="flex items-baseline gap-2.5 mt-1.5">
                  <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                    ${(user?.balanceUsd || 0).toFixed(2)}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-[#00d293] px-2.5 py-1 rounded-lg bg-[#00d293]/15 uppercase tracking-wider">
                    USDT
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  এই ব্যালেন্স দিয়ে যেকোনো বট ফাইল, স্ক্রিপ্ট ও হোস্টিং প্লান কিনতে পারবেন।
                </p>
              </div>

              {/* + Deposit Pill Button */}
              <div>
                <button
                  id="wallet-open-deposit-btn"
                  onClick={() => {
                    if (!user) onOpenAuthModal();
                    else setView('deposit');
                  }}
                  className="px-6 py-3 rounded-full bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-[#00d293]/30 cursor-pointer transition-all hover:scale-105 active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Deposit USDT</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filter Tabs: All | Deposits | Purchases */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#162035] pb-2">
              <button
                onClick={() => setActiveHistoryTab('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeHistoryTab === 'all'
                    ? 'bg-[#00d293] text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Transactions
              </button>
              <button
                onClick={() => setActiveHistoryTab('deposits')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeHistoryTab === 'deposits'
                    ? 'bg-[#00d293] text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Deposits
              </button>
              <button
                onClick={() => setActiveHistoryTab('purchases')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeHistoryTab === 'purchases'
                    ? 'bg-[#00d293] text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Purchases
              </button>
            </div>

            {/* List */}
            {loadingRequests ? (
              <div className="p-8 text-center text-slate-400 text-xs">লোড হচ্ছে...</div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#0d1424] border border-[#1e2e42] text-center space-y-2">
                <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">কোনো ডিপোজিট বা ট্রানজেকশন হিস্ট্রি নেই।</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          req.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : req.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {req.status === 'approved' ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : req.status === 'rejected' ? (
                          <XCircle className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span className="uppercase">{req.method} Deposit</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                              req.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : req.status === 'rejected'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {req.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          TrxID: {req.transactionId} • {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-[#00d293]">
                        +${Number(req.amount || 0).toFixed(2)} USDT
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Deposit Money View */
        <div className="space-y-6">
          {/* Back to Wallet Button */}
          <button
            onClick={() => setView('overview')}
            className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-[#00d293] cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Wallet</span>
          </button>

          {/* Header */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00d293]/15 flex items-center justify-center text-[#00d293]">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              ডিপোজিট মেথড নির্বাচন করুন
            </h2>
          </div>

          {/* All 4 Payment Gateways Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* 1. Binance */}
            <button
              type="button"
              onClick={() => setSelectedGateway('binance')}
              className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                selectedGateway === 'binance'
                  ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/30 shadow-lg'
                  : 'bg-[#0d1424] border-[#1e2e42] hover:border-amber-400/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center font-black text-sm">
                  ₮
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-white block truncate">Binance</span>
                  <span className="text-[10px] text-amber-400 font-bold truncate">Pay ID / UID</span>
                </div>
              </div>
            </button>

            {/* 2. bKash */}
            <button
              type="button"
              onClick={() => setSelectedGateway('bkash')}
              className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                selectedGateway === 'bkash'
                  ? 'bg-pink-500/15 border-pink-500 ring-2 ring-pink-500/30 shadow-lg'
                  : 'bg-[#0d1424] border-[#1e2e42] hover:border-pink-500/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-black text-xs">
                  বিকাশ
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-white block truncate">bKash</span>
                  <span className="text-[10px] text-pink-400 font-bold truncate">Send Money</span>
                </div>
              </div>
            </button>

            {/* 3. Nagad */}
            <button
              type="button"
              onClick={() => setSelectedGateway('nagad')}
              className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                selectedGateway === 'nagad'
                  ? 'bg-orange-500/15 border-orange-500 ring-2 ring-orange-500/30 shadow-lg'
                  : 'bg-[#0d1424] border-[#1e2e42] hover:border-orange-500/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-black text-xs">
                  নগদ
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-white block truncate">Nagad</span>
                  <span className="text-[10px] text-orange-400 font-bold truncate">Send Money</span>
                </div>
              </div>
            </button>

            {/* 4. Rocket */}
            <button
              type="button"
              onClick={() => setSelectedGateway('rocket')}
              className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                selectedGateway === 'rocket'
                  ? 'bg-purple-500/15 border-purple-500 ring-2 ring-purple-500/30 shadow-lg'
                  : 'bg-[#0d1424] border-[#1e2e42] hover:border-purple-500/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-xs">
                  রকেট
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-white block truncate">Rocket</span>
                  <span className="text-[10px] text-purple-400 font-bold truncate">Send Money</span>
                </div>
              </div>
            </button>
          </div>

          {/* Selected Gateway Details & Submission Form */}
          <div className="p-5 sm:p-7 rounded-3xl bg-[#0d1424] border border-[#1e2e42] shadow-xl space-y-5">
            {/* Step-by-Step Payment Instructions */}
            <div className="p-4 rounded-2xl bg-[#070b14] border border-[#1e293b] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>💎</span> {getGatewayTitle()} ডিপোজিট নির্দেশিকা
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00d293]/20 text-[#00d293] font-bold">
                  {selectedGateway === 'binance' ? 'USDT' : '১ USDT = ১২০ টাকা'}
                </span>
              </div>

              {/* Admin Number / Pay ID with 1-click Copy */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0f172a] border border-slate-700">
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-[11px] font-bold text-slate-300">
                    {selectedGateway === 'binance' ? 'এডমিন Binance Pay ID / UID:' : `এডমিন ${getGatewayTitle()} পার্সোনাল নাম্বার (Send Money):`}
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-wider mt-0.5 font-mono truncate">
                    {getGatewayNumber()}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(getGatewayNumber(), 'gatewayNumber')}
                  className="px-3.5 py-2 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95 shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedField === 'gatewayNumber' ? '✓ কপি হয়েছে!' : 'কপি করুন'}</span>
                </button>
              </div>

              {/* Sequential Steps Instructions */}
              <div className="p-3.5 rounded-xl bg-[#0a0f1d] border border-slate-800 space-y-2 text-xs leading-relaxed text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">১</span>
                  <p>
                    উপরের এডমিনের <strong className="text-white">{selectedGateway === 'binance' ? 'Binance Pay ID / UID' : `${getGatewayTitle()} নাম্বার`}</strong> কপি করে আপনার {getGatewayTitle()} একাউন্ট থেকে টাকা/ডলার পাঠান।
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">২</span>
                  <p>
                    পাঠানোর পর মেসেজ বা অ্যাপ থেকে প্রাপ্ত <strong className="text-white">Transaction ID (TrxID)</strong> কপি করুন।
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">৩</span>
                  <p>
                    নিচের বক্সে আপনার প্রেরক নাম্বার ও TrxID লিখে <strong className="text-[#00d293]">ডিপোজিট সাবমিট করুন</strong>। এডমিন যাচাই করে দ্রুত ব্যালেন্স যুক্ত করবেন।
                  </p>
                </div>
              </div>
            </div>

            {/* Submission Form */}
            <form onSubmit={handleSubmitDeposit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    ডলারের পরিমাণ (Deposit Amount in USDT) *
                  </label>
                  {selectedGateway !== 'binance' && (
                    <span className="text-[11px] font-bold text-amber-400">
                      আপনাকে পাঠাতে হবে: <strong className="text-white">{calculatedBdt} ৳</strong>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    required
                    value={depositAmount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a] border border-[#1e293b] text-sm text-white font-bold focus:border-[#00d293] focus:outline-hidden pr-20"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-[#00d293]">
                    USDT ($)
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  ১. {selectedGateway === 'binance' ? 'আপনার Binance UID / Pay ID (প্রেরক আইডি) *' : `আপনার ${getGatewayTitle()} প্রেরক নাম্বার (যে নাম্বার থেকে পাঠিয়েছেন) *`}
                </label>
                <input
                  type="text"
                  required
                  value={senderIdentifier}
                  onChange={(e) => setSenderIdentifier(e.target.value)}
                  placeholder={selectedGateway === 'binance' ? 'e.g. 922593999 (Binance UID)' : 'e.g. 017XXXXXXXX'}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a] border border-[#1e293b] text-sm text-white font-bold focus:border-[#00d293] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  ২. {getGatewayTitle()} Transaction ID (TrxID) *
                </label>
                <input
                  type="text"
                  required
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. 9J83KLOP01"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a] border border-[#1e293b] text-sm text-white font-bold uppercase tracking-wider focus:border-[#00d293] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  ৩. অতিরিক্ত তথ্য বা নোট (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  placeholder="কোনো বিশেষ মন্তব্য থাকলে লিখতে পারেন"
                  className="w-full px-4 py-2 rounded-xl bg-[#0f172a] border border-[#1e293b] text-xs text-white focus:border-[#00d293] focus:outline-hidden"
                />
              </div>

              {submitError && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{submitSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#00d293] to-emerald-400 hover:from-[#00be84] hover:to-emerald-500 text-slate-950 font-black text-sm shadow-xl shadow-[#00d293]/20 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-102 active:scale-98 disabled:opacity-50"
              >
                <Send className="w-4 h-4 stroke-[2.5]" />
                <span>{submitting ? 'সাবমিট হচ্ছে...' : 'ডিপোজিট রিকোয়েস্ট সাবমিট করুন'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
