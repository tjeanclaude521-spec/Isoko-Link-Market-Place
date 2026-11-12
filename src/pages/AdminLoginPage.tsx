import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Mail, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { PasswordInput } from '@/components/PasswordInput';
import { TurnstileWidget, turnstileEnabled } from '@/components/TurnstileWidget';

export function AdminLoginPage() {
  const { signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaKey, setCaptchaKey] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (turnstileEnabled && !captchaToken) {
      setError('Please complete the security check.');
      return;
    }
    setLoading(true);

    const { error: signInError, profile } = await signIn(email, password, captchaToken);

    if (signInError) {
      setLoading(false);
      setError(signInError);
      setCaptchaToken('');
      setCaptchaKey((k) => k + 1);
      return;
    }

    if (profile?.role !== 'admin') {
      await signOut();
      setLoading(false);
      setError('This login is for administrators only. Your account does not have admin access.');
      return;
    }

    setLoading(false);
    navigate('/admin');
  };

  const inputClass =
    'w-full pl-10 pr-3 py-2.5 rounded-lg border border-stone-600 bg-stone-900 text-stone-100 text-sm focus:ring-2 focus:ring-stone-400 outline-none';

  return (
    <div className="min-h-screen flex flex-col bg-stone-900">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-stone-800 border border-stone-700 shadow-lg mb-4">
              <ShieldCheck className="h-7 w-7 text-stone-300" />
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Access</h1>
            <p className="text-stone-400 text-sm mt-1">Isoko Link Platform Administration</p>
          </div>

          <div className="bg-stone-800 rounded-xl shadow-xl border border-stone-700 p-6 space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-900/40 border border-red-800 text-sm text-red-200">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Admin Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="admin@isoko.link"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Password</label>
                <PasswordInput
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  variant="dark"
                />
              </div>

              <TurnstileWidget key={captchaKey} resetKey={captchaKey} onVerify={setCaptchaToken} theme="dark" />

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 rounded-lg bg-stone-200 text-stone-900 font-semibold hover:bg-white transition-colors disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign in to Admin Panel'}
              </button>
            </form>

            <p className="text-center text-xs text-stone-500 pt-2">
              Admin access is restricted. If you are a farmer or buyer,{' '}
              <Link to="/login" className="text-stone-300 font-medium hover:text-white underline">
                sign in here
              </Link>
              .
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
