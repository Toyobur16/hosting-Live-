export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'user';
  plan?: 'free' | '1_month' | '3_months' | '6_months' | '1_year';
  planExpiresAt?: number | null;
  maxBots?: number;
  avatar?: string;
  isVerified?: boolean;
  verificationToken?: string;
  createdAt: string;
}

export interface HostingPlan {
  id: 'free' | '1_month' | '3_months' | '6_months' | '1_year';
  nameBn: string;
  nameEn: string;
  durationDays: number;
  maxBots: number;
  priceBdt: number;
  priceUsd: number;
  popular?: boolean;
  featuresBn: string[];
  featuresEn: string[];
}

export interface PlanRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: string;
  planName: string;
  durationDays: number;
  amount: number;
  currency: string;
  method: string;
  senderNumber: string;
  transactionId: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface PaymentSettings {
  bkashNumber: string;
  nagadNumber: string;
  rocketNumber: string;
  binanceId: string;
  instructionsBn?: string;
  instructionsEn?: string;
}

export interface HostedBot {
  id: string;
  name: string;
  entryFile: string;
  ownerId?: string;
  ownerName?: string;
  token?: string;
  botUsername?: string;
  status: 'running' | 'stopped' | 'starting' | 'error';
  pid: number | null;
  uptimeSeconds: number;
  startTime: string | null;
  createdAt: string;
  autoRestart: boolean;
  fileCount?: number;
  error?: string;
  env?: Record<string, string>;
}

export interface BotStatus {
  status: 'running' | 'stopped' | 'starting' | 'error';
  pid: number | null;
  uptimeSeconds: number;
  startTime: string | null;
  pythonVersion: string;
  botInfo?: {
    ok: boolean;
    username?: string;
    firstName?: string;
    id?: number;
    error?: string;
  };
  logSummary: {
    totalLogs: number;
    lastLogTime: string | null;
  };
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'otp' | 'system';
  message: string;
}

export interface ServiceRange {
  range: string;
  country: string;
}

export interface ServiceItem {
  sid: string;
  ranges: ServiceRange[];
}

export interface UserRecord {
  user_id: string;
  username?: string;
  full_name?: string;
  balance: number;
  total_numbers?: number;
  referral_count?: number;
  created_at?: string;
  is_banned?: boolean;
}

export interface WithdrawRecord {
  payment_id: string;
  user_id: string | number;
  method: string;
  amount: number;
  number: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

export interface OtpRecord {
  id: string;
  number: string;
  otp: string;
  service?: string;
  country?: string;
  full_sms?: string;
  timestamp: string;
}
