import React, { useState } from 'react';
import { 
  X, Settings, FileCode, Package, Database, ShieldCheck, Cloud, ChevronRight, HardDrive, ArrowLeft 
} from 'lucide-react';
import { ScriptEditor } from './ScriptEditor';
import { DatabaseManager } from './DatabaseManager';
import { HostingGuide } from './HostingGuide';
import { PipManagerModal } from './PipManagerModal';
import { HostedBot, AuthUser } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'bn' | 'en';
  currentUser: AuthUser | null;
  bots: HostedBot[];
  selectedBotId: string | null;
  onSelectBot: (id: string) => void;
  onBotsUpdated: () => void;
  onTestToken: () => void;
  initialTab?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  lang,
  currentUser,
  bots,
  selectedBotId,
  onSelectBot,
  onBotsUpdated,
  onTestToken,
  initialTab = 'overview'
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [showPip, setShowPip] = useState(false);

  if (!isOpen) return null;

  const selectedBot = bots.find((b) => b.id === selectedBotId) || (bots.length > 0 ? bots[0] : null);

  const SETTING_ITEMS = [
    {
      id: 'files',
      icon: FileCode,
      titleBn: 'ফাইল আপলোড ও এডিটর',
      titleEn: 'File Upload & Script Editor',
      descBn: 'বটের কোড ও ফাইল দেখুন, লাইভ এডিট করুন বা নতুন ফাইল আপলোড করুন',
      descEn: 'Edit bot code, upload python scripts and inspect files',
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
    },
    {
      id: 'pip',
      icon: Package,
      titleBn: 'প্যাকেজ ম্যানেজার (Pip Install)',
      titleEn: 'Python Pip Packages',
      descBn: 'telebot, aiogram, python-telegram-bot, requests ইত্যাদি লাইব্রেরি ইনস্টল করুন',
      descEn: 'Install python libraries and bot dependencies with one click',
      color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800',
      isAction: true,
      action: () => setShowPip(true)
    },
    {
      id: 'database',
      icon: Database,
      titleBn: 'ডাটাবেজ ও স্টোরেজ ব্যাকআপ',
      titleEn: 'Database & Storage Backup',
      descBn: 'বটের JSON ফাইল, ডাটাবেজ ব্যাকআপ ডাউনলোড ও স্টোরেজ চেক করুন',
      descEn: 'Download full bot data backup and inspect storage',
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
    },
    {
      id: 'token_test',
      icon: ShieldCheck,
      titleBn: 'বট টোকেন ভেরিফাই',
      titleEn: 'Verify Bot Token',
      descBn: 'টেলিগ্রাম অফিসিয়াল API দিয়ে টোকেন সক্রিয় আছে কিনা পরীক্ষা করুন',
      descEn: 'Verify bot token with official Telegram API',
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
      isAction: true,
      action: () => {
        onClose();
        onTestToken();
      }
    },
    {
      id: 'guide',
      icon: Cloud,
      titleBn: '২৪/৭ হোস্টিং গাইড ও সিস্টেম ডেমো',
      titleEn: '24/7 Hosting Guide',
      descBn: 'যেকোনো পাইথন টেলিগ্রাম বট সবসময় চালু রাখার গাইড ও তথ্য',
      descEn: 'Step by step guide to build and host telegram bots',
      color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800'
    }
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-200">
        <div className="bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d] rounded-3xl max-w-5xl w-full h-[88vh] max-h-[850px] shadow-2xl flex flex-col overflow-hidden transition-colors">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-[#e2e8f0] dark:border-[#1f293d] flex items-center justify-between bg-[#f8fafc] dark:bg-[#111827]">
            <div className="flex items-center gap-3">
              {activeTab !== 'overview' && (
                <button
                  onClick={() => setActiveTab('overview')}
                  className="p-1.5 rounded-xl hover:bg-[#e2e8f0] dark:hover:bg-[#1f293d] text-[#64748b] dark:text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white transition-colors cursor-pointer"
                  title="Back to Settings Menu"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="w-10 h-10 rounded-2xl bg-[#0088cc]/10 dark:bg-[#0088cc]/20 border border-[#0088cc]/20 flex items-center justify-center text-[#0088cc]">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1e293b] dark:text-white">
                  {activeTab === 'overview'
                    ? (lang === 'bn' ? 'কন্ট্রোল সেন্টার ও সেটিংস' : 'Control Center & Settings')
                    : SETTING_ITEMS.find((i) => i.id === activeTab)?.titleBn || 'Settings'}
                </h3>
                <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                  {activeTab === 'overview'
                    ? (lang === 'bn' ? 'বট ম্যানেজমেন্ট, ফাইল ও ডাটাবেজ নিয়ন্ত্রণ' : 'Advanced management tools, files and configuration')
                    : SETTING_ITEMS.find((i) => i.id === activeTab)?.descBn || ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeTab !== 'overview' && (
                <button
                  onClick={() => setActiveTab('overview')}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white hover:bg-[#f1f5f9] dark:hover:bg-[#334155] transition-all cursor-pointer hidden sm:flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{lang === 'bn' ? 'মেনু' : 'Back to Menu'}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white hover:bg-[#e2e8f0] dark:hover:bg-[#1e293b] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Content Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 text-[#1e293b] dark:text-[#f3f4f6]">
            {activeTab === 'overview' ? (
              <div className="space-y-6">
                {currentUser && (
                  <div className="p-4 bg-gradient-to-r from-slate-50 dark:from-[#1e293b]/70 to-blue-50/50 dark:to-blue-950/30 border border-[#e2e8f0] dark:border-[#1f293d] rounded-2xl flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#0088cc] text-white flex items-center justify-center font-bold text-base shadow-sm">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#1e293b] dark:text-white">{currentUser.name}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                            {lang === 'bn' ? 'সক্রিয় একাউন্ট' : 'Active Account'}
                          </span>
                        </div>
                        <p className="text-xs text-[#64748b] dark:text-[#94a3b8] font-mono mt-0.5">{currentUser.email}</p>
                      </div>
                    </div>
                    <div className="text-xs text-[#64748b] dark:text-[#94a3b8] flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-[#0088cc]" />
                      <span>{bots.length} {lang === 'bn' ? 'টি বট হোস্ট করা' : 'Bots Hosted'}</span>
                    </div>
                  </div>
                )}

                {bots.length > 1 && (
                  <div className="flex items-center justify-between p-3 bg-[#f8fafc] dark:bg-[#1e293b]/70 border border-[#e2e8f0] dark:border-[#334155] rounded-xl text-xs">
                    <span className="font-semibold text-[#1e293b] dark:text-white">
                      {lang === 'bn' ? 'বর্তমান বট নির্বাচন:' : 'Default Selected Bot:'}
                    </span>
                    <select
                      value={selectedBotId || ''}
                      onChange={(e) => onSelectBot(e.target.value)}
                      className="bg-white dark:bg-[#111827] border border-[#cbd5e1] dark:border-[#334155] rounded-lg px-3 py-1 font-medium text-[#1e293b] dark:text-white cursor-pointer"
                    >
                      {bots.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.status === 'running' ? 'LIVE' : 'OFF'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SETTING_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (item.isAction && item.action) {
                            item.action();
                          } else {
                            setActiveTab(item.id);
                          }
                        }}
                        className="bg-white dark:bg-[#161f30] border border-[#e2e8f0] dark:border-[#1f293d] hover:border-[#0088cc]/60 hover:shadow-md rounded-2xl p-5 transition-all cursor-pointer flex items-start justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${item.color} group-hover:scale-105 transition-transform`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[#1e293b] dark:text-white group-hover:text-[#0088cc] transition-colors">
                              {lang === 'bn' ? item.titleBn : item.titleEn}
                            </h4>
                            <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1 leading-relaxed">
                              {lang === 'bn' ? item.descBn : item.descEn}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#94a3b8] group-hover:text-[#0088cc] group-hover:translate-x-0.5 transition-all shrink-0 mt-3" />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : activeTab === 'files' ? (
              <ScriptEditor
                lang={lang}
                botId={selectedBot?.id}
                botName={selectedBot?.name}
                onFileSaved={() => {
                  onBotsUpdated();
                }}
              />
            ) : activeTab === 'database' ? (
              <DatabaseManager lang={lang} />
            ) : activeTab === 'guide' ? (
              <HostingGuide
                lang={lang}
                botId={selectedBot?.id}
                botName={selectedBot?.name}
              />
            ) : null}
          </div>
        </div>
      </div>

      {showPip && (
        <PipManagerModal onClose={() => setShowPip(false)} lang={lang} />
      )}
    </>
  );
};
