import React, { useState, useEffect } from 'react';
import { CheckCircle2, X, Bell } from 'lucide-react';
import { AppStoreHeader } from './components/AppStoreHeader';
import { SidebarDrawer } from './components/SidebarDrawer';
import { BottomNavBar } from './components/BottomNavBar';
import { StoreHomePage } from './components/StoreHomePage';
import { MarketplacePage } from './components/MarketplacePage';
import { StoreWalletPage } from './components/StoreWalletPage';
import { WishlistPage } from './components/WishlistPage';
import { SupportCenterPage } from './components/SupportCenterPage';
import { ProfilePage } from './components/ProfilePage';
import { PlansPage } from './components/PlansPage';
import { BotList } from './components/BotList';
import { LiveConsole } from './components/LiveConsole';
import { NewBotModal } from './components/NewBotModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { TokenCheckModal } from './components/TokenCheckModal';
import { SafeUploadModal } from './components/SafeUploadModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { HostedBot, LogEntry, AuthUser } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'market' | 'wallet' | 'wishlist' | 'support' | 'profile' | 'plans' | 'bots' | 'terminal'>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [bots, setBots] = useState<HostedBot[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  const [lang, setLang] = useState<'bn' | 'en'>(() => {
    const saved = localStorage.getItem('bot_lang');
    return saved === 'en' ? 'en' : 'bn';
  });

  useEffect(() => {
    localStorage.setItem('bot_lang', lang);
  }, [lang]);

  const [showNewBotModal, setShowNewBotModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTokenCheckModal, setShowTokenCheckModal] = useState(false);
  const [showSafeUploadModal, setShowSafeUploadModal] = useState(false);
  const [safeUploadBot, setSafeUploadBot] = useState<HostedBot | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [tokenForDeploy, setTokenForDeploy] = useState<{ token: string; botName?: string } | null>(null);
  const [settingsInitialTab, setSettingsInitialTab] = useState<string>('overview');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dark Mode Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('bot_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('bot_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('bot_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('bot_auth_token');
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(url, { ...options, headers });
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('bot_auth_token');
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem('bot_auth_token');
        localStorage.removeItem('bot_auth_user');
        setCurrentUser(null);
        return;
      }
      const data = await res.json();
      if ((data.authenticated || data.success) && data.user) {
        setCurrentUser(data.user);
        localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
      }
    } catch {}
  };

  const fetchWishlist = async () => {
    const token = localStorage.getItem('bot_auth_token');
    if (!token) return;
    try {
      const res = await fetch('/api/wishlist', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWishlistIds(data.itemIds || []);
      }
    } catch {}
  };

  const handleToggleWishlist = async (itemId: string) => {
    if (!currentUser) {
      setShowAuthModal(true);
      setToastMessage(lang === 'bn' ? 'উইশলিস্টে যুক্ত করতে অনুগ্রহ করে লগইন করুন।' : 'Please log in to save to wishlist.');
      return;
    }
    try {
      const token = localStorage.getItem('bot_auth_token');
      const res = await fetch('/api/wishlist/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ itemId })
      });
      if (res.ok) {
        const data = await res.json();
        setWishlistIds(data.itemIds || []);
        setToastMessage(
          data.inWishlist
            ? (lang === 'bn' ? 'উইশলিস্টে যুক্ত করা হয়েছে ❤️' : 'Added to wishlist ❤️')
            : (lang === 'bn' ? 'উইশলিস্ট থেকে সরানো হয়েছে' : 'Removed from wishlist')
        );
        setTimeout(() => setToastMessage(null), 2500);
      }
    } catch {}
  };

  const fetchAdminOverview = async () => {
    if (currentUser?.role !== 'admin') return;
    try {
      const res = await authFetch('/api/admin/overview');
      if (res.ok) {
        const data = await res.json();
        setPendingRequestsCount(data.pendingRequestsCount || 0);
      }
    } catch {}
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchAdminOverview();
      const interval = setInterval(fetchAdminOverview, 15000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const isAdmin = Boolean(
    currentUser && (
      currentUser.role === 'admin' ||
      currentUser.email?.toLowerCase().trim() === 'toyoburrahman9090@gmail.com' ||
      currentUser.email?.toLowerCase().trim() === 'mdtayburrahman1111@gmail.com' ||
      currentUser.email?.toLowerCase().trim() === 'toyobur@telegram.bot'
    )
  );

  const hasActivePlan = Boolean(
    currentUser && (
      isAdmin ||
      (currentUser.plan && currentUser.plan !== 'free' && currentUser.plan !== 'none' && currentUser.plan !== 'expired' && (!currentUser.planExpiresAt || currentUser.planExpiresAt > Date.now()))
    )
  );

  // Private Admin URL Detection (?admin=true, /admin, #admin)
  useEffect(() => {
    const checkAdminRoute = () => {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();

      const isAdminUrl =
        params.get('admin') === 'true' ||
        params.get('admin') === 'portal' ||
        params.get('portal') === 'admin' ||
        pathname === '/admin' ||
        pathname.startsWith('/admin/') ||
        hash === '#admin' ||
        hash === '#admin-portal';

      if (isAdminUrl) {
        if (isAdmin) {
          setShowAdminModal(true);
        } else if (!currentUser) {
          setShowAuthModal(true);
          setToastMessage(
            lang === 'bn'
              ? 'গোপন এডমিন প্যানেল ওপেন করতে আপনার অনুমোদিত এডমিন অ্যাকাউন্ট দিয়ে লগইন করুন।'
              : 'Please log in with your authorized admin account to access the private admin portal.'
          );
        } else {
          setToastMessage(
            lang === 'bn'
              ? 'অ্যাক্সেস ডিনাইড: এই অ্যাকাউন্টটির এডমিন পারমিশন নেই।'
              : 'Access Denied: Your account does not have admin permissions.'
          );
        }
      }
    };

    checkAdminRoute();
    window.addEventListener('hashchange', checkAdminRoute);
    window.addEventListener('popstate', checkAdminRoute);
    return () => {
      window.removeEventListener('hashchange', checkAdminRoute);
      window.removeEventListener('popstate', checkAdminRoute);
    };
  }, [currentUser, isAdmin, lang]);

  const fetchBots = async () => {
    try {
      const res = await authFetch('/api/bots');
      const data = await res.json();
      if (data.bots && Array.isArray(data.bots)) {
        setBots(data.bots);
        if (!selectedBotId && data.bots.length > 0) {
          setSelectedBotId(data.bots[0].id);
        } else if (selectedBotId && !data.bots.some((b: HostedBot) => b.id === selectedBotId)) {
          setSelectedBotId(data.bots.length > 0 ? data.bots[0].id : null);
        }
      } else {
        setBots([]);
      }
    } catch {}
  };

  const fetchLogs = async (botId: string | null) => {
    if (!botId) return;
    try {
      const res = await authFetch(`/api/bots/${botId}/logs?limit=400`);
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch {}
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    fetchBots();
    if (currentUser) {
      fetchWishlist();
    }
  }, [currentUser]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchBots();
      if (activeTab === 'terminal' && selectedBotId) {
        fetchLogs(selectedBotId);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [currentUser, activeTab, selectedBotId]);

  const handleStartBot = async (botId: string) => {
    setLoading(true);
    setBots((prev) =>
      prev.map((b) => (b.id === botId ? { ...b, status: 'running' } : b))
    );
    try {
      await authFetch(`/api/bots/${botId}/start`, { method: 'POST' });
      await fetchBots();
      fetchLogs(botId);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleStopBot = async (botId: string) => {
    setLoading(true);
    setBots((prev) =>
      prev.map((b) => (b.id === botId ? { ...b, status: 'stopped' } : b))
    );
    try {
      await authFetch(`/api/bots/${botId}/stop`, { method: 'POST' });
      await fetchBots();
      fetchLogs(botId);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleRestartBot = async (botId: string) => {
    setLoading(true);
    setBots((prev) =>
      prev.map((b) => (b.id === botId ? { ...b, status: 'starting' } : b))
    );
    try {
      await authFetch(`/api/bots/${botId}/restart`, { method: 'POST' });
      await fetchBots();
      fetchLogs(botId);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    const bot = bots.find((b) => b.id === botId);
    if (!bot) return;
    const confirmMsg =
      lang === 'bn'
        ? `আপনি কি নিশ্চিতভাবে '${bot.name}' বটটি মুছে ফেলতে চান?`
        : `Are you sure you want to delete '${bot.name}'?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await authFetch(`/api/bots/${botId}`, { method: 'DELETE' });
      await fetchBots();
      if (selectedBotId === botId) {
        setSelectedBotId(null);
        setLogs([]);
      }
      setToastMessage(
        lang === 'bn' ? `'${bot.name}' মুছে ফেলা হয়েছে` : `'${bot.name}' deleted`
      );
    } catch {}
  };

  const handleClearLogs = async () => {
    if (!selectedBotId) return;
    try {
      await authFetch(`/api/bots/${selectedBotId}/logs`, { method: 'DELETE' });
      setLogs([]);
    } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem('bot_auth_token');
    localStorage.removeItem('bot_auth_user');
    setCurrentUser(null);
    setToastMessage(lang === 'bn' ? 'সফলভাবে লগআউট করা হয়েছে' : 'Logged out successfully');
  };

  const selectedBot = bots.find((b) => b.id === selectedBotId);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-[#00d293] selection:text-slate-950 pb-20 sm:pb-8">
      {/* Top App Store Header */}
      <AppStoreHeader
        user={currentUser}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab as any)}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onOpenNotifications={() => setShowNotificationsModal(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        pendingCount={pendingRequestsCount}
      />

      {/* Slide-out Navigation Drawer */}
      <SidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab as any)}
        user={currentUser}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onOpenAdminModal={() => setShowAdminModal(true)}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        pendingRequestsCount={pendingRequestsCount}
      />

      {/* Main Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {toastMessage && (
          <div className="mb-4 p-3.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 rounded-2xl text-xs flex items-center justify-between shadow-lg animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-emerald-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 1. Store Home Page */}
        {activeTab === 'home' && (
          <StoreHomePage
            user={currentUser}
            onNavigateToWallet={() => setActiveTab('wallet')}
            onNavigateToMarket={() => setActiveTab('market')}
            onNavigateToPlans={() => setActiveTab('plans')}
            onOpenAuthModal={() => setShowAuthModal(true)}
            onOpenAdminModal={() => setShowAdminModal(true)}
            onItemPurchased={() => checkAuth()}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
          />
        )}

        {/* 2. Marketplace Page */}
        {activeTab === 'market' && (
          <MarketplacePage
            user={currentUser}
            onNavigateToWallet={() => setActiveTab('wallet')}
            onNavigateToPlans={() => setActiveTab('plans')}
            onOpenAuthModal={() => setShowAuthModal(true)}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
          />
        )}

        {/* 3. Wallet & Deposit Page */}
        {activeTab === 'wallet' && (
          <StoreWalletPage
            user={currentUser}
            onOpenAuthModal={() => setShowAuthModal(true)}
            onNavigateToPlans={() => setActiveTab('plans')}
            onUserUpdated={(u) => {
              setCurrentUser(u);
              checkAuth();
            }}
          />
        )}

        {/* 4. Wishlist Page */}
        {activeTab === 'wishlist' && (
          <WishlistPage
            user={currentUser}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            onNavigateToMarket={() => setActiveTab('market')}
            onNavigateToWallet={() => setActiveTab('wallet')}
            onOpenAuthModal={() => setShowAuthModal(true)}
          />
        )}

        {/* 5. Support Center Page */}
        {activeTab === 'support' && (
          <SupportCenterPage
            user={currentUser}
            onBack={() => setActiveTab('home')}
            onOpenAuthModal={() => setShowAuthModal(true)}
          />
        )}

        {/* 6. Profile Page */}
        {activeTab === 'profile' && (
          <ProfilePage
            user={currentUser}
            onOpenAuthModal={() => setShowAuthModal(true)}
            onNavigateToWallet={() => setActiveTab('wallet')}
            onNavigateToPlans={() => setActiveTab('plans')}
            onNavigateToBots={() => setActiveTab('bots')}
            onLogout={handleLogout}
            isAdmin={isAdmin}
            onOpenAdminModal={() => setShowAdminModal(true)}
          />
        )}

        {/* 7. Hosting Plans Page */}
        {activeTab === 'plans' && (
          <PlansPage
            user={currentUser}
            onOpenAuthModal={() => setShowAuthModal(true)}
            onNavigateToWallet={() => setActiveTab('wallet')}
            onPlanActivated={(updatedUser) => {
              setCurrentUser(updatedUser);
              fetchBots();
              setToastMessage(
                lang === 'bn'
                  ? '🎉 হোস্টিং প্লান সফলভাবে অ্যাক্টিভ হয়েছে! এখন আপনি নতুন বট ডিপ্লয় করতে পারবেন।'
                  : '🎉 Hosting plan activated! You can now deploy new bots.'
              );
            }}
            lang={lang}
          />
        )}

        {/* 8. Bot List / Manager */}
        {activeTab === 'bots' && (
          <div className="space-y-4">
            <BotList
              bots={bots}
              selectedBotId={selectedBotId}
              onSelectBot={(id) => {
                setSelectedBotId(id);
                setActiveTab('terminal');
              }}
              onStartBot={handleStartBot}
              onStopBot={handleStopBot}
              onRestartBot={handleRestartBot}
              onDeleteBot={handleDeleteBot}
              onOpenNewBotModal={() => {
                if (!hasActivePlan) {
                  setActiveTab('plans');
                  setToastMessage('বট ডিপ্লয় করতে হলে প্রথমে যেকোনো একটি হোস্টিং প্লান কিনুন।');
                  return;
                }
                setShowNewBotModal(true);
              }}
              onOpenFileEditor={(botId) => {
                setSelectedBotId(botId);
                setSettingsInitialTab('files');
                setShowSettingsModal(true);
              }}
              onOpenSafeUpload={(bot) => {
                setSafeUploadBot(bot);
                setShowSafeUploadModal(true);
              }}
              hasActivePlan={hasActivePlan}
              onOpenPlans={() => setActiveTab('plans')}
              lang={lang}
            />
          </div>
        )}

        {/* 9. Live Console Terminal */}
        {activeTab === 'terminal' && (
          <LiveConsole
            logs={logs}
            onClear={handleClearLogs}
            lang={lang}
            botName={selectedBot?.name}
            botStatus={selectedBot?.status}
            onStart={() => selectedBot && handleStartBot(selectedBot.id)}
            onStop={() => selectedBot && handleStopBot(selectedBot.id)}
            onRestart={() => selectedBot && handleRestartBot(selectedBot.id)}
            loading={loading}
          />
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNavBar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab as any)}
        unreadWishlist={wishlistIds.length}
        userBalance={currentUser?.balanceUsd || 0}
      />

      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        canDismiss={true}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setShowAuthModal(false);
          setToastMessage(
            lang === 'bn'
              ? `স্বাগতম, ${user.name}! আপনি সফলভাবে লগইন হয়েছেন।`
              : `Welcome, ${user.name}! You are logged in.`
          );
        }}
        lang={lang}
      />

      {showNewBotModal && (
        <NewBotModal
          onClose={() => {
            setShowNewBotModal(false);
            setTokenForDeploy(null);
          }}
          onCreated={(newBot) => {
            fetchBots();
            setSelectedBotId(newBot.id);
            setActiveTab('terminal');
            fetchLogs(newBot.id);
            setToastMessage(
              lang === 'bn'
                ? `'${newBot.name}' সফলভাবে ডিপ্লয় করা হয়েছে এবং লাইভ চলছে!`
                : `'${newBot.name}' hosted successfully and is now running 24/7!`
            );
            setShowNewBotModal(false);
            setTokenForDeploy(null);
          }}
          lang={lang}
          initialToken={tokenForDeploy?.token || ''}
          initialName={tokenForDeploy?.botName || ''}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          lang={lang}
          currentUser={currentUser}
          bots={bots}
          selectedBotId={selectedBotId}
          onSelectBot={(id) => setSelectedBotId(id)}
          onBotsUpdated={() => fetchBots()}
          onTestToken={() => setShowTokenCheckModal(true)}
          initialTab={settingsInitialTab}
        />
      )}

      <TokenCheckModal
        isOpen={showTokenCheckModal}
        onClose={() => setShowTokenCheckModal(false)}
        lang={lang}
        onDeployWithToken={(token, botName) => {
          setTokenForDeploy({ token, botName });
          setShowTokenCheckModal(false);
          setShowNewBotModal(true);
        }}
      />

      {showSafeUploadModal && safeUploadBot && (
        <SafeUploadModal
          isOpen={showSafeUploadModal}
          onClose={() => {
            setShowSafeUploadModal(false);
            setSafeUploadBot(null);
          }}
          bot={safeUploadBot}
          onSuccess={() => {
            fetchBots();
            setToastMessage(
              lang === 'bn'
                ? `'${safeUploadBot.name}' এর ফাইল সফলভাবে আপডেট হয়েছে এবং ব্যালেন্স অক্ষত আছে!`
                : `'${safeUploadBot.name}' files safely updated and balances preserved!`
            );
          }}
          lang={lang}
        />
      )}

      {showAdminModal && (
        <AdminPanelModal
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
          currentUser={currentUser}
          lang={lang}
          onBotAction={() => fetchBots()}
        />
      )}

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0d1527] border border-[#1e2d48] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2d48]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#00d293]/10 text-[#00d293] flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">নোটিফিকেশন সেন্টার</h3>
                  <span className="text-[11px] text-slate-400">সর্বশেষ আপডেট ও অফার</span>
                </div>
              </div>
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#162238] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-[#111c33] border border-[#1e2d48] space-y-1">
                <span className="text-xs font-bold text-[#00d293] block">⚡ ডিপোজিট সিস্টেম আপডেট</span>
                <p className="text-[11px] text-slate-300">
                  বিকাশ (01614572747), নগদ (01304104492) এবং Binance Pay (922593999) এর মাধ্যমে ইনস্ট্যান্ট ডিপোজিট সুবিধা চালু রয়েছে।
                </p>
                <span className="text-[10px] text-slate-500 block pt-1">১ ঘণ্টা আগে</span>
              </div>

              <div className="p-3 rounded-xl bg-[#111c33] border border-[#1e2d48] space-y-1">
                <span className="text-xs font-bold text-amber-400 block">🛍️ নতুন টেলিগ্রাম মিনি অ্যাপ ফাইল</span>
                <p className="text-[11px] text-slate-300">
                  স্টোরে নতুন ২০২৬ এর ভিআইপি ফাইল ও সোর্স কোড যুক্ত হয়েছে। মাত্র ২৫০ টাকায় ডাউনলোড করুন।
                </p>
                <span className="text-[10px] text-slate-500 block pt-1">৩ ঘণ্টা আগে</span>
              </div>

              <div className="p-3 rounded-xl bg-[#111c33] border border-[#1e2d48] space-y-1">
                <span className="text-xs font-bold text-sky-400 block">🤖 ক্লাউড হোস্টিং ২৪/৭ অ্যাক্টিভ</span>
                <p className="text-[11px] text-slate-300">
                  আপনার ডিপ্লয় করা টেলিগ্রাম বটসমূহ বিরতিহীনভাবে ক্লাউড সার্ভারে সচল থাকবে।
                </p>
                <span className="text-[10px] text-slate-500 block pt-1">১ দিন আগে</span>
              </div>
            </div>

            <button
              onClick={() => setShowNotificationsModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#00d293] hover:bg-[#00be84] text-slate-950 font-black text-xs cursor-pointer"
            >
              ঠিক আছে (Close)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
