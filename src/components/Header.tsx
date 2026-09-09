import React from 'react';
import { Terminal, Settings, Globe, Plus, LogOut, User, CheckCircle2, Moon, Sun, ShieldCheck } from 'lucide-react';
import { HostedBot, AuthUser } from '../types';

interface HeaderProps {
  bots: HostedBot[];
  selectedBotId: string | null;
  onSelectBot: (botId: string) => void;
  onOpenNewBotModal: () => void;
  onOpenSettingsModal: (initialTab?: string) => void;
  onOpenTokenChecker: () => void;
  lang: 'bn' | 'en';
  setLang: (lang: 'bn' | 'en') => void;
  user: AuthUser | null;
  onLogout: () => void;
  onOpenAuthModal: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  bots,
  selectedBotId,
  onSelectBot,
  onOpenNewBotModal,
  onOpenSettingsModal,
  onOpenTokenChecker,
  lang,
  setLang,
  user,
  onLogout,
  onOpenAuthModal,
  theme,
  onToggleTheme
}) => {
  const runningCount = bots.filter((b) => b.status === 'running').length;

  return (
    <header className="bg-white dark:bg-[#111827] border-b border-[#e2e8f0] dark:border-[#1f293d] text-[#1e293b] dark:text-[#f3f4f6] sticky top-0 z-30 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0088cc] flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-[#0088cc]/20">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#1e293b] dark:text-white flex items-center gap-1.5">
                Bot-Host
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#0088cc]/10 dark:bg-[#0088cc]/20 text-[#0088cc] border border-[#0088cc]/20 font-semibold">
                  Cloud
                </span>
                <span className="hidden sm:inline-flex text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-semibold">
                  ২৪/৭ লাইভ
                </span>
              </h1>
            </div>
            <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
              {lang === 'bn'
                ? 'সুরক্ষিত ও স্বাধীন টেলিগ্রাম বট ক্লাউড হোস্টিং'
                : 'Isolated & Secure Telegram Bot Cloud Hosting'}
            </p>
          </div>
        </div>

        {/* Live status badge */}
        <div className="flex items-center gap-2 bg-[#f8fafc] dark:bg-[#1e293b] px-3 py-1.5 rounded-xl border border-[#e2e8f0] dark:border-[#334155]">
          <span className="relative flex h-2 w-2">
            {runningCount > 0 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                runningCount > 0 ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            ></span>
          </span>
          <span className="text-xs font-semibold text-[#1e293b] dark:text-[#e2e8f0]">
            {runningCount}/{bots.length} {lang === 'bn' ? 'বট লাইভ' : 'Bots Online'}
          </span>
          {bots.length > 1 && (
            <>
              <div className="h-3.5 w-px bg-[#e2e8f0] dark:bg-[#334155] mx-1"></div>
              <select
                value={selectedBotId || ''}
                onChange={(e) => onSelectBot(e.target.value)}
                className="bg-white dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#334155] rounded-lg px-2 py-0.5 text-xs font-medium text-[#1e293b] dark:text-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-[#0088cc] cursor-pointer"
              >
                {bots.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.status === 'running' ? 'LIVE' : 'OFF'})
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Action Controls & User info */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Token Check Button */}
          <button
            id="header-token-check-btn"
            onClick={onOpenTokenChecker}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 text-[#0088cc] dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition-all shadow-2xs cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title={lang === 'bn' ? 'টেলিগ্রাম বট টোকেন সক্রিয় আছে কিনা পরীক্ষা করুন' : 'Verify if Telegram Bot Token is valid & active'}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#0088cc] dark:text-sky-300" />
            <span>{lang === 'bn' ? 'টোকেন চেক' : 'Check Token'}</span>
          </button>

          {/* New Bot Button */}
          <button
            id="header-deploy-bot-btn"
            onClick={onOpenNewBotModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white transition-all shadow-sm shadow-[#0088cc]/20 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? '+ বট ডিপ্লয়' : '+ Deploy Bot'}</span>
          </button>

          {/* Settings & Tools Button */}
          <button
            id="header-settings-btn"
            onClick={() => onOpenSettingsModal('overview')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] dark:bg-[#1e293b] dark:hover:bg-[#334155] text-[#1e293b] dark:text-[#f3f4f6] border border-[#e2e8f0] dark:border-[#334155] hover:border-[#0088cc]/40 transition-all cursor-pointer shadow-2xs"
            title={lang === 'bn' ? 'সেটিংস ও ফাইল ম্যানেজার' : 'Platform Settings & Tools'}
          >
            <Settings className="w-3.5 h-3.5 text-[#0088cc]" />
            <span>{lang === 'bn' ? 'সেটিংস' : 'Settings'}</span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            id="header-theme-toggle-btn"
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] dark:bg-[#1e293b] dark:hover:bg-[#334155] text-[#64748b] hover:text-[#1e293b] dark:text-[#94a3b8] dark:hover:text-white border border-[#e2e8f0] dark:border-[#334155] transition-all cursor-pointer"
            title={lang === 'bn' ? 'থিম পরিবর্তন করুন' : 'Toggle Dark Mode'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'bn' ? 'লাইট' : 'Light'}</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[#0088cc]" />
                <span>{lang === 'bn' ? 'ডার্ক' : 'Dark'}</span>
              </>
            )}
          </button>

          {/* Language Switch */}
          <button
            onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] dark:bg-[#1e293b] dark:hover:bg-[#334155] text-[#64748b] hover:text-[#1e293b] dark:text-[#94a3b8] dark:hover:text-white border border-[#e2e8f0] dark:border-[#334155] transition-all cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#94a3b8]" />
            <span>{lang === 'bn' ? 'ENG' : 'বাংলা'}</span>
          </button>

          {/* User Account / Profile button */}
          {user ? (
            <div className="flex items-center gap-1.5 pl-2 ml-1 border-l border-[#e2e8f0] dark:border-[#334155]">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] text-xs">
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[11px]">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden lg:block leading-tight">
                  <p className="font-bold text-[#1e293b] dark:text-white text-xs truncate max-w-[120px]">{user.name}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>{lang === 'bn' ? 'লগইন আছে' : 'Active'}</span>
                  </p>
                </div>
              </div>
              <button
                id="header-logout-btn"
                onClick={onLogout}
                className="p-2 rounded-xl bg-[#f8fafc] hover:bg-rose-50 dark:bg-[#1e293b] dark:hover:bg-rose-950/40 text-[#64748b] hover:text-rose-600 dark:text-[#94a3b8] dark:hover:text-rose-400 border border-[#e2e8f0] dark:border-[#334155] hover:border-rose-200 dark:hover:border-rose-800 transition-colors cursor-pointer"
                title={lang === 'bn' ? 'লগআউট' : 'Log Out'}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="header-login-btn"
              onClick={onOpenAuthModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs cursor-pointer ml-1"
            >
              <User className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'লগইন' : 'Sign In'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
