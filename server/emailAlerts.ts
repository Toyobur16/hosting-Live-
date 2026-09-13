import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const NOTIFICATIONS_FILE = path.join(process.cwd(), 'hosted_bots', 'notifications.json');

export interface EmailAlertOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type: 'deposit_approved' | 'deposit_rejected' | 'plan_expiring' | 'plan_expired' | 'plan_purchased' | 'system';
  userId?: string;
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

export function getUserNotifications(userId: string): any[] {
  const all = getStoredNotifications();
  return all.filter((n) => n.userId === userId);
}

// Create Nodemailer transporter if SMTP credentials are provided
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }
  return null;
}

/**
 * Main helper function to send email alerts to users.
 * Delivers via SMTP if configured, and always saves an in-app persistent notification alert.
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
  const transporter = getTransporter();
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@bot-host.cloud';

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"Bot-Host Cloud" <${fromAddress}>`,
        to,
        subject,
        text: text || html.replace(/<[^>]+>/g, ' '),
        html
      });
      console.log(`[EMAIL ALERT SENT] To: ${to} | Subject: "${subject}" | MsgId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`[EMAIL ALERT FAILED] Could not send to ${to}:`, err.message);
      return { success: false, error: err.message };
    }
  } else {
    // Graceful logging for development or when SMTP is not yet configured in env
    console.log(`[EMAIL ALERT SIMULATION] Transporter not configured. (To configure: add SMTP_HOST, SMTP_USER, SMTP_PASS to .env)`);
    console.log(`[EMAIL ALERT] To: ${to} | Type: ${type} | Subject: "${subject}"`);
    return { success: true, simulated: true };
  }
}

/**
 * Email Alert: Deposit Processed (Approved / Rejected)
 */
