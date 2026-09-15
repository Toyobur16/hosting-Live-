import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import { spawn, exec, execSync } from 'child_process';
import { createServer as createViteServer } from 'vite';
import {
  sendEmailAlert,
  sendDepositProcessedAlert,
  sendSubscriptionExpirationAlert,
  getUserNotifications,
  markNotificationAsRead,
  addBroadcastNotification,
  getStoredNotifications,
  saveStoredNotifications,
  getSmtpConfig,
  verifySmtpConnection,
  sendTestEmail,
  checkAndSendExpiringPlanAlerts,
  loadSmtpSettingsFile,
  saveSmtpSettingsFile,
  testSmtpWithParams
} from './server/emailAlerts';

// Enforce IPv4 priority globally to eliminate ENETUNREACH in containers lacking IPv6 routes
if (typeof (dns as any).setDefaultResultOrder === 'function') {
  try {
    (dns as any).setDefaultResultOrder('ipv4first');
  } catch (e) {}
}

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
const BANNERS_FILE = path.join(HOSTED_BOTS_DIR, 'banners.json');
const CATEGORIES_FILE = path.join(HOSTED_BOTS_DIR, 'categories.json');
const STORE_ITEMS_FILE = path.join(HOSTED_BOTS_DIR, 'store_items.json');
const SUPPORT_SETTINGS_FILE = path.join(HOSTED_BOTS_DIR, 'support_settings.json');
const SUPPORT_MESSAGES_FILE = path.join(HOSTED_BOTS_DIR, 'support_messages.json');
const WISHLIST_FILE = path.join(HOSTED_BOTS_DIR, 'wishlist.json');
const STORE_UPLOADS_DIR = path.join(HOSTED_BOTS_DIR, 'store_uploads');
const STORE_THUMBNAILS_DIR = path.join(HOSTED_BOTS_DIR, 'store_thumbnails');
const ANNOUNCEMENTS_FILE = path.join(HOSTED_BOTS_DIR, 'announcements.json');
const SITE_SETTINGS_FILE = path.join(HOSTED_BOTS_DIR, 'site_settings.json');
const FREE_TRIAL_SETTINGS_FILE = path.join(HOSTED_BOTS_DIR, 'free_trial_settings.json');

