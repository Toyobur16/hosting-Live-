import React, { useState, useEffect } from 'react';
import { ShoppingBag, Bell, Menu, X, Shield, Sparkles, CheckCircle2, User, Wallet, LogOut, Sun, Moon } from 'lucide-react';
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
  pendingCount = 0
}: AppStoreHeaderProps) {
  const [unreadNotifications, setUnreadNotifications] = useState<number>(3);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // Fetch notifications if user logged in
    const token = localStorage.getItem('bot_auth_token');
    if (token) {
      fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.notifications) {
            setNotifications(data.notifications);
            const unread = data.notifications.filter((n: any) => !n.read).length;
            setUnreadNotifications(unread > 0 ? unread : 3);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const getUserInitial = () => {
    if (!user) return 'G';
    return (user.name || user.email || 'U').charAt(0).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0a0f1d]/95 dark:bg-[#070b13]/95 backdrop-blur-md border-b border-[#162035] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left Branding: Matching Screenshot 1 "App Store" with Green Store Icon */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-2.5 group cursor-pointer text-left focus:outline-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00d293] to-[#10b981] flex items-center justify-center shadow-lg shadow-[#00d293]/20 group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold text-white tracking-tight flex items-center gap-1.5">
                App Store
              </span>
              <span className="text-[10px] font-semibold text-[#00d293] tracking-wide uppercase">
                Premium Files & Bots
              </span>
            </div>
          </button>
        </div>

        {/* Center Desktop Quick Nav */}
        <nav className="hidden md:flex items-center gap-1 bg-[#0f172a]/80 p-1 rounded-xl border border-[#1e293b]">
          <button
            onClick={() => onSelectTab('home')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'bg-[#00d293] text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onSelectTab('market')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'market'
                ? 'bg-[#00d293] text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Market
          </button>
          <button
            onClick={() => onSelectTab('wallet')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'wallet'
                ? 'bg-[#00d293] text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Wallet
          </button>
          <button
            onClick={() => onSelectTab('plans')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'plans'
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-amber-400/90 hover:text-amber-300'
            }`}
          >
            👑 Plans
          </button>
          <button
            onClick={() => onSelectTab('bots')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'bots' || activeTab === 'terminal'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-sky-400 hover:text-sky-300'
            }`}
          >
            🤖 My Bots
          </button>
          <button
            onClick={() => onSelectTab('support')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'support'
                ? 'bg-[#00d293] text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Support
          </button>
        </nav>

        {/* Right Actions: Notification Bell with Badge, User Avatar Circle, Hamburger Menu */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Balance display if user is logged in */}
          {user && (
            <button
              onClick={() => onSelectTab('wallet')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f1b2b] hover:bg-[#142338] border border-[#00d293]/30 text-xs font-bold text-[#00d293] cursor-pointer transition-all hover:scale-102"
              title="Click to view wallet & deposit"
            >
              <Wallet className="w-3.5 h-3.5 text-[#00d293]" />
              <span>৳{user.balanceBdt || 0}</span>
              <span className="text-[10px] text-slate-400">(${user.balanceUsd || 0})</span>
            </button>
          )}

          {/* Notification Bell with Badge matching Screenshot 1 */}
          <div className="relative">
            <button
              id="header-notification-btn"
              onClick={() => {
                setShowNotificationDropdown(!showNotificationDropdown);
                onOpenNotifications();
              }}
              className="relative p-2.5 rounded-xl bg-[#111827] hover:bg-[#1f293d] border border-[#1e293b] text-slate-300 hover:text-white cursor-pointer transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-md animate-pulse">
                  {unreadNotifications}
                </span>
              )}
            </button>
          </div>

          {/* User Avatar Circle matching Screenshot 1 (initial with green ring border) */}
          {user ? (
            <button
              id="header-user-avatar-btn"
              onClick={() => onSelectTab('profile')}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e293b] to-[#0f172a] border-2 border-[#00d293] flex items-center justify-center text-white font-black text-sm shadow-md hover:scale-105 cursor-pointer transition-transform"
              title={`${user.name || user.email} (View Profile)`}
            >
              {getUserInitial()}
            </button>
          ) : (
            <button
              id="header-login-btn"
              onClick={onOpenAuthModal}
              className="px-3.5 py-1.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-black shadow-md cursor-pointer transition-all hover:scale-102"
            >
              Login
            </button>
          )}

          {/* Theme Toggle (Light/Dark) */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-[#111827] hover:bg-[#1f293d] border border-[#1e293b] text-slate-400 hover:text-amber-400 cursor-pointer transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Hamburger Menu Button (3 horizontal lines) matching Screenshot 1 */}
          <button
            id="header-sidebar-menu-btn"
            onClick={onOpenSidebar}
            className="p-2.5 rounded-xl bg-[#111827] hover:bg-[#1f293d] border border-[#1e293b] text-slate-300 hover:text-white cursor-pointer transition-colors"
            title="Open Menu"
          >
            <Menu className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </header>
  );
}
