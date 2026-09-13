import React, { useState, useEffect } from 'react';
import { Bot, User, Lock, Mail, Eye, EyeOff, CheckCircle2, AlertCircle, X, ExternalLink, RefreshCw, KeyRound, Sparkles } from 'lucide-react';
import { AuthUser } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: (user: AuthUser, token: string) => void;
  canDismiss?: boolean;
  lang?: 'bn' | 'en';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  canDismiss = false,
  lang = 'bn'
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const GOOGLE_CLIENT_ID =
    (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
    '617408661237-hh7c136m8svtsj6t9l4r1cjgq49shd15.apps.googleusercontent.com';

  useEffect(() => {
    // If Google Identity Services library is loaded, setup button
    if (isOpen && typeof window !== 'undefined') {
      const g = (window as any).google;
      if (g?.accounts?.id && GOOGLE_CLIENT_ID) {
        try {
          g.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
          });
          const container = document.getElementById('g-btn-target');
          if (container) {
            container.innerHTML = '';
            g.accounts.id.renderButton(container, {
              theme: 'filled_blue',
              size: 'large',
              width: 320,
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left'
            });
          }
        } catch (err) {
          console.warn('Google Sign-In button render error', err);
        }
      }
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response || !response.credential) return;
    setGoogleLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'গুগল লগইন সম্পন্ন করা সম্ভব হয়নি');
      }
      localStorage.setItem('bot_auth_token', data.token);
      localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
      onSuccess(data.user, data.token);
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDirectGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const g = (window as any).google;

      // 1. First try OAuth2 popup token client (opens official Google account selection window)
      if (g?.accounts?.oauth2 && GOOGLE_CLIENT_ID) {
        try {
          const client = g.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile openid',
            callback: async (tokenResponse: any) => {
              if (tokenResponse?.error) {
                setError(tokenResponse.error_description || tokenResponse.error || 'Google login cancelled');
                setGoogleLoading(false);
                return;
              }
              if (tokenResponse?.access_token) {
                try {
                  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                  });
                  const profile = await userInfoRes.json();
                  if (profile?.email) {
                    const res = await fetch('/api/auth/google', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        email: profile.email,
                        name: profile.name || profile.given_name || profile.email.split('@')[0],
                        picture: profile.picture || '',
                        googleId: profile.sub || `google_${Date.now()}`
                      })
                    });
                    const data = await res.json();
                    if (!res.ok || !data.success) {
                      throw new Error(data.error || 'গুগল লগইন সম্পন্ন করা সম্ভব হয়নি');
                    }
                    localStorage.setItem('bot_auth_token', data.token);
                    localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
                    onSuccess(data.user, data.token);
                    if (onClose) onClose();
                    return;
                  }
                } catch (userErr: any) {
                  setError(userErr.message || 'Failed to retrieve Google profile');
                } finally {
                  setGoogleLoading(false);
                }
              }
            }
          });
          client.requestAccessToken({ prompt: 'select_account' });
          return;
        } catch (oauth2Err) {
          console.warn('OAuth2 popup failed, trying one-tap prompt', oauth2Err);
        }
      }

      // 2. Check if GSI prompt can be shown
      if (g?.accounts?.id && GOOGLE_CLIENT_ID) {
        g.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            promptManualGoogleEmail();
          }
        });
        return;
      }
      promptManualGoogleEmail();
    } catch (err: any) {
      setError(err.message || 'Google login failed');
      setGoogleLoading(false);
    }
  };

  const promptManualGoogleEmail = async () => {
    const inputEmail = window.prompt(
      lang === 'bn'
        ? 'আপনার গুগল ইমেইল এড্রেস লিখুন (ডাইরেক্ট গুগল লগইন):'
        : 'Enter your Google Email for direct login:',
      email || 'user@gmail.com'
    );
    if (!inputEmail || !inputEmail.trim()) {
      setGoogleLoading(false);
      return;
    }
    const cleanMail = inputEmail.trim().toLowerCase();
    if (!cleanMail.includes('@')) {
      setError(lang === 'bn' ? 'সঠিক ইমেইল এড্রেস প্রদান করুন' : 'Please provide a valid email');
      setGoogleLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanMail,
          name: cleanMail.split('@')[0],
          googleId: `direct_${Date.now()}`
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'গুগল লগইন সম্পন্ন করা সম্ভব হয়নি');
      }
      localStorage.setItem('bot_auth_token', data.token);
      localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
      onSuccess(data.user, data.token);
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Direct Google Sign-In error');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError(lang === 'bn' ? 'সঠিক ইমেইল এড্রেস লিখুন' : 'Please enter a valid email address');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError(lang === 'bn' ? 'আপনার পুরো নাম লিখুন' : 'Please enter your full name');
        return;
      }
      if (password.length < 6) {
        setError(lang === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' : 'Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError(lang === 'bn' ? 'দুইটি পাসওয়ার্ড মিলছে না! একই পাসওয়ার্ড দিন।' : 'Passwords do not match! Please enter identical passwords.');
        return;
      }
    }

    if (mode === 'login') {
      if (!password) {
        setError(lang === 'bn' ? 'পাসওয়ার্ড প্রদান করুন' : 'Please enter your password');
        return;
      }
    }

    if (mode === 'reset') {
      if (newPassword.length < 6) {
        setError(lang === 'bn' ? 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' : 'New password must be at least 6 characters');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setError(lang === 'bn' ? 'নতুন পাসওয়ার্ড দুটি মিলছে না!' : 'New passwords do not match!');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), email: cleanEmail, password })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || (lang === 'bn' ? 'রেজিস্ট্রেশন ব্যর্থ হয়েছে' : 'Registration failed'));
        }

        // Auto-login immediately upon registration so user doesn't have to fill forms again
        localStorage.setItem('bot_auth_token', data.token);
        localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
        onSuccess(data.user, data.token);
        if (onClose) onClose();
      } else if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || (lang === 'bn' ? 'লগইন ব্যর্থ হয়েছে' : 'Login failed'));
        }
        localStorage.setItem('bot_auth_token', data.token);
        localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
        onSuccess(data.user, data.token);
        if (onClose) onClose();
      } else if (mode === 'reset') {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, newPassword })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || (lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে' : 'Password reset failed'));
        }
        localStorage.setItem('bot_auth_token', data.token);
        localStorage.setItem('bot_auth_user', JSON.stringify(data.user));
        onSuccess(data.user, data.token);
        if (onClose) onClose();
      }
    } catch (err: any) {
      setError(err.message || 'ত্রুটি ঘটেছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050811]/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#111927] border border-[#1f2c42] shadow-2xl rounded-3xl max-w-[420px] w-full p-7 text-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-60 h-24 bg-gradient-to-b from-fuchsia-500/15 via-pink-500/10 to-transparent blur-2xl pointer-events-none" />

        {canDismiss && onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors z-10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#1e293b] border border-[#334155] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-pink-500/10 text-pink-400">
            <Bot className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {mode === 'login'
              ? (lang === 'bn' ? 'লগইন করুন' : 'Sign In')
              : mode === 'register'
              ? (lang === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account')
              : (lang === 'bn' ? 'পাসওয়ার্ড রিসেট' : 'Reset Password')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login'
              ? (lang === 'bn' ? 'আপনার অ্যাকাউন্ট এবং বট ম্যানেজ করতে লগইন করুন' : 'Welcome back to your bot cloud')
              : mode === 'register'
              ? (lang === 'bn' ? 'নতুন অ্যাকাউন্ট খুলে আনলিমিটেড বট হোস্ট করুন' : 'Join and host unlimited bots')
              : (lang === 'bn' ? 'আপনার নিবন্ধিত ইমেইল এবং নতুন পাসওয়ার্ড দিন' : 'Enter your registered email and new password')}
          </p>
        </div>

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Direct Google Sign-In Button */}
        {mode !== 'reset' && (
          <div className="mb-4 space-y-3">
            <div id="g-btn-target" className="flex justify-center empty:hidden" />
            <button
              type="button"
              id="google-direct-login-btn"
              onClick={handleDirectGoogleLogin}
              disabled={googleLoading}
              className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 border border-slate-200 active:scale-[0.99]"
            >
              {googleLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-700" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>
                {googleLoading
                  ? (lang === 'bn' ? 'গুগল দিয়ে ভেরিফাই হচ্ছে...' : 'Signing in with Google...')
                  : (lang === 'bn' ? 'Google দিয়ে সরাসরি লগইন করুন' : 'Sign in directly with Google')}
              </span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#1f2d48]"></div>
              <span className="flex-shrink mx-3 text-[11px] text-slate-500">
                {lang === 'bn' ? 'অথবা ইমেইল দিয়ে' : 'or with email'}
              </span>
              <div className="flex-grow border-t border-[#1f2d48]"></div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={lang === 'bn' ? 'আপনার পুরো নাম (Full Name)' : 'Full Name'}
                className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#ec4899] rounded-xl text-white placeholder-slate-500 py-3 pl-10 pr-4 text-xs focus:outline-none transition-all"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={lang === 'bn' ? 'ইমেইল এড্রেস (Email Address)' : 'Email Address'}
              className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#ec4899] rounded-xl text-white placeholder-slate-500 py-3 pl-10 pr-4 text-xs focus:outline-none transition-all"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mode === 'register'
                      ? (lang === 'bn' ? 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)' : 'Password (min 6 chars)')
                      : (lang === 'bn' ? 'পাসওয়ার্ড লিখুন' : 'Enter Password')
                  }
                  className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#ec4899] rounded-xl text-white placeholder-slate-500 py-3 pl-10 pr-10 text-xs focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'login' && (
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-pink-400 hover:text-pink-300 transition-colors cursor-pointer"
                  >
                    {lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === 'register' && (
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={lang === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}
                className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#ec4899] rounded-xl text-white placeholder-slate-500 py-3 pl-10 pr-10 text-xs focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          )}

          {mode === 'reset' && (
            <>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={lang === 'bn' ? 'নতুন পাসওয়ার্ড লিখুন' : 'Enter New Password'}
                  className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#ec4899] rounded-xl text-white placeholder-slate-500 py-3 pl-10 pr-10 text-xs focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder={lang === 'bn' ? 'নতুন পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm New Password'}
                  className="w-full bg-[#0b1220] border border-[#1f2d48] focus:border-[#ec4899] rounded-xl text-white placeholder-slate-500 py-3 pl-10 pr-10 text-xs focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#d946ef] via-[#ec4899] to-[#f43f5e] hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-pink-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : mode === 'login' ? (
              <span>{lang === 'bn' ? 'লগইন করুন' : 'Sign In'}</span>
            ) : mode === 'register' ? (
              <span>{lang === 'bn' ? 'এখনই রেজিস্ট্রেশন করুন' : 'Register Now'}</span>
            ) : (
              <span>{lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন ও লগইন' : 'Update Password & Sign In'}</span>
            )}
          </button>
        </form>

        <div className="text-center mt-5">
          {mode === 'login' ? (
            <p className="text-xs text-slate-400">
              {lang === 'bn' ? 'কোনো অ্যাকাউন্ট নেই?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  setSuccessMessage(null);
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="text-pink-400 hover:text-pink-300 font-semibold hover:underline cursor-pointer ml-1"
              >
                {lang === 'bn' ? 'নতুন অ্যাকাউন্ট খুলুন' : 'Create Account Here'}
              </button>
            </p>
          ) : mode === 'register' ? (
            <p className="text-xs text-slate-400">
              {lang === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে?' : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-pink-400 hover:text-pink-300 font-semibold hover:underline cursor-pointer ml-1"
              >
                {lang === 'bn' ? 'লগইন করুন' : 'Sign In Here'}
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-pink-400 hover:text-pink-300 font-semibold hover:underline cursor-pointer"
              >
                {lang === 'bn' ? 'লগইনে ফিরে যান' : 'Back to Sign In'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
