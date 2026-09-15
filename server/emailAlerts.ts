import 'dotenv/config';
import nodemailer, { type Transporter } from 'nodemailer';
import fs from 'fs';
import path from 'path';
import dns from 'dns';
import net from 'net';

// Force Node.js to prefer IPv4 first globally to prevent ENETUNREACH on cloud containers (e.g. Render) without IPv6 routes
if (typeof (dns as any).setDefaultResultOrder === 'function') {
  try {
    (dns as any).setDefaultResultOrder('ipv4first');
  } catch (e) {
    // Ignore if not supported
  }
}

const NOTIFICATIONS_FILE = path.join(process.cwd(), 'hosted_bots', 'notifications.json');
const SMTP_SETTINGS_FILE = path.join(process.cwd(), 'hosted_bots', 'smtp_settings.json');

export interface EmailAlertOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type: 'deposit_approved' | 'deposit_rejected' | 'plan_expiring' | 'plan_expired' | 'plan_purchased' | 'system';
  userId?: string;
}

export interface SmtpConfigInfo {
  configured: boolean;
  host: string;
  port: number;
  user: string;
  from: string;
  secure: boolean;
  source?: 'file' | 'env' | 'none';
}

export interface SmtpSettingsData {
  host: string;
  port: number;
  user: string;
  pass: string;
  from?: string;
  secure?: boolean;
}

