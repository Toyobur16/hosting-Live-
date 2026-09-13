import React from 'react';
import {
  X,
  Home,
  Store,
  Wallet,
  Heart,
  Download,
  Headphones,
  Bell,
  User,
  Shield,
  LogOut,
  Terminal,
  Crown,
  ChevronRight,
  ExternalLink
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
  pendingRequestsCount = 0
}: SidebarDrawerProps) {
  if (!isOpen) return null;

  const getUserInitial = () => {
    if (!user) return 'G';
    return (user.name || user.email || 'U').charAt(0).toUpperCase();
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, badge: null },
    { id: 'market', label: 'Marketplace', icon: Store, badge: 'Hot' },
    { id: 'wallet', label: 'Wallet', icon: Wallet, badge: user ? `৳${user.balanceBdt || 0}` : null },
    { id: 'wishlist', label: 'Wishlist', icon: Heart, badge: null },
    { id: 'bots', label: 'Downloads / My Bots', icon: Download, badge: null },
    { id: 'terminal', label: 'Live Terminal', icon: Terminal, badge: 'Live' },
    { id: 'plans', label: 'Hosting Plans', icon: Crown, badge: 'VIP' },
    { id: 'support', label: 'Support Center', icon: Headphones, badge: null },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: '3' },
    { id: 'profile', label: 'Profile', icon: User, badge: null }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xs sm:max-w-sm bg-[#0a0f1d] border-l border-[#162035] shadow-2xl flex flex-col justify-between overflow-y-auto">
          {/* Top Section */}
          <div>
            {/* Header: User card with close button */}
            <div className="p-5 border-b border-[#162035] flex items-center justify-between">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1e293b] to-[#0f172a] border-2 border-[#00d293] flex items-center justify-center text-white font-black text-lg shadow-md">
                    {getUserInitial()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white leading-tight">
                      {user.name || 'User'}
                    </span>
                    <span className="text-xs text-slate-400 truncate max-w-[160px]">
                      {user.email}
                    </span>
                    <span className="text-[10px] font-semibold text-[#00d293] mt-0.5">
                      {user.plan && user.plan !== 'free' ? `Plan: ${user.plan.toUpperCase()}` : 'Free Tier'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#111827] border border-[#1e293b] flex items-center justify-center text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">Guest User</span>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenAuthModal();
                      }}
                      className="text-xs text-[#00d293] hover:underline font-bold text-left cursor-pointer"
                    >
                      Login or Register →
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-[#111827] hover:bg-[#1f293d] border border-[#1e293b] text-slate-400 hover:text-white cursor-pointer transition-colors"
                title="Close Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation List matching Screenshot 4 */}
            <div className="py-3 px-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#00d293] text-slate-950 font-black shadow-md'
                        : 'text-slate-300 hover:bg-[#111827] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                            isActive
                              ? 'bg-slate-950/20 text-slate-950'
                              : item.badge === 'VIP'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : item.badge === 'Live'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-[#111827] text-slate-300 border border-[#1e293b]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                    </div>
                  </button>
                );
              })}

              {/* Admin Panel Link */}
              {isAdmin && (
                <button
                  onClick={() => {
                    onOpenAdminModal();
                    onClose();
                  }}
                  className="w-full mt-2 flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-900/40 to-indigo-900/40 hover:from-purple-900/60 hover:to-indigo-900/60 border border-purple-500/30 text-purple-300 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span>👑 Admin Panel</span>
                  </div>
                  {pendingRequestsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                      {pendingRequestsCount} Pending
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Bottom Section: Logout */}
          <div className="p-4 border-t border-[#162035]">
            {user ? (
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 text-xs font-bold cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout ({user.email})</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onOpenAuthModal();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 text-xs font-black cursor-pointer transition-colors shadow-md"
              >
                <User className="w-4 h-4" />
                <span>Login / Register</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
