import React from 'react';
import { Home, Store, Wallet, Heart, User } from 'lucide-react';

interface BottomNavBarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  unreadWishlist?: number;
  userBalance?: number;
}

export function BottomNavBar({
  activeTab,
  onSelectTab,
  unreadWishlist = 0,
  userBalance = 0
}: BottomNavBarProps) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'market', label: 'Market', icon: Store },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0f1d]/95 dark:bg-[#070b13]/95 backdrop-blur-md border-t border-[#162035] py-2 px-3 transition-colors">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
                isActive ? 'text-[#00d293] scale-105' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5] text-[#00d293]' : ''}`} />
                {tab.id === 'wishlist' && unreadWishlist > 0 && (
                  <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                    {unreadWishlist}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-1 font-semibold ${isActive ? 'font-black text-[#00d293]' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#00d293] mt-0.5"></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