// Ensure base directories and persistence files exist
if (!fs.existsSync(HOSTED_BOTS_DIR)) {
  fs.mkdirSync(HOSTED_BOTS_DIR, { recursive: true });
}
if (!fs.existsSync(STORE_UPLOADS_DIR)) {
  fs.mkdirSync(STORE_UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(STORE_THUMBNAILS_DIR)) {
  fs.mkdirSync(STORE_THUMBNAILS_DIR, { recursive: true });
}
if (!fs.existsSync(ANNOUNCEMENTS_FILE)) {
  fs.writeFileSync(
    ANNOUNCEMENTS_FILE,
    JSON.stringify(
      [
        {
          id: 'ann_1',
          titleBn: '⚡ hosting-Live Fast এ স্বাগতম!',
          titleEn: '⚡ Welcome to hosting-Live Fast!',
          messageBn: '২৪/৭ ক্লাউড টেলিগ্রাম বট হোস্টিং, স্বয়ংক্রিয় রিস্টার্ট এবং ইনস্ট্যান্ট বাইনান্স ডিপোজিট সহ আপনার বট লাইভ রাখুন।',
          messageEn: '24/7 cloud Telegram bot hosting, auto-restart watchdog, and instant Binance deposits to keep your bot live.',
          date: new Date().toISOString(),
          active: true
        }
      ],
      null,
      2
    ),
    'utf-8'
  );
}

function getAnnouncements(): any[] {
  try {
    if (!fs.existsSync(ANNOUNCEMENTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(ANNOUNCEMENTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveAnnouncements(list: any[]) {
  try {
    fs.writeFileSync(ANNOUNCEMENTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save announcements:', err);
  }
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
  binanceUid: '922593999',
  binancePayId: '922593999',
  binanceId: '922593999',
  binanceEnabled: true,
  bkashNumber: '01614572747',
  bkashEnabled: false,
  nagadNumber: '01304104492',
  nagadEnabled: false,
  rocketNumber: '01304104492',
  rocketEnabled: false,
  instructionsBn: 'বাইন্যান্স (Binance Pay / UID) দিয়ে নির্ধারিত ডলার পাঠিয়ে আপনার Transaction ID / Order ID এবং আপনার প্রেরক আইডি নিচে লিখে সাবমিট করুন। এডমিন অনুমোদন করলেই সাথে সাথে আপনার ওয়ালেটে ব্যালেন্স জমা হবে।',
  instructionsEn: 'Send USDT via Binance Pay / UID, then submit your Binance Transaction ID / Order ID below. Once approved by admin, your balance is credited instantly.'
};

if (!fs.existsSync(PAYMENT_SETTINGS_FILE)) {
  fs.writeFileSync(PAYMENT_SETTINGS_FILE, JSON.stringify(DEFAULT_PAYMENT_SETTINGS, null, 2), 'utf-8');
} else {
  // Ensure default numbers match current screenshot specs if old placeholders are present
  try {
    const curr = JSON.parse(fs.readFileSync(PAYMENT_SETTINGS_FILE, 'utf-8'));
    if (curr.bkashNumber?.includes('01711223344') || !curr.bkashNumber) {
      curr.bkashNumber = '01614572747';
      curr.nagadNumber = '01304104492';
      curr.binanceId = '922593999';
      curr.binanceUid = '922593999';
      curr.binancePayId = '922593999';
      fs.writeFileSync(PAYMENT_SETTINGS_FILE, JSON.stringify(curr, null, 2), 'utf-8');
    }
  } catch {}
}

const DEFAULT_SITE_SETTINGS = {
  siteName: 'FAKIR BD TOP UP',
  logoUrl: '/site-logo.png',
  taglineBn: '২৪/৭ ক্লাউড বট ও টপ আপ সার্ভিস',
  taglineEn: '24/7 Cloud Bot & Top Up Service'
};

if (!fs.existsSync(SITE_SETTINGS_FILE)) {
  fs.writeFileSync(SITE_SETTINGS_FILE, JSON.stringify(DEFAULT_SITE_SETTINGS, null, 2), 'utf-8');
}

const DEFAULT_BANNERS = [
  {
    id: 'banner_1',
    title: 'ওয়েব ফাইল কিনুন সাথে সাথে দামে',
    titleBn: 'ওয়েব ফাইল কিনুন সাথে সাথে দামে',
    subtitle: 'HTML5, CSS3, টেলিগ্রাম মিনি অ্যাপ এবং ফুল কোড ফাইল',
    subtitleBn: 'HTML5, CSS3, টেলিগ্রাম মিনি অ্যাপ এবং ফুল কোড ফাইল',
    badge: 'অল্প দামে',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    link: 'market',
    active: true,
    order: 1
  },
  {
    id: 'banner_2',
    title: '২৪/৭ ক্লাউড টেলিগ্রাম বট হোস্টিং',
    titleBn: '২৪/৭ ক্লাউড টেলিগ্রাম বট হোস্টিং',
    subtitle: 'সুপারফাস্ট স্পিড, লাইভ কনসোল ও স্বয়ংক্রিয় অটো-রিস্টার্ট ওয়াচডগ',
    subtitleBn: 'সুপারফাস্ট স্পিড, লাইভ কনসোল ও স্বয়ংক্রিয় অটো-রিস্টার্ট ওয়াচডগ',
    badge: 'সাশ্রয়ী প্লান',
    imageUrl: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&w=1200&q=80',
    link: 'plans',
    active: true,
    order: 2
  }
];

if (!fs.existsSync(BANNERS_FILE)) {
  fs.writeFileSync(BANNERS_FILE, JSON.stringify(DEFAULT_BANNERS, null, 2), 'utf-8');
}

const DEFAULT_CATEGORIES = [
  { id: 'vip_file', name: 'VIP FILE', nameBn: 'ভিআইপি ফাইল', icon: 'folder', count: 12, active: true },
  { id: 'telegram_bots', name: 'Telegram Bots', nameBn: 'টেলিগ্রাম বটস', icon: 'bot', count: 8, active: true },
  { id: 'mini_apps', name: 'Mini Apps', nameBn: 'মিনি অ্যাপস', icon: 'sparkles', count: 15, active: true },
  { id: 'hosting_plans', name: 'Hosting Plans', nameBn: 'হোস্টিং প্লান', icon: 'crown', count: 4, active: true }
];

if (!fs.existsSync(CATEGORIES_FILE)) {
  fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(DEFAULT_CATEGORIES, null, 2), 'utf-8');
}

const DEFAULT_STORE_ITEMS: any[] = [];

if (!fs.existsSync(STORE_ITEMS_FILE)) {
  fs.writeFileSync(STORE_ITEMS_FILE, JSON.stringify(DEFAULT_STORE_ITEMS, null, 2), 'utf-8');
}

const DEFAULT_SUPPORT_SETTINGS = {
  email: 'toyoburrahman560@gmail.com',
  whatsapp: '01304104492',
  telegram: 'toyoburrahman',
  workingHours: '24/7 Live Support',
  noticeBn: 'যেকোনো সাহায্যের জন্য আমাদের ইমেইল, হোয়াটসঅ্যাপ অথবা টেলিগ্রামে সরাসরি যোগাযোগ করুন।',
  noticeEn: 'For any assistance, contact us directly via Email, WhatsApp or Telegram.'
};

if (!fs.existsSync(SUPPORT_SETTINGS_FILE)) {
  fs.writeFileSync(SUPPORT_SETTINGS_FILE, JSON.stringify(DEFAULT_SUPPORT_SETTINGS, null, 2), 'utf-8');
}
if (!fs.existsSync(SUPPORT_MESSAGES_FILE)) {
  fs.writeFileSync(SUPPORT_MESSAGES_FILE, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(WISHLIST_FILE)) {
  fs.writeFileSync(WISHLIST_FILE, JSON.stringify({}, null, 2), 'utf-8');
}

const DEFAULT_FREE_TRIAL_SETTINGS = {
  enabled: true,
  durationDays: 30,
  maxBots: 1,
  nameBn: '১ মাস ফ্রি ট্রায়াল (নতুন ইউজার স্পেশাল)',
  nameEn: '1 Month Free Trial (New User Special)',
  featuresBn: [
    '১টি টেলিগ্রাম বট ২৪/৭ সার্বক্ষণিক লাইভ হোস্টিং',
    '১ মাস (৩০ দিন) সম্পূর্ণ ফ্রি লাইভ অ্যাক্সেস',
    'অটো-রিস্টার্ট ও ক্র্যাশ প্রোটেকশন ওয়াচডগ',
    'লাইভ কনসোল ও রিয়েল-টাইম লগস',
    'ফাইল এডিটর ও ডাটাবেজ ব্যাকআপ'
  ],
  featuresEn: [
    '1 Telegram Bot 24/7 Live Hosting',
    '1 Month (30 Days) Completely Free Live Access',
    'Auto-Restart & Crash Protection Watchdog',
    'Live Console & Real-time Logs',
    'File Editor & Database Backup'
  ]
};

function getFreeTrialSettings() {
  try {
    if (fs.existsSync(FREE_TRIAL_SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(FREE_TRIAL_SETTINGS_FILE, 'utf-8'));
      return { ...DEFAULT_FREE_TRIAL_SETTINGS, ...data };
    }
  } catch {}
  return DEFAULT_FREE_TRIAL_SETTINGS;
}

function saveFreeTrialSettings(data: any) {
  fs.writeFileSync(FREE_TRIAL_SETTINGS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

if (!fs.existsSync(FREE_TRIAL_SETTINGS_FILE)) {
  saveFreeTrialSettings(DEFAULT_FREE_TRIAL_SETTINGS);
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

// Bot Deployment History Helpers
function getBotDeploymentsFile(botId: string): string {
  const reg = getRegistry();
  const bot = reg.find((b: any) => b.id === botId);
  const botDir = path.join(HOSTED_BOTS_DIR, bot?.dirName || botId);
  return path.join(botDir, 'deployments.json');
}

function getBotDeployments(botId: string): any[] {
  const filePath = getBotDeploymentsFile(botId);
  const reg = getRegistry();
  const bot = reg.find((b: any) => b.id === botId);

  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch {}
  }

  // Generate fallback initial deployment if bot exists
  if (bot) {
    const initialDep = {
      id: `dep-${Date.parse(bot.created || bot.createdAt || new Date().toISOString()) || Date.now()}-init`,
      botId: bot.id,
      version: 'v1.0.0',
      timestamp: bot.created || bot.createdAt || new Date().toISOString(),
      trigger: 'initial_deploy',
      status: 'active',
      entryFile: bot.entryFile || 'bot.py',
      description: 'Initial cloud bot deployment and workspace bootstrap',
      deployedBy: bot.ownerName || 'Admin',
      filesCount: typeof bot.fileCount === 'number' ? bot.fileCount : 1
    };
    saveBotDeployments(botId, [initialDep]);
    return [initialDep];
  }

  return [];
}

function saveBotDeployments(botId: string, deployments: any[]) {
  try {
    const filePath = getBotDeploymentsFile(botId);
    const botDir = path.dirname(filePath);
    if (!fs.existsSync(botDir)) {
      fs.mkdirSync(botDir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(deployments, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save bot deployments:', err);
  }
}

function recordBotDeployment(botId: string, details: {
  version?: string;
  trigger: string;
  description?: string;
  status?: 'active' | 'success' | 'failed';
  entryFile?: string;
  deployedBy?: string;
  filesCount?: number;
}) {
  const deployments = getBotDeployments(botId);

  let version = details.version;
  if (!version) {
    const lastVersion = deployments[0]?.version || 'v1.0.0';
    const match = lastVersion.match(/v?(\d+)\.(\d+)(?:\.(\d+))?/);
    if (match) {
      const major = parseInt(match[1] || '1', 10);
      const minor = parseInt(match[2] || '0', 10);
      const patch = parseInt(match[3] || '0', 10);
      version = `v${major}.${minor}.${patch + 1}`;
    } else {
      version = `v1.0.${deployments.length + 1}`;
    }
  }

  const isNewActive = (details.status || 'active') === 'active';
  const updatedDeployments = deployments.map((d: any) => {
    if (isNewActive && d.status === 'active') {
      return { ...d, status: 'success' };
    }
    return d;
  });

  const newEntry = {
    id: `dep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    botId,
    version,
    timestamp: new Date().toISOString(),
    trigger: details.trigger || 'manual_deploy',
    status: details.status || 'active',
    entryFile: details.entryFile || 'bot.py',
    description: details.description || `Deployment ${version}`,
    deployedBy: details.deployedBy || 'Owner',
    filesCount: details.filesCount
  };

  updatedDeployments.unshift(newEntry);
  saveBotDeployments(botId, updatedDeployments);
  return newEntry;
}

function getAccounts(): any[] {
  try {
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveAccounts(data: any[]) {
  try {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save accounts:', err);
  }
}

function getSessions(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveSessions(data: Record<string, string>) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save sessions:', err);
  }
}

function getPlans(): any[] {
  try {
    const raw = JSON.parse(fs.readFileSync(PLANS_FILE, 'utf-8'));
    if (Array.isArray(raw)) {
      return raw.filter((p: any) => p && p.id !== 'free' && (p.durationDays > 0 || p.priceBdt > 0 || p.priceUsd > 0));
    }
    return DEFAULT_PLANS.filter((p) => p.id !== 'free');
  } catch {
    return DEFAULT_PLANS.filter((p) => p.id !== 'free');
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

function getSiteSettings(): any {
  try {
    if (fs.existsSync(SITE_SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SITE_SETTINGS_FILE, 'utf-8'));
      return { ...DEFAULT_SITE_SETTINGS, ...data };
    }
    return DEFAULT_SITE_SETTINGS;
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

function saveSiteSettings(data: any) {
  fs.writeFileSync(SITE_SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function getBanners(): any[] {
  try {
    return JSON.parse(fs.readFileSync(BANNERS_FILE, 'utf-8'));
  } catch {
    return DEFAULT_BANNERS;
  }
}

function saveBanners(data: any[]) {
  try {
    fs.writeFileSync(BANNERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save banners:', err);
  }
}

function getCategories(): any[] {
  try {
    return JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf-8'));
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

function saveCategories(data: any[]) {
  try {
    fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save categories:', err);
  }
}

function getStoreItems(): any[] {
  try {
    return JSON.parse(fs.readFileSync(STORE_ITEMS_FILE, 'utf-8'));
  } catch {
    return DEFAULT_STORE_ITEMS;
  }
}

function saveStoreItems(data: any[]) {
  try {
    fs.writeFileSync(STORE_ITEMS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save store items:', err);
  }
}

function getSupportSettings(): any {
  try {
    return JSON.parse(fs.readFileSync(SUPPORT_SETTINGS_FILE, 'utf-8'));
  } catch {
    return DEFAULT_SUPPORT_SETTINGS;
  }
}

function saveSupportSettings(data: any) {
  try {
    fs.writeFileSync(SUPPORT_SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save support settings:', err);
  }
}

function getSupportMessages(): any[] {
  try {
    return JSON.parse(fs.readFileSync(SUPPORT_MESSAGES_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveSupportMessages(data: any[]) {
  try {
    fs.writeFileSync(SUPPORT_MESSAGES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save support messages:', err);
  }
}

function getWishlistMap(): Record<string, string[]> {
  try {
    return JSON.parse(fs.readFileSync(WISHLIST_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveWishlistMap(data: Record<string, string[]>) {
  fs.writeFileSync(WISHLIST_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function isUserAdmin(user: any): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const email = (user.email || '').toLowerCase().trim();
  if (
    email === 'toyoburrahman9090@gmail.com' ||
    email === 'mdtayburrahman1111@gmail.com' ||
    email === 'toyobur@telegram.bot'
  ) {
    return true;
  }
  return false;
}

// Strict ownership verification: Only bot owner or admin can view, access, or edit bot files
function canUserAccessBot(bot: any, user: any): boolean {
  if (!user || !bot) return false;
  if (isUserAdmin(user)) return true;

  const userId = String(user.id || '').trim();
  const userEmail = String(user.email || '').trim().toLowerCase();

  const botOwnerId = String(bot.ownerId || '').trim();
  const botOwner = String(bot.owner || '').trim();
  const botOwnerEmail = String(bot.ownerEmail || '').trim().toLowerCase();

  if (botOwnerId && botOwnerId === userId) return true;
  if (botOwner && botOwner === userId) return true;
  if (botOwnerEmail && userEmail && botOwnerEmail === userEmail) return true;

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

  if (isUserAdmin(user)) {
    if (user.role !== 'admin') {
      user.role = 'admin';
      changed = true;
    }
    user.maxBots = 999;
    user.plan = user.plan || 'admin_unlimited';
  } else {
    // Normal user:
    if (user.plan === 'free_trial') {
      if (user.planExpiresAt && user.planExpiresAt < Date.now()) {
        user.plan = 'expired';
        user.maxBots = 0;
        changed = true;
      } else {
        user.maxBots = Math.max(user.maxBots || 0, 1);
      }
    } else if (user.planExpiresAt && user.planExpiresAt < Date.now()) {
      user.plan = 'expired';
      user.maxBots = 0;
      changed = true;
    } else if (!user.plan || user.plan === 'none' || user.plan === 'free') {
      user.plan = 'free';
      user.maxBots = user.maxBots || 0;
    }
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

// Auth Middleware (Token based with 30-day session persistence, supporting Header and Query Token)
function getAuthUser(req: express.Request): any | null {
  const authHeader = req.headers.authorization;
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && typeof req.query.token === 'string') {
    token = req.query.token;
  }
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
  const accounts = getAccounts();
  let registryChanged = false;

  for (const bot of reg) {
    const owner = accounts.find(
      (a) =>
        a.id === bot.ownerId ||
        a.id === bot.owner ||
        (bot.ownerEmail && a.email.toLowerCase() === bot.ownerEmail.toLowerCase())
    );

    // Plan Expiry Enforcement: If owner's plan is expired or inactive, IMMEDIATELY halt live running bot
    if (owner && owner.role !== 'admin') {
      const isExpired = Boolean(owner.planExpiresAt && owner.planExpiresAt < Date.now());
      const hasNoActivePlan = !owner.plan || owner.plan === 'none' || owner.plan === 'expired' || owner.plan === 'free';

      if (isExpired || hasNoActivePlan) {
        if (runningProcesses.has(bot.id) || bot.status === 'running' || bot.autoRestart) {
          console.log(`[WATCHDOG PLAN EXPIRED] Stopping live bot "${bot.name || bot.id}" for user "${owner.email}" - plan expired.`);
          stopBotProcess(bot.id);
          bot.autoRestart = false;
          bot.status = 'stopped';
          bot.pid = null;
          appendLog(bot.id, 'warn', '⚠️ [প্ল্যান বন্ধ] আপনার ফ্রি প্লানটি বন্ধ হয়ে গেছে। একটি প্ল্যান কিনুন, আপনার আগের বট সাথে সাথে লাইভ হয়ে যাবে!');
          registryChanged = true;
        }
        continue;
      }
    }

    // Normal auto-restart watchdog for bots with active plans
    if (bot.autoRestart && bot.status === 'running') {
      if (!runningProcesses.has(bot.id)) {
        appendLog(bot.id, 'info', '24/7 Watchdog: Process died or container restarted. Auto-restarting bot...');
        launchBotProcess(bot);
      }
    }
  }

  if (registryChanged) {
    saveRegistry(reg);
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
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getAccounts();
  const existing = accounts.find((a) => a.email && a.email.trim().toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'এই ইমেইলে ইতোমধ্যে অ্যাকাউন্ট খোলা আছে। অনুগ্রহ করে লগইন করুন।' });
  }

  const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const isAdmin = accounts.length === 0 ||
    cleanEmail === 'mdtayburrahman1111@gmail.com' ||
    cleanEmail === 'toyobur@telegram.bot';

  const newUser = {
    id: userId,
    name: name.trim(),
    email: cleanEmail,
    password: password || '',
    role: isAdmin ? 'admin' : 'user',
    plan: 'free',
    maxBots: isAdmin ? 999 : 1,
    planExpiresAt: null,
    balanceBdt: 0,
    balanceUsd: 0,
    isVerified: true,
    avatar: '',
    googleId: '',
    createdAt: new Date().toISOString()
  };
  accounts.push(newUser);
  saveAccounts(accounts);

  const enriched = enrichUserWithPlanAndRole(newUser);
  const token = generateAuthToken(enriched);
  const sessions = getSessions();
  sessions[token] = userId;
  saveSessions(sessions);

  res.json({ success: true, token, user: enriched });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getAccounts();
  let user = accounts.find((a) => a.email && a.email.trim().toLowerCase() === cleanEmail);
  if (!user) {
    // Quick auto-registration if doesn't exist
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const isAdmin = accounts.length === 0 ||
      cleanEmail === 'mdtayburrahman1111@gmail.com' ||
      cleanEmail === 'toyobur@telegram.bot';
    user = {
      id: userId,
      name: cleanEmail.split('@')[0],
      email: cleanEmail,
      password: password || '',
      role: isAdmin ? 'admin' : 'user',
      plan: 'free',
      maxBots: isAdmin ? 999 : 1,
      planExpiresAt: null,
      balanceBdt: 0,
      balanceUsd: 0,
      isVerified: true,
      avatar: '',
      googleId: '',
      createdAt: new Date().toISOString()
    };
    accounts.push(user);
    saveAccounts(accounts);
  } else {
    // Check password if set
    if (user.password && password && user.password !== password) {
      return res.status(401).json({ error: 'ভুল পাসওয়ার্ড! অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন অথবা পাসওয়ার্ড রিসেট করুন।' });
    }
    // If account had no password previously, save it now
    if (!user.password && password) {
      user.password = password;
      saveAccounts(accounts);
    }
  }

  user = enrichUserWithPlanAndRole(user);
  const token = generateAuthToken(user);
  const sessions = getSessions();
  sessions[token] = user.id;
  saveSessions(sessions);

  res.json({ success: true, token, user });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'ইমেইল এবং নতুন পাসওয়ার্ড প্রদান করুন' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getAccounts();
  const user = accounts.find((a) => a.email && a.email.trim().toLowerCase() === cleanEmail);
  if (!user) {
    return res.status(404).json({ error: 'এই ইমেইলে কোনো নিবন্ধিত অ্যাকাউন্ট পাওয়া যায়নি' });
  }
  user.password = newPassword;
  saveAccounts(accounts);

  const enriched = enrichUserWithPlanAndRole(user);
  const token = generateAuthToken(enriched);
  const sessions = getSessions();
  sessions[token] = user.id;
  saveSessions(sessions);

  res.json({ success: true, message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে', token, user: enriched });
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

// Google Direct Login route (Seamlessly links with any previously registered account matching email)
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
          let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4) base64 += '=';
          const payloadJson = Buffer.from(base64, 'base64').toString('utf-8');
          const payload = JSON.parse(payloadJson);
          email = payload.email || '';
          name = payload.name || payload.given_name || (payload.email ? payload.email.split('@')[0] : '');
          picture = payload.picture || '';
          googleId = payload.sub || '';
        }
      } catch (err) {
        console.error('Failed to parse Google JWT:', err);
      }
    }

    if (!email && directEmail) {
      email = String(directEmail).trim();
      name = directName || email.split('@')[0];
      picture = directPicture || '';
      googleId = directGoogleId || '';
    }

    if (!email) {
      return res.status(400).json({ error: 'গুগল সাইন-ইন থেকে কোনো সঠিক ইমেইল এড্রেস পাওয়া যায়নি' });
    }

    email = email.trim().toLowerCase();
    name = (name || email.split('@')[0]).trim();

    const accounts = getAccounts();
    // Look up existing account by email OR googleId
    let user = accounts.find((a) =>
      (a.email && a.email.trim().toLowerCase() === email) ||
      (googleId && a.googleId && a.googleId === googleId)
    );

    const isAdmin = accounts.length === 0 ||
      email === 'mdtayburrahman1111@gmail.com' ||
      email === 'toyobur@telegram.bot' ||
      (user && user.role === 'admin');

    let isExistingAccount = false;

    if (!user) {
      // Create new account if none exists with this email
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
        balanceBdt: 0,
        balanceUsd: 0,
        isVerified: true,
        createdAt: new Date().toISOString()
      };
      accounts.push(user);
      saveAccounts(accounts);
    } else {
      // PREVIOUS ACCOUNT EXISTS: Link Google login seamlessly to this exact registered account
      isExistingAccount = true;
      let changed = false;

      // Link googleId to their existing account
      if (googleId && user.googleId !== googleId) {
        user.googleId = googleId;
        changed = true;
      }

      // Link avatar if not set
      if (picture && !user.avatar) {
        user.avatar = picture;
        changed = true;
      }

      // Update name if current name is empty or default handle
      if ((!user.name || user.name === email.split('@')[0]) && name) {
        user.name = name;
        changed = true;
      }

      // Admin role preservation
      if (isAdmin && user.role !== 'admin') {
        user.role = 'admin';
        user.maxBots = 999;
        changed = true;
      }

      // Mark verified
      if (!user.isVerified) {
        user.isVerified = true;
        changed = true;
      }

      // Ensure plan exists
      if (!user.plan || user.plan === 'none') {
        user.plan = 'free';
        user.maxBots = user.role === 'admin' ? 999 : 1;
        changed = true;
      }

      if (changed) {
        const uIdx = accounts.findIndex((a) => a.id === user.id);
        if (uIdx !== -1) {
          accounts[uIdx] = { ...accounts[uIdx], ...user };
        }
        saveAccounts(accounts);
      }

      // Ensure all bots created under this email are connected to this user ID
      try {
        const reg = getRegistry();
        let regChanged = false;
        for (const bot of reg) {
          if (bot.ownerEmail && bot.ownerEmail.trim().toLowerCase() === email) {
            if (bot.ownerId !== user.id || bot.owner !== user.id) {
              bot.ownerId = user.id;
              bot.owner = user.id;
              regChanged = true;
            }
          }
        }
        if (regChanged) {
          saveRegistry(reg);
        }
      } catch (err) {
        console.error('Error reconciling bot ownership on Google login:', err);
      }
    }

    user = enrichUserWithPlanAndRole(user);
    const token = generateAuthToken(user);
    const sessions = getSessions();
    sessions[token] = user.id;
    saveSessions(sessions);

    return res.json({
      success: true,
      token,
      user,
      isExistingAccount,
      message: isExistingAccount
        ? 'আপনার পূর্বের রেজিস্ট্রেশন করা অ্যাকাউন্টে সফলভাবে গুগল দিয়ে লগইন হয়েছে।'
        : 'গুগল দিয়ে সফলভাবে নতুন অ্যাকাউন্ট তৈরি ও লগইন হয়েছে।'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Google login failed' });
  }
});

// Hosting Plans & Payment Endpoints
app.get('/api/plans', (req, res) => {
  const allPlans = getPlans();
  const user = getAuthUser(req);
  const userClaimed = Boolean(user && (user.hasClaimedFreePlan || user.hasClaimedFreeTrial));

  // If user has already claimed the 1-month free plan and is not admin, hide the free trial plan from their view
  if (user && userClaimed && !isUserAdmin(user)) {
    return res.json({
      plans: allPlans.filter((p: any) => !p.isFreeTrial && p.id !== 'free_trial_1m'),
      userClaimedFreePlan: true,
      freeTrial: getFreeTrialSettings()
    });
  }

  res.json({
    plans: allPlans,
    userClaimedFreePlan: userClaimed,
    freeTrial: getFreeTrialSettings()
  });
});

app.get('/api/admin/plans', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json({ plans: getPlans(), freeTrial: getFreeTrialSettings() });
});

app.get('/api/free-trial/settings', (req, res) => {
  res.json({ success: true, settings: getFreeTrialSettings() });
});

const handleClaimFreeTrialEndpoint = (req: express.Request, res: express.Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'ফ্রি প্ল্যান ক্লেইম করতে প্রথমে লগইন করুন (Please login to claim free trial)' });
  }

  const settings = getFreeTrialSettings();
  if (settings && settings.enabled === false) {
    return res.status(400).json({ error: 'বর্তমানে ফ্রি ট্রায়াল অফারটি সাময়িকভাবে বন্ধ রয়েছে।' });
  }

  const accounts = getAccounts();
  const targetUser = accounts.find((a) => a.id === user.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  if (targetUser.hasClaimedFreeTrial || targetUser.hasClaimedFreePlan) {
    return res.status(400).json({
      error: 'আপনি ইতোমধ্যে ১ মাসের ফ্রি প্ল্যান ব্যবহার করেছেন। এটি প্রতি ইউজারের জন্য শুধুমাত্র একবার প্রযোজ্য।',
      alreadyClaimed: true
    });
  }

  const durationDays = Number(settings?.durationDays) || 30;
  targetUser.hasClaimedFreeTrial = true;
  targetUser.hasClaimedFreePlan = true;
  targetUser.freeTrialClaimedAt = new Date().toISOString();
  targetUser.plan = 'free_trial_1m';
  targetUser.maxBots = Math.max(targetUser.maxBots || 0, Number(settings?.maxBots) || 1);
  const currentExpiry = (targetUser.planExpiresAt && targetUser.planExpiresAt > Date.now()) ? targetUser.planExpiresAt : Date.now();
  targetUser.planExpiresAt = currentExpiry + durationDays * 24 * 60 * 60 * 1000;
  saveAccounts(accounts);

  // In-app notification
  try {
    const notifications = getStoredNotifications();
    notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: targetUser.id,
      type: 'plan_purchased',
      title: '🎉 ১ মাসের ফ্রি ট্রায়াল প্ল্যান সক্রিয় হয়েছে!',
      message: `অভিনন্দন! আপনি ১ মাসের (${durationDays} দিন) জন্য ১টি টেলিগ্রাম বট ফ্রি হোস্টিং সুবিধা পেয়েছেন। মেয়াদ: ${new Date(targetUser.planExpiresAt).toLocaleDateString('bn-BD')} পর্যন্ত।`,
      createdAt: new Date().toISOString(),
      read: false
    });
    saveStoredNotifications(notifications);
  } catch {}

  const enriched = enrichUserWithPlanAndRole(targetUser);
  res.json({
    success: true,
    message: '🎉 অভিনন্দন! ১ মাসের ফ্রি ট্রায়াল প্ল্যান সফলভাবে সক্রিয় হয়েছে। এখন আপনি ১টি টেলিগ্রাম বট লাইভ হোস্ট করতে পারবেন।',
    user: enriched
  });
};

app.post('/api/free-trial/claim', handleClaimFreeTrialEndpoint);
app.post('/api/plans/claim-free-trial', handleClaimFreeTrialEndpoint);

app.post('/api/admin/free-trial/settings', (req, res) => {
  const user = getAuthUser(req);
  if (!isUserAdmin(user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { enabled, durationDays, maxBots, nameBn, nameEn, featuresBn, featuresEn } = req.body;
  const current = getFreeTrialSettings();
  const updated = {
    ...current,
    enabled: typeof enabled === 'boolean' ? enabled : current.enabled,
    durationDays: Number(durationDays) || current.durationDays,
    maxBots: Number(maxBots) || current.maxBots,
    nameBn: nameBn || current.nameBn,
    nameEn: nameEn || current.nameEn,
    featuresBn: Array.isArray(featuresBn) ? featuresBn : current.featuresBn,
    featuresEn: Array.isArray(featuresEn) ? featuresEn : current.featuresEn
  };
  saveFreeTrialSettings(updated);
  res.json({ success: true, settings: updated });
});

app.post('/api/admin/free-trial/reset-user', (req, res) => {
  const user = getAuthUser(req);
  if (!isUserAdmin(user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { userId } = req.body;
  const accounts = getAccounts();
  const target = accounts.find((a) => a.id === userId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  target.hasClaimedFreeTrial = false;
  delete target.freeTrialClaimedAt;
  saveAccounts(accounts);

  res.json({
    success: true,
    message: 'ইউজারের ফ্রি ট্রায়াল স্ট্যাটাস রিসেট করা হয়েছে। ইউজার আবার ১ মাসের ফ্রি ট্রায়াল নিতে পারবে।',
    user: enrichUserWithPlanAndRole(target)
  });
});

app.post('/api/admin/free-trial/grant-user', (req, res) => {
  const user = getAuthUser(req);
  if (!isUserAdmin(user)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { userId } = req.body;
  const accounts = getAccounts();
  const target = accounts.find((a) => a.id === userId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  const settings = getFreeTrialSettings();
  const durationDays = Number(settings.durationDays) || 30;
  target.hasClaimedFreeTrial = true;
  target.freeTrialClaimedAt = new Date().toISOString();
  target.plan = 'free_trial';
  target.maxBots = Number(settings.maxBots) || 1;
  const currentExpiry = (target.planExpiresAt && target.planExpiresAt > Date.now()) ? target.planExpiresAt : Date.now();
  target.planExpiresAt = currentExpiry + durationDays * 24 * 60 * 60 * 1000;
  saveAccounts(accounts);

  res.json({
    success: true,
    message: 'ইউজারকে ১ মাসের ফ্রি প্ল্যান প্রদান করা হয়েছে।',
    user: enrichUserWithPlanAndRole(target)
  });
});

app.get('/api/payment-settings', (req, res) => {
  res.json({ settings: getPaymentSettings() });
});

app.get('/api/settings/payment', (req, res) => {
  res.json(getPaymentSettings());
});

app.get('/api/site-settings', (req, res) => {
  res.json({ settings: getSiteSettings() });
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
  if (!user) {
    const publicNotifs = getUserNotifications('', '');
    return res.json({ notifications: publicNotifs.slice(0, 10) });
  }
  res.json({ notifications: getUserNotifications(user.id, user.email) });
});

app.post('/api/notifications/mark-read', (req, res) => {
  const user = getAuthUser(req);
  const { id } = req.body;
  markNotificationAsRead(id || 'all', user?.id);
  res.json({ success: true, message: 'Notifications marked as read' });
});

// Platform Announcements & Notices (Home ticker and banners)
app.get('/api/announcements', (req, res) => {
  const all = getAnnouncements();
  const active = all.filter((a) => a.active !== false);
  res.json({ announcements: active });
});

app.post('/api/admin/announcements', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const { titleBn, titleEn, messageBn, messageEn, active } = req.body;
  if (!titleBn && !titleEn) return res.status(400).json({ error: 'Notice title is required' });

  const list = getAnnouncements();
  const newAnn = {
    id: `ann_${Date.now()}`,
    titleBn: (titleBn || titleEn || '').trim(),
    titleEn: (titleEn || titleBn || '').trim(),
    messageBn: (messageBn || messageEn || '').trim(),
    messageEn: (messageEn || messageBn || '').trim(),
    date: new Date().toISOString(),
    active: active !== false
  };

  list.unshift(newAnn);
  saveAnnouncements(list);

  // Also publish to notifications
  addBroadcastNotification(newAnn.titleBn, newAnn.messageBn, 'broadcast');

  res.json({ success: true, announcement: newAnn, announcements: list });
});

app.delete('/api/admin/announcements/:id', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  let list = getAnnouncements();
  list = list.filter((a) => a.id !== req.params.id);
  saveAnnouncements(list);
  res.json({ success: true, announcements: list });
});

// Admin Broadcast to all users
app.post('/api/admin/broadcast', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const { title, message, type } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message are required' });

  const notif = addBroadcastNotification(title.trim(), message.trim(), type || 'broadcast');

  // Also add to active announcements for top home ticker
  const list = getAnnouncements();
  list.unshift({
    id: `ann_${Date.now()}`,
    titleBn: title.trim(),
    titleEn: title.trim(),
    messageBn: message.trim(),
    messageEn: message.trim(),
    date: new Date().toISOString(),
    active: true
  });
  if (list.length > 30) list.splice(30);
  saveAnnouncements(list);

  res.json({ success: true, message: 'Broadcast sent to all users and announcements ticker', notification: notif });
});

app.post('/api/admin/notifications/send', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const { targetUserId, targetEmail, title, message, type } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message are required' });

  if (targetUserId === 'all' || (!targetUserId && !targetEmail)) {
    const notif = addBroadcastNotification(title.trim(), message.trim(), type || 'broadcast');
    return res.json({ success: true, message: 'Broadcast notification sent to all users', notification: notif });
  }

  // Single user notification
  sendEmailAlert({
    to: targetEmail || targetUserId,
    userId: targetUserId,
    subject: title.trim(),
    html: `<p>${message.trim()}</p>`,
    text: message.trim(),
    type: (type as any) || 'system'
  });

  res.json({ success: true, message: 'Notification sent successfully to target user' });
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
    totalRevenueUsd: totalRevenue,
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
      // Wallet deposit approval (credit balance in USDT)
      targetUser.balanceUsd = (targetUser.balanceUsd || 0) + (request.amount || 0);
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

// SMTP Status & Diagnostics Endpoint for Admin
app.get('/api/admin/smtp-status', async (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const config = getSmtpConfig();
  if (!config.configured) {
    return res.json({
      configured: false,
      message: 'SMTP কনফিগার করা হয়নি। নিচের ফর্মে আপনার জিমেইল ও ১৬ সংখ্যার App Password দিয়ে সেভ করুন।',
      config
    });
  }

  const verifyResult = await verifySmtpConnection();
  res.json({
    configured: true,
    connected: verifyResult.success,
    message: verifyResult.message,
    config
  });
});

// Get current SMTP settings (for admin editing)
app.get('/api/admin/smtp-settings', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const saved = loadSmtpSettingsFile();
  const config = getSmtpConfig();

  res.json({
    settings: {
      host: saved?.host || process.env.SMTP_HOST || 'smtp.gmail.com',
      port: saved?.port || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465),
      user: saved?.user || process.env.SMTP_USER || '',
      pass: saved?.pass || (process.env.SMTP_PASS ? '********' : ''),
      from: saved?.from || process.env.SMTP_FROM || '',
      secure: saved?.secure !== undefined ? saved.secure : (process.env.SMTP_SECURE === 'true' || true)
    },
    config
  });
});

// Save SMTP settings from Admin Panel
app.post('/api/admin/smtp-settings', async (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { host, port, user, pass, from, secure } = req.body;
  if (!host || !user) {
    return res.status(400).json({ error: 'SMTP Host এবং User Email দেওয়া আবশ্যক।' });
  }

  const existing = loadSmtpSettingsFile();
  // Keep existing pass if masked string was sent back unchanged
  const finalPass = (pass === '********' && existing?.pass) ? existing.pass : (pass || '');

  const saved = saveSmtpSettingsFile({
    host: (host || '').trim(),
    port: parseInt(String(port || '465').trim(), 10),
    user: (user || '').trim(),
    pass: finalPass.trim(),
    from: (from || '').trim(),
    secure: secure !== undefined ? Boolean(secure) : true
  });

  if (!saved) {
    return res.status(500).json({ error: 'SMTP সেটিংস সংরক্ষণ করতে ব্যর্থ হয়েছে।' });
  }

  const verifyResult = await verifySmtpConnection();

  res.json({
    success: true,
    message: 'SMTP সেটিংস সফলভাবে সংরক্ষিত হয়েছে!',
    connected: verifyResult.success,
    errorCategory: verifyResult.errorCategory,
    verifyMessage: verifyResult.message,
    solutionHint: verifyResult.solutionHint,
    details: verifyResult.details,
    workingPort: verifyResult.workingPort,
    workingSecure: verifyResult.workingSecure,
    config: getSmtpConfig()
  });
});

// Auto-Fix IPv4 & Auto-detect working SMTP port (Port 587 or 465)
app.post('/api/admin/smtp-autofix', async (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const existing = loadSmtpSettingsFile();
  const rawUser = (req.body.user || existing?.user || process.env.SMTP_USER || '').trim();
  const reqPass = req.body.pass;
  const rawPass = (reqPass && reqPass !== '********') ? reqPass : (existing?.pass || process.env.SMTP_PASS || '');
  const rawHost = (req.body.host || existing?.host || process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const requestedPort = parseInt(String(req.body.port || existing?.port || 465), 10);
  const requestedSecure = req.body.secure !== undefined ? Boolean(req.body.secure) : (requestedPort === 465);

  if (!rawUser) {
    return res.status(400).json({ error: 'প্রেরক ইমেইল এড্রেস দেওয়া আবশ্যক।' });
  }

  const testResult = await testSmtpWithParams({
    host: rawHost,
    port: requestedPort,
    user: rawUser,
    pass: rawPass,
    secure: requestedSecure
  });

  if (testResult.success && testResult.workingPort) {
    saveSmtpSettingsFile({
      host: rawHost,
      port: testResult.workingPort,
      user: rawUser,
      pass: rawPass.replace(/\s+/g, ''),
      secure: testResult.workingSecure !== undefined ? testResult.workingSecure : (testResult.workingPort === 465)
    });
  }

  res.json({
    success: testResult.success,
    connected: testResult.success,
    message: testResult.message,
    workingPort: testResult.workingPort,
    workingSecure: testResult.workingSecure,
    workingIp: testResult.workingIp,
    errorCategory: testResult.errorCategory,
    solutionHint: testResult.solutionHint,
    details: testResult.details,
    config: getSmtpConfig()
  });
});

// Send Test Alert Email Endpoint for Admin
app.post('/api/admin/smtp-test', async (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const recipient = (req.body.email || (admin ? admin.email : '')).trim();
  if (!recipient || !recipient.includes('@')) {
    return res.status(400).json({ error: 'সঠিক ইমেইল এড্রেস লিখুন (Valid email address required)' });
  }

  const result = await sendTestEmail(recipient);
  if (result.success) {
    res.json({
      success: true,
      message: result.message,
      messageId: result.messageId
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.message,
      errorCategory: result.errorCategory,
      solutionHint: result.solutionHint,
      details: result.error
    });
  }
});

// Trigger Manual Expiration Scan Endpoint for Admin
app.post('/api/admin/scan-expiring-plans', async (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const accounts = getAccounts();
    const reg = getRegistry();

    const result = await checkAndSendExpiringPlanAlerts(accounts, (expiredAccount) => {
      const userBots = reg.filter((b) =>
        b.ownerId === expiredAccount.id ||
        b.owner === expiredAccount.id ||
        (b.ownerEmail && b.ownerEmail.toLowerCase() === expiredAccount.email.toLowerCase())
      );
      let activeCount = 0;
      for (const bot of userBots) {
        if (runningProcesses.has(bot.id)) {
          activeCount++;
          if (activeCount > 1) {
            stopBotProcess(bot.id);
            appendLog(bot.id, 'warn', '⚠️ [PLAN EXPIRED] আপনার পেইড সাবস্ক্রিপশনের মেয়াদ শেষ হয়েছে। অতিরিক্ত বটটি বন্ধ করা হলো। প্ল্যান রিনিউ করুন।');
          }
        }
      }
    });

    if (result.modified) {
      saveAccounts(accounts);
    }

    res.json({
      success: true,
      message: `স্ক্যান সম্পন্ন: ${result.checkedCount} টি একাউন্ট যাচাই করা হয়েছে, ${result.alertedCount} জনকে মেয়াদ সতর্কবার্তা এবং ${result.expiredCount} টি মেয়াদোত্তীর্ণ একাউন্ট প্রসেস করা হয়েছে।`,
      result
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'স্ক্যান করতে ত্রুটি হয়েছে' });
  }
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

app.get('/api/admin/site-settings', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json({ success: true, settings: getSiteSettings() });
});

app.post('/api/admin/site-settings', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { siteName, logoUrl, taglineBn, taglineEn } = req.body;
  let finalLogoUrl = typeof logoUrl === 'string' ? logoUrl.trim() : undefined;

  // If user pasted a Kommodo share link like https://kommodo.ai/i/ID, convert to direct image URL
  if (finalLogoUrl && finalLogoUrl.includes('kommodo.ai/i/')) {
    const match = finalLogoUrl.match(/kommodo\.ai\/i\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      finalLogoUrl = `https://plain-apac-prod-public.komododecks.com/202609/15/${match[1]}/image.png`;
    }
  }

  const current = getSiteSettings();
  const updated = {
    ...current,
    ...(typeof siteName === 'string' ? { siteName: siteName.trim() } : {}),
    ...(finalLogoUrl !== undefined ? { logoUrl: finalLogoUrl } : {}),
    ...(typeof taglineBn === 'string' ? { taglineBn: taglineBn.trim() } : {}),
    ...(typeof taglineEn === 'string' ? { taglineEn: taglineEn.trim() } : {})
  };
  saveSiteSettings(updated);
  res.json({ success: true, settings: updated });
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

// Admin Edit Plan
app.post('/api/admin/plans/:id/edit', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.params;
  const { nameBn, nameEn, durationDays, maxBots, priceBdt, priceUsd, popular, featuresBn, featuresEn } = req.body;

  let plans = getPlans();
  const planIdx = plans.findIndex((p) => p.id === id);
  if (planIdx === -1) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  plans[planIdx] = {
    ...plans[planIdx],
    nameBn: (nameBn || plans[planIdx].nameBn || '').trim(),
    nameEn: (nameEn || plans[planIdx].nameEn || '').trim(),
    durationDays: parseInt(durationDays, 10) || plans[planIdx].durationDays || 30,
    maxBots: parseInt(maxBots, 10) || plans[planIdx].maxBots || 1,
    priceBdt: typeof priceBdt !== 'undefined' ? parseFloat(priceBdt) : plans[planIdx].priceBdt,
    priceUsd: typeof priceUsd !== 'undefined' ? parseFloat(priceUsd) : plans[planIdx].priceUsd,
    popular: typeof popular !== 'undefined' ? Boolean(popular) : plans[planIdx].popular,
    featuresBn: Array.isArray(featuresBn) ? featuresBn : (featuresBn ? featuresBn.split('\n').map((s: string) => s.trim()).filter(Boolean) : plans[planIdx].featuresBn),
    featuresEn: Array.isArray(featuresEn) ? featuresEn : (featuresEn ? featuresEn.split('\n').map((s: string) => s.trim()).filter(Boolean) : plans[planIdx].featuresEn)
  };

  savePlans(plans);
  res.json({ success: true, message: 'প্যাকেজ সফলভাবে আপডেট করা হয়েছে (Plan updated)', plan: plans[planIdx], plans: getPlans() });
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

// ==========================================
// STORE, BANNERS, CATEGORIES & PRODUCTS API
// ==========================================

// Banners
app.get(['/api/store/banners', '/api/banners'], (req, res) => {
  const banners = getBanners();
  const activeBanners = banners.filter((b) => b.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  res.json({ banners: activeBanners });
});

app.get('/api/admin/banners', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });
  res.json({ banners: getBanners() });
});

app.post('/api/admin/banners', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const { id, title, titleBn, subtitle, subtitleBn, badge, imageUrl, link, active, order } = req.body;
  if (!title && !titleBn) return res.status(400).json({ error: 'Banner title is required' });

  const banners = getBanners();
  const bannerId = id || `banner_${Date.now()}`;
  const existingIdx = banners.findIndex((b) => b.id === bannerId);

  const bannerData = {
    id: bannerId,
    title: title || titleBn || 'অফার',
    titleBn: titleBn || title || 'অফার',
    subtitle: subtitle || subtitleBn || '',
    subtitleBn: subtitleBn || subtitle || '',
    badge: badge || 'অল্প দামে',
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    link: link || 'market',
    active: active !== false,
    order: parseInt(order, 10) || 1
  };

  if (existingIdx >= 0) {
    banners[existingIdx] = bannerData;
  } else {
    banners.push(bannerData);
  }

  saveBanners(banners);
  res.json({ success: true, banner: bannerData, banners });
});

app.delete('/api/admin/banners/:id', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  let banners = getBanners();
  banners = banners.filter((b) => b.id !== req.params.id);
  saveBanners(banners);
  res.json({ success: true, banners });
});

// Categories
app.get('/api/store/categories', (req, res) => {
  const categories = getCategories();
  const activeCats = categories.filter((c) => c.active !== false);
  res.json({ categories: activeCats });
});

app.get('/api/admin/categories', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });
  res.json({ categories: getCategories() });
});

app.post('/api/admin/categories', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const { id, name, nameBn, icon, count, active } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  const categories = getCategories();
  const catId = (id || name.toLowerCase().replace(/[^a-z0-9]+/g, '_')).trim();
  const existingIdx = categories.findIndex((c) => c.id === catId);

  const catData = {
    id: catId,
    name: name.trim(),
    nameBn: (nameBn || name).trim(),
    icon: icon || 'folder',
    count: parseInt(count, 10) || 0,
    active: active !== false
  };

  if (existingIdx >= 0) {
    categories[existingIdx] = catData;
  } else {
    categories.push(catData);
  }

  saveCategories(categories);
  res.json({ success: true, category: catData, categories });
});

app.delete('/api/admin/categories/:id', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  let categories = getCategories();
  categories = categories.filter((c) => c.id !== req.params.id);
  saveCategories(categories);
  res.json({ success: true, categories });
});

// Store Items / Files
app.get('/api/store/items', (req, res) => {
  const items = getStoreItems();
  const { category, search, featured } = req.query;

  let filtered = items.filter((i) => i.active !== false);
  if (category && category !== 'all') {
    filtered = filtered.filter((i) => i.categoryId === category);
  }
  if (featured === 'true') {
    filtered = filtered.filter((i) => i.featured);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.titleBn && i.titleBn.toLowerCase().includes(q)) ||
        (i.description && i.description.toLowerCase().includes(q))
    );
  }

  res.json({ items: filtered });
});

// Serve uploaded store thumbnails
app.get('/api/store/thumbnails/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(STORE_THUMBNAILS_DIR, filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Thumbnail not found');
  }
});

