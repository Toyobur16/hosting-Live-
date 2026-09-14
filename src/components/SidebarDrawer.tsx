import React from 'react';
import {
  X,
  Home,
  Crown,
  PlusCircle,
  Server,
  Terminal,
  Wallet,
  Headphones,
  User,
  Shield,
  LogOut,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { AuthUser } from '../types';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAuthModal: () => void;
  onOpenAdminModal: () => void;
  onLogout: () => void;
  isAdmin: boolean;
  pendingRequestsCount?: number;
  lang: 'bn' | 'en';
  onDeployNewBot: () => void;
  botsCount?: number;
}

export function SidebarDrawer({
  isOpen,
  onClose,
  user,
  activeTab,
  onSelectTab,
  onOpenAuthModal,
  onOpenAdminModal,
  onLogout,
  isAdmin,
  pendingRequestsCount = 0,
  lang,
  onDeployNewBot,
  botsCount = 0
}: SidebarDrawerProps) {
  if (!isOpen) return null;

  const getUserInitial = () => {
    if (!user) return 'U';
    return (user.name || user.email || 'U').charAt(0).toUpperCase();
  };

  const navItems = [
    {
      id: 'home',
      label: lang === 'bn' ? 'হোম পেজ' : 'Home Page',
      icon: Home,
      badge: null,
      color: 'emerald'
    },
    {
      id: 'plans',
      label: lang === 'bn' ? 'হোস্টিং প্ল্যানস' : 'Hosting Plans',
      icon: Crown,
      badge: 'VIP',
      color: 'amber'
    },
    {
      id: 'deploy_action',
      label: lang === 'bn' ? 'নতুন বট ডিপ্লয় করুন' : 'Deploy New Bot',
      icon: PlusCircle,
      badge: lang === 'bn' ? 'লাইভ' : 'Live',
      color: 'emerald',
      isAction: true
    },
    {
      id: 'bots',
      label: lang === 'bn' ? 'আমার বট সমূহ' : 'My Hosted Bots',
      icon: Server,
      badge: botsCount > 0 ? `${botsCount}` : null,
      color: 'sky'
    },
    {
      id: 'terminal',
      label: lang === 'bn' ? 'লাইভ কনসোল টার্মিনাল' : 'Live Console Terminal',
      icon: Terminal,
      badge: 'Real-time',
      color: 'slate'
    },
    {
      id: 'wallet',
      label: lang === 'bn' ? 'ওয়ালেট ও ডিপোজিট' : 'Wallet & Deposit',
      icon: Wallet,
      badge: user ? `৳${user.balanceBdt || 0}` : null,
      color: 'emerald'
    },
    {
      id: 'support',
      label: lang === 'bn' ? 'সাপোর্ট সেন্টার' : 'Support Center',
      icon: Headphones,
      badge: '24/7',
      color: 'indigo'
    },
    {
      id: 'profile',
      label: lang === 'bn' ? 'ইউজার প্রোফাইল' : 'My Profile',
      icon: User,
      badge: null,
      color: 'slate'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xs sm:max-w-sm bg-white dark:bg-[#0a0f1d] border-l border-slate-200 dark:border-[#162035] shadow-2xl flex flex-col justify-between overflow-y-auto transition-colors">
          {/* Top Section */}
          <div>
            {/* Header: User card with close button */}
            <div className="p-5 border-b border-slate-200 dark:border-[#162035] flex items-center justify-between">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-[#1e293b] border-2 border-[#00d293] flex items-center justify-center text-slate-900 dark:text-white font-black text-base shadow-md">
                    {getUserInitial()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      {user.name || 'User'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                      {user.email}
                    </span>
                    <span className="text-[10px] font-bold text-[#00a876] dark:text-[#00d293] mt-0.5">
                      {user.plan && user.plan !== 'free'
                        ? `${lang === 'bn' ? 'প্ল্যান:' : 'Plan:'} ${user.plan.toUpperCase()}`
                        : lang === 'bn'
                        ? 'ফ্রি টিয়ার'
                        : 'Free Starter'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#111827] border border-slate-200 dark:border-[#1e293b] flex items-center justify-center text-slate-500">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {lang === 'bn' ? 'গেস্ট ইউজার' : 'Guest User'}
                    </span>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenAuthModal();
                      }}
                      className="text-xs text-[#00a876] dark:text-[#00d293] hover:underline font-bold text-left cursor-pointer"
                    >
                      {lang === 'bn' ? 'লগইন বা রেজিস্টার →' : 'Login / Register →'}
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-100 dark:bg-[#111827] hover:bg-slate-200 dark:hover:bg-[#1f293d] border border-slate-200 dark:border-[#1e293b] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation List */}
            <div className="py-3 px-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onClose();
                      if (item.isAction) {
                        onDeployNewBot();
                      } else {
                        onSelectTab(item.id);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#00d293] text-slate-950 font-black shadow-md'
                        : item.isAction
                        ? 'bg-[#00d293]/10 text-[#00a876] dark:text-[#00d293] hover:bg-[#00d293]/20 border border-[#00d293]/30'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#111827] hover:text-slate-950 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-[#00d293]'}`} />
                      <span>{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.badge && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            isActive
                              ? 'bg-slate-950 text-white'
                              : 'bg-slate-200 dark:bg-[#1c273e] text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Section: Admin Portal & Logout */}
          <div className="p-4 border-t border-slate-200 dark:border-[#162035] space-y-2">
            {/* Admin Management Button (Visible if user is admin) */}
            {isAdmin && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAdminModal();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-black transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" />
                  <span>{lang === 'bn' ? 'এডমিন ম্যানেজমেন্ট প্যানেল' : 'Admin Management Panel'}</span>
                </div>
                {pendingRequestsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            )}

            {user ? (
              <button
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{lang === 'bn' ? 'লগআউট করুন' : 'Sign Out'}</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  onOpenAuthModal();
                }}
                className="w-full py-2.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer"
              >
                {lang === 'bn' ? 'একাউন্টে লগইন করুন' : 'Log In / Register'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
