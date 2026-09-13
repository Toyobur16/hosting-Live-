import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn, exec, execSync } from 'child_process';
import { createServer as createViteServer } from 'vite';
import {
  sendEmailAlert,
  sendDepositProcessedAlert,
  sendSubscriptionExpirationAlert,
  getUserNotifications
} from './server/emailAlerts';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

const HOSTED_BOTS_DIR = path.join(process.cwd(), 'hosted_bots');
const REGISTRY_FILE = path.join(HOSTED_BOTS_DIR, 'registry.json');
const ACCOUNTS_FILE = path.join(HOSTED_BOTS_DIR, 'accounts.json');
const SESSIONS_FILE = path.join(HOSTED_BOTS_DIR, 'sessions.json');
const PLANS_FILE = path.join(HOSTED_BOTS_DIR, 'plans.json');
const PLAN_REQUESTS_FILE = path.join(HOSTED_BOTS_DIR, 'plan_requests.json');
const PAYMENT_SETTINGS_FILE = path.join(HOSTED_BOTS_DIR, 'payment_settings.json');

// Ensure base directories and persistence files exist
if (!fs.existsSync(HOSTED_BOTS_DIR)) {
  fs.mkdirSync(HOSTED_BOTS_DIR, { recursive: true });
}
if (!fs.existsSync(REGISTRY_FILE)) {
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(ACCOUNTS_FILE)) {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(SESSIONS_FILE)) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify({}, null, 2), 'utf-8');
}

const DEFAULT_PLANS = [
  {
    id: 'free',
    nameBn: 'ফ্রি ট্রায়াল প্লান',
    nameEn: 'Free Starter',
    durationDays: 0,
    maxBots: 1,
    priceBdt: 0,
    priceUsd: 0,
    popular: false,
    featuresBn: [
      '১টি টেলিগ্রাম বট লাইভ হোস্টিং',
      '২৪/৭ ক্লাউড রানটাইম ওয়াচডগ',
      'লাইভ টার্মিনাল কনসোল ও রিয়েল-টাইম লগ',
      'অটোমেটিক ডাটাবেজ ব্যাকআপ ও ব্যালেন্স সুরক্ষা'
    ],
    featuresEn: [
      '1 Telegram Bot Live Hosting',
      '24/7 Cloud Runtime Watchdog',
      'Live Terminal Console & Real-time Logs',
      'Automatic Database Backup & Balance Safety'
    ]
  },
  {
    id: '1_month',
    nameBn: '১ মাস প্লান',
    nameEn: '1 Month Plan',
    durationDays: 30,
    maxBots: 3,
    priceBdt: 150,
    priceUsd: 1.50,
    popular: false,
    featuresBn: [
      '৩টি টেলিগ্রাম বট একসাথে লাইভ',
      '১ মাস (৩০ দিন) সার্বক্ষণিক লাইভ হোস্টিং',
      'হাই-স্পিড প্রায়োরিটি রানটাইম সিপিইউ',
      'ব্যালেন্স ও ডাটাবেজ অটো-প্রোটেকশন',
      'পাইপ (Pip) লাইব্রেরি প্যাকেজ ম্যানেজার'
    ],
    featuresEn: [
      '3 Telegram Bots Concurrent Live',
      '1 Month (30 Days) Continuous Hosting',
      'High-speed Priority CPU Runtime',
      'Balance & Database Auto-Protection',
      'Python Pip Library Package Manager'
    ]
  },
  {
    id: '3_months',
    nameBn: '৩ মাস প্রিমিয়াম',
    nameEn: '3 Months Plan',
    durationDays: 90,
    maxBots: 5,
    priceBdt: 400,
    priceUsd: 4.00,
    popular: true,
    featuresBn: [
      '৫টি টেলিগ্রাম বট লাইভ হোস্টিং',
      '৩ মাস (৯০ দিন) প্রিমিয়াম ক্লাউড সার্ভার',
      'ইনস্ট্যান্ট রিস্টার্ট ও অটো-হিলিং ওয়াচডগ',
      'ফুল ফাইল এডিটর ও ডাটাবেজ সিঙ্ক',
      'প্রাইভেট ভিআইপি সাপোর্ট'
    ],
    featuresEn: [
      '5 Telegram Bots Live Hosting',
      '3 Months (90 Days) Premium Cloud Server',
      'Instant Restart & Auto-Healing Watchdog',
      'Full File Editor & Database Sync',
      'Private VIP Support'
    ]
  },
  {
    id: '6_months',
    nameBn: '৬ মাস বিজনেস',
    nameEn: '6 Months Plan',
    durationDays: 180,
    maxBots: 10,
    priceBdt: 750,
    priceUsd: 7.50,
    popular: false,
    featuresBn: [
      '১০টি টেলিগ্রাম বট লাইভ হোস্টিং',
      '৬ মাস (১৮০ দিন) হাই-পারফরম্যান্স ক্লাউড',
      'আনলিমিটেড ডাটাবেজ স্ন্যাপশট ও রিস্টোর',
      'এসএমএস ও ওটিপি গেটওয়ে সাপোর্ট',
      'ভিআইপি প্রায়োরিটি প্রসেস'
    ],
    featuresEn: [
      '10 Telegram Bots Live Hosting',
      '6 Months (180 Days) High-Performance Cloud',
      'Unlimited Database Snapshots & Restore',
      'SMS & OTP Gateway Support',
      'VIP Priority Process'
    ]
  },
  {
    id: '1_year',
    nameBn: '১ বছর আনলিমিটেড',
    nameEn: '1 Year Plan',
    durationDays: 365,
    maxBots: 999,
    priceBdt: 1400,
    priceUsd: 14.00,
    popular: false,
    featuresBn: [
      'আনলিমিটেড টেলিগ্রাম বট লাইভ হোস্টিং',
      '১ বছর (৩৬৫ দিন) ডেডিকেটেড ভিআইপি ক্লাউড',
      'লাইফটাইম ডাটা ও ব্যালেন্স সুরক্ষা গ্যারান্টি',
      'সর্বোচ্চ ব্যান্ডউইথ ও ব্যাকগ্রাউন্ড পারফরম্যান্স',
      '২৪/৭ এডমিন ডিরেক্ট সাপোর্ট ও হেল্প'
    ],
    featuresEn: [
      'Unlimited Telegram Bots Live Hosting',
      '1 Year (365 Days) Dedicated VIP Cloud',
      'Lifetime Data & Balance Safety Guarantee',
      'Maximum Bandwidth & Background Performance',
      '24/7 Direct Admin Support & Assistance'
    ]
  }
];

