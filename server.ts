import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn, exec, execSync } from 'child_process';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

const HOSTED_BOTS_DIR = path.join(process.cwd(), 'hosted_bots');
const REGISTRY_FILE = path.join(HOSTED_BOTS_DIR, 'registry.json');
const ACCOUNTS_FILE = path.join(HOSTED_BOTS_DIR, 'accounts.json');
const SESSIONS_FILE = path.join(HOSTED_BOTS_DIR, 'sessions.json');

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
    if (user) return user;
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
          user = {
            id: payload.userId,
            name: payload.name || (payload.email ? payload.email.split('@')[0] : 'User'),
            email: payload.email || 'user@bot-host.local',
            role: payload.role || (accounts.length === 0 ? 'admin' : 'user')
          };
          accounts.push(user);
          saveAccounts(accounts);
        }
        sessions[token] = user.id;
        saveSessions(sessions);
        return user;
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
    owner: 'user',
    autoRestart: autoStart !== false,
    lastPing: new Date().toISOString()
  };

  const reg = getRegistry();
  reg.push(newBot);
  saveRegistry(reg);

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
