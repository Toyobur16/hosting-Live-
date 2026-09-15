import React, { useState, useMemo } from 'react';
import {
  Play,
  Square,
  RotateCw,
  Trash2,
  Download,
  Terminal,
  Radio,
  Check,
  Plus,
  FileCode,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Bot,
  Sparkles,
  Upload,
  Clock,
  HardDrive,
  User,
  Search,
  ExternalLink,
  Code2,
  History,
  Tag
} from 'lucide-react';
import { HostedBot } from '../types';

interface BotListProps {
  bots: HostedBot[];
  selectedBotId: string | null;
  onSelectBot: (botId: string) => void;
  onStartBot: (botId: string) => void;
  onStopBot: (botId: string) => void;
  onRestartBot: (botId: string) => void;
  onDeleteBot: (botId: string) => void;
  onOpenNewBotModal: () => void;
  onOpenFileEditor?: (botId: string) => void;
  onOpenSafeUpload?: (bot: HostedBot) => void;
  onOpenDeployments?: (botId: string) => void;
  hasActivePlan?: boolean;
  onOpenPlans?: () => void;
  lang: 'bn' | 'en';
}

export const BotList: React.FC<BotListProps> = ({
  bots,
  selectedBotId,
  onSelectBot,
  onStartBot,
  onStopBot,
  onRestartBot,
  onDeleteBot,
  onOpenNewBotModal,
  onOpenFileEditor,
  onOpenSafeUpload,
  onOpenDeployments,
  hasActivePlan = false,
  onOpenPlans,
  lang
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [botToDelete, setBotToDelete] = useState<HostedBot | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const formatUptime = (seconds: number) => {
    if (!seconds || seconds <= 0) return lang === 'bn' ? '০ সেকেন্ড' : '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (lang === 'bn') {
      if (hrs > 0) return `${hrs} ঘণ্টা ${mins} মি.`;
      if (mins > 0) return `${mins} মিনিট ${secs} সে.`;
      return `${secs} সেকেন্ড`;
    }
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const handleCopyPing = (e: React.MouseEvent, botId: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/api/keepalive/${botId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(botId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredBots = useMemo(() => {
    if (!searchQuery.trim()) return bots;
    const q = searchQuery.toLowerCase();
    return bots.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.botUsername && b.botUsername.toLowerCase().includes(q)) ||
        b.entryFile.toLowerCase().includes(q)
    );
  }, [bots, searchQuery]);

  const runningBotsCount = bots.filter((b) => b.status === 'running').length;

  return (
    <div className="space-y-5 pb-8">
      {/* Bot Deletion Confirmation Modal */}
      {botToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d] rounded-2xl p-6 max-w-sm w-full shadow-2xl transition-colors">
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3.5">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              {lang === 'bn' ? 'বট ডিলিট নিশ্চিত করুন' : 'Confirm Bot Deletion'}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              {lang === 'bn'
                ? `আপনি কি নিশ্চিত যে '${botToDelete.name}' বট এবং এর সমস্ত ফাইল ও ডাটাবেজ স্থায়ীভাবে ডিলিট করতে চান?`
                : `Are you sure you want to permanently delete '${botToDelete.name}' and all its files? This cannot be undone.`}
            </p>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setBotToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  onDeleteBot(botToDelete.id);
                  setBotToDelete(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/25 cursor-pointer transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>{lang === 'bn' ? 'ডিলিট করুন' : 'Delete Bot'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 24/7 Live Top Header Banner & Stats */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1f293d] p-5 sm:p-6 rounded-2xl shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#0088cc]" />
                <span>{lang === 'bn' ? 'আমার হোস্টেড বটস' : 'My Hosted Bots'}</span>
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#0088cc]/10 dark:bg-[#0088cc]/20 text-[#0088cc] border border-[#0088cc]/20 font-bold">
                {bots.length} {lang === 'bn' ? 'বট' : 'Bots'}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>
                  {runningBotsCount} {lang === 'bn' ? 'লাইভ চলছে' : 'Active Live'}
                </span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
              {lang === 'bn'
                ? 'আপনার পাইথন টেলিগ্রাম বটস ও স্ক্রিপ্টসমূহ ক্লাউডে ২৪/৭ বিরতিহীনভাবে লাইভ থাকে। রিস্টার্ট ওয়াচডগ স্বয়ংক্রিয়ভাবে বট অনলাইন রাখে।'
                : 'Your Python Telegram bots and web scripts run 24/7 with isolated environments, persistent data storage, and watchdog monitoring.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {hasActivePlan ? (
              <button
                onClick={onOpenNewBotModal}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-black shadow-md shadow-[#00d293]/20 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>{lang === 'bn' ? '+ নতুন বট ডিপ্লয় করুন' : '+ Deploy New Bot'}</span>
              </button>
            ) : (
              <button
                onClick={onOpenPlans}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                title={lang === 'bn' ? 'বট ডিপ্লয় করতে প্রথমে একটি প্ল্যান কিনুন' : 'Purchase a plan to unlock Deploy Bot'}
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>{lang === 'bn' ? '🔒 প্ল্যান কিনুন (Deploy Bot)' : '🔒 Buy Plan (Deploy Bot)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Search if user has bots */}
        {bots.length > 1 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[#1f293d] flex items-center">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'bn' ? 'বটের নাম বা ইউজারনেম দিয়ে খুঁজুন...' : 'Search bots by name, username or file...'}
                className="w-full pl-9.5 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0a0e1a] border border-slate-200 dark:border-[#1f293d] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-[#0088cc]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Empty State when no bots */}
      {bots.length === 0 && (
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1f293d] rounded-2xl p-8 sm:p-12 text-center shadow-xs transition-colors">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-[#0088cc]/10 border border-blue-200 dark:border-[#0088cc]/20 text-[#0088cc] flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Bot className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {lang === 'bn' ? 'আপনার কোনো বট এখনও হোস্ট করা হয়নি' : 'No bots hosted yet'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
            {hasActivePlan
              ? lang === 'bn'
                ? 'আপনার পাইথন বট ফাইল (.py) বা জিপ আর্কাইভ আপলোড করে এক ক্লিকে ২৪/৭ লাইভ ক্লাউড হোস্টিং চালু করুন।'
                : 'Upload your Python bot files or zip archive to get instant 24/7 background hosting with live logs.'
              : lang === 'bn'
              ? 'বট ডিপ্লয় করতে যেকোনো একটি প্ল্যান (১ মাস, ৩ মাস, ৬ মাস বা ১ বছর) কিনুন। প্ল্যান সক্রিয় হওয়ার সাথে সাথে আনলিমিটেড হোস্টিং সুবিধা পাবেন।'
              : 'Purchase a hosting plan (1 month, 3 months, 6 months or 1 year) to unlock bot deployment.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {hasActivePlan ? (
              <button
                onClick={onOpenNewBotModal}
                className="px-6 py-3 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold shadow-md shadow-[#0088cc]/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
              >
                <Sparkles className="w-4 h-4" />
                <span>{lang === 'bn' ? '+ প্রথম বট হোস্ট করুন' : '+ Host Your First Bot'}</span>
              </button>
            ) : (
              <button
                onClick={onOpenPlans}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
              >
                <Sparkles className="w-4 h-4" />
                <span>{lang === 'bn' ? '🔒 প্ল্যান কিনুন (Buy Plan Now)' : '🔒 Buy Plan Now'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* No search results */}
      {bots.length > 0 && filteredBots.length === 0 && (
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1f293d] rounded-2xl p-8 text-center">
          <p className="text-xs text-slate-500">
            {lang === 'bn'
              ? `"${searchQuery}" এর সাথে কোনো বটের মিল পাওয়া যায়নি।`
              : `No bots matched "${searchQuery}".`}
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-3 text-xs text-[#0088cc] hover:underline font-semibold"
          >
            {lang === 'bn' ? 'সব বট দেখুন' : 'View all bots'}
          </button>
        </div>
      )}

      {/* Bots Grid - Responsive & Spacious */}
      {filteredBots.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBots.map((bot) => {
            const isSelected = bot.id === selectedBotId;
            const isRunning = bot.status === 'running';
            const isStarting = bot.status === 'starting';

            return (
              <div
                key={bot.id}
                className={`bg-white dark:bg-[#111827] border rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between relative ${
                  isSelected
                    ? 'border-[#0088cc] dark:border-[#0088cc] ring-2 ring-[#0088cc]/20'
                    : 'border-slate-200 dark:border-[#1f293d] hover:border-slate-300 dark:hover:border-[#334155]'
                }`}
              >
                <div>
                  {/* Card Header: Bot Name, Handle & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-[#0088cc]/10 dark:bg-[#0088cc]/20 text-[#0088cc] flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3
                            className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate"
                            title={bot.name}
                          >
                            {bot.name}
                          </h3>
                          {bot.botUsername ? (
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#0088cc] truncate mt-0.5">
                              <CheckCircle2 className="w-3 h-3 text-[#0088cc] shrink-0" />
                              <span>@{bot.botUsername}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              <Code2 className="w-3 h-3 shrink-0" />
                              <span>{bot.entryFile || 'bot.py'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide shrink-0 ${
                        isRunning
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : isStarting
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isRunning
                            ? 'bg-emerald-500 animate-pulse'
                            : isStarting
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                      ></span>
                      <span>
                        {isRunning
                          ? lang === 'bn'
                            ? 'লাইভ ২৪/৭'
                            : '24/7 LIVE'
                          : isStarting
                          ? lang === 'bn'
                            ? 'চালু হচ্ছে'
                            : 'STARTING'
                          : lang === 'bn'
                          ? 'বন্ধ'
                          : 'STOPPED'}
                      </span>
                    </span>
                  </div>

                  {/* 24/7 Cloud Details Box */}
                  <div className="bg-slate-50 dark:bg-[#162035]/60 border border-slate-200/80 dark:border-[#1f293d] rounded-xl p-3.5 text-xs text-slate-600 dark:text-slate-300 space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lang === 'bn' ? 'আপটাইম:' : 'Live Uptime:'}</span>
                      </span>
                      <span className="font-mono text-slate-900 dark:text-white font-bold">
                        {isRunning ? formatUptime(bot.uptimeSeconds) : lang === 'bn' ? '০ সেকেন্ড' : '0s'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lang === 'bn' ? 'হোস্টেড ফাইলস:' : 'Hosted Files:'}</span>
                      </span>
                      <span className="font-mono text-slate-900 dark:text-white font-semibold">
                        {bot.fileCount || 1} {lang === 'bn' ? 'টি ফাইল' : 'files'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Tag className="w-3.5 h-3.5 text-purple-500" />
                        <span>{lang === 'bn' ? 'বর্তমান ভার্সন:' : 'Version:'}</span>
                      </span>
                      {onOpenDeployments ? (
                        <button
                          type="button"
                          onClick={() => onOpenDeployments(bot.id)}
                          className="font-mono text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800 transition-colors flex items-center gap-1 cursor-pointer"
                          title={lang === 'bn' ? 'ডিপ্লয়মেন্ট হিস্ট্রি দেখুন' : 'View deployment history'}
                        >
                          <History className="w-3 h-3 text-purple-500" />
                          <span>{bot.currentVersion || 'v1.0.0'}</span>
                        </button>
                      ) : (
                        <span className="font-mono text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                          {bot.currentVersion || 'v1.0.0'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-[#1f293d]">
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{lang === 'bn' ? 'অটো-রিস্টার্ট ওয়াচডগ:' : 'Auto-Restart:'}</span>
                      </span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                        {lang === 'bn' ? 'সক্রিয় (২৪/৭)' : 'Active (24/7)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Structured Action Buttons - Clear Multi-Tier Layout */}
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-[#1f293d]">
                  {/* Tier 1: Main Start / Stop & Restart Controls */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      {isRunning ? (
                        <button
                          onClick={() => onStopBot(bot.id)}
                          className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-98"
                          title={lang === 'bn' ? 'বট বন্ধ করুন' : 'Stop Bot'}
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>{lang === 'bn' ? 'বট বন্ধ করুন' : 'Stop Bot'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onStartBot(bot.id)}
                          className="w-full py-2.5 px-3 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-[#0088cc]/25 transition-all cursor-pointer hover:scale-[1.01] active:scale-98"
                          title={lang === 'bn' ? '২৪/৭ লাইভ বট চালু করুন' : 'Start Bot 24/7'}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{lang === 'bn' ? 'বট চালু করুন' : 'Start Bot (24/7)'}</span>
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => onRestartBot(bot.id)}
                      className="py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1e293b] dark:hover:bg-[#334155] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#334155] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title={lang === 'bn' ? 'রিস্টার্ট করুন' : 'Restart Bot'}
                    >
                      <RotateCw className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                      <span>{lang === 'bn' ? 'রিস্টার্ট' : 'Restart'}</span>
                    </button>
                  </div>

                  {/* Tier 2: Developer & Management Controls */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* Live Console button */}
                    <button
                      onClick={() => onSelectBot(bot.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                        isSelected
                          ? 'bg-[#0088cc]/15 text-[#0088cc] border-[#0088cc]/30 font-bold'
                          : 'bg-slate-50 dark:bg-[#1e293b] hover:bg-slate-100 dark:hover:bg-[#334155] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#334155]'
                      }`}
                      title={lang === 'bn' ? 'লাইভ কনসোল ও রিয়েল-টাইম লগ দেখুন' : 'Live Console & Real-time Logs'}
                    >
                      <Terminal className="w-3.5 h-3.5 text-[#0088cc]" />
                      <span>{lang === 'bn' ? 'কনসোল' : 'Console'}</span>
                    </button>

                    {/* Files & Code button */}
                    {onOpenFileEditor && (
                      <button
                        onClick={() => onOpenFileEditor(bot.id)}
                        className="py-2 px-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-[#1e293b] hover:bg-slate-100 dark:hover:bg-[#334155] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#334155] transition-colors cursor-pointer flex items-center justify-center gap-1"
                        title={lang === 'bn' ? 'বটের কোড ও ফাইলসমূহ পরিচালনা করুন' : 'Files & Code Manager'}
                      >
                        <FileCode className="w-3.5 h-3.5 text-amber-500" />
                        <span>{lang === 'bn' ? 'ফাইলস' : 'Files'}</span>
                      </button>
                    )}

                    {/* Safe Upload Button - Preserves User Balances & Data */}
                    {onOpenSafeUpload ? (
                      <button
                        id={`safe-upload-bot-${bot.id}`}
                        onClick={() => onOpenSafeUpload(bot)}
                        className="py-2 px-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                        title={lang === 'bn' ? 'বট না মুছে নিরাপদ ফাইল আপলোড (ডাটাবেজ অক্ষত থাকবে)' : 'Upload files safely (data preserved)'}
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{lang === 'bn' ? 'আপলোড' : 'Upload'}</span>
                      </button>
                    ) : (
                      <div />
                    )}

                    {/* Deployment History Button */}
                    {onOpenDeployments && (
                      <button
                        id={`btn-deployments-${bot.id}`}
                        onClick={() => onOpenDeployments(bot.id)}
                        className="py-2 px-2 rounded-xl text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                        title={lang === 'bn' ? 'ডিপ্লয়মেন্ট হিস্ট্রি ও ভার্সন কন্ট্রোল' : 'Deployment History & Versions'}
                      >
                        <History className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>{lang === 'bn' ? 'হিস্ট্রি' : 'History'}</span>
                      </button>
                    )}
                  </div>

                  {/* Tier 3: Utilities (Zip Download, 24/7 KeepAlive URL, Delete) */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5 flex-1">
                      {/* Download Zip */}
                      <a
                        href={`/api/bots/${bot.id}/export/zip`}
                        download
                        className="py-1.5 px-2.5 rounded-xl bg-slate-50 dark:bg-[#1e293b] hover:bg-slate-100 dark:hover:bg-[#334155] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#334155] text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                        title={lang === 'bn' ? 'সম্পূর্ণ বটের জিপ ডাউনলোড করুন' : 'Download Full Bot Zip'}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{lang === 'bn' ? 'জিপ' : 'Zip'}</span>
                      </a>

                      {/* KeepAlive Ping URL */}
                      <button
                        onClick={(e) => handleCopyPing(e, bot.id)}
                        className={`py-1.5 px-2.5 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                          copiedId === bot.id
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                            : 'bg-slate-50 dark:bg-[#1e293b] hover:bg-slate-100 dark:hover:bg-[#334155] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-[#334155]'
                        }`}
                        title={lang === 'bn' ? '২৪/৭ কিপ-এলাইভ ইউআরএল কপি করুন' : 'Copy 24/7 KeepAlive URL'}
                      >
                        {copiedId === bot.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{lang === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                          </>
                        ) : (
                          <>
                            <Radio className="w-3.5 h-3.5 text-[#0088cc]" />
                            <span>{lang === 'bn' ? 'কিপ-এলাইভ' : 'Ping URL'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Delete Bot */}
                    <button
                      onClick={() => setBotToDelete(bot)}
                      className="py-1.5 px-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                      title={lang === 'bn' ? `'${bot.name}' ডিলিট করুন` : `Delete bot '${bot.name}'`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'ডিলিট' : 'Delete'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