if (!fs.existsSync(PLANS_FILE)) {
  fs.writeFileSync(PLANS_FILE, JSON.stringify(DEFAULT_PLANS, null, 2), 'utf-8');
}
if (!fs.existsSync(PLAN_REQUESTS_FILE)) {
  fs.writeFileSync(PLAN_REQUESTS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

const DEFAULT_PAYMENT_SETTINGS = {
  binanceUid: '849201948',
  binancePayId: '849201948',
  binanceId: 'USDT (TRC20): TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
  bkashNumber: '01711223344 (Personal - Send Money)',
  nagadNumber: '01811223344 (Personal - Send Money)',
  rocketNumber: '01911223344 (Personal - Send Money)',
  instructionsBn: 'বাইন্যান্স (Binance Pay / UID) দিয়ে নির্ধারিত ডলার পাঠিয়ে আপনার Transaction ID / Order ID এবং আপনার প্রেরক আইডি নিচে লিখে সাবমিট করুন। এডমিন অনুমোদন করলেই সাথে সাথে আপনার প্লান সক্রিয় হবে।',
  instructionsEn: 'Send USDT via Binance Pay / UID, then submit your Binance Transaction ID / Order ID below. Once approved by admin, your plan activates instantly.'
};

if (!fs.existsSync(PAYMENT_SETTINGS_FILE)) {
  fs.writeFileSync(PAYMENT_SETTINGS_FILE, JSON.stringify(DEFAULT_PAYMENT_SETTINGS, null, 2), 'utf-8');
}

// In-memory process and log store
interface BotProcess {
  process: any;
  startTime: number;
}
const runningProcesses = new Map<string, BotProcess>();
const botLogs = new Map<string, Array<{ id: string; timestamp: string; level: 'info' | 'warn' | 'error'; message: string }>>();

// Robust Python Package Installer
function runPipInstall(args: string, cwd?: string, timeout = 60000): void {
  const dir = cwd || process.cwd();
  try {
    execSync(`python3 -m pip install --break-system-packages --no-cache-dir ${args}`, { cwd: dir, timeout });
  } catch {
    try {
      execSync(`pip3 install --break-system-packages --no-cache-dir ${args}`, { cwd: dir, timeout });
    } catch {
      try {
        execSync(`apt-get update && apt-get install -y python3-pip python3-venv`, { timeout: 90000 });
        execSync(`python3 -m pip install --break-system-packages --no-cache-dir ${args}`, { cwd: dir, timeout });
      } catch (err: any) {
        throw err;
      }
    }
  }
}

// Background environment verification ensuring pip and core libraries are ready
function ensurePythonBotDependencies() {
  exec('python3 -c "import httpx, telebot, telegram, aiogram, requests"', (err) => {
    if (err) {
      console.log('Installing core Python bot dependencies...');
      exec('python3 -m pip install --break-system-packages --no-cache-dir httpx "httpx[http2]" pyTelegramBotAPI python-telegram-bot aiogram requests aiohttp pillow beautifulsoup4 pydantic pytz schedule', (instErr) => {
        if (instErr) {
          exec('apt-get update && apt-get install -y python3-pip python3-venv && python3 -m pip install --break-system-packages --no-cache-dir httpx "httpx[http2]" pyTelegramBotAPI python-telegram-bot aiogram requests aiohttp pillow beautifulsoup4 pydantic pytz schedule');
        }
      });
    }
  });
}
ensurePythonBotDependencies();

function appendLog(botId: string, level: 'info' | 'warn' | 'error', message: string) {
  if (!botLogs.has(botId)) {
    botLogs.set(botId, []);
  }
  const logs = botLogs.get(botId)!;
  logs.push({
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    level,
    message
  });
  if (logs.length > 800) {
    logs.splice(0, logs.length - 800);
  }
  // Also append to file in bot workspace
  try {
    const logFilePath = path.join(HOSTED_BOTS_DIR, botId, 'bot.log');
    fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}\n`);
  } catch {
    // Ignore
  }
}

// Registry helpers
function getRegistry(): any[] {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveRegistry(data: any[]) {
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function getAccounts(): any[] {
  try {
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveAccounts(data: any[]) {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function getSessions(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveSessions(data: Record<string, string>) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function getPlans(): any[] {
  try {
    return JSON.parse(fs.readFileSync(PLANS_FILE, 'utf-8'));
  } catch {
    return DEFAULT_PLANS;
  }
}

function savePlans(data: any[]) {
  fs.writeFileSync(PLANS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function getPlanRequests(): any[] {
  try {
    return JSON.parse(fs.readFileSync(PLAN_REQUESTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function savePlanRequests(data: any[]) {
  fs.writeFileSync(PLAN_REQUESTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function getPaymentSettings(): any {
  try {
    const data = JSON.parse(fs.readFileSync(PAYMENT_SETTINGS_FILE, 'utf-8'));
    return { ...DEFAULT_PAYMENT_SETTINGS, ...data };
  } catch {
    return DEFAULT_PAYMENT_SETTINGS;
  }
}

function savePaymentSettings(data: any) {
  fs.writeFileSync(PAYMENT_SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function isUserAdmin(user: any): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const email = (user.email || '').toLowerCase().trim();
  if (email === 'mdtayburrahman1111@gmail.com' || email === 'toyobur@telegram.bot') {
    return true;
  }
  return false;
}

function generateAuthToken(user: any): string {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // Valid for 30 days (persists across 24h)
  };
  return `bt_${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
}

function enrichUserWithPlanAndRole(user: any): any {
  if (!user) return null;
  const accounts = getAccounts();
  let changed = false;

  if (isUserAdmin(user) && user.role !== 'admin') {
    user.role = 'admin';
    user.maxBots = 999;
    changed = true;
  }

  if (!user.plan) {
    user.plan = 'free';
    user.maxBots = user.role === 'admin' ? 999 : 1;
    changed = true;
  }

  if (user.role !== 'admin' && user.planExpiresAt && user.planExpiresAt < Date.now()) {
    user.plan = 'free';
    user.maxBots = 1;
    user.planExpiresAt = null;
    changed = true;
  }

  if (typeof user.balanceBdt !== 'number') {
    user.balanceBdt = 0;
    changed = true;
  }
  if (typeof user.balanceUsd !== 'number') {
    user.balanceUsd = 0;
    changed = true;
  }

  if (changed) {
    const idx = accounts.findIndex((a) => a.id === user.id);
    if (idx !== -1) {
      accounts[idx] = { ...accounts[idx], ...user };
      saveAccounts(accounts);
    }
  }

  return user;
}

// Auth Middleware (Token based with 30-day session persistence)
function getAuthUser(req: express.Request): any | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  if (!token) return null;

  const sessions = getSessions();
  const accounts = getAccounts();

  // 1. Direct session lookup
  if (sessions[token]) {
    const userId = sessions[token];
    const user = accounts.find((a) => a.id === userId);
    if (user) return enrichUserWithPlanAndRole(user);
  }

  // 2. Structured self-healing token (retains login across container restarts for 30 days)
  if (token.startsWith('bt_')) {
    try {
      const jsonStr = Buffer.from(token.slice(3), 'base64url').toString('utf-8');
      const payload = JSON.parse(jsonStr);
      if (payload && payload.userId && payload.expiresAt && payload.expiresAt > Date.now()) {
        let user = accounts.find(
          (a) => a.id === payload.userId || (payload.email && a.email?.toLowerCase() === payload.email.toLowerCase())
        );
        if (!user) {
          const isAdmin = accounts.length === 0 || 
            (payload.email && (payload.email.toLowerCase() === 'mdtayburrahman1111@gmail.com' || payload.email.toLowerCase() === 'toyobur@telegram.bot'));
          user = {
            id: payload.userId,
            name: payload.name || (payload.email ? payload.email.split('@')[0] : 'User'),
            email: payload.email || 'user@bot-host.local',
            role: isAdmin ? 'admin' : (payload.role || 'user'),
            plan: 'free',
            maxBots: isAdmin ? 999 : 1
          };
          accounts.push(user);
          saveAccounts(accounts);
        }
        sessions[token] = user.id;
        saveSessions(sessions);
        return enrichUserWithPlanAndRole(user);
      }
    } catch {
      // Invalid payload
    }
  }

  return null;
}

// Bot runner
function launchBotProcess(bot: any): boolean {
  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  if (!fs.existsSync(botDir)) {
    appendLog(bot.id, 'error', `Workspace folder not found: ${botDir}`);
    return false;
  }

  // Stop previous instance if alive
  if (runningProcesses.has(bot.id)) {
    try {
      const p = runningProcesses.get(bot.id)!.process;
      p.kill('SIGTERM');
      setTimeout(() => {
        try { p.kill('SIGKILL'); } catch {}
      }, 100);
    } catch {
      // Ignore
    }
    runningProcesses.delete(bot.id);
  }
  try {
    execSync(`pkill -9 -f "${botDir}" 2>/dev/null || true`);
  } catch {}

  const entry = bot.entryFile || 'bot.py';
  const entryPath = path.join(botDir, entry);
  if (!fs.existsSync(entryPath)) {
    appendLog(bot.id, 'error', `Entry script '${entry}' does not exist in workspace.`);
    return false;
  }

  // Ensure default JSON files exist so bot does not crash with FileNotFoundError
  const defaultJsons = [
    { name: 'users.json', content: '{}' },
    { name: 'paid_sms.json', content: '{}' },
    { name: 'user_stats.json', content: '{}' },
    { name: 'referral_data.json', content: '{}' },
    { name: 'banned_users.json', content: '[]' },
    { name: 'withdraw_requests.json', content: '{}' },
    { name: 'activity_logs.json', content: '[]' },
    { name: 'datarange.json', content: '{}' },
    { name: 'custom_services.json', content: '[]' }
  ];
  for (const jf of defaultJsons) {
    const p = path.join(botDir, jf.name);
    if (!fs.existsSync(p)) {
      try {
        fs.writeFileSync(p, jf.content, 'utf-8');
      } catch {}
    }
  }

  // Auto install requirements.txt if present
  const reqFile = path.join(botDir, 'requirements.txt');
  if (fs.existsSync(reqFile)) {
    try {
      runPipInstall(`-r "${reqFile}"`, botDir, 60000);
    } catch {}
  }

  appendLog(bot.id, 'info', `Starting python process: python3 ${entry}`);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PYTHONUNBUFFERED: '1',
    BOT_TOKEN: bot.token || '',
    TOKEN: bot.token || '',
    TELEGRAM_BOT_TOKEN: bot.token || '',
    API_TOKEN: bot.token || '',
    TELEGRAM_TOKEN: bot.token || ''
  };

  // Load .env file from bot workspace if present
  const envFilePath = path.join(botDir, '.env');
  if (fs.existsSync(envFilePath)) {
    try {
      const envRaw = fs.readFileSync(envFilePath, 'utf-8');
      for (const line of envRaw.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const eqIdx = trimmed.indexOf('=');
          const k = trimmed.slice(0, eqIdx).trim();
          let v = trimmed.slice(eqIdx + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          if (k) env[k] = v;
        }
      }
    } catch {}
  }

  try {
    const child = spawn('python3', [entry], {
      cwd: botDir,
      env
    });

    runningProcesses.set(bot.id, {
      process: child,
      startTime: Date.now()
    });

    child.stdout.on('data', (data: Buffer) => {
      const lines = data.toString('utf-8').split('\n');
      for (const line of lines) {
        if (line.trim()) {
          appendLog(bot.id, 'info', line);
        }
      }
    });

    child.stderr.on('data', (data: Buffer) => {
      const text = data.toString('utf-8');
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          appendLog(bot.id, 'warn', line);

          // Auto-heal missing python modules or packages
          let missingPkg: string | null = null;
          const modMatch = line.match(/(?:ModuleNotFoundError|ImportError): No module named ['"]([^'"]+)['"]/);
          if (modMatch && modMatch[1]) {
            missingPkg = modMatch[1];
          } else if (line.includes("'h2' package is not installed") || line.includes("install httpx[http2]")) {
            missingPkg = "h2";
          } else if (line.match(/the ['"]([a-zA-Z0-9_\-]+)['"] package is not installed/i)) {
            const m = line.match(/the ['"]([a-zA-Z0-9_\-]+)['"] package is not installed/i);
            if (m && m[1]) missingPkg = m[1];
          } else if (line.match(/pip install ([a-zA-Z0-9_\-\[\]]+)/i)) {
            const m = line.match(/pip install ([a-zA-Z0-9_\-\[\]]+)/i);
            if (m && m[1]) missingPkg = m[1];
          }

          if (missingPkg) {
            const pkgAliases: Record<string, string> = {
              telebot: 'pyTelegramBotAPI',
              telegram: 'python-telegram-bot',
              PIL: 'pillow',
              bs4: 'beautifulsoup4',
              cv2: 'opencv-python',
              dotenv: 'python-dotenv'
            };
            const targetPkg = pkgAliases[missingPkg] || missingPkg;
            appendLog(bot.id, 'info', `Auto-healing: Installing missing library '${targetPkg}' via python pip...`);
            try {
              runPipInstall(`"${targetPkg}"`, botDir, 45000);
              appendLog(bot.id, 'info', `Library '${targetPkg}' installed! Re-launching bot process...`);
              setTimeout(() => {
                launchBotProcess(bot);
              }, 1500);
            } catch (instErr: any) {
              appendLog(bot.id, 'warn', `Could not auto-install '${targetPkg}': ${instErr.message}`);
            }
          }
        }
      }
    });

    child.on('close', (code: number) => {
      appendLog(bot.id, code === 0 ? 'info' : 'error', `Process exited with code ${code}`);
      runningProcesses.delete(bot.id);
      const reg = getRegistry();
      const idx = reg.findIndex((b) => b.id === bot.id);
      if (idx !== -1) {
        reg[idx].status = 'stopped';
        reg[idx].pid = null;
        saveRegistry(reg);
      }
    });

    child.on('error', (err: Error) => {
      appendLog(bot.id, 'error', `Process spawn error: ${err.message}`);
    });

    // Update registry status
    const reg = getRegistry();
    const idx = reg.findIndex((b) => b.id === bot.id);
    if (idx !== -1) {
      reg[idx].status = 'running';
      reg[idx].pid = child.pid;
      reg[idx].lastPing = new Date().toISOString();
      saveRegistry(reg);
    }
    return true;
  } catch (err: any) {
    appendLog(bot.id, 'error', `Failed to spawn: ${err.message}`);
    return false;
  }
}

function stopBotProcess(botId: string): boolean {
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === botId);
  const botDir = bot ? path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id) : null;

  if (runningProcesses.has(botId)) {
    const item = runningProcesses.get(botId)!;
    const p = item.process;
    const pid = p.pid;
    try {
      p.kill('SIGTERM');
    } catch {}

    if (pid) {
      try { process.kill(pid, 'SIGKILL'); } catch {}
      try { process.kill(-pid, 'SIGKILL'); } catch {}
    }
    runningProcesses.delete(botId);
  }

  // Forcefully terminate any remaining python process attached to this bot workspace
  if (botDir) {
    try {
      execSync(`pkill -9 -f "${botDir}" 2>/dev/null || true`);
    } catch {}
  }

  // Close Telegram active polling session & drop pending updates if bot token is present
  if (bot?.token) {
    try {
      fetch(`https://api.telegram.org/bot${bot.token}/deleteWebhook?drop_pending_updates=true`).catch(() => {});
      fetch(`https://api.telegram.org/bot${bot.token}/close`).catch(() => {});
    } catch {}
  }

  const idx = reg.findIndex((b) => b.id === botId);
  if (idx !== -1) {
    reg[idx].status = 'stopped';
    reg[idx].pid = null;
    reg[idx].autoRestart = false; // Disable watchdog auto-restart when explicitly stopped
    saveRegistry(reg);
  }
  appendLog(botId, 'info', 'Bot process forcefully stopped and Telegram session closed.');
  return true;
}

// Watchdog service: runs every 10 seconds to ensure 24/7 stability and auto-restart
setInterval(() => {
  const reg = getRegistry();
  for (const bot of reg) {
    if (bot.autoRestart && bot.status === 'running') {
      if (!runningProcesses.has(bot.id)) {
        appendLog(bot.id, 'info', '24/7 Watchdog: Process died or container restarted. Auto-restarting bot...');
        launchBotProcess(bot);
      }
    }
  }
}, 10000);

// API ROUTES

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    bots: getRegistry().length,
    activeProcesses: runningProcesses.size,
    timestamp: new Date().toISOString()
  });
});