// Admin direct file and thumbnail upload endpoint
app.post('/api/admin/upload-file', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const { fileName, fileData, fileType } = req.body;
  if (!fileName || !fileData) {
    return res.status(400).json({ error: 'File name and file data are required' });
  }

  try {
    const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    const buffer = Buffer.from(base64Data, 'base64');
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();

    if (fileType === 'thumbnail') {
      const storedFileName = `thumb_${timestamp}_${cleanName}`;
      const destPath = path.join(STORE_THUMBNAILS_DIR, storedFileName);
      fs.writeFileSync(destPath, buffer);
      return res.json({
        success: true,
        url: `/api/store/thumbnails/${storedFileName}`,
        storedFileName,
        originalFileName: fileName
      });
    } else {
      // product file / script / zip / rar / code
      const storedFileName = `product_${timestamp}_${cleanName}`;
      const destPath = path.join(STORE_UPLOADS_DIR, storedFileName);
      fs.writeFileSync(destPath, buffer);

      const bytes = buffer.length;
      let sizeFormatted = `${(bytes / 1024).toFixed(1)} KB`;
      if (bytes >= 1024 * 1024) {
        sizeFormatted = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      }

      return res.json({
        success: true,
        storedFileName,
        originalFileName: fileName,
        fileSizeFormatted: sizeFormatted
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'File upload failed' });
  }
});

