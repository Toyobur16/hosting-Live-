import React, { useState } from 'react';
import { Play, Square, RotateCw, Trash2, Download, Terminal, Radio, Check, Plus, FileCode, CheckCircle2, ShieldCheck, AlertTriangle, Bot, Sparkles } from 'lucide-react';
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
  lang
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [botToDelete, setBotToDelete] = useState<HostedBot | null>(null);

  const formatUptime = (seconds: number) => {
    if (!seconds) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
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

  return (
    <div className="space-y-4">
      {/* Bot Deletion Confirmation Modal */}
      {botToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d] rounded-2xl p-6 max-w-sm w-full shadow-2xl transition-colors">
            <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#1e293b] dark:text-white">
              {lang === 'bn' ? 'বট ডিলিট নিশ্চিত করুন' : 'Confirm Bot Deletion'}
            </h4>
            <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1.5 leading-relaxed">
              {lang === 'bn'
                ? `আপনি কি নিশ্চিত যে '${botToDelete.name}' বট এবং এর সমস্ত ফাইল স্থায়ীভাবে ডিলিট করতে চান?`
                : `Are you sure you want to permanently delete '${botToDelete.name}' and all its files?`}
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setBotToDelete(null)}
                className="px-3.5 py-2 rounded-xl bg-[#f8fafc] dark:bg-[#1e293b] hover:bg-[#f1f5f9] dark:hover:bg-[#334155] text-[#64748b] dark:text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white text-xs font-semibold border border-[#e2e8f0] dark:border-[#334155] cursor-pointer transition-colors"
              >
                {lang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  onDeleteBot(botToDelete.id);
                  setBotToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-rose-600/20 cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'ডিলিট করুন' : 'Delete Bot'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 24/7 Live Top Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d] p-5 rounded-2xl shadow-xs transition-colors">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-base font-bold text-[#1e293b] dark:text-white">
              {lang === 'bn' ? 'হোস্টেড টেলিগ্রাম বটস' : 'Hosted Telegram Bots'}
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#0088cc]/10 dark:bg-[#0088cc]/20 text-[#0088cc] border border-[#0088cc]/20 font-semibold">
              {bots.length} {lang === 'bn' ? 'বট' : 'Bots'}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {lang === 'bn' ? '২৪/৭ ব্যাকগ্রাউন্ড লাইভ' : '24/7 Background Live'}
            </span>
          </div>
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] leading-relaxed">
            {lang === 'bn'
              ? 'আপনার আপলোড করা বটের ফাইল সুরক্ষিতভাবে হোস্ট করা থাকে। সাইটের সার্ভার বট ফাইল পরিবর্তন বা নষ্ট করে না।'
              : 'All your hosted bots run in isolated workspaces. Uploaded files remain intact and persistent.'}
          </p>
        </div>

        <button
          onClick={onOpenNewBotModal}
          className="px-4 py-2.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-semibold shadow-sm shadow-[#0088cc]/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'bn' ? '+ নতুন বট ডিপ্লয় করুন' : '+ Deploy New Bot'}</span>
        </button>
      </div>

      {/* Empty State when no bots */}
      {bots.length === 0 && (
        <div className="bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d] rounded-2xl p-10 text-center shadow-xs transition-colors">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-[#0088cc]/10 border border-blue-200 dark:border-[#0088cc]/20 text-[#0088cc] flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Bot className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#1e293b] dark:text-white">
            {lang === 'bn' ? 'কোনো বট এখনও হোস্ট করা হয়নি' : 'No bots hosted yet'}
          </h3>
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] max-w-md mx-auto mt-1.5 leading-relaxed">
            {lang === 'bn'
              ? 'আপনার পাইথন বট ফাইল (.py) বা জিপ ফাইল আপলোড করে এক ক্লিকে লাইভ হোস্ট করুন।'
              : 'Upload your Python bot files or zip archive to get instant 24/7 background hosting.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onOpenNewBotModal}
              className="px-5 py-2.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-semibold shadow-sm shadow-[#0088cc]/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4" />
              <span>{lang === 'bn' ? '+ প্রথম বট হোস্ট করুন' : '+ Host Your First Bot'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Bots Grid */}
      {bots.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bots.map((bot) => {
            const isSelected = bot.id === selectedBotId;
            const isRunning = bot.status === 'running';
            const isStarting = bot.status === 'starting';

            return (
              <div
                key={bot.id}
                onClick={() => onSelectBot(bot.id)}
                className={`bg-white dark:bg-[#111827] border rounded-2xl p-5 shadow-xs transition-all cursor-pointer flex flex-col justify-between relative ${
                  isSelected
                    ? 'border-[#0088cc] dark:border-[#0088cc] ring-2 ring-[#0088cc]/20'
                    : 'border-[#e2e8f0] dark:border-[#1f293d] hover:border-[#cbd5e1] dark:hover:border-[#334155]'
                }`}
              >
                <div>
                  {/* Header: Name & Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[#1e293b] dark:text-white truncate" title={bot.name}>
                          {bot.name}
                        </h3>
                        {isSelected && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#0088cc] text-white shrink-0">
                            {lang === 'bn' ? 'সিলেক্টেড' : 'Selected'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-[#64748b] dark:text-[#94a3b8] flex items-center gap-1">
                          <FileCode className="w-3.5 h-3.5 text-[#94a3b8]" />
                          {bot.entryFile}
                        </span>
                        {bot.botUsername && (
                          <span className="text-[11px] font-semibold text-[#0088cc] flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3 text-[#0088cc]" />
                            @{bot.botUsername}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shrink-0 ${
                        isRunning
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : isStarting
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isRunning ? 'bg-emerald-500 animate-pulse' : isStarting ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                      ></span>
                      {isRunning
                        ? (lang === 'bn' ? 'লাইভ' : '24/7 LIVE')
                        : isStarting
                        ? (lang === 'bn' ? 'চালু হচ্ছে' : 'STARTING')
                        : (lang === 'bn' ? 'বন্ধ' : 'STOPPED')}
                    </span>
                  </div>

                  {/* 24/7 Cloud details */}
                  <div className="bg-[#f8fafc] dark:bg-[#1e293b]/70 border border-[#e2e8f0] dark:border-[#334155] rounded-xl p-3 text-xs text-[#64748b] dark:text-[#94a3b8] space-y-1.5 mb-4">
                    <div className="flex items-center justify-between">
                      <span>{lang === 'bn' ? 'আপটাইম:' : 'Live Uptime:'}</span>
                      <span className="font-mono text-[#1e293b] dark:text-white font-semibold">
                        {isRunning ? formatUptime(bot.uptimeSeconds) : '0s'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{lang === 'bn' ? 'ফাইল সংখ্যা:' : 'Hosted Files:'}</span>
                      <span className="font-mono text-[#1e293b] dark:text-white">{bot.fileCount || 1} files</span>
                    </div>
                    {bot.ownerName && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span>{lang === 'bn' ? 'মালিক:' : 'Owner:'}</span>
                        <span className="font-medium text-[#0088cc]">{bot.ownerName}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#e2e8f0] dark:border-[#334155]">
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        {lang === 'bn' ? 'অটো-রিস্টার্ট ওয়াচডগ:' : 'Auto-Restart:'}
                      </span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                        {lang === 'bn' ? 'সক্রিয় (২৪/৭)' : 'Active (24/7)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Start, Stop, Restart, Console, Files, Delete */}
                <div className="pt-3 border-t border-[#f1f5f9] dark:border-[#1f293d] flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    {isRunning ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStopBot(bot.id);
                        }}
                        className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                        title={lang === 'bn' ? 'বট বন্ধ করুন' : 'Stop Bot'}
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartBot(bot.id);
                        }}
                        className="p-2 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white shadow-xs transition-colors cursor-pointer"
                        title={lang === 'bn' ? 'বট চালু করুন' : 'Start Bot (24/7)'}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestartBot(bot.id);
                      }}
                      className="p-2 rounded-xl bg-[#f8fafc] dark:bg-[#1e293b] hover:bg-[#f1f5f9] dark:hover:bg-[#334155] text-[#64748b] dark:text-[#94a3b8] border border-[#e2e8f0] dark:border-[#334155] transition-colors cursor-pointer"
                      title={lang === 'bn' ? 'রিস্টার্ট করুন' : 'Restart Bot'}
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>

                    <a
                      href={`/api/bots/${bot.id}/export/zip`}
                      onClick={(e) => e.stopPropagation()}
                      download
                      className="p-2 rounded-xl bg-[#f8fafc] dark:bg-[#1e293b] hover:bg-[#f1f5f9] dark:hover:bg-[#334155] text-[#64748b] dark:text-[#94a3b8] border border-[#e2e8f0] dark:border-[#334155] transition-colors cursor-pointer"
                      title={lang === 'bn' ? 'জিপ ডাউনলোড করুন' : 'Download Zip'}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={(e) => handleCopyPing(e, bot.id)}
                      className="p-2 rounded-xl bg-[#f8fafc] dark:bg-[#1e293b] hover:bg-[#f1f5f9] dark:hover:bg-[#334155] text-[#64748b] dark:text-[#94a3b8] border border-[#e2e8f0] dark:border-[#334155] transition-colors cursor-pointer"
                      title={lang === 'bn' ? '২৪/৭ কিপ-এলাইভ ইউআরএল কপি করুন' : 'Copy 24/7 KeepAlive URL'}
                    >
                      {copiedId === bot.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Radio className="w-3.5 h-3.5 text-[#0088cc]" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Live Console button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBot(bot.id);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-[#0088cc]/10 text-[#0088cc]'
                          : 'bg-[#f8fafc] dark:bg-[#1e293b] hover:bg-[#f1f5f9] dark:hover:bg-[#334155] text-[#64748b] dark:text-[#94a3b8]'
                      }`}
                      title={lang === 'bn' ? 'লাইভ কনসোল' : 'Live Console'}
                    >
                      <Terminal className="w-3 h-3" />
                      <span>{lang === 'bn' ? 'কনসোল' : 'Console'}</span>
                    </button>

                    {/* Files & Code button */}
                    {onOpenFileEditor && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenFileEditor(bot.id);
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#f8fafc] dark:bg-[#1e293b] hover:bg-[#f1f5f9] dark:hover:bg-[#334155] text-[#64748b] dark:text-[#94a3b8] hover:text-[#0088cc] dark:hover:text-[#0088cc] border border-[#e2e8f0] dark:border-[#334155] transition-colors cursor-pointer flex items-center gap-1"
                        title={lang === 'bn' ? 'ফাইলস এবং কোড' : 'Files & Code'}
                      >
                        <FileCode className="w-3 h-3" />
                        <span className="hidden sm:inline">{lang === 'bn' ? 'ফাইলস' : 'Files'}</span>
                      </button>
                    )}

                    {/* DELETE BUTTON */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBotToDelete(bot);
                      }}
                      className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                      title={lang === 'bn' ? `'${bot.name}' ডিলিট করুন` : `Delete bot '${bot.name}'`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