// 1. Auth routes
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  const accounts = getAccounts();
  const existing = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Account with this email already exists' });
  }

  const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newUser = {
    id: userId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: accounts.length === 0 ? 'admin' : 'user'
  };
  accounts.push(newUser);
  saveAccounts(accounts);

  const token = generateAuthToken(newUser);
  const sessions = getSessions();
  sessions[token] = userId;
  saveSessions(sessions);

  res.json({ success: true, token, user: newUser });
});

app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const accounts = getAccounts();
  let user = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    // Quick auto-registration if doesn't exist
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    user = {
      id: userId,
      name: email.split('@')[0],
      email: email.trim().toLowerCase(),
      role: accounts.length === 0 ? 'admin' : 'user'
    };
    accounts.push(user);
    saveAccounts(accounts);
  }

  const token = generateAuthToken(user);
  const sessions = getSessions();
  sessions[token] = user.id;
  saveSessions(sessions);

  res.json({ success: true, token, user });
});

app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ authenticated: false, error: 'Unauthorized' });
  }
  res.json({ authenticated: true, user });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const sessions = getSessions();
    delete sessions[token];
    saveSessions(sessions);
  }
  res.json({ success: true });
});

// Google Direct Login route
app.post('/api/auth/google', (req, res) => {
  try {
    const { credential, email: directEmail, name: directName, picture: directPicture, googleId: directGoogleId } = req.body;
    let email = '';
    let name = '';
    let picture = '';
    let googleId = '';

    if (credential && typeof credential === 'string') {
      try {
        const parts = credential.split('.');
        if (parts.length >= 2) {
          const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf-8');
          const payload = JSON.parse(payloadJson);
          email = payload.email || '';
          name = payload.name || payload.given_name || email.split('@')[0];
          picture = payload.picture || '';
          googleId = payload.sub || '';
        }
      } catch (err) {
        console.error('Failed to parse Google JWT:', err);
      }
    }

    if (!email && directEmail) {
      email = directEmail;
      name = directName || directEmail.split('@')[0];
      picture = directPicture || '';
      googleId = directGoogleId || '';
    }

    if (!email) {
      return res.status(400).json({ error: 'Google sign-in did not provide a valid email address' });
    }

    email = email.trim().toLowerCase();
    name = (name || email.split('@')[0]).trim();

    const accounts = getAccounts();
    let user = accounts.find((a) => a.email && a.email.toLowerCase() === email);

    const isAdmin = accounts.length === 0 ||
      email === 'mdtayburrahman1111@gmail.com' ||
      email === 'toyobur@telegram.bot' ||
      (user && user.role === 'admin');

    if (!user) {
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      user = {
        id: userId,
        name,
        email,
        avatar: picture || '',
        googleId,
        role: isAdmin ? 'admin' : 'user',
        plan: 'free',
        maxBots: isAdmin ? 999 : 1,
        planExpiresAt: null,
        isVerified: true,
        createdAt: new Date().toISOString()
      };
      accounts.push(user);
      saveAccounts(accounts);
    } else {
      let changed = false;
      if (picture && !user.avatar) {
        user.avatar = picture;
        changed = true;
      }
      if (isAdmin && user.role !== 'admin') {
        user.role = 'admin';
        user.maxBots = 999;
        changed = true;
      }
      if (!user.isVerified) {
        user.isVerified = true;
        changed = true;
      }
      if (!user.plan) {
        user.plan = 'free';
        user.maxBots = user.role === 'admin' ? 999 : 1;
        changed = true;
      }
      if (changed) {
        saveAccounts(accounts);
      }
    }

    user = enrichUserWithPlanAndRole(user);
    const token = generateAuthToken(user);
    const sessions = getSessions();
    sessions[token] = user.id;
    saveSessions(sessions);

    return res.json({ success: true, token, user });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Google login failed' });
  }
});

// Hosting Plans & Payment Endpoints
app.get('/api/plans', (req, res) => {
  res.json({ plans: getPlans() });
});

app.get('/api/payment-settings', (req, res) => {
  res.json({ settings: getPaymentSettings() });
});

app.post('/api/plans/purchase', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'প্লান কিনতে প্রথমে লগইন করুন (Please login to purchase a plan)' });
  }

  const { planId, method, senderNumber, transactionId, note } = req.body;
  if (!planId) return res.status(400).json({ error: 'প্লান নির্বাচন করুন (Plan is required)' });
  if (!senderNumber || !senderNumber.trim()) return res.status(400).json({ error: 'প্রেরক ফোন নাম্বার দিন (Sender phone number is required)' });
  if (!transactionId || !transactionId.trim()) return res.status(400).json({ error: 'Transaction ID (TrxID) দিন' });

  const plans = getPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) {
    return res.status(404).json({ error: 'Invalid plan selected' });
  }

  const requests = getPlanRequests();
  const isBinance = method === 'binance';
  const amount = isBinance ? (plan.priceUsd || Math.round((plan.priceBdt || 150) / 120)) : (plan.priceBdt || 150);
  const currency = isBinance ? 'USD' : 'BDT';

  const newRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type: 'plan_purchase',
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    planId: plan.id,
    planName: plan.nameBn,
    durationDays: plan.durationDays,
    amount,
    currency,
    method: method || 'binance',
    senderNumber: senderNumber.trim(),
    transactionId: transactionId.trim().toUpperCase(),
    note: (note || '').trim(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  requests.unshift(newRequest);
  savePlanRequests(requests);

  res.json({
    success: true,
    message: 'আপনার প্লান রিকোয়েস্ট সফলভাবে জমা হয়েছে। এডমিন ভেরিফাই করে অনুমোদন (Approve) করলেই প্লান সক্রিয় হবে।',
    request: newRequest
  });
});

