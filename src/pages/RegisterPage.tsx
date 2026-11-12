import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Logo } from '@/components/Logo';
import type { UserRole } from '@/lib/types';
import { Mail, User, Phone, AlertCircle, ArrowLeft, Sprout, ShoppingBag, CheckCircle } from 'lucide-react';
import { PasswordInput } from '@/components/PasswordInput';
import { useDocumentMeta } from '@/lib/use-document-meta';

export function RegisterPage() {
  const { t } = useLanguage();
  const { signUp, signUpWithPhone, user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('buyer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useDocumentMeta({
    title: 'Create Your Isoko Link Account — Sell or Buy Agricultural Products',
    description: t('metaSellDesc'),
    canonicalPath: '/register',
  });

  if (authLoading) return null;
  if (user && profile) {
    const dash = profile.role === 'admin' ? '/admin' : profile.role === 'farmer' ? '/farmer' : '/buyer';
    return <Navigate to={dash} replace />;
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError(t('passwordHint'));
      return;
    }
    setLoading(true);
    const { error: err } = await signUp(email, password, fullName, role, phone);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setSuccess(true);
      setTimeout(() => navigate(role === 'farmer' ? '/farmer' : '/buyer'), 1500);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError(t('passwordHint'));
      return;
    }
    setLoading(true);
    const { error: err } = await signUpWithPhone(phone, password, fullName, role);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setSuccess(true);
      setTimeout(() => navigate(role === 'farmer' ? '/farmer' : '/buyer'), 1500);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-stone-800 mb-2">{t('accountCreated')}</h1>
          <p className="text-stone-500">{t('createAccount')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Logo className="justify-center mb-2" />
            <h1 className="text-2xl font-bold text-stone-800 mt-4">{t('createAccount')}</h1>
            <p className="text-stone-500 text-sm mt-1">{t('accountTypeHint')}</p>
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
              {t('registerWithEmail')}
            </button>
            <button
              type="button"
              onClick={() => { setMode('phone'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'phone' ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <Phone className="h-4 w-4" />
              {t('registerWithPhone')}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Full name — always needed */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('fullName')}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Jean Pierre Habimana"
                />
              </div>
            </div>

            {/* Account type — always needed */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">{t('accountType')}</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('farmer')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    role === 'farmer'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <Sprout className="h-6 w-6" />
                  <span className="text-sm font-medium">{t('farmer')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('buyer')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    role === 'buyer'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <ShoppingBag className="h-6 w-6" />
                  <span className="text-sm font-medium">{t('buyer')}</span>
                </button>
              </div>
              <p className="text-xs text-stone-500 mt-2">
                {role === 'farmer' ? t('farmerHint') : t('buyerHint')}
              </p>
            </div>

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
                  <p className="text-xs text-stone-500 mt-1">{t('emailHint')}</p>
                </div>

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
                  <p className="text-xs text-stone-500 mt-1">{t('phoneHint')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('password')}</label>
                  <PasswordInput
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-stone-500 mt-1">{t('passwordHint')}</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {loading ? t('creatingAccount') : t('createAccount')}
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
                  <p className="text-xs text-stone-500 mt-1">{t('phoneHint')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('password')}</label>
                  <PasswordInput
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-stone-500 mt-1">{t('passwordHint')}</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {loading ? t('creatingAccount') : t('createAccount')}
                </button>
              </form>
            )}

            <p className="text-center text-sm text-stone-600">
              {t('haveAccount')}{' '}
              <Link to="/login" className="text-emerald-700 font-medium hover:text-emerald-800">
                {t('login')}
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
    </div>
  );
}