app.get('/api/admin/store-items', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });
  res.json({ items: getStoreItems() });
});

app.post('/api/admin/store-items', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const {
    id,
    title,
    titleBn,
    categoryId,
    categoryName,
    priceBdt,
    priceUsd,
    rating,
    downloads,
    badge,
    imageUrl,
    description,
    planId,
    fileUrl,
    originalFileName,
    fileStorageName,
    fileSizeFormatted,
    featured,
    active
  } = req.body;

  if (!title) return res.status(400).json({ error: 'Item title is required' });

  const items = getStoreItems();
  const itemId = id || `item_${Date.now()}`;
  const existingIdx = items.findIndex((i) => i.id === itemId);

  const itemData = {
    id: itemId,
    title: title.trim(),
    titleBn: (titleBn || title).trim(),
    categoryId: categoryId || 'vip_file',
    categoryName: categoryName || 'VIP FILE',
    priceBdt: parseFloat(priceBdt) || 0,
    priceUsd: parseFloat(priceUsd) || 0,
    rating: typeof rating !== 'undefined' ? parseFloat(rating) : 5,
    downloads: parseInt(downloads, 10) || 0,
    badge: badge || 'সাশ্রয়ী দামে',
    imageUrl: imageUrl || '',
    description: description || '',
    planId: planId || '',
    fileUrl: fileUrl || '',
    originalFileName: originalFileName || (existingIdx >= 0 ? items[existingIdx].originalFileName : ''),
    fileStorageName: fileStorageName || (existingIdx >= 0 ? items[existingIdx].fileStorageName : ''),
    fileSizeFormatted: fileSizeFormatted || (existingIdx >= 0 ? items[existingIdx].fileSizeFormatted : ''),
    featured: Boolean(featured),
    active: active !== false,
    createdAt: items[existingIdx]?.createdAt || new Date().toISOString()
  };

  if (existingIdx >= 0) {
    items[existingIdx] = itemData;
  } else {
    items.push(itemData);
  }

  saveStoreItems(items);
  res.json({ success: true, item: itemData, items });
});