// Wallet Deposit Submission Endpoint
app.post('/api/wallet/deposit', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'ডিপোজিট করতে প্রথমে লগইন করুন (Please login to deposit)' });
  }

  const { amount, currency, method, senderIdentifier, transactionId, note } = req.body;
  const numAmount = parseFloat(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'সঠিক পরিমাণ (Amount) লিখুন' });
  }
  if (!senderIdentifier || !senderIdentifier.trim()) {
    return res.status(400).json({ error: 'প্রেরক ফোন নাম্বার বা Binance UID দিন' });
  }
  if (!transactionId || !transactionId.trim()) {
    return res.status(400).json({ error: 'Transaction ID (TrxID) দিন' });
  }

  const requests = getPlanRequests();
  const newRequest = {
    id: `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type: 'deposit',
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    planId: 'wallet_deposit',
    planName: `ওয়ালেট ডিপোজিট (${numAmount} ${currency || 'USD'})`,
    amount: numAmount,
    currency: currency === 'BDT' ? 'BDT' : 'USD',
    method: method || 'binance',
    senderNumber: senderIdentifier.trim(),
    senderIdentifier: senderIdentifier.trim(),
    transactionId: transactionId.trim().toUpperCase(),
    note: (note || '').trim(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  requests.unshift(newRequest);
  savePlanRequests(requests);

  res.json({
    success: true,
    message: 'আপনার ডিপোজিট রিকোয়েস্ট সফলভাবে জমা হয়েছে। এডমিন ভেরিফাই করে অনুমোদন করলেই আপনার ওয়ালেটে ব্যালেন্স যোগ হবে।',
    request: newRequest
  });
});

// Buy Plan with Wallet Balance Endpoint
app.post('/api/plans/buy-with-wallet', async (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'প্যাকেজ কিনতে প্রথমে লগইন করুন (Please login to purchase)' });
  }

  const { planId, currency } = req.body;
  if (!planId) return res.status(400).json({ error: 'প্লান নির্বাচন করুন' });

  const plans = getPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return res.status(404).json({ error: 'প্লানটি খুঁজে পাওয়া যায়নি (Plan not found)' });
  if (plan.id === 'free') return res.status(400).json({ error: 'ফ্রি প্লান কেনার প্রয়োজন নেই।' });

  const accounts = getAccounts();
  const targetUser = accounts.find((a) => a.id === user.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  targetUser.balanceBdt = typeof targetUser.balanceBdt === 'number' ? targetUser.balanceBdt : 0;
  targetUser.balanceUsd = typeof targetUser.balanceUsd === 'number' ? targetUser.balanceUsd : 0;

  const payCurrency = currency === 'BDT' ? 'BDT' : 'USD';
  const price = payCurrency === 'BDT' ? (plan.priceBdt || 0) : (plan.priceUsd || 0);

  if (payCurrency === 'USD') {
    if (targetUser.balanceUsd < price) {
      return res.status(400).json({
        error: `আপনার ওয়ালেটে পর্যাপ্ত USD ব্যালেন্স নেই। প্রয়োজন: $${price} USD, বর্তমান ব্যালেন্স: $${targetUser.balanceUsd.toFixed(2)} USD। প্রথমে ডিপোজিট করুন।`,
        needsDeposit: true,
        requiredAmount: price,
        currentBalance: targetUser.balanceUsd,
        currency: 'USD'
      });
    }
    targetUser.balanceUsd = parseFloat((targetUser.balanceUsd - price).toFixed(2));
  } else {
    if (targetUser.balanceBdt < price) {
      return res.status(400).json({
        error: `আপনার ওয়ালেটে পর্যাপ্ত BDT ব্যালেন্স নেই। প্রয়োজন: ৳${price} BDT, বর্তমান ব্যালেন্স: ৳${targetUser.balanceBdt.toFixed(2)} BDT। প্রথমে ডিপোজিট করুন।`,
        needsDeposit: true,
        requiredAmount: price,
        currentBalance: targetUser.balanceBdt,
        currency: 'BDT'
      });
    }
    targetUser.balanceBdt = parseFloat((targetUser.balanceBdt - price).toFixed(2));
  }

  // Activate / extend user plan
  const durationDays = plan.durationDays || 30;
  targetUser.plan = plan.id;
  targetUser.maxBots = plan.maxBots || 3;
  const currentExpiry = (targetUser.planExpiresAt && targetUser.planExpiresAt > Date.now()) ? targetUser.planExpiresAt : Date.now();
  targetUser.planExpiresAt = currentExpiry + durationDays * 24 * 60 * 60 * 1000;
  saveAccounts(accounts);

  // Send in-app notification & email alert
  sendEmailAlert({
    to: targetUser.email,
    userId: targetUser.id,
    type: 'plan_purchased',
    subject: `🎉 প্যাকেজ সফলভাবে কেনা হয়েছে (${plan.nameBn})`,
    html: `<p>প্রিয় ${targetUser.name}, আপনি সফলভাবে <strong>${plan.nameBn}</strong> প্যাকেজটি ক্রয় করেছেন। ওয়ালেট থেকে ${price} ${payCurrency} কাটা হয়েছে। আপনার নতুন মেয়াদ: ${new Date(targetUser.planExpiresAt).toLocaleDateString('bn-BD')}।</p>`,
    text: `আপনি সফলভাবে ${plan.nameBn} প্যাকেজটি কিনেছেন। ওয়ালেট থেকে ${price} ${payCurrency} কাটা হয়েছে।`
  });

  res.json({
    success: true,
    message: `🎉 অভিনন্দন! "${plan.nameBn}" সফলভাবে ক্রয় করা হয়েছে। আপনার প্লান সক্রিয় করা হয়েছে।`,
    user: enrichUserWithPlanAndRole(targetUser)
  });
});

app.get('/api/notifications', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.json({ notifications: [] });
  res.json({ notifications: getUserNotifications(user.id) });
});

app.get('/api/plans/my-request', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const requests = getPlanRequests();
  const userRequests = requests.filter((r) => r.userId === user.id || (r.userEmail && r.userEmail.toLowerCase() === user.email.toLowerCase()));
  const latest = userRequests.length > 0 ? userRequests[0] : null;

  res.json({
    latestRequest: latest,
    allRequests: userRequests,
    userPlan: user.plan || 'free',
    planExpiresAt: user.planExpiresAt || null,
    maxBots: user.maxBots || 1,
    balanceBdt: user.balanceBdt || 0,
    balanceUsd: user.balanceUsd || 0
  });
});

// Admin Panel Endpoints
app.get('/api/admin/overview', (req, res) => {
  const user = getAuthUser(req);
  if (!isUserAdmin(user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const accounts = getAccounts();
  const reg = getRegistry();
  const requests = getPlanRequests();
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const approvedRequests = requests.filter((r) => r.status === 'approved');
  const totalRevenue = approvedRequests.reduce((sum, r) => sum + (r.amount || 0), 0);

  res.json({
    totalUsers: accounts.length,
    totalBots: reg.length,
    runningBots: runningProcesses.size,
    pendingRequestsCount: pendingRequests.length,
    approvedRequestsCount: approvedRequests.length,
    totalRevenueBdt: totalRevenue,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/admin/plan-requests', (req, res) => {
  const user = getAuthUser(req);
  if (!isUserAdmin(user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json({ requests: getPlanRequests() });
});

app.post('/api/admin/plan-requests/:id/approve', async (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  const requests = getPlanRequests();
  const reqIdx = requests.findIndex((r) => r.id === id);
  if (reqIdx === -1) {
    return res.status(404).json({ error: 'Request not found' });
  }

  const request = requests[reqIdx];
  if (request.status === 'approved') {
    return res.status(400).json({ error: 'Request is already approved' });
  }

  request.status = 'approved';
  request.reviewedAt = new Date().toISOString();
  request.reviewedBy = admin ? admin.email : 'admin';
  savePlanRequests(requests);

  // Update target user account
  const accounts = getAccounts();
  const targetUser = accounts.find((a) => a.id === request.userId || (a.email && a.email.toLowerCase() === request.userEmail.toLowerCase()));
  if (targetUser) {
    if (request.type === 'deposit') {
      // Wallet deposit approval
      if (request.currency === 'BDT') {
        targetUser.balanceBdt = (targetUser.balanceBdt || 0) + (request.amount || 0);
      } else {
        targetUser.balanceUsd = (targetUser.balanceUsd || 0) + (request.amount || 0);
      }
      saveAccounts(accounts);
      await sendDepositProcessedAlert(targetUser, request, 'approved');
    } else {
      // Direct plan request approval
      const plans = getPlans();
      const plan = plans.find((p) => p.id === request.planId);
      const durationDays = request.durationDays || (plan ? plan.durationDays : 30);
      targetUser.plan = request.planId;
      const currentExpiry = (targetUser.planExpiresAt && targetUser.planExpiresAt > Date.now()) ? targetUser.planExpiresAt : Date.now();
      targetUser.planExpiresAt = currentExpiry + durationDays * 24 * 60 * 60 * 1000;

      if (request.planId === '1_month') targetUser.maxBots = 3;
      else if (request.planId === '3_months') targetUser.maxBots = 5;
      else if (request.planId === '6_months') targetUser.maxBots = 10;
      else if (request.planId === '1_year') targetUser.maxBots = 999;
      else if (plan && plan.maxBots) targetUser.maxBots = plan.maxBots;
      else targetUser.maxBots = 1;

      saveAccounts(accounts);
      await sendDepositProcessedAlert(targetUser, request, 'approved');
    }
  }

  res.json({ success: true, message: 'অনুমোদন সফল হয়েছে (Approved successfully)', request, updatedUser: targetUser });
});

app.post('/api/admin/plan-requests/:id/reject', async (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  const { reason } = req.body;
  const requests = getPlanRequests();
  const reqIdx = requests.findIndex((r) => r.id === id);
  if (reqIdx === -1) {
    return res.status(404).json({ error: 'Request not found' });
  }

  const request = requests[reqIdx];
  request.status = 'rejected';
  request.rejectReason = reason || 'ভুল বা অপর্যাপ্ত ট্রানজেকশন তথ্য (Invalid or unpaid)';
  request.reviewedAt = new Date().toISOString();
  request.reviewedBy = admin ? admin.email : 'admin';
  savePlanRequests(requests);

  const accounts = getAccounts();
  const targetUser = accounts.find((a) => a.id === request.userId || (a.email && a.email.toLowerCase() === request.userEmail.toLowerCase()));
  if (targetUser) {
    await sendDepositProcessedAlert(targetUser, request, 'rejected');
  }

  res.json({ success: true, message: 'রিকোয়েস্ট বাতিল করা হয়েছে (Request rejected)', request });
});

app.get('/api/admin/users', (req, res) => {
  const user = getAuthUser(req);
  if (!isUserAdmin(user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const accounts = getAccounts();
  const reg = getRegistry();

  const enrichedUsers = accounts.map((a) => {
    const userBots = reg.filter((b) => b.ownerId === a.id || b.owner === a.id || (b.ownerEmail && b.ownerEmail.toLowerCase() === a.email.toLowerCase()));
    return {
      ...a,
      botsCount: userBots.length,
      activePlan: a.plan || 'free',
      isExpired: a.planExpiresAt ? a.planExpiresAt < Date.now() : false,
      expiresAtFormatted: a.planExpiresAt ? new Date(a.planExpiresAt).toLocaleDateString() : 'N/A'
    };
  });

  res.json({ users: enrichedUsers });
});

app.post('/api/admin/users/:id/update-plan', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  const { plan, durationDays, maxBots, role } = req.body;

  const accounts = getAccounts();
  const targetUser = accounts.find((a) => a.id === id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  if (plan) targetUser.plan = plan;
  if (maxBots !== undefined) targetUser.maxBots = parseInt(maxBots, 10);
  if (role) targetUser.role = role;
  if (durationDays !== undefined) {
    const days = parseInt(durationDays, 10);
    if (days > 0) {
      targetUser.planExpiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
    } else {
      targetUser.planExpiresAt = null;
    }
  }

  saveAccounts(accounts);
  res.json({ success: true, user: targetUser });
});

app.post('/api/admin/payment-settings', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const settings = req.body;
  savePaymentSettings(settings);
  res.json({ success: true, settings: getPaymentSettings() });
});

app.post('/api/admin/plans', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { plans } = req.body;
  if (!Array.isArray(plans)) {
    return res.status(400).json({ error: 'Plans must be an array' });
  }

  savePlans(plans);
  res.json({ success: true, plans: getPlans() });
});

// Admin Add New Plan
app.post('/api/admin/plans/add', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id, nameBn, nameEn, durationDays, maxBots, priceBdt, priceUsd, popular, featuresBn, featuresEn } = req.body;
  if (!nameBn || !nameEn) {
    return res.status(400).json({ error: 'প্যাকেজের নাম দেওয়া আবশ্যক (Plan name required)' });
  }

  const plans = getPlans();
  const planId = (id || nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '') || `plan_${Date.now()}`).trim();

  if (plans.some((p) => p.id === planId)) {
    return res.status(400).json({ error: 'এই আইডির প্যাকেজ ইতিমধ্যে রয়েছে (Plan ID already exists)' });
  }

  const newPlan = {
    id: planId,
    nameBn: nameBn.trim(),
    nameEn: nameEn.trim(),
    durationDays: parseInt(durationDays, 10) || 30,
    maxBots: parseInt(maxBots, 10) || 1,
    priceBdt: parseFloat(priceBdt) || 0,
    priceUsd: parseFloat(priceUsd) || 0,
    popular: Boolean(popular),
    featuresBn: Array.isArray(featuresBn) ? featuresBn : (featuresBn ? featuresBn.split('\n').map((s: string) => s.trim()).filter(Boolean) : []),
    featuresEn: Array.isArray(featuresEn) ? featuresEn : (featuresEn ? featuresEn.split('\n').map((s: string) => s.trim()).filter(Boolean) : [])
  };

  plans.push(newPlan);
  savePlans(plans);

  res.json({ success: true, message: 'নতুন প্যাকেজ সফলভাবে যুক্ত হয়েছে (New plan added)', plan: newPlan, plans });
});

// Admin Delete Plan
app.delete('/api/admin/plans/:id', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  if (id === 'free') {
    return res.status(400).json({ error: 'ফ্রি স্টার্টার প্লান ডিলিট করা যাবে না (Cannot delete free plan)' });
  }

  let plans = getPlans();
  const exists = plans.some((p) => p.id === id);
  if (!exists) return res.status(404).json({ error: 'Plan not found' });

  plans = plans.filter((p) => p.id !== id);
  savePlans(plans);

  res.json({ success: true, message: 'প্যাকেজ ডিলিট করা হয়েছে (Plan deleted)', plans });
});

app.get('/api/admin/all-bots', (req, res) => {
  const user = getAuthUser(req);
  if (!isUserAdmin(user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const reg = getRegistry();
  const enriched = reg.map((b) => ({
    ...b,
    status: runningProcesses.has(b.id) ? 'running' : b.status || 'stopped',
    pid: runningProcesses.has(b.id) ? runningProcesses.get(b.id)!.process.pid : null
  }));

  res.json({ bots: enriched });
});

// 2. Bot management
app.get('/api/bots', (req, res) => {
  const reg = getRegistry();
  // enrich with runtime status
  const enriched = reg.map((b) => ({
    ...b,
    status: runningProcesses.has(b.id) ? 'running' : b.status || 'stopped',
    pid: runningProcesses.has(b.id) ? runningProcesses.get(b.id)!.process.pid : null
  }));
  res.json({ bots: enriched });
});

app.post('/api/bots', (req, res) => {
  const { name, entryFile, token, files, zipBase64, autoStart } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Bot name is required' });
  }

  const user = getAuthUser(req);
  const reg = getRegistry();

  // Enforce Free vs Paid Plan Bot Limits
  if (user && user.role !== 'admin') {
    const userBots = reg.filter((b) => b.ownerId === user.id || b.owner === user.id || (b.ownerEmail && b.ownerEmail.toLowerCase() === user.email.toLowerCase()));
    const maxAllowed = user.maxBots || 1;
    if (userBots.length >= maxAllowed) {
      return res.status(403).json({
        error: `আপনার বর্তমান প্লানের সীমা (${maxAllowed}টি বট) পূর্ণ হয়েছে। অতিরিক্ত বট হোস্ট করতে ১ মাস থেকে ১ বছর মেয়াদি প্লান কিনুন এবং এডমিন অনুমোদনের পর নতুন বট তৈরি করুন।`,
        planRequired: true,
        currentBots: userBots.length,
        maxBots: maxAllowed
      });
    }
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'bot';
  const botId = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
  const botDir = path.join(HOSTED_BOTS_DIR, botId);
  fs.mkdirSync(botDir, { recursive: true });

  const finalEntry = entryFile || 'bot.py';

  // Handle uploaded files
  if (Array.isArray(files)) {
    for (const f of files) {
      if (f.name && (f.content !== undefined || f.base64)) {
        const filePath = path.join(botDir, f.name);
        if (f.content !== undefined) {
          fs.writeFileSync(filePath, f.content, 'utf-8');
        } else if (f.base64) {
          fs.writeFileSync(filePath, Buffer.from(f.base64, 'base64'));
        }
      }
    }
  }

  // Handle zip archive
  if (zipBase64) {
    const zipPath = path.join(botDir, '_archive.zip');
    fs.writeFileSync(zipPath, Buffer.from(zipBase64, 'base64'));
    try {
      execSync(`python3 -m zipfile -e "${zipPath}" "${botDir}"`);
      try { fs.unlinkSync(zipPath); } catch {}

      // If the zip contained a single enclosing directory (e.g. repo-main/bot.py), flatten it
      const currentItems = fs.readdirSync(botDir).filter((f) => f !== '_archive.zip');
      if (currentItems.length === 1) {
        const singleItemPath = path.join(botDir, currentItems[0]);
        if (fs.statSync(singleItemPath).isDirectory()) {
          const subItems = fs.readdirSync(singleItemPath);
          for (const sub of subItems) {
            const src = path.join(singleItemPath, sub);
            const dest = path.join(botDir, sub);
            if (!fs.existsSync(dest)) {
              fs.renameSync(src, dest);
            }
          }
          try { fs.rmdirSync(singleItemPath); } catch {}
        }
      }
    } catch (err: any) {
      appendLog(botId, 'error', `Zip extraction error: ${err.message}`);
    }
  }

  // Detect entry file if specified file doesn't exist
  let resolvedEntry = finalEntry;
  if (!fs.existsSync(path.join(botDir, resolvedEntry))) {
    if (fs.existsSync(path.join(botDir, 'bot.py'))) {
      resolvedEntry = 'bot.py';
    } else if (fs.existsSync(path.join(botDir, 'main.py'))) {
      resolvedEntry = 'main.py';
    } else {
      const allFiles = fs.readdirSync(botDir);
      const pyFile = allFiles.find((f) => f.endsWith('.py'));
      if (pyFile) {
        resolvedEntry = pyFile;
      }
    }
  }

  // Ensure entry file exists
  const entryPath = path.join(botDir, resolvedEntry);
  if (!fs.existsSync(entryPath)) {
    fs.writeFileSync(
      entryPath,
      `# Telegram Bot: ${name}\nimport os\nprint("Bot started: ${name}")\n`,
      'utf-8'
    );
  }

  // Extract or sync token
  let effectiveToken = (token || '').trim();
  const envPath = path.join(botDir, '.env');
  if (effectiveToken) {
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }
    if (!envContent.includes(effectiveToken)) {
      envContent += `\nBOT_TOKEN=${effectiveToken}\nTOKEN=${effectiveToken}\nTELEGRAM_BOT_TOKEN=${effectiveToken}\n`;
      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
    }
  } else if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const m = content.match(/(?:BOT_TOKEN|TOKEN|TELEGRAM_BOT_TOKEN)\s*=\s*["']?([0-9]{8,14}:[a-zA-Z0-9_-]{25,50})["']?/);
    if (m && m[1]) effectiveToken = m[1];
  }

  const newBot = {
    id: botId,
    name,
    dirName: botId,
    entryFile: resolvedEntry,
    token: effectiveToken,
    created: new Date().toISOString(),
    status: 'stopped',
    pid: null,
    uptime: '0s',
    owner: user ? user.id : 'user',
    ownerId: user ? user.id : 'guest',
    ownerName: user ? user.name : 'Guest',
    ownerEmail: user ? user.email : '',
    autoRestart: autoStart !== false,
    lastPing: new Date().toISOString()
  };

  const updatedReg = getRegistry();
  updatedReg.push(newBot);
  saveRegistry(updatedReg);

  // Background install requirements if present, without blocking API response
  const reqPath = path.join(botDir, 'requirements.txt');
  if (fs.existsSync(reqPath)) {
    appendLog(botId, 'info', 'Found requirements.txt, checking dependencies in background...');
    exec(`python3 -m pip install --break-system-packages --no-cache-dir -r "${reqPath}" || pip3 install --break-system-packages --no-cache-dir -r "${reqPath}"`, { cwd: botDir }, (err, stdout) => {
      if (err) {
        appendLog(botId, 'warn', `Pip notice: ${err.message}`);
      } else {
        appendLog(botId, 'info', 'Dependencies installed.');
      }
    });
  }

  if (autoStart !== false) {
    launchBotProcess(newBot);
    newBot.status = 'running';
  }

  res.json({ success: true, bot: newBot });
});

