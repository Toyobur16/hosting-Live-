import React, { useState, useEffect } from 'react';
import {
  Server,
  Bell,
  Menu,
  Languages,
  User,
  Wallet,
  Sun,
  Moon,
  Rocket,
  PlusCircle,
  Crown
} from 'lucide-react';
import { AuthUser } from '../types';

interface AppStoreHeaderProps {
  user: AuthUser | null;
  onOpenSidebar: () => void;
  onOpenAuthModal: () => void;
  onOpenNotifications: () => void;
  onSelectTab: (tab: string) => void;
  activeTab: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  lang: 'bn' | 'en';
  onToggleLang: () => void;
  onDeployNewBot: () => void;
  hasActivePlan: boolean;
  botsCount?: number;
  pendingCount?: number;
}

export function AppStoreHeader({
  user,
  onOpenSidebar,
  onOpenAuthModal,
  onOpenNotifications,
  onSelectTab,
  activeTab,
  theme,
  onToggleTheme,
  lang,
  onToggleLang,
  onDeployNewBot,
  hasActivePlan,
  botsCount = 0,
  pendingCount = 0
}: AppStoreHeaderProps) {
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  useEffect(() => {
    const token = localStorage.getItem('bot_auth_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch('/api/notifications', { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.notifications) {
          const unread = data.notifications.filter((n: any) => !n.read).length;
          setUnreadNotifications(unread);
        }
      })
      .catch(() => {});
  }, [user]);

  const getUserInitial = () => {
    if (!user) return 'U';
    return (user.name || user.email || 'U').charAt(0).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#070b13]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#162035] transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left Branding: hosting-Live Fast & USDT Balance Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-2.5 group cursor-pointer text-left focus:outline-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00d293] to-emerald-400 flex items-center justify-center shadow-lg shadow-[#00d293]/20 group-hover:scale-105 transition-transform">
              <Server className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                hosting-Live Fast
              </span>
              <span className="text-[10px] font-bold text-[#00d293] tracking-wider uppercase">
                {lang === 'bn' ? '২৪/৭ ক্লাউড বট হোস্টিং' : '24/7 Cloud Bot & Web Hosting'}
              </span>
            </div>
          </button>

          {/* Balance Button right beside Website Name */}
          <button
            id="brand-usdt-balance-button"
            type="button"
            onClick={() => (user ? onSelectTab('wallet') : onOpenAuthModal())}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-black text-emerald-600 dark:text-[#00d293] cursor-pointer transition-all shadow-xs hover:scale-102"
            title={user ? (lang === 'bn' ? 'ওয়ালেট ও ডিপোজিট দেখুন' : 'View USDT Wallet & Deposit') : (lang === 'bn' ? 'লগইন করুন' : 'Login to view balance')}
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="font-extrabold tracking-tight">
              ${user ? Number(user.balanceUsd || 0).toFixed(2) : '0.00'}
            </span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider">
              USDT
            </span>
          </button>
        </div>

        {/* Center Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-[#0f172a]/80 p-1 rounded-xl border border-slate-200 dark:border-[#1e293b]">
          <button
            onClick={() => onSelectTab('home')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'bg-[#00d293] text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {lang === 'bn' ? 'হোম' : 'Home'}
          </button>

          {/* Plans replaces Market */}
          <button
            onClick={() => onSelectTab('plans')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'plans'
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            {lang === 'bn' ? 'প্ল্যানস' : 'Plans'}
          </button>

          {/* Deploy New Bot replaces Wishlist - Plan Gated */}
          <button
            onClick={onDeployNewBot}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-[#00d293]/15 hover:bg-[#00d293]/25 text-[#00a876] dark:text-[#00d293] border border-[#00d293]/30"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            {lang === 'bn' ? 'ডিপ্লয় বট' : 'Deploy New Bot'}
          </button>

          {/* My Bots replaces Downloads */}
          <button
            onClick={() => onSelectTab('bots')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'bots' || activeTab === 'terminal'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'আমার বট' : 'My Bots'}</span>
            {botsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white/20 text-current">
                {botsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('wallet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'wallet'
                ? 'bg-[#00d293] text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            {lang === 'bn' ? 'ওয়ালেট' : 'Wallet'}
          </button>

          <button
            onClick={() => onSelectTab('support')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'support'
                ? 'bg-[#00d293] text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {lang === 'bn' ? 'সাপোর্ট' : 'Support'}
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Quick Deploy button on tablet/mobile */}
          <button
            onClick={onDeployNewBot}
            className="hidden md:flex lg:hidden items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-black shadow-xs cursor-pointer transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'ডিপ্লয় বট' : 'Deploy'}</span>
          </button>

          {/* User Balance Chip */}
          {user && (
            <button
              onClick={() => onSelectTab('wallet')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0f1b2b] hover:bg-slate-200 dark:hover:bg-[#142338] border border-slate-200 dark:border-[#00d293]/30 text-xs font-bold text-slate-800 dark:text-[#00d293] cursor-pointer transition-all"
              title={lang === 'bn' ? 'ওয়ালেট ও ডিপোজিট দেখুন' : 'View Wallet & Deposit'}
            >
              <Wallet className="w-3.5 h-3.5 text-[#00d293]" />
              <span className="font-extrabold">${(user.balanceUsd || 0).toFixed(2)}</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                USDT
              </span>
            </button>
          )}

          {/* Language Switch Button */}
          <button
            onClick={onToggleLang}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#111827] hover:bg-slate-200 dark:hover:bg-[#1f293d] border border-slate-200 dark:border-[#1e293b] text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
            title={lang === 'bn' ? 'Switch to English' : 'বাংলা ভাষায় দেখুন'}
          >
            <Languages className="w-3.5 h-3.5 text-[#00d293]" />
            <span>{lang === 'bn' ? 'EN' : 'বাংলা'}</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-[#111827] hover:bg-slate-200 dark:hover:bg-[#1f293d] border border-slate-200 dark:border-[#1e293b] text-slate-700 dark:text-slate-300 hover:text-amber-500 cursor-pointer transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'ডার্ক মোড চালু করুন'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notification Bell */}
          <button
            id="header-notification-btn"
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl bg-slate-100 dark:bg-[#111827] hover:bg-slate-200 dark:hover:bg-[#1f293d] border border-slate-200 dark:border-[#1e293b] text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors"
            title={lang === 'bn' ? 'নোটিফিকেশন সেন্টার' : 'Notifications'}
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-md animate-pulse">
                {unreadNotifications}
              </span>
            )}
          </button>

          {/* User Profile or Login */}
          {user ? (
            <button
              id="header-user-avatar-btn"
              onClick={() => onSelectTab('profile')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-200 dark:bg-[#1e293b] border-2 border-[#00d293] flex items-center justify-center text-slate-900 dark:text-white font-black text-sm shadow-md hover:scale-105 cursor-pointer transition-transform"
              title={`${user.name || user.email} (${lang === 'bn' ? 'প্রোফাইল দেখুন' : 'View Profile'})`}
            >
              {getUserInitial()}
            </button>
          ) : (
            <button
              id="header-login-btn"
              onClick={onOpenAuthModal}
              className="px-3 sm:px-4 py-1.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-black shadow-md cursor-pointer transition-all hover:scale-102"
            >
              {lang === 'bn' ? 'লগইন' : 'Login'}
            </button>
          )}

          {/* Hamburger Menu for Mobile */}
          <button
            id="header-sidebar-menu-btn"
            onClick={onOpenSidebar}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-[#111827] hover:bg-slate-200 dark:hover:bg-[#1f293d] border border-slate-200 dark:border-[#1e293b] text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white cursor-pointer transition-colors"
            title={lang === 'bn' ? 'মেনু খুলুন' : 'Open Menu'}
          >
            <Menu className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </header>
  );
}