app.delete('/api/admin/store-items/:id', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  let items = getStoreItems();
  items = items.filter((i) => i.id !== req.params.id);
  saveStoreItems(items);
  res.json({ success: true, items });
});

// Buy Store Item with Wallet Balance
app.post('/api/store/items/:id/buy', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Please login to purchase files or plans' });

  const { currency } = req.body;
  const items = getStoreItems();
  const item = items.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const payCurrency = currency === 'BDT' ? 'BDT' : 'USD';
  const price = payCurrency === 'BDT' ? item.priceBdt : item.priceUsd;

  const accounts = getAccounts();
  const targetUser = accounts.find((a) => a.id === user.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  targetUser.balanceBdt = typeof targetUser.balanceBdt === 'number' ? targetUser.balanceBdt : 0;
  targetUser.balanceUsd = typeof targetUser.balanceUsd === 'number' ? targetUser.balanceUsd : 0;

  if (payCurrency === 'USD') {
    if (targetUser.balanceUsd < price) {
      return res.status(400).json({
        error: `পর্যাপ্ত USD ব্যালেন্স নেই। প্রয়োজন: $${price} USD, বর্তমান: $${targetUser.balanceUsd.toFixed(2)} USD। ডিপোজিট করুন।`,
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
        error: `পর্যাপ্ত BDT ব্যালেন্স নেই। প্রয়োজন: ৳${price} BDT, বর্তমান: ৳${targetUser.balanceBdt.toFixed(2)} BDT। ডিপোজিট করুন।`,
        needsDeposit: true,
        requiredAmount: price,
        currentBalance: targetUser.balanceBdt,
        currency: 'BDT'
      });
    }
    targetUser.balanceBdt = parseFloat((targetUser.balanceBdt - price).toFixed(2));
  }

  // Increment item download / purchase count
  item.downloads = (item.downloads || 0) + 1;
  saveStoreItems(items);

  // Record user purchased items
  targetUser.purchasedItemIds = targetUser.purchasedItemIds || [];
  if (!targetUser.purchasedItemIds.includes(item.id)) {
    targetUser.purchasedItemIds.push(item.id);
  }
  targetUser.purchasedItems = targetUser.purchasedItems || [];
  targetUser.purchasedItems.push({
    itemId: item.id,
    title: item.title,
    titleBn: item.titleBn,
    priceBdt: item.priceBdt,
    priceUsd: item.priceUsd,
    fileUrl: item.fileUrl || '',
    purchasedAt: Date.now()
  });

  // If item corresponds to a hosting plan, activate it!
  if (item.planId) {
    const plans = getPlans();
    const matchedPlan = plans.find((p) => p.id === item.planId);
    if (matchedPlan) {
      const durationDays = matchedPlan.durationDays || 30;
      targetUser.plan = matchedPlan.id;
      targetUser.maxBots = matchedPlan.maxBots || 3;
      const currentExpiry = (targetUser.planExpiresAt && targetUser.planExpiresAt > Date.now()) ? targetUser.planExpiresAt : Date.now();
      targetUser.planExpiresAt = currentExpiry + durationDays * 24 * 60 * 60 * 1000;
    }
  }

  saveAccounts(accounts);

  // Send notification & email alert
  sendEmailAlert({
    to: targetUser.email,
    userId: targetUser.id,
    type: 'plan_purchased',
    subject: `🎉 সফল কেনাকাটা: ${item.titleBn || item.title}`,
    html: `<p>প্রিয় ${targetUser.name}, আপনি সফলভাবে <strong>${item.titleBn || item.title}</strong> ক্রয় করেছেন। ওয়ালেট থেকে ${price} ${payCurrency} কাটা হয়েছে।</p>`,
    text: `আপনি সফলভাবে ${item.titleBn || item.title} ক্রয় করেছেন।`
  });

  const downloadUrl = item.fileUrl || `/api/store/items/${item.id}/download`;

  res.json({
    success: true,
    message: `🎉 অভিনন্দন! "${item.titleBn || item.title}" সফলভাবে ক্রয় সম্পন্ন হয়েছে।`,
    user: enrichUserWithPlanAndRole(targetUser),
    item,
    downloadUrl
  });
});