// Telegram Bot Token Verification endpoint
app.post('/api/telegram/verify-token', async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ ok: false, description: 'Telegram bot token is required' });
  }

  const cleanToken = token.trim();
  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const data = await tgRes.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      description: `Could not connect to Telegram server: ${err.message}`
    });
  }
});

app.post('/api/bots/:id/start', (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  const user = getAuthUser(req);
  if (user && user.role !== 'admin') {
    const maxAllowed = user.maxBots || 1;
    // Check if user's paid plan is expired
    if (user.planExpiresAt && user.planExpiresAt < Date.now()) {
      return res.status(403).json({
        error: 'আপনার প্রিমিয়াম প্ল্যানের মেয়াদ শেষ হয়েছে। দয়া করে প্ল্যান রিনিউ করুন।',
        planExpired: true
      });
    }

    // Count how many other bots belonging to this user are currently running
    const userRunningBots = reg.filter((b) =>
      b.id !== id &&
      (b.ownerId === user.id || b.owner === user.id || (b.ownerEmail && b.ownerEmail.toLowerCase() === user.email.toLowerCase())) &&
      runningProcesses.has(b.id)
    );

    if (userRunningBots.length >= maxAllowed) {
      return res.status(403).json({
        error: `আপনার বর্তমান প্ল্যানে সর্বোচ্চ ${maxAllowed}টি বট চালু রাখার অনুমতি আছে। অতিরিক্ত বট চালু করতে প্ল্যান আপগ্রেড করুন।`,
        planRequired: true
      });
    }
  }

  bot.autoRestart = true;
  saveRegistry(reg);
  const started = launchBotProcess(bot);
  res.json({ success: started });
});

