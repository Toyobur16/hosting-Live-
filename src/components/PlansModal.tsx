import React, { useState, useEffect } from 'react';
import { X, Check, ShieldCheck, Sparkles, Crown, Zap, Clock, CreditCard, Send, CheckCircle2, AlertCircle, Copy, HelpCircle } from 'lucide-react';
import { HostingPlan, PaymentSettings, AuthUser, PlanRequest } from '../types';

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  onOpenAuthModal: () => void;
  lang: 'bn' | 'en';
}

export const PlansModal: React.FC<PlansModalProps> = ({
  isOpen,
  onClose,
  user,
  onOpenAuthModal,
  lang
}) => {
  const [plans, setPlans] = useState<HostingPlan[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('1_month');
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'binance'>('bkash');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [note, setNote] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successRequest, setSuccessRequest] = useState<PlanRequest | null>(null);
  const [existingRequest, setExistingRequest] = useState<PlanRequest | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessRequest(null);
      fetchPlans();
      fetchPaymentSettings();
      if (user) {
        fetchUserPlanStatus();
      }
    }
  }, [isOpen, user]);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/plans');
      const data = await res.json();
      if (data.plans) setPlans(data.plans);
    } catch {}
  };

  const fetchPaymentSettings = async () => {
    try {
      const res = await fetch('/api/payment-settings');
      const data = await res.json();
      if (data.settings) setPaymentSettings(data.settings);
    } catch {}
  };

  const fetchUserPlanStatus = async () => {
    const token = localStorage.getItem('bot_auth_token');
    if (!token) return;
    try {
      const res = await fetch('/api/plans/my-request', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.latestRequest && data.latestRequest.status === 'pending') {
        setExistingRequest(data.latestRequest);
      } else {
        setExistingRequest(null);
      }
    } catch {}
  };

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuthModal();
      return;
    }

    if (!senderNumber.trim()) {
      setError(lang === 'bn' ? 'প্রেরক ফোন নাম্বার প্রদান করুন' : 'Sender phone number is required');
      return;
    }
    if (!transactionId.trim()) {
      setError(lang === 'bn' ? 'Transaction ID (TrxID) প্রদান করুন' : 'Transaction ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/plans/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          planId: selectedPlanId,
          method: paymentMethod,
          senderNumber: senderNumber.trim(),
          transactionId: transactionId.trim(),
          note: note.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'অনুরোধ ব্যর্থ হয়েছে');
      }

      setSuccessRequest(data.request);
      setExistingRequest(data.request);
    } catch (err: any) {
      setError(err.message || 'Error submitting purchase request');
    } finally {
      setLoading(false);
    }
  };

  const currentSelectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[1];

  const getMethodDetails = () => {
    if (!paymentSettings) return { number: '01711223344', title: 'bKash Send Money' };
    switch (paymentMethod) {
      case 'nagad':
        return { number: paymentSettings.nagadNumber, title: 'Nagad Personal (Send Money)' };
      case 'rocket':
        return { number: paymentSettings.rocketNumber, title: 'Rocket Personal (Send Money)' };
      case 'binance':
        return { number: paymentSettings.binanceId, title: 'Binance USDT (TRC20)' };
      case 'bkash':
      default:
        return { number: paymentSettings.bkashNumber, title: 'bKash Personal (Send Money)' };
    }
  };

  const methodInfo = getMethodDetails();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#050811]/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#111927] border border-[#1f2c42] shadow-2xl rounded-3xl max-w-4xl w-full p-5 sm:p-7 text-white relative overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1f2c42] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{lang === 'bn' ? 'হোস্টিং প্লান ও সাবস্ক্রিপশন' : 'Hosting Plans & Subscriptions'}</span>
                <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-[#0088cc]/15 text-[#0088cc] border border-[#0088cc]/30">
                  {lang === 'bn' ? '১ মাস থেকে ১ বছর' : '1 Month to 1 Year'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'bn'
                  ? 'নতুন ইউজারের জন্য ১টি বট সম্পূর্ণ ফ্রি! অতিরিক্ত ও সার্বক্ষণিক লাইভ হোস্টিংয়ের জন্য প্লান কিনুন।'
                  : '1 Bot is 100% Free for new users. Purchase a plan for extra bots & priority live hosting.'}
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

        <div className="overflow-y-auto space-y-6 pr-1">
          {/* User Status Bar */}
          {user && (
            <div className="p-3.5 rounded-2xl bg-[#0d1524] border border-[#1f2d48] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-white">{user.name} ({user.email})</p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span>{lang === 'bn' ? 'বর্তমান প্লান:' : 'Current Plan:'}</span>
                    <span className="text-emerald-400 font-bold uppercase">{user.plan || 'Free Starter'}</span>
                    <span>• {lang === 'bn' ? `সর্বোচ্চ বট: ${user.maxBots || 1}টি` : `Max Bots: ${user.maxBots || 1}`}</span>
                    {user.planExpiresAt && (
                      <span>• {lang === 'bn' ? `মেয়াদ: ${new Date(user.planExpiresAt).toLocaleDateString()}` : `Expires: ${new Date(user.planExpiresAt).toLocaleDateString()}`}</span>
                    )}
                  </p>
                </div>
              </div>

              {existingRequest && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold text-[11px] animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'bn'
                      ? '⏳ আপনার ১টি প্লান রিকোয়েস্ট এডমিন অনুমোদনের অপেক্ষায় আছে'
                      : '⏳ Your plan request is pending admin approval'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Success Banner */}
          {successRequest && (
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-xs space-y-2 animate-in zoom-in-95">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>{lang === 'bn' ? 'আপনার প্লান রিকোয়েস্ট সফলভাবে জমা হয়েছে!' : 'Plan Request Submitted Successfully!'}</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                {lang === 'bn'
                  ? `প্লান: ${successRequest.planName} (৳${successRequest.amount}), TrxID: ${successRequest.transactionId}। এডমিন প্যানেল থেকে ভেরিফাই করে অনুমোদন (Approve) করলেই আপনার একাউন্টে তৎক্ষণাৎ বট হোস্টিংয়ের অনুমতি কার্যকর হবে।`
                  : `Plan: ${successRequest.planName} (৳${successRequest.amount}), TrxID: ${successRequest.transactionId}. Once reviewed and approved in admin panel, your live hosting limit will be unlocked immediately.`}
              </p>
            </div>
          )}

          {/* Plans Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              {lang === 'bn' ? '১. হোস্টিং প্লান নির্বাচন করুন' : '1. Choose Your Hosting Plan'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {plans.filter(p => p.id !== 'free').map((p) => {
                const isSelected = selectedPlanId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlanId(p.id)}
                    className={`relative rounded-2xl p-4 cursor-pointer transition-all border flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-b from-[#16233b] to-[#0e1726] border-[#0088cc] shadow-lg shadow-[#0088cc]/10 ring-2 ring-[#0088cc]/40'
                        : 'bg-[#0d1524] border-[#1f2d48] hover:border-slate-600 hover:bg-[#111c2e]'
                    }`}
                  >
                    {p.popular && (
                      <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow-md">
                        {lang === 'bn' ? 'বেস্ট চয়েস' : 'Popular'}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-bold text-sm text-white">{lang === 'bn' ? p.nameBn : p.nameEn}</h5>
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-[#0088cc] text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-600" />
                        )}
                      </div>

                      <div className="mb-3">
                        <span className="text-2xl font-black text-white">৳{p.priceBdt}</span>
                        <span className="text-xs text-slate-400 ml-1.5 font-medium">
                          / {p.durationDays} {lang === 'bn' ? 'দিন' : 'Days'}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-[#090f1a] border border-[#1a2538] mb-3 text-[11px]">
                        <span className="text-[#0088cc] font-bold">{p.maxBots === 999 ? 'আনলিমিটেড' : p.maxBots}টি</span>{' '}
                        <span className="text-slate-300">{lang === 'bn' ? 'টেলিগ্রাম বট হোস্টিং' : 'Telegram Bots'}</span>
                      </div>

                      <ul className="space-y-1.5 text-[11px] text-slate-300">
                        {(lang === 'bn' ? p.featuresBn : p.featuresEn).map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-tight">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment & Checkout Box */}
          <div className="bg-[#0b1220] border border-[#1f2d48] rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#0088cc]" />
              <span>{lang === 'bn' ? '২. পেমেন্ট করুন ও TrxID প্রদান করুন' : '2. Send Payment & Enter TrxID'}</span>
            </h4>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('bkash')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  paymentMethod === 'bkash'
                    ? 'bg-[#e2136e]/15 border-[#e2136e] text-[#e2136e]'
                    : 'bg-[#0d1524] border-[#1f2d48] text-slate-300 hover:border-slate-500'
                }`}
              >
                <span>bKash (বিকাশ)</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('nagad')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  paymentMethod === 'nagad'
                    ? 'bg-[#f7941d]/15 border-[#f7941d] text-[#f7941d]'
                    : 'bg-[#0d1524] border-[#1f2d48] text-slate-300 hover:border-slate-500'
                }`}
              >
                <span>Nagad (নগদ)</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('rocket')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  paymentMethod === 'rocket'
                    ? 'bg-[#8c3494]/15 border-[#8c3494] text-[#a445ad]'
                    : 'bg-[#0d1524] border-[#1f2d48] text-slate-300 hover:border-slate-500'
                }`}
              >
                <span>Rocket (রকেট)</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('binance')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  paymentMethod === 'binance'
                    ? 'bg-[#f3ba2f]/15 border-[#f3ba2f] text-[#f3ba2f]'
                    : 'bg-[#0d1524] border-[#1f2d48] text-slate-300 hover:border-slate-500'
                }`}
              >
                <span>USDT (Binance)</span>
              </button>
            </div>

            {/* Payment Number & Instructions */}
            <div className="p-3.5 rounded-xl bg-[#090f1a] border border-[#1a2538] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <p className="text-[11px] text-slate-400">{methodInfo.title}</p>
                <p className="font-mono text-sm sm:text-base font-bold text-white mt-0.5 select-all">
                  {methodInfo.number}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {lang === 'bn' ? `প্লানের মূল্য: ৳${currentSelectedPlan.priceBdt} টাকা Send Money করুন` : `Send: ৳${currentSelectedPlan.priceBdt} BDT`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(methodInfo.number.split(' ')[0], 'method_num')}
                className="px-3 py-1.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-[#334155] cursor-pointer transition-colors"
              >
                {copiedKey === 'method_num' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{lang === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#0088cc]" />
                    <span>{lang === 'bn' ? 'নাম্বার কপি করুন' : 'Copy Number'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Submission Form */}
            <form onSubmit={handleSubmitPurchase} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    {lang === 'bn' ? 'আপনার প্রেরক ফোন নাম্বার (Sender Number) *' : 'Sender Phone Number *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                    placeholder="e.g. 01712345678"
                    className="w-full bg-[#090e18] border border-[#1f2d48] focus:border-[#0088cc] rounded-xl text-white placeholder-slate-500 py-2.5 px-3 text-xs focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    {lang === 'bn' ? 'Transaction ID (TrxID) *' : 'Transaction ID (TrxID) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. 9J4K2L8M1N"
                    className="w-full bg-[#090e18] border border-[#1f2d48] focus:border-[#0088cc] rounded-xl text-white placeholder-slate-500 py-2.5 px-3 text-xs font-mono focus:outline-none transition-all uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  {lang === 'bn' ? 'অতিরিক্ত তথ্য বা নোট (ঐচ্ছিক)' : 'Additional Note (Optional)'}
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: রেফারেল বা বিকাশ রেফারেন্স' : 'e.g., bKash reference'}
                  className="w-full bg-[#090e18] border border-[#1f2d48] focus:border-[#0088cc] rounded-xl text-white placeholder-slate-500 py-2 px-3 text-xs focus:outline-none transition-all"
                />
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <p className="text-[11px] text-slate-400">
                  {lang === 'bn'
                    ? 'সাবমিট করার পর এডমিন ভেরিফাই করে অনুমোদন দিলেই আপনার প্লান লাইভ হবে।'
                    : 'Once submitted, your plan goes live after admin approval.'}
                </p>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0088cc] to-sky-600 hover:opacity-95 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#0088cc]/25 cursor-pointer disabled:opacity-50 transition-all shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{loading ? (lang === 'bn' ? 'সাবমিট হচ্ছে...' : 'Submitting...') : (lang === 'bn' ? 'প্লান রিকোয়েস্ট পাঠান' : 'Submit Plan Request')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