// Authenticated Download Endpoint for Store Files
app.get('/api/store/items/:id/download', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] || (req.query.token as string);
  let user: any = null;
  if (token) {
    try {
      if (token.startsWith('bt_')) {
        const payloadStr = Buffer.from(token.replace('bt_', ''), 'base64url').toString('utf-8');
        const payload = JSON.parse(payloadStr);
        const accounts = getAccounts();
        user = accounts.find((a) => a.id === payload.userId) || null;
      }
    } catch {}
  }

  const items = getStoreItems();
  const item = items.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).send('Item not found');

  const isAdmin = isUserAdmin(user);
  const hasPurchased = user && Array.isArray(user.purchasedItemIds) && user.purchasedItemIds.includes(item.id);

  if (!isAdmin && !hasPurchased) {
    return res.status(403).send('এই ফাইলটি ডাউনলোড করার আগে আপনাকে ক্রয় করতে হবে (Purchase required to download)');
  }

  // 1. If admin uploaded an actual file (zip, rar, py, json, etc.), stream it directly!
  if (item.fileStorageName) {
    const uploadedFilePath = path.join(STORE_UPLOADS_DIR, item.fileStorageName);
    if (fs.existsSync(uploadedFilePath)) {
      const clientFileName = item.originalFileName || `${(item.title || 'download').replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`;
      return res.download(uploadedFilePath, clientFileName);
    }
  }

  // 2. If external fileUrl is specified, redirect to it
  if (item.fileUrl && (item.fileUrl.startsWith('http://') || item.fileUrl.startsWith('https://'))) {
    return res.redirect(item.fileUrl);
  }

  // Provide a clean ready-to-use Telegram Bot / Mini App Source Code Bundle
  const safeFilename = (item.title || 'telegram_source_bundle').replace(/[^a-zA-Z0-9_-]/g, '_');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.py"`);
  res.setHeader('Content-Type', 'text/x-python; charset=utf-8');

  const sampleSourceCode = `# ========================================================
# ${item.title}
# Downloaded from App Store Premium Portal
# Customer: ${user?.name || 'Authorized Buyer'} (${user?.email || ''})
# Generated at: ${new Date().toISOString()}
# ========================================================

import os
import sys
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

logging.basicConfig(level=logging.INFO)

# Mini App Configuration
WEB_APP_URL = "https://ai.studio/build"

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_name = update.effective_user.first_name
    keyboard = [
        [InlineKeyboardButton("🚀 Open Mini App", web_app=WebAppInfo(url=WEB_APP_URL))],
        [InlineKeyboardButton("💰 Check Wallet Balance", callback_data="wallet")],
        [InlineKeyboardButton("💬 24/7 Support", url="https://t.me/toyoburrahman")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        f"👋 Welcome {user_name}! Your Telegram Mini App is ready to run.",
        reply_markup=reply_markup
    )

def main():
    token = os.getenv("BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
    app = ApplicationBuilder().token(token).build()
    app.add_handler(CommandHandler("start", start))
    print("🤖 Bot started successfully on 24/7 Cloud Host!")
    app.run_polling()

if __name__ == "__main__":
    main()
`;

  res.send(sampleSourceCode);
});

// ==========================================
// SUPPORT CENTER & MESSAGES API
// ==========================================
app.get(['/api/support/settings', '/api/support-settings'], (req, res) => {
  res.json({ settings: getSupportSettings() });
});

app.post('/api/admin/support-settings', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const current = getSupportSettings();
  const updated = { ...current, ...req.body };
  saveSupportSettings(updated);
  res.json({ success: true, settings: updated });
});

app.post('/api/support/message', (req, res) => {
  const user = getAuthUser(req);
  const { subject, message, name, email } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'মেসেজ লেখা আবশ্যক (Message required)' });
  }

  const messages = getSupportMessages();
  const newMsg = {
    id: `msg_${Date.now()}`,
    userId: user?.id || 'guest',
    userName: user?.name || name || 'Customer',
    userEmail: user?.email || email || 'No email',
    subject: subject?.trim() || 'General Inquiry',
    message: message.trim(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  messages.unshift(newMsg);
  saveSupportMessages(messages);

  res.json({
    success: true,
    message: 'আপনার মেসেজটি সফলভাবে সাপোর্ট টিমের কাছে পাঠানো হয়েছে! শীঘ্রই যোগাযোগ করা হবে।',
    supportMessage: newMsg
  });
});

app.get('/api/admin/support-messages', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });
  res.json({ messages: getSupportMessages() });
});