app.post('/api/bots/:id/stop', (req, res) => {
  const { id } = req.params;
  const stopped = stopBotProcess(id);
  res.json({ success: stopped });
});

app.post('/api/bots/:id/restart', (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  bot.autoRestart = true;
  saveRegistry(reg);
  stopBotProcess(id);
  setTimeout(() => {
    const started = launchBotProcess(bot);
    res.json({ success: started });
  }, 500);
});

app.delete('/api/bots/:id', (req, res) => {
  const { id } = req.params;
  stopBotProcess(id);

  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  const updatedReg = reg.filter((b) => b.id !== id);
  saveRegistry(updatedReg);

  if (bot) {
    const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
    try {
      fs.rmSync(botDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  }

  botLogs.delete(id);
  res.json({ success: true });
});

// 3. Bot logs
app.get('/api/bots/:id/logs', (req, res) => {
  const { id } = req.params;
  const logs = botLogs.get(id) || [];
  res.json({ logs });
});

app.delete('/api/bots/:id/logs', (req, res) => {
  const { id } = req.params;
  botLogs.set(id, []);
  try {
    const bot = getRegistry().find((b) => b.id === id);
    if (bot) {
      const logFile = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id, 'bot.log');
      if (fs.existsSync(logFile)) {
        fs.writeFileSync(logFile, '', 'utf-8');
      }
    }
  } catch {
    // Ignore
  }
  res.json({ success: true });
});

// 4. File operations (Edit, List, Delete, Upload)
app.get('/api/bots/:id/files', (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  if (!fs.existsSync(botDir)) {
    return res.json({ files: [], fileDetails: [] });
  }

  const items = fs.readdirSync(botDir);
  const files: string[] = [];
  const fileDetails: any[] = [];

  for (const item of items) {
    const p = path.join(botDir, item);
    const stat = fs.statSync(p);
    if (stat.isFile()) {
      files.push(item);
      fileDetails.push({
        name: item,
        size: stat.size,
        modified: stat.mtime.toISOString(),
        isEntry: item === bot.entryFile,
        isEditable: item.endsWith('.py') || item.endsWith('.json') || item.endsWith('.txt') || item.endsWith('.env') || item.endsWith('.md')
      });
    }
  }

  res.json({ files, fileDetails });
});

app.get('/api/bots/:id/file', (req, res) => {
  const { id } = req.params;
  const filename = req.query.name as string;
  if (!filename) return res.status(400).json({ error: 'Filename is required' });

  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const safeFilename = path.basename(filename);
  const filePath = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ content, filename: safeFilename });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bots/:id/file', (req, res) => {
  const { id } = req.params;
  const { filename, content, restart } = req.body;
  if (!filename || content === undefined) {
    return res.status(400).json({ error: 'Filename and content are required' });
  }

  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const safeFilename = path.basename(filename);
  const filePath = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id, safeFilename);

  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    appendLog(id, 'info', `File '${safeFilename}' updated successfully.`);

    if (restart) {
      stopBotProcess(id);
      setTimeout(() => {
        launchBotProcess(bot);
      }, 600);
    }

    res.json({ success: true, filename: safeFilename });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bots/:id/delete-file', (req, res) => {
  const { id } = req.params;
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: 'Filename is required' });

  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const safeFilename = path.basename(filename);
  const filePath = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id, safeFilename);

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      appendLog(id, 'info', `File '${safeFilename}' deleted by user.`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

app.post('/api/bots/:id/upload-files', (req, res) => {
  const { id } = req.params;
  const { files, restart } = req.body;
  if (!Array.isArray(files)) return res.status(400).json({ error: 'Files array required' });

  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  for (const f of files) {
    if (f.name) {
      const p = path.join(botDir, path.basename(f.name));
      if (f.content !== undefined) {
        fs.writeFileSync(p, f.content, 'utf-8');
      } else if (f.base64) {
        fs.writeFileSync(p, Buffer.from(f.base64, 'base64'));
      }
    }
  }

  appendLog(id, 'info', `Uploaded ${files.length} files.`);
  if (restart) {
    stopBotProcess(id);
    setTimeout(() => {
      launchBotProcess(bot);
    }, 600);
  }
  res.json({ success: true });
});

app.post('/api/bots/:id/upload-zip', (req, res) => {
  const { id } = req.params;
  const { zipBase64, restart } = req.body;
  if (!zipBase64) return res.status(400).json({ error: 'zipBase64 is required' });

  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  const zipPath = path.join(botDir, `upload_${Date.now()}.zip`);
  fs.writeFileSync(zipPath, Buffer.from(zipBase64, 'base64'));

  exec(`python3 -m zipfile -e "${zipPath}" "${botDir}"`, (err) => {
    try { fs.unlinkSync(zipPath); } catch {}
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    appendLog(id, 'info', 'Extracted zip archive successfully.');
    if (restart) {
      stopBotProcess(id);
      setTimeout(() => {
        launchBotProcess(bot);
      }, 600);
    }
    res.json({ success: true });
  });
});

// Safe File Update with 100% User Balance & Database Protection
app.post('/api/bots/:id/safe-update', (req, res) => {
  const { id } = req.params;
  const { files, zipBase64, restart = true, preserveDatabases = true, autoConnectDatabase = true } = req.body;

  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  if (!fs.existsSync(botDir)) {
    fs.mkdirSync(botDir, { recursive: true });
  }

  // 1. Take a safe timestamped snapshot of all existing database files
  const snapshotTimestamp = Date.now();
  const snapshotDir = path.join(botDir, '_db_snapshots', `backup_${snapshotTimestamp}`);
  fs.mkdirSync(snapshotDir, { recursive: true });

  const existingFiles = fs.readdirSync(botDir);
  const preservedDatabases: string[] = [];
  const existingDbContents = new Map<string, string>();

  const PROTECTED_DB_FILES = [
    'users.json',
    'user_stats.json',
    'paid_sms.json',
    'referral_data.json',
    'banned_users.json',
    'withdraw_requests.json',
    'datarange.json',
    'custom_services.json',
    'activity_logs.json'
  ];

  for (const f of existingFiles) {
    if (f.endsWith('.json') && !f.startsWith('_')) {
      const fullPath = path.join(botDir, f);
      try {
        if (fs.statSync(fullPath).isFile()) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          existingDbContents.set(f, content);
          fs.writeFileSync(path.join(snapshotDir, f), content, 'utf-8');
          preservedDatabases.push(f);
        }
      } catch (err) {}
    }
  }

  let updatedFileCount = 0;

  // 2. Handle files array
  if (Array.isArray(files)) {
    for (const f of files) {
      if (!f.name) continue;
      const baseName = path.basename(f.name);
      const isProtectedDb = PROTECTED_DB_FILES.includes(baseName) || (baseName.endsWith('.json') && existingDbContents.has(baseName));

      if (isProtectedDb && preserveDatabases && existingDbContents.has(baseName)) {
        const existingData = existingDbContents.get(baseName)!;
        try {
          const currentJson = JSON.parse(existingData);
          if (f.content && typeof f.content === 'string') {
            const uploadedJson = JSON.parse(f.content);
            if (typeof currentJson === 'object' && currentJson !== null && !Array.isArray(currentJson)) {
              const merged = { ...uploadedJson, ...currentJson };
              fs.writeFileSync(path.join(botDir, baseName), JSON.stringify(merged, null, 2), 'utf-8');
            }
          }
        } catch {
          // Keep existing safe file untouched
        }
        continue;
      }

      const filePath = path.join(botDir, baseName);
      if (f.content !== undefined) {
        fs.writeFileSync(filePath, f.content, 'utf-8');
        updatedFileCount++;
      } else if (f.base64) {
        fs.writeFileSync(filePath, Buffer.from(f.base64, 'base64'));
        updatedFileCount++;
      }
    }
  }

  // 3. Handle zip archive safely
  if (zipBase64) {
    const tempExtractDir = path.join('/tmp', `extract_${id}_${snapshotTimestamp}`);
    fs.mkdirSync(tempExtractDir, { recursive: true });
    const tempZipPath = path.join(tempExtractDir, 'upload.zip');
    fs.writeFileSync(tempZipPath, Buffer.from(zipBase64, 'base64'));

    try {
      execSync(`python3 -m zipfile -e "${tempZipPath}" "${tempExtractDir}"`);
      try { fs.unlinkSync(tempZipPath); } catch {}

      const copySafe = (srcDir: string, destDir: string) => {
        const items = fs.readdirSync(srcDir);
        for (const item of items) {
          const srcItem = path.join(srcDir, item);
          const destItem = path.join(destDir, item);
          if (fs.statSync(srcItem).isDirectory()) {
            if (!fs.existsSync(destItem)) fs.mkdirSync(destItem, { recursive: true });
            copySafe(srcItem, destItem);
          } else {
            const isProtected = PROTECTED_DB_FILES.includes(item) || (item.endsWith('.json') && existingDbContents.has(item));
            if (isProtected && preserveDatabases && existingDbContents.has(item)) {
              continue;
            }
            fs.copyFileSync(srcItem, destItem);
            updatedFileCount++;
          }
        }
      };

      copySafe(tempExtractDir, botDir);
      try { fs.rmSync(tempExtractDir, { recursive: true, force: true }); } catch {}
    } catch (err: any) {
      appendLog(id, 'error', `Zip update note: ${err.message}`);
    }
  }

  // 4. Auto-connect and initialize database files if missing
  if (autoConnectDatabase) {
    for (const dbFile of PROTECTED_DB_FILES) {
      const p = path.join(botDir, dbFile);
      if (!fs.existsSync(p)) {
        fs.writeFileSync(p, dbFile === 'activity_logs.json' ? '[]' : '{}', 'utf-8');
      }
    }
  }

  // 5. Read protected user stats
  let usersCount = 0;
  let totalBalance = 0;
  const usersPath = path.join(botDir, 'users.json');
  if (fs.existsSync(usersPath)) {
    try {
      const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
      usersCount = Object.keys(usersData).length;
      for (const k in usersData) {
        if (usersData[k] && typeof usersData[k].balance === 'number') {
          totalBalance += usersData[k].balance;
        }
      }
    } catch {}
  }

  appendLog(id, 'info', `Safe update completed! Updated ${updatedFileCount} files. Preserved ${preservedDatabases.length} database files (${usersCount} users, total balance: ${totalBalance} सुरक्षित).`);

  if (restart) {
    stopBotProcess(id);
    setTimeout(() => {
      launchBotProcess(bot);
    }, 600);
  }

  return res.json({
    success: true,
    updatedFileCount,
    preservedDatabases,
    backupDir: `_db_snapshots/backup_${snapshotTimestamp}`,
    databaseStats: {
      usersCount,
      totalBalance
    }
  });
});

