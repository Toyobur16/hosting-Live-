export interface StoreBanner {
  id: string;
  title: string;
  titleBn?: string;
  subtitle: string;
  subtitleBn?: string;
  badge?: string;
  imageUrl: string;
  link?: string;
  active: boolean;
  order?: number;
}

export interface StoreCategory {
  id: string;
  name: string;
  nameBn?: string;
  icon: string;
  count?: number;
  active: boolean;
}

export interface StoreItem {
  id: string;
  title: string;
  titleBn?: string;
  categoryId: string;
  categoryName?: string;
  priceBdt: number;
  priceUsd: number;
  rating: number;
  downloads: number;
  badge?: string;
  imageUrl: string;
  description?: string;
  planId?: string;
  fileUrl?: string;
  originalFileName?: string;
  fileStorageName?: string;
  fileSizeFormatted?: string;
  featured?: boolean;
  active: boolean;
  createdAt?: string;
}

export interface SupportSettings {
  email: string;
  whatsapp: string;
  telegram: string;
  workingHours?: string;
  noticeBn?: string;
  noticeEn?: string;
}

export interface SupportMessage {
  id: string;
  userId?: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  status: 'pending' | 'resolved' | 'replied';
  reply?: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'user';
  plan?: string;
  planExpiresAt?: number | null;
  maxBots?: number;
  balanceBdt?: number;
  balanceUsd?: number;
  purchasedItemIds?: string[];
  purchasedItems?: Array<{
    itemId: string;
    title: string;
    fileUrl?: string;
    purchasedAt: number;
  }>;
  avatar?: string;
  isVerified?: boolean;
  verificationToken?: string;
  createdAt: string;
}

export interface HostingPlan {
  id: string;
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

export interface DepositRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: 'USD' | 'BDT';
  method: 'binance' | 'bkash' | 'nagad' | 'rocket' | string;
  senderIdentifier: string;
  transactionId: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface UserNotification {
  id: string;
  userId: string;
  type: 'deposit_approved' | 'deposit_rejected' | 'plan_expiring' | 'plan_expired' | 'plan_purchased' | 'system';
  title: string;
  message: string;
  createdAt: string;
  read?: boolean;
}

export interface PlanRequest {
  id: string;
  type?: 'plan_purchase' | 'deposit';
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
  senderIdentifier?: string;
  transactionId: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface PaymentSettings {
  binanceUid?: string;
  binancePayId?: string;
  binanceId: string;
  binanceEnabled?: boolean;
  bkashNumber: string;
  bkashEnabled?: boolean;
  nagadNumber: string;
  nagadEnabled?: boolean;
  rocketNumber: string;
  rocketEnabled?: boolean;
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