app.post('/api/admin/support-messages/:id/reply', (req, res) => {
  const admin = getAuthUser(req);
  if (!isUserAdmin(admin)) return res.status(403).json({ error: 'Admin access required' });

  const { id } = req.params;
  const { reply, status } = req.body;
  const messages = getSupportMessages();
  const idx = messages.findIndex((m) => m.id === id);

  if (idx === -1) return res.status(404).json({ error: 'Message not found' });

  messages[idx].reply = reply || messages[idx].reply;
  messages[idx].status = status || 'replied';
  messages[idx].repliedAt = new Date().toISOString();
  messages[idx].repliedBy = admin?.email || 'admin';

  saveSupportMessages(messages);
  res.json({ success: true, message: messages[idx] });
});

// ==========================================
// WISHLIST API
// ==========================================
app.get('/api/wishlist', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.json({ items: [] });

  const map = getWishlistMap();
  const itemIds = map[user.id] || [];
  const allItems = getStoreItems();
  const wishlistItems = allItems.filter((i) => itemIds.includes(i.id));

  res.json({ itemIds, items: wishlistItems });
});

app.post('/api/wishlist/toggle', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Please login to save wishlist' });

  const { itemId } = req.body;
  if (!itemId) return res.status(400).json({ error: 'Item ID required' });

  const map = getWishlistMap();
  const list = map[user.id] || [];
  const idx = list.indexOf(itemId);

  let inWishlist = false;
  if (idx >= 0) {
    list.splice(idx, 1);
    inWishlist = false;
  } else {
    list.push(itemId);
    inWishlist = true;
  }

  map[user.id] = list;
  saveWishlistMap(map);

  res.json({ success: true, inWishlist, itemIds: list });
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

// 2. Bot management (Strict User Isolation: Each user only sees their own bots)
app.get('/api/bots', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    // Unauthenticated visitors do not see any user's hosted bots
    return res.json({ bots: [] });
  }

  const reg = getRegistry();
  // Admins see all bots, normal users ONLY see bots they own
  const userBots = isUserAdmin(user) ? reg : reg.filter((b) => canUserAccessBot(b, user));

  // enrich with runtime status, accurate uptimeSeconds, and fileCount
  const enriched = userBots.map((b) => {
    const isRunning = runningProcesses.has(b.id);
    const botDir = path.join(HOSTED_BOTS_DIR, b.dirName || b.id);
    let fileCount = 1;
    try {
      if (fs.existsSync(botDir)) {
        fileCount = fs.readdirSync(botDir).filter((f) => !f.startsWith('.')).length;
      }
    } catch {}
    let uptimeSeconds = 0;
    if (isRunning && runningProcesses.get(b.id)?.startTime) {
      uptimeSeconds = Math.floor((Date.now() - runningProcesses.get(b.id)!.startTime) / 1000);
    }
    const deps = getBotDeployments(b.id);
    const latestDep = deps[0];
    return {
      ...b,
      currentVersion: latestDep?.version || 'v1.0.0',
      lastDeployedAt: latestDep?.timestamp || b.createdAt || b.created || new Date().toISOString(),
      deploymentCount: deps.length,
      createdAt: b.createdAt || b.created || new Date().toISOString(),
      ownerName: b.ownerName || b.owner || 'User',
      status: isRunning ? 'running' : b.status || 'stopped',
      pid: isRunning ? runningProcesses.get(b.id)!.process.pid : null,
      fileCount: b.fileCount || fileCount,
      uptimeSeconds: uptimeSeconds > 0 ? uptimeSeconds : (typeof b.uptimeSeconds === 'number' ? b.uptimeSeconds : 0)
    };
  });
  res.json({ bots: enriched });
});

app.post('/api/bots', (req, res) => {
  const { name, entryFile, token, files, zipBase64, autoStart } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Bot name is required' });
  }

  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'বট হোস্ট করতে প্রথমে আপনার অ্যাকাউন্টে লগইন করুন (Please login to deploy bots)' });
  }

  const reg = getRegistry();

  // Enforce Paid Plan Requirement (user must have bought an active plan, admin is exempt)
  if (user.role !== 'admin') {
    const hasActivePlan = Boolean(
      user.plan &&
      user.plan !== 'none' &&
      user.plan !== 'free' &&
      user.plan !== 'expired' &&
      (!user.planExpiresAt || user.planExpiresAt > Date.now())
    );

    if (!hasActivePlan) {
      return res.status(403).json({
        error: 'বট ডিপ্লয় করতে হলে প্রথমে যেকোনো একটি হোস্টিং প্লান (১ মাস, ৩ মাস, ৬ মাস বা ১ বছর) ক্রয় করুন। প্লান সক্রিয় হলেই নতুন বট ডিপ্লয় করতে পারবেন।',
        planRequired: true
      });
    }

    const userBots = reg.filter((b) => b.ownerId === user.id || b.owner === user.id || (b.ownerEmail && b.ownerEmail.toLowerCase() === user.email.toLowerCase()));
    const maxAllowed = user.maxBots || 1;
    if (userBots.length >= maxAllowed) {
      return res.status(403).json({
        error: `আপনার বর্তমান প্লানের সীমা (${maxAllowed}টি বট) পূর্ণ হয়েছে। অতিরিক্ত বট হোস্ট করতে প্লান আপগ্রেড করুন।`,
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

  recordBotDeployment(botId, {
    version: 'v1.0.0',
    trigger: 'initial_deploy',
    description: 'Initial bot project deployment and setup',
    deployedBy: user ? user.name : 'Owner',
    entryFile: resolvedEntry
  });

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
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'এই বট চালু করার অনুমতি আপনার নেই (Access Denied: You do not own this bot)' });
  }

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
      canUserAccessBot(b, user) &&
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
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'এই বট বন্ধ করার অনুমতি আপনার নেই (Access Denied: You do not own this bot)' });
  }

  const stopped = stopBotProcess(id);
  bot.autoRestart = false;
  saveRegistry(reg);
  res.json({ success: stopped });
});

app.post('/api/bots/:id/restart', (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'এই বট রিস্টার্ট করার অনুমতি আপনার নেই (Access Denied: You do not own this bot)' });
  }

  if (user && user.role !== 'admin') {
    if (user.planExpiresAt && user.planExpiresAt < Date.now()) {
      return res.status(403).json({
        error: 'আপনার ফ্রি প্লানটি বন্ধ হয়ে গেছে। একটি প্ল্যান কিনুন, আপনার আগের বট সাথে সাথে লাইভ হয়ে যাবে!',
        planExpired: true
      });
    }
    if (!user.plan || user.plan === 'none' || user.plan === 'expired' || user.plan === 'free') {
      return res.status(403).json({
        error: user.hasClaimedFreeTrial
          ? 'আপনার ফ্রি প্লানটি বন্ধ হয়ে গেছে। একটি প্ল্যান কিনুন, আপনার আগের বট সাথে সাথে লাইভ হয়ে যাবে!'
          : 'বট লাইভ রাখতে ১ মাসের ফ্রি প্ল্যান ক্লেইম করুন অথবা একটি প্যাকেজ কিনুন।',
        planRequired: true
      });
    }
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
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'এই বট ডিলিট করার অনুমতি আপনার নেই (Access Denied: You do not own this bot)' });
  }

  stopBotProcess(id);
  const updatedReg = reg.filter((b) => b.id !== id);
  saveRegistry(updatedReg);

  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  try {
    fs.rmSync(botDir, { recursive: true, force: true });
  } catch {
    // Ignore
  }

  botLogs.delete(id);
  res.json({ success: true });
});

// 3. Bot logs
app.get('/api/bots/:id/logs', (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'লগ দেখার অনুমতি আপনার নেই (Access Denied: Only bot owner can view logs)' });
  }

  const logs = botLogs.get(id) || [];
  res.json({ logs });
});

app.delete('/api/bots/:id/logs', (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'লগ মোছার অনুমতি আপনার নেই (Access Denied: Only bot owner can clear logs)' });
  }

  botLogs.set(id, []);
  try {
    const logFile = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id, 'bot.log');
    if (fs.existsSync(logFile)) {
      fs.writeFileSync(logFile, '', 'utf-8');
    }
  } catch {
    // Ignore
  }
  res.json({ success: true });
});

// 4. File operations (Edit, List, Delete, Upload) - Strictly isolated per bot owner
app.get('/api/bots/:id/files', (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' });
  }

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'বটের ফাইল দেখার অনুমতি আপনার নেই (Access Denied: Only bot owner can view files)' });
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
    try {
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
    } catch {}
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

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'এই ফাইল পড়ার অনুমতি আপনার নেই (Access Denied: Only bot owner can view files)' });
  }

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

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ফাইল পরিবর্তন করার অনুমতি আপনার নেই (Access Denied: Only bot owner can edit files)' });
  }

  const safeFilename = path.basename(filename);
  const filePath = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id, safeFilename);

  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    appendLog(id, 'info', `File '${safeFilename}' updated successfully.`);

    recordBotDeployment(id, {
      trigger: 'code_update',
      description: `Updated script file: ${safeFilename}`,
      deployedBy: user ? user.name : 'Owner',
      entryFile: safeFilename
    });

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

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ফাইল ডিলিট করার অনুমতি আপনার নেই (Access Denied: Only bot owner can delete files)' });
  }

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

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ফাইল আপলোড করার অনুমতি আপনার নেই (Access Denied: Only bot owner can upload files)' });
  }

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

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'জিপ আপলোড করার অনুমতি আপনার নেই (Access Denied: Only bot owner can upload zip)' });
  }

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

// Secure Bot Workspace Zip Download (Strictly only owner or admin can download files)
app.get(['/api/bots/:id/export/zip', '/api/bots/:id/download'], (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ফাইল ডাউনলোড করার অনুমতি আপনার নেই (Access Denied: Only bot owner can download files)' });
  }

  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  if (!fs.existsSync(botDir)) {
    return res.status(404).json({ error: 'Bot directory not found' });
  }

  const tempZipPath = path.join('/tmp', `bot_${bot.id}_${Date.now()}.zip`);
  exec(`cd "${botDir}" && python3 -m zipfile -c "${tempZipPath}" .`, (err) => {
    if (err || !fs.existsSync(tempZipPath)) {
      return res.status(500).json({ error: 'Failed to create zip file' });
    }
    const downloadName = `${(bot.name || 'bot').replace(/[^a-zA-Z0-9_-]/g, '_')}_workspace.zip`;
    res.download(tempZipPath, downloadName, () => {
      try { fs.unlinkSync(tempZipPath); } catch {}
    });
  });
});