// Database Auto-Connect & Diagnostic Route
app.post('/api/bots/:id/database/auto-connect', (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  if (!fs.existsSync(botDir)) {
    fs.mkdirSync(botDir, { recursive: true });
  }

  const STANDARD_FILES = [
    { name: 'users.json', defaultContent: '{}' },
    { name: 'user_stats.json', defaultContent: '{}' },
    { name: 'paid_sms.json', defaultContent: '{}' },
    { name: 'referral_data.json', defaultContent: '{}' },
    { name: 'banned_users.json', defaultContent: '{}' },
    { name: 'withdraw_requests.json', defaultContent: '{}' },
    { name: 'custom_services.json', defaultContent: '{}' },
    { name: 'datarange.json', defaultContent: '{}' },
    { name: 'activity_logs.json', defaultContent: '[]' }
  ];

  const results: any[] = [];
  for (const sf of STANDARD_FILES) {
    const fp = path.join(botDir, sf.name);
    let created = false;
    let valid = true;
    if (!fs.existsSync(fp)) {
      fs.writeFileSync(fp, sf.defaultContent, 'utf-8');
      created = true;
    } else {
      try {
        JSON.parse(fs.readFileSync(fp, 'utf-8'));
      } catch {
        valid = false;
      }
    }
    results.push({ name: sf.name, created, valid });
  }

  let usersCount = 0;
  let totalBalance = 0;
  try {
    const usersJson = JSON.parse(fs.readFileSync(path.join(botDir, 'users.json'), 'utf-8'));
    usersCount = Object.keys(usersJson).length;
    for (const uid in usersJson) {
      if (usersJson[uid] && typeof usersJson[uid].balance === 'number') {
        totalBalance += usersJson[uid].balance;
      }
    }
  } catch {}

  appendLog(id, 'info', `Database Auto-Connect & Verify: All collections connected. Total users: ${usersCount}, Total balance: ${totalBalance}`);

  res.json({
    success: true,
    connected: true,
    stats: {
      usersCount,
      totalBalance,
      files: results
    }
  });
});

// Real-time Database stats for a bot
app.get('/api/bots/:id/database/stats', (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  let usersCount = 0;
  let totalBalance = 0;
  let paidSmsCount = 0;
  let withdrawCount = 0;

  try {
    const usersPath = path.join(botDir, 'users.json');
    if (fs.existsSync(usersPath)) {
      const u = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
      usersCount = Object.keys(u).length;
      for (const k in u) {
        if (u[k] && typeof u[k].balance === 'number') totalBalance += u[k].balance;
      }
    }
  } catch {}

  try {
    const smsPath = path.join(botDir, 'paid_sms.json');
    if (fs.existsSync(smsPath)) {
      const s = JSON.parse(fs.readFileSync(smsPath, 'utf-8'));
      paidSmsCount = Object.keys(s).length;
    }
  } catch {}

  try {
    const wPath = path.join(botDir, 'withdraw_requests.json');
    if (fs.existsSync(wPath)) {
      const w = JSON.parse(fs.readFileSync(wPath, 'utf-8'));
      withdrawCount = Object.keys(w).length;
    }
  } catch {}

  const snapshotsDir = path.join(botDir, '_db_snapshots');
  let snapshotsCount = 0;
  if (fs.existsSync(snapshotsDir)) {
    try {
      snapshotsCount = fs.readdirSync(snapshotsDir).length;
    } catch {}
  }

  res.json({
    usersCount,
    totalBalance,
    paidSmsCount,
    withdrawCount,
    snapshotsCount,
    isHealthy: true
  });
});

// 5. Python Syntax Checker
app.post('/api/code/syntax-check', (req, res) => {
  const { code } = req.body;
  if (code === undefined) return res.status(400).json({ error: 'Code is required' });

  const tempFile = path.join('/tmp', `syntax_${Date.now()}.py`);
  fs.writeFileSync(tempFile, code, 'utf-8');

  exec(`python3 -m py_compile "${tempFile}"`, (err, stdout, stderr) => {
    try { fs.unlinkSync(tempFile); } catch {}
    if (err) {
      const lineMatch = stderr.match(/line\s+(\d+)/i);
      const line = lineMatch ? parseInt(lineMatch[1], 10) : null;
      return res.json({
        valid: false,
        error: stderr || err.message,
        line
      });
    }
    res.json({ valid: true, message: 'Syntax is valid!' });
  });
});

// 6. Python Pip Package Manager
app.get('/api/pip/packages', (req, res) => {
  exec('python3 -m pip list --format=json || pip3 list --format=json', (err, stdout) => {
    if (err) {
      return res.json({ packages: [] });
    }
    try {
      const pkgs = JSON.parse(stdout);
      res.json({ packages: pkgs });
    } catch {
      res.json({ packages: [] });
    }
  });
});

app.post('/api/pip/install', (req, res) => {
  const { package: pkgName } = req.body;
  if (!pkgName) return res.status(400).json({ error: 'Package name is required' });

  const safePkg = pkgName.trim().replace(/[^a-zA-Z0-9_\-\.\=\>\<\[\]]/g, '');
  exec(`python3 -m pip install --no-cache-dir --break-system-packages ${safePkg} || pip3 install --no-cache-dir --break-system-packages ${safePkg}`, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: stderr || err.message });
    }
    res.json({ success: true, output: stdout });
  });
});

// 7. Services & SMS Manager for Bot
function resolveBotDirectory(botIdQuery?: any): { bot: any; botDir: string } | null {
  const reg = getRegistry();
  let bot = null;
  if (botIdQuery) {
    bot = reg.find((b) => b.id === botIdQuery || b.dirName === botIdQuery);
  }
  if (!bot && reg.length > 0) {
    bot = reg[0];
  }
  if (!bot) return null;
  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  if (!fs.existsSync(botDir)) {
    fs.mkdirSync(botDir, { recursive: true });
  }
  return { bot, botDir };
}

// Global & Per-Bot Services endpoints
app.get(['/api/services', '/api/bots/:id/services'], (req, res) => {
  const botId = req.params.id || req.query.botId;
  const resolved = resolveBotDirectory(botId);
  if (!resolved) return res.json({ services: [] });

  const servicesPath = path.join(resolved.botDir, 'custom_services.json');
  if (fs.existsSync(servicesPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(servicesPath, 'utf-8'));
      return res.json({ services: Array.isArray(data) ? data : [] });
    } catch {
      return res.json({ services: [] });
    }
  }
  res.json({ services: [] });
});

