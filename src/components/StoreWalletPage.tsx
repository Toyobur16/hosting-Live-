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
  Send
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
    bkashEnabled: false,
    nagadNumber: '01304104492',
    nagadEnabled: false,
    rocketNumber: '01304104492',
    rocketEnabled: false
  });

  const [selectedGateway, setSelectedGateway] = useState<'binance'>('binance');
  const [depositAmount, setDepositAmount] = useState<string>('5');
  const [depositCurrency, setDepositCurrency] = useState<'USD'>('USD');
  const [senderIdentifier, setSenderIdentifier] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [depositNote, setDepositNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [userRequests, setUserRequests] = useState<DepositRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

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
        setSelectedGateway('binance');
        setDepositCurrency('USD');
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
          currency: depositCurrency,
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
    if (activeHistoryTab === 'purchases') return false; // purely store purchases
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 animate-in fade-in duration-200">
      {view === 'overview' ? (
        <>
          {/* Header matching Screenshot 2 */}
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
                  এই ব্যালেন্স দিয়ে যেকোনো ফাইল, বট ও হোস্টিং প্লান কিনতে পারবেন।
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
                  <span>Deposit</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filter Tabs matching Screenshot 2: All | Deposits | Purchases */}
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
                All
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

            {/* Empty State / Transactions List matching Screenshot 2 */}
            {!user ? (
              <div className="p-10 rounded-2xl bg-[#0f172a] border border-[#1e293b] text-center space-y-3">
                <p className="text-xs text-slate-400">ট্রানজেকশন হিস্ট্রি দেখতে লগইন করুন।</p>
                <button
                  onClick={onOpenAuthModal}
                  className="px-4 py-2 rounded-xl bg-[#00d293] text-slate-950 font-bold text-xs cursor-pointer"
                >
                  লগইন করুন
                </button>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="py-14 px-6 rounded-3xl bg-[#0d1424] border border-[#1e293b] flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#162238] flex items-center justify-center text-slate-400 shadow-inner">
                  <FileText className="w-7 h-7 stroke-[1.5]" />
                </div>
                <h4 className="text-sm font-bold text-white">
                  No transactions yet
                </h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  আপনার অ্যাকাউন্টে এখনও কোনো ডিপোজিট বা ট্রানজেকশন নেই। টাকা জমা দিতে ডিপোজিট বাটনে ক্লিক করুন।
                </p>
                <button
                  onClick={() => setView('deposit')}
                  className="mt-2 px-5 py-2 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-black cursor-pointer shadow-md"
                >
                  + Deposit Now
                </button>
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
              + Deposit Money (USDT)
            </h2>
          </div>

          {/* Payment Gateway Cards (Binance by default; other methods only show if enabled in admin panel) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Binance Card (USDT) */}
            <button
              type="button"
              onClick={() => {
                setSelectedGateway('binance');
                setDepositCurrency('USD');
              }}
              className="p-4 rounded-2xl border text-left cursor-pointer transition-all bg-[#1f1b0a] border-amber-400 ring-2 ring-amber-400/30 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-amber-400/40 flex items-center justify-center text-amber-400 font-black text-sm shadow-md">
                  ₮
                </div>
                <div>
                  <span className="text-xs font-black text-white block">Binance (USDT)</span>
                  <span className="text-[10px] text-amber-400 font-semibold">Pay ID / UID</span>
                </div>
              </div>
              <div className="mt-3 text-xs font-black text-slate-200 bg-[#0a0f1d] p-2 rounded-lg border border-[#1e293b] truncate">
                {paymentSettings.binancePayId || paymentSettings.binanceUid || paymentSettings.binanceId || '922593999'}
              </div>
            </button>
          </div>

          {/* Selected Gateway Payment Details & Submission Form */}
          <div className="p-6 rounded-3xl bg-[#0d1424] border border-[#1e2e42] shadow-xl space-y-5">
            {/* Step-by-Step Payment Instructions */}
            <div className="p-4 rounded-2xl bg-[#070b14] border border-[#1e293b] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>💎</span> Binance ডিপোজিট পদ্ধতি
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00d293]/20 text-[#00d293] font-bold">
                  USDT Only
                </span>
              </div>

              {/* Admin Binance Pay ID / UID with 1-click Copy */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0f172a] border border-amber-500/30">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-amber-300">
                    এডমিন Binance Pay ID / UID (কপি করুন):
                  </span>
                  <span className="text-lg font-black text-white tracking-wider mt-0.5">
                    {paymentSettings.binancePayId || paymentSettings.binanceUid || paymentSettings.binanceId || '922593999'}
                  </span>
                </div>

                <button
                  type="button"
                  id="copy-admin-binance-id-btn"
                  onClick={() =>
                    handleCopy(
                      paymentSettings.binancePayId || paymentSettings.binanceUid || paymentSettings.binanceId || '922593999',
                      'gatewayNumber'
                    )
                  }
                  className="px-4 py-2 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedField === 'gatewayNumber' ? '✓ কপি হয়েছে!' : 'কপি করুন'}</span>
                </button>
              </div>

              {/* Sequential Steps Instructions */}
              <div className="p-3.5 rounded-xl bg-[#0a0f1d] border border-slate-800 space-y-2 text-xs leading-relaxed text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">১</span>
                  <p>উপরের এডমিনের <strong className="text-white">Binance Pay ID / UID</strong> কপি করে আপনার Binance অ্যাপে গিয়ে ডলার (USDT) পাঠান।</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">২</span>
                  <p>ডলার পাঠানোর পর Binance অ্যাপ থেকে প্রাপ্ত <strong className="text-white">Order ID (অর্ডার আইডি)</strong> কপি করুন।</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">৩</span>
                  <p>নিচের বক্সে প্রথমে আপনার <strong className="text-white">Binance UID</strong> এবং পরে <strong className="text-white">Order ID</strong> পেস্ট করে ডিপোজিট সাবমিট করুন।</p>
                </div>
              </div>
            </div>

            {/* Submission Form */}
            <form onSubmit={handleSubmitDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  ডলারের পরিমাণ (Deposit Amount in USDT) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.5"
                    required
                    value={depositAmount}
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
                  ১. প্রথমে: আপনার Binance UID / Pay ID (প্রেরক আইডি) *
                </label>
                <input
                  type="text"
                  required
                  value={senderIdentifier}
                  onChange={(e) => setSenderIdentifier(e.target.value)}
                  placeholder="e.g. 922593999 (আপনার Binance একাউন্ট আইডি)"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a] border border-[#1e293b] text-sm text-white font-bold focus:border-[#00d293] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  ২. পরে: Binance Order ID / TrxID (অর্ডার আইডি) *
                </label>
                <input
                  type="text"
                  required
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. 2384910294819284 (ডলার পাঠানোর পর প্রাপ্ত অর্ডার আইডি)"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0f172a] border border-[#1e293b] text-sm text-white font-bold uppercase tracking-wider focus:border-[#00d293] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  ৩. নোট বা অতিরিক্ত তথ্য (ঐচ্ছিক)
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
                className="w-full py-3.5 rounded-2xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-sm shadow-lg shadow-[#00d293]/20 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-101 active:scale-98 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'সাবমিট হচ্ছে...' : 'ডিপোজিট সাবমিট করুন'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
