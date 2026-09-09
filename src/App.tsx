import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Shield, X, Bot, Terminal, Plus, Sparkles, ShieldCheck } from 'lucide-react';
import { Header } from './components/Header';
import { BotList } from './components/BotList';
import { LiveConsole } from './components/LiveConsole';
import { NewBotModal } from './components/NewBotModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { TokenCheckModal } from './components/TokenCheckModal';
import { HostedBot, LogEntry, AuthUser } from './types';

export default function App() {
  const [bots, setBots] = useState<HostedBot[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'bots' | 'terminal'>('bots');
  const [lang, setLang] = useState<'bn' | 'en'>('bn');
  const [showNewBotModal, setShowNewBotModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTokenCheckModal, setShowTokenCheckModal] = useState(false);
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
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
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
    if (!token) {
      // User can browse existing bots or log in
      return;
    }
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if ((data.authenticated || data.success) && data.user) {
        setCurrentUser(data.user);
      } else {
        localStorage.removeItem('bot_auth_token');
        setCurrentUser(null);
      }
    } catch {
      // Retain offline
    }
  };

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
    } catch {
      // Ignore
    }
  };

  const fetchLogs = async (botId: string | null) => {
    if (!botId) return;
    try {
      const res = await authFetch(`/api/bots/${botId}/logs?limit=400`);
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    fetchBots();
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
    try {
      const res = await authFetch(`/api/bots/${botId}/start`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchBots();
        fetchLogs(botId);
      }
    } catch {
      // Network retry
    } finally {
      setLoading(false);
    }
  };

  const handleStopBot = async (botId: string) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/bots/${botId}/stop`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchBots();
        fetchLogs(botId);
      }
    } catch {
      // Network retry
    } finally {
      setLoading(false);
    }
  };

  const handleRestartBot = async (botId: string) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/bots/${botId}/restart`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchBots();
        fetchLogs(botId);
      }
    } catch {
      // Network retry
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/bots/${botId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        if (selectedBotId === botId) {
          const remaining = bots.filter((b) => b.id !== botId);
          setSelectedBotId(remaining.length > 0 ? remaining[0].id : null);
          setLogs([]);
        }
        fetchBots();
      }
    } catch {
      // Network retry
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    if (!selectedBotId) return;
    try {
      await authFetch(`/api/bots/${selectedBotId}/logs`, { method: 'DELETE' });
      setLogs([]);
    } catch {
      // Ignore
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('bot_auth_token');
    setCurrentUser(null);
  };

  const selectedBot = bots.find((b) => b.id === selectedBotId);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0a0e1a] text-[#1e293b] dark:text-[#f3f4f6] flex flex-col selection:bg-[#0088cc] selection:text-white transition-colors">
      <Header
        bots={bots}
        selectedBotId={selectedBotId}
        onSelectBot={(id) => setSelectedBotId(id)}
        onOpenNewBotModal={() => {
          setTokenForDeploy(null);
          setShowNewBotModal(true);
        }}
        onOpenSettingsModal={(tab = 'overview') => {
          setSettingsInitialTab(tab);
          setShowSettingsModal(true);
        }}
        onOpenTokenChecker={() => setShowTokenCheckModal(true)}
        lang={lang}
        setLang={setLang}
        user={currentUser}
        onLogout={handleLogout}
        onOpenAuthModal={() => setShowAuthModal(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {toastMessage && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl text-xs flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold">{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-white p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Top View Switcher Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-[#1f293d] p-2.5 rounded-2xl shadow-xs transition-colors">
          <div className="flex items-center gap-1.5 bg-[#f8fafc] dark:bg-[#0f172a] p-1 rounded-xl border border-[#e2e8f0] dark:border-[#1f293d]">
            <button
              onClick={() => setActiveTab('bots')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'bots'
                  ? 'bg-[#0088cc] text-white shadow-xs'
                  : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'হোস্টেড বটস' : 'Hosted Bots'} ({bots.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('terminal')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'terminal'
                  ? 'bg-[#0088cc] text-white shadow-xs'
                  : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#1e293b] dark:hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'লাইভ টার্মিনাল ও লগ' : 'Live Terminal & Logs'}</span>
              {selectedBot?.status === 'running' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'terminal' && bots.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[#64748b] dark:text-[#94a3b8] font-semibold hidden sm:inline">
                  {lang === 'bn' ? 'বট নির্বাচন:' : 'Select Bot:'}
                </span>
                <select
                  value={selectedBotId || ''}
                  onChange={(e) => {
                    setSelectedBotId(e.target.value);
                    fetchLogs(e.target.value);
                  }}
                  className="bg-[#f8fafc] dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#1e293b] dark:text-white cursor-pointer"
                >
                  {bots.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.status === 'running' ? 'LIVE' : 'STOPPED'})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              id="toolbar-token-check-btn"
              onClick={() => setShowTokenCheckModal(true)}
              className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 text-[#0088cc] dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all hover:scale-[1.01]"
              title={lang === 'bn' ? 'টেলিগ্রাম বট টোকেন সক্রিয় আছে কিনা পরীক্ষা করুন' : 'Verify if Telegram Bot Token is valid & active'}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#0088cc] dark:text-sky-300" />
              <span>{lang === 'bn' ? 'টোকেন চেক' : 'Check Token'}</span>
            </button>
            <button
              id="toolbar-deploy-bot-btn"
              onClick={() => {
                setTokenForDeploy(null);
                setShowNewBotModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all hover:scale-[1.01]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? '+ নতুন বট ডিপ্লয়' : '+ Deploy Bot'}</span>
            </button>
          </div>
        </div>

        {activeTab === 'bots' && (
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
              setShowNewBotModal(true);
            }}
            onOpenFileEditor={(botId) => {
              setSelectedBotId(botId);
              setSettingsInitialTab('files');
              setShowSettingsModal(true);
            }}
            lang={lang}
          />
        )}

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

      <footer className="px-8 py-4 bg-white dark:bg-[#111827] border-t border-[#e2e8f0] dark:border-[#1f293d] text-[#94a3b8] text-xs flex flex-wrap items-center justify-between gap-2 mt-auto transition-colors">
        <span>&copy; Bot-Host — Free Unlimited Telegram Bot Cloud Hosting</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>স্ট্যাটাস: <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">সক্রিয়</span></span>
        </span>
      </footer>
    </div>
  );
}