app.post(['/api/services', '/api/bots/:id/services'], (req, res) => {
  const botId = req.params.id || req.query.botId || req.body.botId;
  const resolved = resolveBotDirectory(botId);
  if (!resolved) return res.status(404).json({ error: 'No bot found' });

  const { services } = req.body;
  const servicesPath = path.join(resolved.botDir, 'custom_services.json');
  try {
    fs.writeFileSync(servicesPath, JSON.stringify(services || [], null, 2), 'utf-8');
    appendLog(resolved.bot.id, 'info', `Updated custom services list (${(services || []).length} items).`);
    res.json({ success: true, services: services || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/services/clear', '/api/bots/:id/services/clear'], (req, res) => {
  const botId = req.params.id || req.query.botId || req.body.botId;
  const resolved = resolveBotDirectory(botId);
  if (!resolved) return res.status(404).json({ error: 'No bot found' });

  const servicesPath = path.join(resolved.botDir, 'custom_services.json');
  try {
    fs.writeFileSync(servicesPath, JSON.stringify([], null, 2), 'utf-8');
    appendLog(resolved.bot.id, 'info', 'All services cleared from custom_services.json.');
    res.json({ success: true, services: [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/services/reset-default', '/api/bots/:id/services/reset-default'], (req, res) => {
  const botId = req.params.id || req.query.botId || req.body.botId;
  const resolved = resolveBotDirectory(botId);
  if (!resolved) return res.status(404).json({ error: 'No bot found' });

  const defaultServices = [
    { sid: 'TELEGRAM', ranges: [{ range: 'GLOBAL', country: 'International' }] },
    { sid: 'WHATSAPP', ranges: [{ range: 'GLOBAL', country: 'International' }] },
    { sid: 'FACEBOOK', ranges: [{ range: 'GLOBAL', country: 'International' }] },
    { sid: 'TIKTOK', ranges: [{ range: 'GLOBAL', country: 'International' }] },
    { sid: 'IMO', ranges: [{ range: 'GLOBAL', country: 'International' }] },
    { sid: 'GOOGLE / GMAIL', ranges: [{ range: 'GLOBAL', country: 'International' }] },
    { sid: 'TWITTER / X', ranges: [{ range: 'GLOBAL', country: 'International' }] },
    { sid: 'INSTAGRAM', ranges: [{ range: 'GLOBAL', country: 'International' }] },
    { sid: 'SNAPCHAT', ranges: [{ range: 'GLOBAL', country: 'International' }] }
  ];

  const servicesPath = path.join(resolved.botDir, 'custom_services.json');
  try {
    fs.writeFileSync(servicesPath, JSON.stringify(defaultServices, null, 2), 'utf-8');
    appendLog(resolved.bot.id, 'info', 'Default services restored in custom_services.json.');
    res.json({ success: true, services: defaultServices });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SMS Gateway Config endpoints
app.get(['/api/sms-config', '/api/bots/:id/sms-config'], (req, res) => {
  const botId = req.params.id || req.query.botId;
  const resolved = resolveBotDirectory(botId);
  if (!resolved) return res.json({ baseUrl: 'https://minosms.com', apiKey: '', token: '' });

  const configPath = path.join(resolved.botDir, 'sms_config.json');
  let config: any = { baseUrl: 'https://minosms.com', apiKey: '', token: resolved.bot.token || '' };
  if (fs.existsSync(configPath)) {
    try {
      config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf-8')) };
    } catch {}
  } else {
    // Check .env
    const envPath = path.join(resolved.botDir, '.env');
    if (fs.existsSync(envPath)) {
      const text = fs.readFileSync(envPath, 'utf-8');
      const baseMatch = text.match(/(?:BASE_URL|API_URL|SMS_API_URL)\s*=\s*["']?([^"'\r\n]+)["']?/i);
      const keyMatch = text.match(/(?:API_KEY|SMS_API_KEY|MINO_API_KEY)\s*=\s*["']?([^"'\r\n]+)["']?/i);
      if (baseMatch) config.baseUrl = baseMatch[1];
      if (keyMatch) config.apiKey = keyMatch[1];
    }
  }
  res.json(config);
});

app.post(['/api/sms-config', '/api/bots/:id/sms-config'], (req, res) => {
  const botId = req.params.id || req.body.botId;
  const resolved = resolveBotDirectory(botId);
  if (!resolved) return res.status(404).json({ error: 'No bot found' });

  const { baseUrl, apiKey, token } = req.body;
  const config = {
    baseUrl: (baseUrl || 'https://minosms.com').trim(),
    apiKey: (apiKey || '').trim(),
    token: (token || resolved.bot.token || '').trim()
  };

  const configPath = path.join(resolved.botDir, 'sms_config.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    // Also sync to bot workspace .env
    const envPath = path.join(resolved.botDir, '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
    if (config.baseUrl) {
      if (envContent.match(/BASE_URL\s*=/)) {
        envContent = envContent.replace(/BASE_URL\s*=.*/, `BASE_URL=${config.baseUrl}`);
      } else {
        envContent += `\nBASE_URL=${config.baseUrl}\n`;
      }
    }
    if (config.apiKey) {
      if (envContent.match(/API_KEY\s*=/)) {
        envContent = envContent.replace(/API_KEY\s*=.*/, `API_KEY=${config.apiKey}`);
      } else {
        envContent += `\nAPI_KEY=${config.apiKey}\n`;
      }
    }
    if (config.token) {
      if (envContent.match(/BOT_TOKEN\s*=/)) {
        envContent = envContent.replace(/BOT_TOKEN\s*=.*/, `BOT_TOKEN=${config.token}`);
      } else {
        envContent += `\nBOT_TOKEN=${config.token}\nTOKEN=${config.token}\n`;
      }
    }
    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
    appendLog(resolved.bot.id, 'info', 'SMS Gateway configuration updated.');
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Database & Storage Manager
app.get('/api/database/backup', (req, res) => {
  const reg = getRegistry();
  const firstBot = reg[0];
  const botDir = firstBot ? path.join(HOSTED_BOTS_DIR, firstBot.dirName || firstBot.id) : null;

  const data: Record<string, any> = {
    registry: reg,
    timestamp: new Date().toISOString()
  };

  if (botDir && fs.existsSync(botDir)) {
    const files = ['users.json', 'custom_services.json', 'datarange.json', 'paid_sms.json', 'referral_data.json', 'withdraw_requests.json'];
    for (const f of files) {
      const fp = path.join(botDir, f);
      if (fs.existsSync(fp)) {
        try {
          data[f] = JSON.parse(fs.readFileSync(fp, 'utf-8'));
        } catch {
          data[f] = null;
        }
      }
    }
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="bot-backup.json"');
  res.send(JSON.stringify(data, null, 2));
});

app.get('/api/database/stats', (req, res) => {
  const reg = getRegistry();
  let totalFiles = 0;
  let totalBytes = 0;

  for (const b of reg) {
    const botDir = path.join(HOSTED_BOTS_DIR, b.dirName || b.id);
    if (fs.existsSync(botDir)) {
      const files = fs.readdirSync(botDir);
      totalFiles += files.length;
      for (const f of files) {
        try {
          const s = fs.statSync(path.join(botDir, f));
          totalBytes += s.size;
        } catch {}
      }
    }
  }

  res.json({
    totalBots: reg.length,
    runningBots: runningProcesses.size,
    totalFiles,
    totalBytes,
    formattedSize: (totalBytes / (1024 * 1024)).toFixed(2) + ' MB'
  });
});

// 9. Users & Balances API
app.get('/api/users', (req, res) => {
  const reg = getRegistry();
  const firstBot = reg[0];
  if (!firstBot) return res.json({ users: [] });

  const usersPath = path.join(HOSTED_BOTS_DIR, firstBot.dirName || firstBot.id, 'users.json');
  if (fs.existsSync(usersPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
      const list = Object.keys(data).map((uid) => ({
        id: uid,
        balance: data[uid]?.balance || 0,
        totalNumbers: data[uid]?.total_numbers || 0,
        referrals: data[uid]?.referral_count || 0
      }));
      return res.json({ users: list });
    } catch {
      return res.json({ users: [] });
    }
  }
  res.json({ users: [] });
});

app.post('/api/users/:uid/balance', (req, res) => {
  const { uid } = req.params;
  const { amount } = req.body;

  const reg = getRegistry();
  const firstBot = reg[0];
  if (!firstBot) return res.status(404).json({ error: 'No bot found' });

  const usersPath = path.join(HOSTED_BOTS_DIR, firstBot.dirName || firstBot.id, 'users.json');
  if (fs.existsSync(usersPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
      if (!data[uid]) data[uid] = { user_id: uid, balance: 0 };
      data[uid].balance = parseFloat(amount) || 0;
      fs.writeFileSync(usersPath, JSON.stringify(data, null, 2), 'utf-8');
      return res.json({ success: true, balance: data[uid].balance });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
  res.status(404).json({ error: 'users.json not found' });
});

// Background Watchdog: automatically checks for expired plans, halts excess bots and resets limits
setInterval(() => {
  try {
    const accounts = getAccounts();
    const now = Date.now();
    let accountsModified = false;
    const reg = getRegistry();

    // Check for subscriptions expiring soon (within 3 days) or already expired
    for (const account of accounts) {
      if (account.role !== 'admin' && account.planExpiresAt) {
        if (account.planExpiresAt > now) {
          const diffMs = account.planExpiresAt - now;
          const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
          if (diffMs <= threeDaysMs) {
            const lastAlert = account.lastExpAlertAt || 0;
            // Send alert at most once every 24 hours
            if (now - lastAlert > 24 * 60 * 60 * 1000) {
              const daysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
              const formattedDate = new Date(account.planExpiresAt).toLocaleDateString('bn-BD');
              sendSubscriptionExpirationAlert(account, daysRemaining, formattedDate);
              account.lastExpAlertAt = now;
              accountsModified = true;
            }
          }
        } else if (account.planExpiresAt < now) {
          console.log(`[EXPIRED PLAN] Account ${account.email} has expired. Downgrading to Free plan.`);
          account.plan = 'free';
          account.maxBots = 1;
          account.planExpiresAt = null;
          accountsModified = true;

          // Send expired alert
          sendEmailAlert({
            to: account.email,
            userId: account.id,
            type: 'plan_expired',
            subject: '⚠️ আপনার Bot-Host পেইড প্লানের মেয়াদ সমাপ্ত হয়েছে',
            html: `<p>প্রিয় ${account.name || 'গ্রাহক'}, আপনার পেইড প্যাকেজের মেয়াদ শেষ হয়েছে। একাউন্ট ফ্রি প্ল্যানে ডাউনগ্রেড করা হয়েছে। পুনরায় সেবা চালু রাখতে অনুগ্রহ করে ওয়ালেটে ডিপোজিট করে প্যাকেজ রিনিউ করুন।</p>`,
            text: 'আপনার Bot-Host পেইড প্লানের মেয়াদ শেষ হয়েছে।'
          });

          // Find user's running bots and stop excess ones
          const userBots = reg.filter((b) =>
            b.ownerId === account.id ||
            b.owner === account.id ||
            (b.ownerEmail && b.ownerEmail.toLowerCase() === account.email.toLowerCase())
          );

          let activeCount = 0;
          for (const bot of userBots) {
            if (runningProcesses.has(bot.id)) {
              activeCount++;
              // If beyond 1 free bot, auto-stop excess bots
              if (activeCount > 1) {
                console.log(`[EXPIRED PLAN] Stopping excess bot ${bot.id} for user ${account.email}`);
                stopBotProcess(bot.id);
                appendLog(bot.id, 'warn', '⚠️ [PLAN EXPIRED] আপনার পেইড সাবস্ক্রিপশনের মেয়াদ শেষ হয়েছে। অতিরিক্ত বটটি বন্ধ করা হলো। প্ল্যান রিনিউ করুন।');
              }
            }
          }
        }
      }
    }

    if (accountsModified) {
      saveAccounts(accounts);
    }
  } catch (err) {
    console.error('Watchdog plan expiry error:', err);
  }
}, 30000);

// Admin Direct URL Route: allows visiting /admin directly in browser
app.get(['/admin', '/admin/login'], (req, res) => {
  res.redirect('/?admin=true');
});

// Vite middleware / Static Serving
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bot-Host server running on http://0.0.0.0:${PORT}`);
  });
}

start();
