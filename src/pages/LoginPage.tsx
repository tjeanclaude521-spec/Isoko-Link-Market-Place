import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Logo } from '@/components/Logo';
import { requestPasswordRecovery } from '@/lib/auth-gateway';
import { TurnstileWidget, turnstileEnabled } from '@/components/TurnstileWidget';
import { Mail, AlertCircle, ArrowLeft, Phone, KeyRound, CheckCircle } from 'lucide-react';
import { PasswordInput } from '@/components/PasswordInput';
import type { Profile } from '@/lib/types';

function dashboardPath(profile: Profile | null): string {
  if (profile?.role === 'admin') return '/admin';
  if (profile?.role === 'farmer') return '/farmer';
  return '/buyer';
}

export function LoginPage() {
  const { t } = useLanguage();
  const { signIn, user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetMode, setResetMode] = useState<'email' | 'phone'>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0);
  const [resetCaptchaToken, setResetCaptchaToken] = useState('');
  const [resetCaptchaKey, setResetCaptchaKey] = useState(0);

  if (authLoading) return null;
  if (user && profile) return <Navigate to={dashboardPath(profile)} replace />;

  const attemptSignIn = async (identifier: string) => {
    setError('');
    if (turnstileEnabled && !captchaToken) {
      setError('Please complete the security check.');
      return;
    }
    setLoading(true);
    const { error: err, profile } = await signIn(identifier, password, captchaToken);
    setLoading(false);
    if (err) {
      setError(err);
      setCaptchaToken('');
      setCaptchaKey((k) => k + 1);
    } else {
      navigate(dashboardPath(profile));
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    attemptSignIn(email);
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    attemptSignIn(phone);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (turnstileEnabled && !resetCaptchaToken) {
      setResetError('Please complete the security check.');
      return;
    }
    setResetLoading(true);

    const identifier = resetMode === 'email' ? resetEmail : resetPhone;
    const { error: recoveryError } = await requestPasswordRecovery(
      identifier,
      `${window.location.origin}/reset-password`,
      resetCaptchaToken,
    );

    setResetLoading(false);
    setResetCaptchaToken('');
    setResetCaptchaKey((k) => k + 1);

    if (recoveryError) {
      setResetError(recoveryError);
      return;
    }

    setResetSent(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo className="justify-center mb-2" />
            <h1 className="text-2xl font-bold text-stone-800 mt-4">{t('signInToAccount')}</h1>
            <p className="text-stone-500 text-sm mt-1">Welcome back to Isoko Link</p>
          </div>

          {/* Mode toggle */}
          <div className="flex p-1 bg-stone-100 rounded-lg mb-4">
            <button
              type="button"
              onClick={() => { setMode('email'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'email' ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <Mail className="h-4 w-4" />
              {t('signInWithEmail')}
            </button>
            <button
              type="button"
              onClick={() => { setMode('phone'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'phone' ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <Phone className="h-4 w-4" />
              {t('signInWithPhone')}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'email' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('email')}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('password')}</label>
                  <PasswordInput
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setResetOpen(true); setResetMode('email'); setResetSent(false); setResetError(''); setResetEmail(email); }}
                    className="flex items-center gap-1 text-sm text-stone-500 hover:text-emerald-700 transition-colors"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Forgot your password?
                  </button>
                </div>

                <TurnstileWidget key={captchaKey} resetKey={captchaKey} onVerify={setCaptchaToken} />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : t('login')}
                </button>
              </form>
            ) : (
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('phone')}</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      required
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="+250 788 000 000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('password')}</label>
                  <PasswordInput
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setResetOpen(true); setResetMode('phone'); setResetSent(false); setResetError(''); setResetPhone(phone); }}
                    className="flex items-center gap-1 text-sm text-stone-500 hover:text-emerald-700 transition-colors"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Forgot your password?
                  </button>
                </div>

                <TurnstileWidget key={captchaKey} resetKey={captchaKey} onVerify={setCaptchaToken} />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : t('login')}
                </button>
              </form>
            )}

            <p className="text-center text-sm text-stone-600">
              {t('noAccount')}{' '}
              <Link to="/register" className="text-emerald-700 font-medium hover:text-emerald-800">
                {t('register')}
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700">
              <ArrowLeft className="h-4 w-4" />
              {t('home')}
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setResetOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-stone-200">
              <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-emerald-600" />
                Reset Password
              </h3>
              <button onClick={() => setResetOpen(false)} className="p-1 rounded-lg text-stone-400 hover:bg-stone-100 text-xl leading-none">&times;</button>
            </div>

            <div className="p-5">
              {resetSent ? (
                <div className="text-center py-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 mx-auto mb-4">
                    <CheckCircle className="h-7 w-7 text-emerald-600" />
                  </div>
                  <p className="text-sm text-stone-700 mb-2 font-medium">Reset link sent!</p>
                  <p className="text-sm text-stone-500">Check your email for a password reset link. If you registered with a phone number, the link was sent to your account email.</p>
                  <button
                    onClick={() => setResetOpen(false)}
                    className="mt-5 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Got it
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-stone-600 mb-4">Enter your {resetMode === 'email' ? 'email' : 'phone number'} and we'll send you a link to reset your password.</p>

                  {/* Reset mode toggle */}
                  <div className="flex p-1 bg-stone-100 rounded-lg mb-4">
                    <button
                      type="button"
                      onClick={() => { setResetMode('email'); setResetError(''); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                        resetMode === 'email' ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                      }`}
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </button>
                    <button
                      type="button"
                      onClick={() => { setResetMode('phone'); setResetError(''); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                        resetMode === 'phone' ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                      }`}
                    >
                      <Phone className="h-4 w-4" />
                      Phone
                    </button>
                  </div>

                  {resetError && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-4">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{resetError}</span>
                    </div>
                  )}

                  <form onSubmit={handleResetSubmit} className="space-y-4">
                    {resetMode === 'email' ? (
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">{t('email')}</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                          <input
                            required
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="you@example.com"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">{t('phone')}</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                          <input
                            required
                            type="tel"
                            value={resetPhone}
                            onChange={(e) => setResetPhone(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="+250 788 000 000"
                          />
                        </div>
                      </div>
                    )}

                    <TurnstileWidget key={resetCaptchaKey} resetKey={resetCaptchaKey} onVerify={setResetCaptchaToken} />

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setResetOpen(false)}
                        className="flex-1 px-4 py-2.5 rounded-lg border border-stone-300 text-stone-700 font-medium hover:bg-stone-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={resetLoading}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {resetLoading ? 'Sending...' : 'Send Reset Link'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