export async function sendDepositProcessedAlert(
  user: { id: string; email: string; name: string },
  deposit: { amount: number; currency: string; method: string; transactionId: string; rejectReason?: string },
  status: 'approved' | 'rejected'
) {
  const isApproved = status === 'approved';
  const subject = isApproved
    ? `✅ আপনার ডিপোজিট সফলভাবে অনুমোদিত হয়েছে (${deposit.amount} ${deposit.currency})`
    : `❌ আপনার ডিপোজিট রিকোয়েস্ট বাতিল করা হয়েছে`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #0088cc; margin: 0; font-size: 24px;">Bot-Host Cloud</h1>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">টেলিগ্রাম বট লাইভ হোস্টিং ও ওয়ালেট নোটিফিকেশন</p>
      </div>

      <div style="background: ${isApproved ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border: 1px solid ${isApproved ? '#10b981' : '#ef4444'}; padding: 18px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: ${isApproved ? '#10b981' : '#ef4444'}; margin-top: 0; font-size: 18px;">
          ${isApproved ? '🎉 ডিপোজিট সফল ও ওয়ালেটে ব্যালেন্স জমা হয়েছে!' : '⚠️ ডিপোজিট রিকোয়েস্ট বাতিল'}
        </h2>
        <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6;">
          প্রিয় <strong>${user.name || 'গ্রাহক'}</strong>,<br>
          ${isApproved
            ? `আপনার <strong>${deposit.amount} ${deposit.currency}</strong> ডিপোজিট রিকোয়েস্টটি এডমিন দ্বারা সফলভাবে ভেরিফাই ও অনুমোদন করা হয়েছে। আপনার ওয়ালেটে নতুন ব্যালেন্স যুক্ত হয়েছে!`
            : `আপনার <strong>${deposit.amount} ${deposit.currency}</strong> ডিপোজিট রিকোয়েস্টটি এডমিন দ্বারা বাতিল করা হয়েছে।`}
        </p>
        ${!isApproved && deposit.rejectReason ? `<p style="color: #fca5a5; font-size: 13px;"><strong>বাতিলের কারণ:</strong> ${deposit.rejectReason}</p>` : ''}
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; color: #cbd5e1;">
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 8px 0; color: #94a3b8;">পেমেন্ট মেথড:</td>
          <td style="padding: 8px 0; font-weight: bold; text-align: right; text-transform: uppercase;">${deposit.method}</td>
        </tr>
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 8px 0; color: #94a3b8;">পরিমাণ (Amount):</td>
          <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #38bdf8;">${deposit.amount} ${deposit.currency}</td>
        </tr>
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 8px 0; color: #94a3b8;">Transaction ID:</td>
          <td style="padding: 8px 0; font-family: monospace; font-weight: bold; text-align: right; color: #facc15;">${deposit.transactionId}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #94a3b8;">স্ট্যাটাস:</td>
          <td style="padding: 8px 0; font-weight: bold; text-align: right; color: ${isApproved ? '#10b981' : '#ef4444'};">
            ${isApproved ? 'অনুমোদিত (Approved)' : 'বাতিল (Rejected)'}
          </td>
        </tr>
      </table>

      ${isApproved ? `
        <div style="text-align: center; margin-top: 24px;">
          <p style="color: #94a3b8; font-size: 13px; margin-bottom: 12px;">এখনই আপনার ওয়ালেট ব্যালেন্স দিয়ে পছন্দের হোস্টিং প্যাকেজ কিনতে পারবেন।</p>
        </div>
      ` : ''}

      <div style="border-top: 1px solid #334155; padding-top: 16px; margin-top: 24px; text-align: center; color: #64748b; font-size: 12px;">
        ধন্যবাদ,<br>
        <strong>Bot-Host Cloud টিম</strong>
      </div>
    </div>
  `;

  return sendEmailAlert({
    to: user.email,
    userId: user.id,
    subject,
    html,
    text: `${subject} - Amount: ${deposit.amount} ${deposit.currency}, TrxID: ${deposit.transactionId}`,
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
    ? `🚨 জরুরি সতর্কবার্তা: আপনার Bot-Host সাবস্ক্রিপশন মেয়াদ আজ/কাল শেষ হচ্ছে!`
    : `⏳ সতর্কবার্তা: আপনার Bot-Host সাবস্ক্রিপশন মেয়াদ ${daysRemaining} দিনের মধ্যে শেষ হবে`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #0088cc; margin: 0; font-size: 24px;">Bot-Host Cloud</h1>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">সাবস্ক্রিপশন মেয়াদ শেষ হওয়ার নোটিশ</p>
      </div>

      <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid #f59e0b; padding: 18px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #f59e0b; margin-top: 0; font-size: 18px;">
          ⚠️ আর মাত্র ${daysRemaining > 0 ? `${daysRemaining} দিন` : 'কয়েক ঘণ্টা'} বাকি আছে!
        </h2>
        <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6;">
          প্রিয় <strong>${user.name || 'গ্রাহক'}</strong>,<br>
          আপনার বর্তমান পেইড প্যাকেজের (<strong>${user.plan || 'Premium'}</strong>) মেয়াদ আগামী <strong>${expiresAtFormatted}</strong> তারিখে শেষ হতে চলেছে।
        </p>
        <p style="color: #cbd5e1; font-size: 13px; margin-top: 8px;">
          মেয়াদ শেষ হয়ে গেলে আপনার একাউন্টটি স্বয়ংক্রিয়ভাবে ফ্রি স্টার্টার প্ল্যানে ডাউনগ্রেড হয়ে যাবে এবং ১টির অতিরিক্ত থাকা চলমান বটগুলো সাময়িকভাবে স্থগিত হতে পারে।
        </p>
      </div>

      <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #38bdf8; margin: 0 0 8px 0; font-size: 14px;">বট অবিরাম সচল রাখতে করণীয়:</h3>
        <ol style="color: #94a3b8; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.7;">
          <li>লগইন করে ওয়ালেটে ব্যালেন্স ডিপোজিট করুন।</li>
          <li>পছন্দের প্যাকেজের নিচে <strong>'বাই নাও (Buy Now)'</strong> বাটনে ক্লিক করে সহজেই প্ল্যান রিনিউ করুন।</li>
        </ol>
      </div>

      <div style="border-top: 1px solid #334155; padding-top: 16px; margin-top: 24px; text-align: center; color: #64748b; font-size: 12px;">
        ধন্যবাদ,<br>
        <strong>Bot-Host Cloud টিম</strong>
      </div>
    </div>
  `;

  return sendEmailAlert({
    to: user.email,
    userId: user.id,
    subject,
    html,
    text: `সতর্কবার্তা: আপনার Bot-Host প্লানের মেয়াদ ${daysRemaining} দিনের মধ্যে (${expiresAtFormatted}) শেষ হবে। অবিলম্বে রিনিউ করুন।`,
    type: 'plan_expiring'
  });
}