// Safe File Update with 100% User Balance & Database Protection
app.post('/api/bots/:id/safe-update', (req, res) => {
  const { id } = req.params;
  const { files, zipBase64, restart = true, preserveDatabases = true, autoConnectDatabase = true } = req.body;

  const reg = getRegistry();
  const bot = reg.find((b) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'বট আপডেট করার অনুমতি আপনার নেই (Access Denied: You do not own this bot)' });
  }

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

  recordBotDeployment(id, {
    trigger: zipBase64 ? 'zip_upload' : 'safe_update',
    description: `Safe update: updated ${updatedFileCount} files (preserved ${preservedDatabases.length} database collections)`,
    deployedBy: user ? user.name : 'Owner',
    filesCount: updatedFileCount
  });

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

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ডাটাবেজ কানেক্ট করার অনুমতি আপনার নেই (Access Denied: Only bot owner can manage databases)' });
  }

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

  const user = getAuthUser(req);
  if (!user || !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ডাটাবেজ স্ট্যাটস দেখার অনুমতি আপনার নেই (Access Denied: Only bot owner can view database stats)' });
  }

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

// Bot Deployment History Routes
app.get('/api/bots/:id/deployments', (req, res) => {
  const { id } = req.params;
  const reg = getRegistry();
  const bot = reg.find((b: any) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (user && !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ডিপ্লয়মেন্ট হিস্ট্রি দেখার অনুমতি আপনার নেই (Access Denied: Only bot owner can view deployments)' });
  }

  const deployments = getBotDeployments(id);
  res.json({
    success: true,
    botId: id,
    botName: bot.name,
    currentVersion: deployments[0]?.version || 'v1.0.0',
    deployments
  });
});

app.post('/api/bots/:id/deployments', (req, res) => {
  const { id } = req.params;
  const { version, description, trigger = 'manual_deploy', restart = true } = req.body;
  const reg = getRegistry();
  const bot = reg.find((b: any) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (user && !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ডিপ্লয় করার অনুমতি আপনার নেই (Access Denied: Only bot owner can trigger deployments)' });
  }

  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  let filesCount = 1;
  try {
    if (fs.existsSync(botDir)) {
      filesCount = fs.readdirSync(botDir).filter((f: string) => !f.startsWith('.')).length;
    }
  } catch {}

  const newDep = recordBotDeployment(id, {
    version: version ? version.trim() : undefined,
    trigger,
    description: description ? description.trim() : 'Manual version deployment',
    status: 'active',
    entryFile: bot.entryFile || 'bot.py',
    deployedBy: user ? (user.name || user.email) : (bot.ownerName || 'Admin'),
    filesCount
  });

  if (restart) {
    stopBotProcess(id);
    setTimeout(() => {
      launchBotProcess(bot);
    }, 600);
  }

  appendLog(id, 'info', `🚀 Deployment ${newDep.version} released: ${newDep.description}`);

  const allDeployments = getBotDeployments(id);
  res.json({
    success: true,
    message: `Version ${newDep.version} deployed successfully`,
    deployment: newDep,
    deployments: allDeployments
  });
});

app.post('/api/bots/:id/deployments/:depId/activate', (req, res) => {
  const { id, depId } = req.params;
  const { restart = true } = req.body;
  const reg = getRegistry();
  const bot = reg.find((b: any) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const user = getAuthUser(req);
  if (user && !canUserAccessBot(bot, user)) {
    return res.status(403).json({ error: 'ডিপ্লয়মেন্ট রোলব্যাক করার অনুমতি আপনার নেই' });
  }

  const deployments = getBotDeployments(id);
  const targetDep = deployments.find((d: any) => d.id === depId);
  if (!targetDep) {
    return res.status(404).json({ error: 'Deployment record not found' });
  }

  const updatedDeployments = deployments.map((d: any) => ({
    ...d,
    status: d.id === depId ? 'active' : 'success'
  }));
  saveBotDeployments(id, updatedDeployments);

  if (restart) {
    stopBotProcess(id);
    setTimeout(() => {
      launchBotProcess(bot);
    }, 600);
  }

  appendLog(id, 'info', `🔄 Deployment version ${targetDep.version} set as active target.`);

  res.json({
    success: true,
    message: `Version ${targetDep.version} is now marked as active`,
    deployments: updatedDeployments
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

// 7. Services & SMS Manager for Bot (Strict User Isolation)
function resolveBotDirectoryForUser(user: any, botIdQuery?: any): { bot: any; botDir: string } | null {
  if (!user) return null;
  const reg = getRegistry();
  const accessibleBots = isUserAdmin(user) ? reg : reg.filter((b) => canUserAccessBot(b, user));
  if (accessibleBots.length === 0) return null;

  let bot = null;
  if (botIdQuery) {
    bot = accessibleBots.find((b) => b.id === botIdQuery || b.dirName === botIdQuery);
  }
  if (!bot && accessibleBots.length > 0) {
    bot = accessibleBots[0];
  }
  if (!bot) return null;
  const botDir = path.join(HOSTED_BOTS_DIR, bot.dirName || bot.id);
  if (!fs.existsSync(botDir)) {
    fs.mkdirSync(botDir, { recursive: true });
  }
  return { bot, botDir };
}

// Global & Per-Bot Services endpoints (Isolated per bot owner)
app.get(['/api/services', '/api/bots/:id/services'], (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized', services: [] });

  const botId = req.params.id || req.query.botId;
  const resolved = resolveBotDirectoryForUser(user, botId);
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
  const user = getAuthUser(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized' });

  const botId = req.params.id || req.query.botId || req.body.botId;
  const resolved = resolveBotDirectoryForUser(user, botId);
  if (!resolved) return res.status(404).json({ error: 'No bot found or access denied' });

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
  const user = getAuthUser(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized' });

  const botId = req.params.id || req.query.botId || req.body.botId;
  const resolved = resolveBotDirectoryForUser(user, botId);
  if (!resolved) return res.status(404).json({ error: 'No bot found or access denied' });

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
  const user = getAuthUser(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized' });

  const botId = req.params.id || req.query.botId || req.body.botId;
  const resolved = resolveBotDirectoryForUser(user, botId);
  if (!resolved) return res.status(404).json({ error: 'No bot found or access denied' });

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

// SMS Gateway Config endpoints (Strictly per user bot)
app.get(['/api/sms-config', '/api/bots/:id/sms-config'], (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized', baseUrl: 'https://minosms.com', apiKey: '', token: '' });

  const botId = req.params.id || req.query.botId;
  const resolved = resolveBotDirectoryForUser(user, botId);
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
  const user = getAuthUser(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized' });

  const botId = req.params.id || req.body.botId;
  const resolved = resolveBotDirectoryForUser(user, botId);
  if (!resolved) return res.status(404).json({ error: 'No bot found or access denied' });

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

// 8. Database & Storage Manager (Per User / Per Bot)
app.get('/api/database/backup', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized' });

  const botId = req.query.botId as string;
  const resolved = resolveBotDirectoryForUser(user, botId);
  if (!resolved) return res.status(404).json({ error: 'No bot found or access denied' });

  const data: Record<string, any> = {
    bot: {
      id: resolved.bot.id,
      name: resolved.bot.name,
      ownerEmail: resolved.bot.ownerEmail
    },
    timestamp: new Date().toISOString()
  };

  const botDir = resolved.botDir;
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

  const safeBotName = (resolved.bot.name || 'bot').replace(/[^a-zA-Z0-9_-]/g, '_');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${safeBotName}-backup.json"`);
  res.send(JSON.stringify(data, null, 2));
});

app.get('/api/database/stats', (req, res) => {
  const user = getAuthUser(req);
  const reg = getRegistry();
  const accessibleBots = user ? (isUserAdmin(user) ? reg : reg.filter((b) => canUserAccessBot(b, user))) : [];

  let totalFiles = 0;
  let totalBytes = 0;

  for (const b of accessibleBots) {
    const botDir = path.join(HOSTED_BOTS_DIR, b.dirName || b.id);
    if (fs.existsSync(botDir)) {
      try {
        const files = fs.readdirSync(botDir);
        totalFiles += files.length;
        for (const f of files) {
          try {
            const s = fs.statSync(path.join(botDir, f));
            totalBytes += s.size;
          } catch {}
        }
      } catch {}
    }
  }

  const runningCount = accessibleBots.filter((b) => runningProcesses.has(b.id)).length;

  res.json({
    totalBots: accessibleBots.length,
    runningBots: runningCount,
    totalFiles,
    totalBytes,
    formattedSize: (totalBytes / (1024 * 1024)).toFixed(2) + ' MB'
  });
});

// 9. Users & Balances API (Strictly scoped to user-owned bots)
app.get('/api/users', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized', users: [] });

  const botId = req.query.botId as string;
  const resolved = resolveBotDirectoryForUser(user, botId);
  if (!resolved) return res.json({ users: [] });

  const usersPath = path.join(resolved.botDir, 'users.json');
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
  const user = getAuthUser(req);
  if (!user) return res.status(403).json({ error: 'Unauthorized' });

  const botId = (req.query.botId as string) || req.body.botId;
  const resolved = resolveBotDirectoryForUser(user, botId);
  if (!resolved) return res.status(403).json({ error: 'No bot found or access denied' });

  const { uid } = req.params;
  const { amount } = req.body;

  const usersPath = path.join(resolved.botDir, 'users.json');
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

// Background Watchdog: automatically checks for expired plans, halts excess bots, resets limits, and sends near-expiry email alerts
setInterval(async () => {
  try {
    const accounts = getAccounts();
    const reg = getRegistry();

    const result = await checkAndSendExpiringPlanAlerts(accounts, (expiredAccount) => {
      if (expiredAccount.role === 'admin') return;

      const userBots = reg.filter((b) =>
        b.ownerId === expiredAccount.id ||
        b.owner === expiredAccount.id ||
        (b.ownerEmail && b.ownerEmail.toLowerCase() === expiredAccount.email.toLowerCase())
      );
      let regUpdated = false;
      for (const bot of userBots) {
        if (runningProcesses.has(bot.id) || bot.status === 'running' || bot.autoRestart) {
          console.log(`[EXPIRED PLAN] Halting live bot "${bot.name || bot.id}" for user ${expiredAccount.email}`);
          stopBotProcess(bot.id);
          bot.autoRestart = false;
          bot.status = 'stopped';
          bot.pid = null;
          appendLog(bot.id, 'warn', '⚠️ [প্ল্যান বন্ধ] আপনার ফ্রি প্লানটি বন্ধ হয়ে গেছে। একটি প্ল্যান কিনুন, আপনার আগের বট সাথে সাথে লাইভ হয়ে যাবে!');
          regUpdated = true;
        }
      }
      if (regUpdated) {
        saveRegistry(reg);
      }
    });

    if (result.modified) {
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
  const publicPath = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }

  const isProd = process.env.NODE_ENV === 'production' || process.argv[1]?.includes('dist') || !fs.existsSync(path.join(process.cwd(), 'src', 'main.tsx'));
  if (!isProd) {
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