export function loadSmtpSettingsFile(): SmtpSettingsData | null {
  try {
    if (fs.existsSync(SMTP_SETTINGS_FILE)) {
      const content = fs.readFileSync(SMTP_SETTINGS_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (data && (data.host || data.user)) {
        return data;
      }
    }
  } catch (err) {
    console.error('Error reading smtp_settings.json:', err);
  }
  return null;
}

export function saveSmtpSettingsFile(data: Partial<SmtpSettingsData>): boolean {
  try {
    const dir = path.dirname(SMTP_SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const existing = loadSmtpSettingsFile() || {
      host: 'smtp.gmail.com',
      port: 465,
      user: '',
      pass: '',
      from: '',
      secure: true
    };
    const merged = { ...existing, ...data };
    if (merged.pass) {
      // Strip all whitespace from App Passwords
      merged.pass = merged.pass.replace(/\s+/g, '');
    }
    fs.writeFileSync(SMTP_SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    // Invalidate cached transporter
    cachedTransporter = null;
    lastTransporterConfigKey = '';
    return true;
  } catch (err) {
    console.error('Error saving smtp_settings.json:', err);
    return false;
  }
}

// In-memory or file-based notifications store for users
export function getStoredNotifications(): any[] {
  try {
    if (!fs.existsSync(NOTIFICATIONS_FILE)) {
      fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    return JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export function saveStoredNotifications(list: any[]) {
  try {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save notifications:', err);
  }
}

export function getUserNotifications(userId: string, userEmail?: string): any[] {
  const all = getStoredNotifications();
  const lowerEmail = (userEmail || '').toLowerCase();
  return all.filter((n) => {
    if (n.userId === 'all' || n.target === 'all' || n.type === 'broadcast') return true;
    if (userId && n.userId === userId) return true;
    if (lowerEmail && n.userEmail && n.userEmail.toLowerCase() === lowerEmail) return true;
    if (lowerEmail && n.userId && n.userId.toLowerCase() === lowerEmail) return true;
    return false;
  });
}

export function markNotificationAsRead(notifId: string, userId?: string): boolean {
  try {
    const list = getStoredNotifications();
    if (notifId === 'all') {
      list.forEach((n) => {
        if (!userId || n.userId === userId || n.userEmail === userId || n.userId === 'all') {
          n.read = true;
        }
      });
    } else {
      const target = list.find((n) => n.id === notifId);
      if (target) target.read = true;
    }
    saveStoredNotifications(list);
    return true;
  } catch {
    return false;
  }
}

export function addBroadcastNotification(title: string, message: string, type = 'broadcast'): any {
  const list = getStoredNotifications();
  const newNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: 'all',
    target: 'all',
    type,
    title,
    message,
    createdAt: new Date().toISOString(),
    read: false
  };
  list.unshift(newNotification);
  if (list.length > 500) list.splice(500);
  saveStoredNotifications(list);
  return newNotification;
}

// Get SMTP Configuration Details (checks smtp_settings.json first, falls back to process.env)
export function getSmtpConfig(): SmtpConfigInfo {
  const fileConfig = loadSmtpSettingsFile();

  const host = (fileConfig?.host || process.env.SMTP_HOST || '').trim();
  const rawPort = fileConfig?.port !== undefined ? fileConfig.port : process.env.SMTP_PORT;
  const port = parseInt(String(rawPort || '465').trim(), 10);
  const user = (fileConfig?.user || process.env.SMTP_USER || '').trim();
  const pass = (fileConfig?.pass || process.env.SMTP_PASS || '').trim();
  const from = (fileConfig?.from || process.env.SMTP_FROM || user || 'noreply@hosting-live-fast.cloud').trim();
  
  const secure = fileConfig?.secure !== undefined
    ? Boolean(fileConfig.secure)
    : (process.env.SMTP_SECURE === 'true' || (process.env.SMTP_SECURE !== 'false' && port === 465));

  const configured = Boolean(host && user && pass);
  const source: 'file' | 'env' | 'none' = (fileConfig && fileConfig.user && fileConfig.pass)
    ? 'file'
    : (process.env.SMTP_USER && process.env.SMTP_PASS ? 'env' : 'none');

  // Mask user email for privacy
  const maskedUser = user.includes('@')
    ? user.replace(/^(.)(.*)(@.*)$/, (_, first, middle, last) => `${first}***${last}`)
    : user ? `${user.substring(0, 3)}***` : 'Not Configured';

  return {
    configured,
    host: host || 'None',
    port: isNaN(port) ? 465 : port,
    user: maskedUser,
    from,
    secure,
    source
  };
}

let cachedTransporter: Transporter | null = null;
let lastTransporterConfigKey = '';

export interface ResolvedHostInfo {
  ip: string;
  originalHost: string;
  allIps: string[];
}

let cachedResolvedHost: { key: string; info: ResolvedHostInfo; expires: number } | null = null;

/**
 * Resolve hostname strictly to IPv4 address to prevent ENETUNREACH errors on cloud platforms (e.g. Render)
 * that lack IPv6 outbound routing.
 */
export async function resolveIpv4Host(hostname: string, forceFresh = false): Promise<ResolvedHostInfo> {
  const cleanHost = (hostname || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/[:/].*$/, '');

  if (!cleanHost) {
    return { ip: '74.125.203.108', originalHost: 'smtp.gmail.com', allIps: ['74.125.203.108'] };
  }

  // If already an IPv4 address, return directly
  if (net.isIPv4(cleanHost)) {
    return { ip: cleanHost, originalHost: cleanHost, allIps: [cleanHost] };
  }

  const isGmail = cleanHost.toLowerCase().includes('gmail') || cleanHost.toLowerCase().includes('google');
  const targetHost = isGmail ? 'smtp.gmail.com' : cleanHost;

  const now = Date.now();
  if (!forceFresh && cachedResolvedHost && cachedResolvedHost.key === targetHost && cachedResolvedHost.expires > now) {
    return cachedResolvedHost.info;
  }

  let resolvedIps: string[] = [];

  try {
    const addresses = await dns.promises.resolve4(targetHost);
    if (addresses && addresses.length > 0) {
      resolvedIps = addresses.filter(addr => net.isIPv4(addr));
    }
  } catch (err: any) {
    console.warn(`[SMTP DNS] resolve4 failed for ${targetHost}:`, err?.message);
  }

  if (resolvedIps.length === 0) {
    try {
      const lookup = await dns.promises.lookup(targetHost, { family: 4, all: true });
      if (Array.isArray(lookup) && lookup.length > 0) {
        resolvedIps = lookup.map(l => l.address).filter(addr => net.isIPv4(addr));
      }
    } catch (err: any) {
      console.warn(`[SMTP DNS] dns.lookup failed for ${targetHost}:`, err?.message);
    }
  }

  // Known fallback IPv4s for smtp.gmail.com if DNS is completely blocked/down
  if (resolvedIps.length === 0 && isGmail) {
    resolvedIps = ['74.125.203.108', '142.251.10.108', '142.250.180.108'];
  }

  const selectedIp = resolvedIps.length > 0 ? resolvedIps[0] : targetHost;
  const result: ResolvedHostInfo = {
    ip: selectedIp,
    originalHost: targetHost,
    allIps: resolvedIps.length > 0 ? resolvedIps : [selectedIp]
  };

  if (resolvedIps.length > 0) {
    cachedResolvedHost = {
      key: targetHost,
      info: result,
      expires: now + 10 * 60 * 1000 // Cache for 10 minutes
    };
  }

  return result;
}

/**
 * Build a transporter pointing directly to an IPv4 address with explicit SNI servername
 */
export function buildTransportOptions(options: {
  hostOrIp: string;
  originalHost: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}): any {
  const { hostOrIp, originalHost, port, secure, user, pass } = options;

  return {
    host: hostOrIp,
    port,
    secure,
    family: 4, // Enforce IPv4 socket
    auth: { user, pass },
    // Critical: When connecting directly to an IP, provide servername for TLS handshake and certificate check
    tls: {
      servername: originalHost,
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    servername: originalHost,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  } as any;
}

// Create or retrieve cached Nodemailer transporter asynchronously with IPv4 resolution
export async function getTransporterAsync(forceFresh = false): Promise<Transporter | null> {
  const fileConfig = loadSmtpSettingsFile();
  const host = (fileConfig?.host || process.env.SMTP_HOST || '').trim();
  const rawPort = fileConfig?.port !== undefined ? fileConfig.port : process.env.SMTP_PORT;
  const port = parseInt(String(rawPort || '465').trim(), 10);
  const user = (fileConfig?.user || process.env.SMTP_USER || '').trim();
  const rawPass = (fileConfig?.pass || process.env.SMTP_PASS || '').trim();
  const pass = rawPass.replace(/\s+/g, '');

  const secure = fileConfig?.secure !== undefined
    ? Boolean(fileConfig.secure)
    : (process.env.SMTP_SECURE === 'true' || (process.env.SMTP_SECURE !== 'false' && port === 465));

  if (!host || !user || !pass) {
    return null;
  }

  const resolved = await resolveIpv4Host(host, forceFresh);
  const currentKey = `${resolved.ip}:${port}:${user}:${pass.slice(0, 4)}:${secure}`;

  if (!forceFresh && cachedTransporter && lastTransporterConfigKey === currentKey) {
    return cachedTransporter;
  }

  try {
    const opts = buildTransportOptions({
      hostOrIp: resolved.ip,
      originalHost: resolved.originalHost,
      port,
      secure: secure !== undefined ? secure : (port === 465),
      user,
      pass
    });

    cachedTransporter = nodemailer.createTransport(opts);
    lastTransporterConfigKey = currentKey;
    return cachedTransporter;
  } catch (err) {
    console.error('[SMTP TRANSPORTER INITIALIZATION ERROR]:', err);
    return null;
  }
}

// Synchronous transporter getter for legacy calls (uses cached IPv4 if available)
export function getTransporter(): Transporter | null {
  const fileConfig = loadSmtpSettingsFile();
  const host = (fileConfig?.host || process.env.SMTP_HOST || '').trim();
  const rawPort = fileConfig?.port !== undefined ? fileConfig.port : process.env.SMTP_PORT;
  const port = parseInt(String(rawPort || '465').trim(), 10);
  const user = (fileConfig?.user || process.env.SMTP_USER || '').trim();
  const rawPass = (fileConfig?.pass || process.env.SMTP_PASS || '').trim();
  const pass = rawPass.replace(/\s+/g, '');

  const secure = fileConfig?.secure !== undefined
    ? Boolean(fileConfig.secure)
    : (process.env.SMTP_SECURE === 'true' || (process.env.SMTP_SECURE !== 'false' && port === 465));

  if (!host || !user || !pass) {
    return null;
  }

  const isGmail = host.toLowerCase().includes('gmail.com') || host.toLowerCase() === 'gmail';
  const effectiveHost = isGmail ? 'smtp.gmail.com' : host;
  const ipOrHost = (cachedResolvedHost && cachedResolvedHost.key === effectiveHost) 
    ? cachedResolvedHost.info.ip 
    : (isGmail ? '74.125.203.108' : effectiveHost);

  const currentKey = `${ipOrHost}:${port}:${user}:${pass.slice(0, 4)}:${secure}`;
  if (cachedTransporter && lastTransporterConfigKey === currentKey) {
    return cachedTransporter;
  }

  try {
    const transportOptions = buildTransportOptions({
      hostOrIp: ipOrHost,
      originalHost: effectiveHost,
      port,
      secure: secure !== undefined ? secure : (port === 465),
      user,
      pass
    });

    cachedTransporter = nodemailer.createTransport(transportOptions);
    lastTransporterConfigKey = currentKey;
    return cachedTransporter;
  } catch (err) {
    console.error('[SMTP TRANSPORTER INITIALIZATION ERROR]:', err);
    return null;
  }
}

export type SmtpErrorCategory = 
  | 'Invalid SMTP credentials' 
  | 'Connection timeout' 
  | 'Port blocked' 
  | 'Network unreachable' 
  | 'Host not found' 
  | 'SSL/TLS Error'
  | 'Unknown error';

export interface SmtpDiagnosticResult {
  category: SmtpErrorCategory;
  userMessage: string;
  solutionHint: string;
  technicalMessage: string;
}

/**
 * Categorize and explain SMTP error with clear, user-friendly messages
 */
export function diagnoseSmtpError(err: any, port?: number): SmtpDiagnosticResult {
  const msg = err?.message || String(err || '');
  const code = (err?.code || '').toUpperCase();
  const command = (err?.command || '').toUpperCase();

  // 1. Invalid credentials / authentication failure
  if (
    msg.includes('535') ||
    msg.includes('BadCredentials') ||
    msg.includes('Username and Password not accepted') ||
    msg.includes('Invalid login') ||
    msg.includes('authentication failed') ||
    code === 'EAUTH' ||
    command.includes('AUTH')
  ) {
    return {
      category: 'Invalid SMTP credentials',
      userMessage: 'Invalid SMTP credentials (ভুল ইমেইল অথবা পাসওয়ার্ড): ইউজারনেম অথবা গুগল অ্যাপ পাসওয়ার্ড সঠিক নয়।',
      solutionHint: 'আপনি যদি জিমেইলের সাধারণ পাসওয়ার্ড দিয়ে থাকেন তবে কাজ করবে না। আপনার গুগল একাউন্টের 2-Step Verification অন করে একটি ১৬ অক্ষরের Google App Password তৈরি করে পাসওয়ার্ড বক্সে বসান।',
      technicalMessage: msg
    };
  }

  // 2. Connection timeout
  if (
    code === 'ETIMEDOUT' ||
    code === 'ESOCKETTIMEDOUT' ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('ESOCKETTIMEDOUT') ||
    msg.toLowerCase().includes('timeout')
  ) {
    return {
      category: 'Connection timeout',
      userMessage: `Connection timeout (কানেকশন টাইমআউট): পোর্ট ${port || '465/587'}-এ সার্ভারের সাথে নির্দিষ্ট সময়ে সংযোগ স্থাপন করা যায়নি।`,
      solutionHint: `ক্লাউড হোস্টিংয়ে হয়তো পোর্ট ${port || 465} ট্রাফিক ব্লক রয়েছে। উপরে 'Gmail 587 (TLS)' বা 'Gmail 465 (SSL)' পরিবর্তন করে চেষ্টা করুন।`,
      technicalMessage: msg
    };
  }

  // 3. Port blocked / Connection refused
  if (
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ECONNRESET')
  ) {
    return {
      category: 'Port blocked',
      userMessage: `Port blocked (পোর্ট সংযোগ প্রত্যাখ্যাত): সার্ভার পোর্ট ${port || '465/587'}-এ সংযোগ গ্রহণ করছে না।`,
      solutionHint: 'হোস্টিং ফায়ারওয়াল এই আউটবাউন্ড পোর্ট ব্লক করেছে। বিকল্প পোর্ট (যেমন 587 বা 465) নির্বাচন করে ট্রাই করুন।',
      technicalMessage: msg
    };
  }

  // 4. Network unreachable (e.g. IPv6 unrouted on container)
  if (
    code === 'ENETUNREACH' ||
    code === 'EHOSTUNREACH' ||
    msg.includes('ENETUNREACH') ||
    msg.includes('EHOSTUNREACH')
  ) {
    return {
      category: 'Network unreachable',
      userMessage: 'Network unreachable (নেটওয়ার্ক রুট অনুপলব্ধ): ক্লাউড হোস্টে IPv6 রুট উপলব্ধ নেই।',
      solutionHint: 'সিস্টেমে IPv4 এনফোর্সমেন্ট যুক্ত করা হয়েছে। পুনরায় সেভ ও টেস্ট সংযোগ বাটনে ক্লিক করুন।',
      technicalMessage: msg
    };
  }

  // 5. Host not found / DNS failure
  if (code === 'ENOTFOUND' || msg.includes('ENOTFOUND')) {
    return {
      category: 'Host not found',
      userMessage: 'Host not found (SMTP সার্ভার পাওয়া যায়নি): ডোমেইন নাম বা সার্ভার এড্রেস সঠিক নয়।',
      solutionHint: 'জিমেইল হলে SMTP Host বক্সে শুধুমাত্র smtp.gmail.com লিখুন।',
      technicalMessage: msg
    };
  }

  // 6. TLS / SSL handshake failure
  if (msg.toLowerCase().includes('certificate') || msg.toLowerCase().includes('handshake') || msg.toLowerCase().includes('tls')) {
    return {
      category: 'SSL/TLS Error',
      userMessage: 'SSL/TLS Error (এনক্রিপশন ত্রুটি): সিকিউর হ্যান্ডশেক করতে সমস্যা হয়েছে।',
      solutionHint: 'পোর্ট 465 হলে SSL টিক দিয়ে রাখুন, অথবা পোর্ট 587 নির্বাচন করে SSL টিক তুলে TLS ব্যবহার করুন।',
      technicalMessage: msg
    };
  }

  return {
    category: 'Unknown error',
    userMessage: `SMTP সংযোগ ব্যর্থ: ${msg}`,
    solutionHint: 'আপনার হোস্ট, পোর্ট, ইউজার এবং গুগল অ্যাপ পাসওয়ার্ড পুনরায় ভালো করে যাচাই করে চেষ্টা করুন।',
    technicalMessage: msg
  };
}

// Diagnose SMTP error message for friendly explanation
export function explainSmtpError(err: any): string {
  const diagnosed = diagnoseSmtpError(err);
  return `${diagnosed.category} - ${diagnosed.userMessage} (${diagnosed.solutionHint})`;
}

// Verify SMTP connection
export async function verifySmtpConnection(): Promise<{
  success: boolean;
  message: string;
  workingPort?: number;
  workingSecure?: boolean;
  workingIp?: string;
  errorCategory?: SmtpErrorCategory;
  solutionHint?: string;
  details?: string;
}> {
  const config = getSmtpConfig();
  if (!config.configured) {
    return {
      success: false,
      errorCategory: 'Invalid SMTP credentials',
      message: 'SMTP কনফিগার করা নেই। অনুগ্রহ করে এডমিন প্যানেল থেকে SMTP Host, ইমেইল এবং App Password সেভ করুন।',
      solutionHint: 'নিচের ফর্মে প্রয়োজনীয় তথ্য পূরণ করে সেভ করুন।'
    };
  }

  const fileConfig = loadSmtpSettingsFile();
  const rawPass = (fileConfig?.pass || process.env.SMTP_PASS || '').trim();
  const user = (fileConfig?.user || process.env.SMTP_USER || '').trim();
  const host = (fileConfig?.host || process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = parseInt(String(fileConfig?.port || process.env.SMTP_PORT || 465), 10);
  const secure = fileConfig?.secure !== undefined ? Boolean(fileConfig.secure) : (port === 465);

  const testResult = await testSmtpWithParams({
    host,
    port,
    user,
    pass: rawPass,
    secure
  });

  // If alternate port was required for connection, persist working settings
  if (testResult.success && testResult.workingPort && (testResult.workingPort !== port || testResult.workingSecure !== secure)) {
    console.log(`[SMTP AUTO-UPDATE] Persisting verified working port ${testResult.workingPort} (secure: ${testResult.workingSecure}) to smtp_settings.json`);
    saveSmtpSettingsFile({
      port: testResult.workingPort,
      secure: testResult.workingSecure
    });
  }

  return testResult;
}

/**
 * Test SMTP connection with specific parameters and automatically handle IPv4 fallback
 */
export async function testSmtpWithParams(options: {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure?: boolean;
}): Promise<{
  success: boolean;
  message: string;
  workingPort?: number;
  workingSecure?: boolean;
  workingIp?: string;
  errorCategory?: SmtpErrorCategory;
  solutionHint?: string;
  details?: string;
}> {
  const cleanHost = (options.host || '').trim();
  const cleanUser = (options.user || '').trim();
  const cleanPass = (options.pass || '').trim().replace(/\s+/g, '');
  const reqPort = options.port || 465;
  const reqSecure = options.secure !== undefined ? Boolean(options.secure) : (reqPort === 465);

  if (!cleanHost || !cleanUser || !cleanPass) {
    return {
      success: false,
      errorCategory: 'Invalid SMTP credentials',
      message: 'হোস্ট, ইউজার ইমেইল এবং অ্যাপ পাসওয়ার্ড দেওয়া আবশ্যক।',
      solutionHint: 'সকল ঘর সঠিকভাবে পূরণ করে চেষ্টা করুন।'
    };
  }

  // Strictly resolve target to IPv4
  const resolved = await resolveIpv4Host(cleanHost, true);
  const ipsToTry = resolved.allIps.length > 0 ? resolved.allIps : [resolved.ip];
  const isGmail = cleanHost.toLowerCase().includes('gmail') || cleanHost.toLowerCase().includes('google');

  // Define candidate ports to test (requested port first, then alternate standard port)
  const candidatePorts: Array<{ port: number; secure: boolean }> = [
    { port: reqPort, secure: reqSecure }
  ];

  if (isGmail || reqPort === 465 || reqPort === 587) {
    const alternatePort = reqPort === 465 ? 587 : 465;
    candidatePorts.push({ port: alternatePort, secure: alternatePort === 465 });
  }

  let lastError: any = null;
  let lastDiagnostic: SmtpDiagnosticResult | null = null;

  for (const portConfig of candidatePorts) {
    for (const ip of ipsToTry) {
      try {
        console.log(`[SMTP TEST] Testing ${resolved.originalHost} via IPv4 ${ip}:${portConfig.port} (secure: ${portConfig.secure})...`);
        const testTransport = nodemailer.createTransport(buildTransportOptions({
          hostOrIp: ip,
          originalHost: resolved.originalHost,
          port: portConfig.port,
          secure: portConfig.secure,
          user: cleanUser,
          pass: cleanPass
        }));

        await testTransport.verify();

        console.log(`[SMTP TEST SUCCESS] Connected to ${resolved.originalHost} via ${ip}:${portConfig.port}!`);
        cachedTransporter = testTransport;
        lastTransporterConfigKey = `${ip}:${portConfig.port}:${cleanUser}:${cleanPass.slice(0, 4)}:${portConfig.secure}`;

        const isAlternate = portConfig.port !== reqPort;
        const msg = isAlternate
          ? `✅ পোর্ট ${reqPort} ব্লকিং অতিক্রম করে ক্লাউড অপ্টিমাইজড পোর্ট ${portConfig.port} (IPv4: ${ip}) দিয়ে সফলভাবে সংযোগ সম্পন্ন হয়েছে!`
          : `✅ SMTP সংযোগ সফল হয়েছে (${resolved.originalHost}:${portConfig.port} | IPv4: ${ip})! ইমেইল পাঠানোর জন্য সম্পূর্ণ প্রস্তুত।`;

        return {
          success: true,
          message: msg,
          workingPort: portConfig.port,
          workingSecure: portConfig.secure,
          workingIp: ip
        };
      } catch (err: any) {
        lastError = err;
        const diag = diagnoseSmtpError(err, portConfig.port);
        lastDiagnostic = diag;
        console.warn(`[SMTP TEST FAILED on ${ip}:${portConfig.port}]:`, err?.message);

        // If it's an authentication error (535 / Invalid credentials), the TCP/TLS network connection
        // to Google ALREADY succeeded! There's no point testing other ports; the issue is just the App Password.
        if (diag.category === 'Invalid SMTP credentials') {
          return {
            success: false,
            errorCategory: diag.category,
            message: `গুগল সার্ভারে সফল সংযোগ হয়েছে, কিন্তু অ্যাপ পাসওয়ার্ড সঠিক নয় (Invalid Credentials / 535)।`,
            solutionHint: diag.solutionHint,
            details: diag.technicalMessage,
            workingPort: portConfig.port,
            workingSecure: portConfig.secure,
            workingIp: ip
          };
        }
      }
    }
  }

  const finalDiag = lastDiagnostic || diagnoseSmtpError(lastError, reqPort);
  return {
    success: false,
    errorCategory: finalDiag.category,
    message: finalDiag.userMessage,
    solutionHint: finalDiag.solutionHint,
    details: finalDiag.technicalMessage
  };
}

/**
 * Main helper function to send email alerts to users.
 * Delivers via SMTP if configured, and always stores an in-app persistent notification alert.
 */
export async function sendEmailAlert(options: EmailAlertOptions): Promise<{ success: boolean; simulated?: boolean; messageId?: string; error?: string }> {
  const { to, subject, html, text, type, userId } = options;

  // 1. Always store in persistent notification system
  try {
    const list = getStoredNotifications();
    const newNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: userId || to,
      userEmail: to,
      type,
      title: subject,
      message: text || html.replace(/<[^>]+>/g, ' ').slice(0, 300),
      createdAt: new Date().toISOString(),
      read: false
    };
    list.unshift(newNotification);
    if (list.length > 500) list.splice(500);
    saveStoredNotifications(list);
  } catch (e) {
    console.error('Notification storage error:', e);
  }

  // 2. Attempt real SMTP sending if configured
  const fileConfig = loadSmtpSettingsFile();
  const config = getSmtpConfig();
  const transporter = (await getTransporterAsync()) || getTransporter();
  const rawFrom = (fileConfig?.from || process.env.SMTP_FROM || fileConfig?.user || process.env.SMTP_USER || 'no-reply@hosting-live-fast.cloud').trim();
  const fromFormatted = rawFrom.includes('<') ? rawFrom : `"hosting-Live Fast" <${rawFrom}>`;

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromFormatted,
        to,
        subject,
        text: text || html.replace(/<[^>]+>/g, ' '),
        html
      });
      console.log(`[EMAIL ALERT SENT] To: ${to} | Subject: "${subject}" | MsgId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      const errorDetail = explainSmtpError(err);
      console.error(`[EMAIL ALERT FAILED] Could not send to ${to}:`, errorDetail);
      return { success: false, error: errorDetail };
    }
  } else {
    // Graceful notification for development or when SMTP is not yet configured
    console.log(`[EMAIL ALERT SIMULATION] SMTP not configured. Stored in in-app notifications. (To send real email, configure SMTP in Admin Panel or .env)`);
    console.log(`[EMAIL ALERT TO: ${to}] Type: ${type} | Subject: "${subject}"`);
    return { success: true, simulated: true };
  }
}

/**
 * Send Live Test Email to verify SMTP settings
 */
export async function sendTestEmail(toEmail: string): Promise<{
  success: boolean;
  message: string;
  messageId?: string;
  error?: string;
  errorCategory?: SmtpErrorCategory;
  solutionHint?: string;
}> {
  const config = getSmtpConfig();
  if (!config.configured) {
    return {
      success: false,
      errorCategory: 'Invalid SMTP credentials',
      message: 'SMTP কনফিগার করা হয়নি! অনুগ্রহ করে এডমিন প্যানেলে আপনার SMTP Host (যেমন smtp.gmail.com), ইমেইল এবং Google App Password দিন।',
      solutionHint: 'নিচের ফর্মে প্রয়োজনীয় তথ্য পূরণ করে সেভ করুন।',
      error: 'SMTP Not Configured'
    };
  }

  const transporter = (await getTransporterAsync()) || getTransporter();
  if (!transporter) {
    return {
      success: false,
      errorCategory: 'Unknown error',
      message: 'SMTP ট্রান্সপোর্টার তৈরি করা যায়নি। সেটিংস পুনরায় চেক করুন।',
      solutionHint: 'হোস্ট এবং ইউজার তথ্য সঠিক কিনা দেখে নিন।',
      error: 'Transporter creation failed'
    };
  }

  const subject = `🔔 hosting-Live Fast | টেস্ট নোটিফিকেশন (SMTP Test Email)`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070b14; color: #f8fafc; padding: 28px; border-radius: 16px; border: 1px solid #162035;">
      <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #1e293b;">
        <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background: rgba(0, 210, 147, 0.15); border: 1px solid #00d293; border-radius: 12px; font-size: 22px; margin-bottom: 8px;">🚀</div>
        <h1 style="color: #00d293; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">hosting-Live Fast</h1>
        <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">24/7 Cloud Telegram Bot & Website Hosting Platform</p>
      </div>

      <div style="background: rgba(0, 210, 147, 0.1); border: 1px solid #00d293; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
        <h2 style="color: #00d293; margin: 0 0 8px 0; font-size: 17px; font-weight: 700;">
          🎉 আপনার SMTP ইমেইল সার্ভিস সফলভাবে কনফিগার হয়েছে!
        </h2>
        <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; margin: 0;">
          এটি একটি টেস্ট ইমেইল। আপনার কনফিগার করা SMTP হোস্ট (<strong>${config.host}</strong>) এবং পোর্ট (<strong>${config.port}</strong>) ব্যবহার করে এই বার্তাটি সফলভাবে পৌঁছানো হয়েছে।
        </p>
      </div>

      <div style="background: #0d1527; border: 1px solid #1e2d48; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
        <h3 style="color: #38bdf8; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">সক্রিয় এলার্ট সুবিধাসমূহ:</h3>
        <ul style="color: #94a3b8; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li><strong style="color: #f1f5f9;">ডিপোজিট অ্যাপ্রুভাল এলার্ট:</strong> ইউজারদের বাইনান্স (USDT) ডিপোজিট অনুমোদিত হলে স্বয়ংক্রিয় বিস্তারিত ইমেইল পৌঁছে যাবে।</li>
          <li><strong style="color: #f1f5f9;">হোস্টিং প্ল্যান মেয়াদ সতর্কবার্তা:</strong> প্ল্যানের মেয়াদ শেষ হওয়ার ৩ দিন পূর্বে ও শেষ দিনে ইউজারদের ইমেইল ও ইন-অ্যাপ সতর্কবার্তা পাঠানো হবে।</li>
        </ul>
      </div>

      <div style="border-top: 1px solid #1e293b; padding-top: 18px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.5;">
        © 2026 <strong>hosting-Live Fast</strong>. All rights reserved.<br>
        স্বয়ংক্রিয় সিস্টেম থেকে প্রেরিত বার্তা।
      </div>
    </div>
  `;

  try {
    const fileConfig = loadSmtpSettingsFile();
    const rawFrom = (fileConfig?.from || process.env.SMTP_FROM || fileConfig?.user || process.env.SMTP_USER || 'no-reply@hosting-live-fast.cloud').trim();
    const fromFormatted = rawFrom.includes('<') ? rawFrom : `"hosting-Live Fast" <${rawFrom}>`;

    const info = await transporter.sendMail({
      from: fromFormatted,
      to: toEmail,
      subject,
      text: `hosting-Live Fast SMTP Test Email: Your email notification service is working successfully via ${config.host}:${config.port}!`,
      html
    });

    console.log(`[TEST EMAIL SENT] To: ${toEmail} | MsgId: ${info.messageId}`);
    return {
      success: true,
      message: `টেস্ট ইমেইল সফলভাবে '${toEmail}' এ পাঠানো হয়েছে! (Message ID: ${info.messageId})`,
      messageId: info.messageId
    };
  } catch (err: any) {
    const diagnostic = diagnoseSmtpError(err, config.port);
    console.error(`[TEST EMAIL FAILED] Could not send to ${toEmail}:`, err);
    return {
      success: false,
      errorCategory: diagnostic.category,
      message: diagnostic.userMessage,
      solutionHint: diagnostic.solutionHint,
      error: diagnostic.technicalMessage
    };
  }
}

/**
 * Email Alert: Deposit Processed (Approved / Rejected)
 */
export async function sendDepositProcessedAlert(
  user: { id: string; email: string; name: string },
  deposit: { amount: number; currency: string; method: string; transactionId: string; senderIdentifier?: string; senderNumber?: string; planName?: string; rejectReason?: string },
  status: 'approved' | 'rejected'
) {
  const isApproved = status === 'approved';
  const currencySymbol = deposit.currency === 'BDT' ? '৳' : '$';
  const senderId = deposit.senderIdentifier || deposit.senderNumber || 'N/A';
  const isDirectPlan = Boolean(deposit.planName && !deposit.planName.includes('ওয়ালেট ডিপোজিট'));

  const subject = isApproved
    ? `✅ আপনার ডিপোজিট সফলভাবে অনুমোদিত হয়েছে (${currencySymbol}${deposit.amount} ${deposit.currency}) - hosting-Live Fast`
    : `❌ আপনার ডিপোজিট রিকোয়েস্ট বাতিল করা হয়েছে - hosting-Live Fast`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070b14; color: #f8fafc; padding: 28px; border-radius: 16px; border: 1px solid #162035;">
      
      <!-- Brand Header -->
      <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #1e293b;">
        <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background: rgba(0, 210, 147, 0.15); border: 1px solid #00d293; border-radius: 12px; font-size: 22px; margin-bottom: 8px;">⚡</div>
        <h1 style="color: #00d293; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">hosting-Live Fast</h1>
        <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">২৪/৭ ক্লাউড টেলিগ্রাম বট ও ওয়েবসাইট হোস্টিং</p>
      </div>

      <!-- Main Status Banner -->
      <div style="background: ${isApproved ? 'rgba(0, 210, 147, 0.12)' : 'rgba(239, 68, 68, 0.12)'}; border: 1px solid ${isApproved ? '#00d293' : '#ef4444'}; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
        <h2 style="color: ${isApproved ? '#00d293' : '#ef4444'}; margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">
          ${isApproved ? '🎉 ডিপোজিট সফল ও অনুমোদিত!' : '⚠️ ডিপোজিট রিকোয়েস্ট বাতিল'}
        </h2>
        <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; margin: 0;">
          প্রিয় <strong>${user.name || 'সম্মানিত গ্রাহক'}</strong>,<br>
          ${isApproved
            ? `আপনার <strong>${currencySymbol}${deposit.amount} ${deposit.currency}</strong> ডিপোজিট রিকোয়েস্টটি এডমিন দ্বারা সফলভাবে ভেরিফাই ও অনুমোদন করা হয়েছে। আপনার একাউন্টে ব্যালেন্স যুক্ত হয়েছে!`
            : `আপনার <strong>${currencySymbol}${deposit.amount} ${deposit.currency}</strong> ডিপোজিট রিকোয়েস্টটি এডমিন দ্বারা যাচাইয়ের পর বাতিল করা হয়েছে।`}
        </p>
        ${!isApproved && deposit.rejectReason ? `<p style="color: #fca5a5; font-size: 13px; margin: 10px 0 0 0; padding: 10px; background: rgba(239, 68, 68, 0.15); border-radius: 8px;"><strong>বাতিলের কারণ:</strong> ${deposit.rejectReason}</p>` : ''}
      </div>

      <!-- Transaction Details Table -->
      <div style="background: #0d1527; border: 1px solid #1e2d48; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
        <h3 style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;">ট্রানজেকশন তথ্য (Transaction Details)</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #cbd5e1;">
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 10px 0; color: #94a3b8;">পেমেন্ট মেথড:</td>
            <td style="padding: 10px 0; font-weight: bold; text-align: right; text-transform: uppercase; color: #f1f5f9;">${deposit.method}</td>
          </tr>
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 10px 0; color: #94a3b8;">পরিমাণ (Amount):</td>
            <td style="padding: 10px 0; font-weight: bold; text-align: right; color: #00d293; font-size: 15px;">${currencySymbol}${deposit.amount} ${deposit.currency}</td>
          </tr>
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 10px 0; color: #94a3b8;">Transaction ID:</td>
            <td style="padding: 10px 0; font-family: monospace; font-weight: bold; text-align: right; color: #facc15;">${deposit.transactionId}</td>
          </tr>
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 10px 0; color: #94a3b8;">প্রেরক নাম্বার / UID:</td>
            <td style="padding: 10px 0; font-weight: bold; text-align: right; color: #e2e8f0;">${senderId}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #94a3b8;">স্ট্যাটাস:</td>
            <td style="padding: 10px 0; font-weight: bold; text-align: right; color: ${isApproved ? '#00d293' : '#ef4444'};">
              ${isApproved ? 'অনুমোদিত (Approved)' : 'বাতিল (Rejected)'}
            </td>
          </tr>
        </table>
      </div>

      ${isApproved ? `
        <!-- Call to Action -->
        <div style="text-align: center; margin-bottom: 24px;">
          <p style="color: #94a3b8; font-size: 13px; margin: 0 0 16px 0;">
            ${isDirectPlan ? 'আপনার হোস্টিং প্ল্যান চালু হয়ে গেছে। এখনই নতুন টেলিগ্রাম বট ডিপ্লয় করুন!' : 'আপনার ব্যালেন্স দিয়ে এখনই আপনার পছন্দের হোস্টিং প্যাকেজ কিনতে পারবেন।'}
          </p>
          <a href="#" style="display: inline-block; background: #00d293; color: #070b14; font-weight: 800; font-size: 14px; padding: 12px 28px; border-radius: 12px; text-decoration: none;">
            ${isDirectPlan ? 'বট ডিপ্লয় করুন (Deploy Bot)' : 'হোস্টিং প্ল্যান কিনুন (Buy Plan)'}
          </a>
        </div>
      ` : `
        <div style="text-align: center; margin-bottom: 24px;">
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">
            কোনো সমস্যা বা তথ্যের জন্য আমাদের সাপোর্ট সেন্টারে যোগাযোগ করুন।
          </p>
        </div>
      `}

      <!-- Footer -->
      <div style="border-top: 1px solid #1e293b; padding-top: 20px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.6;">
        ধন্যবাদ,<br>
        <strong>hosting-Live Fast টিম</strong><br>
        <span style="font-size: 11px; color: #475569;">২৪/৭ নিরবচ্ছিন্ন ক্লাউড হোস্টিং সেবা</span>
      </div>
    </div>
  `;

  return sendEmailAlert({
    to: user.email,
    userId: user.id,
    subject,
    html,
    text: `${subject} - Amount: ${deposit.amount} ${deposit.currency}, TrxID: ${deposit.transactionId}, Method: ${deposit.method}`,
    type: isApproved ? 'deposit_approved' : 'deposit_rejected'
  });
}

/**
 * Email Alert: Subscription Nearing Expiration
 */
export async function sendSubscriptionExpirationAlert(
  user: { id: string; email: string; name: string; plan?: string; maxBots?: number },
  daysRemaining: number,
  expiresAtFormatted: string
) {
  const isUrgent = daysRemaining <= 1;
  const subject = isUrgent
    ? `🚨 জরুরি সতর্কবার্তা: আপনার hosting-Live Fast হোস্টিং প্ল্যানের মেয়াদ শেষ হচ্ছে!`
    : `⏳ সতর্কবার্তা: আপনার হোস্টিং প্ল্যানের মেয়াদ ${daysRemaining} দিনের মধ্যে শেষ হবে`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070b14; color: #f8fafc; padding: 28px; border-radius: 16px; border: 1px solid #162035;">
      
      <!-- Brand Header -->
      <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #1e293b;">
        <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background: rgba(0, 210, 147, 0.15); border: 1px solid #00d293; border-radius: 12px; font-size: 22px; margin-bottom: 8px;">⏳</div>
        <h1 style="color: #00d293; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">hosting-Live Fast</h1>
        <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">সাবস্ক্রিপশন মেয়াদ সতর্কবার্তা নোটিশ</p>
      </div>

      <!-- Warning Box -->
      <div style="background: ${isUrgent ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)'}; border: 1px solid ${isUrgent ? '#ef4444' : '#f59e0b'}; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
        <h2 style="color: ${isUrgent ? '#f87171' : '#f59e0b'}; margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">
          ⚠️ ${daysRemaining > 0 ? `আর মাত্র ${daysRemaining} দিন বাকি আছে!` : 'আজই মেয়াদ সমাপ্ত হবে!'}
        </h2>
        <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; margin: 0;">
          প্রিয় <strong>${user.name || 'সম্মানিত গ্রাহক'}</strong>,<br>
          আপনার বর্তমান পেইড হোস্টিং প্যাকেজের (<strong>${user.plan || 'পেইড প্ল্যান'}</strong>) মেয়াদ আগামী <strong>${expiresAtFormatted}</strong> তারিখে শেষ হতে চলেছে।
        </p>
        <p style="color: #cbd5e1; font-size: 13px; margin: 10px 0 0 0; line-height: 1.5;">
          মেয়াদ শেষ হয়ে গেলে আপনার একাউন্টটি স্বয়ংক্রিয়ভাবে ফ্রি প্ল্যানে ডাউনগ্রেড হয়ে যাবে এবং চলমান অতিরিক্ত বট সাময়িকভাবে বন্ধ (Stop) হতে পারে।
        </p>
      </div>

      <!-- Plan Status Table -->
      <div style="background: #0d1527; border: 1px solid #1e2d48; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #cbd5e1;">
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 10px 0; color: #94a3b8;">বর্তমান প্ল্যান:</td>
            <td style="padding: 10px 0; font-weight: bold; text-align: right; text-transform: uppercase; color: #00d293;">${user.plan || 'Standard'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #1e293b;">
            <td style="padding: 10px 0; color: #94a3b8;">মেয়াদ শেষের তারিখ:</td>
            <td style="padding: 10px 0; font-weight: bold; text-align: right; color: #facc15;">${expiresAtFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #94a3b8;">বাকি সময়:</td>
            <td style="padding: 10px 0; font-weight: bold; text-align: right; color: ${isUrgent ? '#f87171' : '#38bdf8'};">
              ${daysRemaining > 0 ? `${daysRemaining} দিন` : 'কয়েক ঘণ্টা'}
            </td>
          </tr>
        </table>
      </div>

      <!-- Instructions to Renew -->
      <div style="background: #111c33; border: 1px solid #1e2d48; padding: 18px; border-radius: 12px; margin-bottom: 24px;">
        <h3 style="color: #38bdf8; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">বট অবিরাম ২৪/৭ লাইভ রাখতে করণীয়:</h3>
        <ol style="color: #94a3b8; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>একাউন্টে লগইন করে বাইনান্স (USDT) দিয়ে ওয়ালেটে ব্যালেন্স যোগ করুন।</li>
          <li>হোস্টিং প্ল্যান পেজে গিয়ে পছন্দের প্যাকেজের নিচে <strong>'প্যাকেজ কিনুন (Buy Plan)'</strong> বাটনে ক্লিক করে সাথে সাথে রিনিউ করুন।</li>
        </ol>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="#" style="display: inline-block; background: #00d293; color: #070b14; font-weight: 800; font-size: 14px; padding: 12px 28px; border-radius: 12px; text-decoration: none;">
          প্ল্যান রিনিউ করুন (Renew Plan)
        </a>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #1e293b; padding-top: 20px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.6;">
        ধন্যবাদ,<br>
        <strong>hosting-Live Fast টিম</strong><br>
        <span style="font-size: 11px; color: #475569;">২৪/৭ ক্লাউড টেলিগ্রাম বট ও ওয়েবসাইট হোস্টিং</span>
      </div>
    </div>
  `;

  return sendEmailAlert({
    to: user.email,
    userId: user.id,
    subject,
    html,
    text: `সতর্কবার্তা: আপনার hosting-Live Fast প্ল্যানের মেয়াদ ${daysRemaining} দিনের মধ্যে (${expiresAtFormatted}) শেষ হবে। অবিলম্বে রিনিউ করুন।`,
    type: 'plan_expiring'
  });
}

/**
 * Scan all accounts and send expiration alerts for plans nearing expiry (<= 3 days)
 */
export async function checkAndSendExpiringPlanAlerts(
  accounts: any[],
  stopExcessBotsCallback?: (user: any) => void
): Promise<{ checkedCount: number; alertedCount: number; expiredCount: number; modified: boolean }> {
  const now = Date.now();
  let alertedCount = 0;
  let expiredCount = 0;
  let modified = false;

  for (const account of accounts) {
    if (account.role === 'admin' || !account.planExpiresAt) {
      continue;
    }

    // Check if nearing expiry (within 3 days)
    if (account.planExpiresAt > now) {
      const diffMs = account.planExpiresAt - now;
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      if (diffMs <= threeDaysMs) {
        const lastAlert = account.lastExpAlertAt || 0;
        // Send alert at most once every 24 hours
        if (now - lastAlert > 24 * 60 * 60 * 1000) {
          const daysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
          const formattedDate = new Date(account.planExpiresAt).toLocaleDateString('bn-BD', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          await sendSubscriptionExpirationAlert(account, daysRemaining, formattedDate);
          account.lastExpAlertAt = now;
          modified = true;
          alertedCount++;
        }
      }
    } else if (account.planExpiresAt <= now) {
      // Plan has expired
      console.log(`[EXPIRED PLAN] Account ${account.email} has expired. Downgrading to Free.`);
      account.plan = 'free';
      account.maxBots = 1;
      account.planExpiresAt = null;
      modified = true;
      expiredCount++;

      // Send expired alert
      await sendEmailAlert({
        to: account.email,
        userId: account.id,
        type: 'plan_expired',
        subject: '⚠️ আপনার hosting-Live Fast হোস্টিং প্ল্যানের মেয়াদ সমাপ্ত হয়েছে',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070b14; color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #162035;">
            <h2 style="color: #ef4444; margin: 0 0 10px 0;">মেয়াদ সমাপ্ত হয়েছে (Plan Expired)</h2>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
              প্রিয় <strong>${account.name || 'গ্রাহক'}</strong>,<br>
              আপনার হোস্টিং প্ল্যানের মেয়াদ শেষ হয়েছে। একাউন্ট ফ্রি প্ল্যানে ডাউনগ্রেড করা হয়েছে। বটের সেবা পুনরায় সচল রাখতে অনুগ্রহ করে ওয়ালেটে ডিপোজিট করে প্যাকেজ রিনিউ করুন।
            </p>
          </div>
        `,
        text: 'আপনার hosting-Live Fast পেইড প্ল্যানের মেয়াদ শেষ হয়েছে। একাউন্ট ফ্রি প্ল্যানে ডাউনগ্রেড করা হয়েছে।'
      });

      if (stopExcessBotsCallback) {
        stopExcessBotsCallback(account);
      }
    }
  }

  return {
    checkedCount: accounts.length,
    alertedCount,
    expiredCount,
    modified
  };
}
