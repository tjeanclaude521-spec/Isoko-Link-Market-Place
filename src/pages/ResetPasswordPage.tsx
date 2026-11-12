import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { PasswordInput } from '@/components/PasswordInput';
import { AlertCircle, CheckCircle, KeyRound } from 'lucide-react';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Your new password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError('We could not update your password. Please request a new reset link.');
      return;
    }
    await supabase.auth.signOut();
    setDone(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
        <h1 className="text-xl font-bold text-stone-800 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-emerald-600" />
          Choose a new password
        </h1>

        {ready === false && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>This reset link is invalid or has expired. Please request a new one.</span>
          </div>
        )}

        {ready && !done && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">New password</label>
              <PasswordInput
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Confirm new password</label>
              <PasswordInput
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat the password"
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save new password'}
            </button>
          </form>
        )}

        {done && (
          <div className="text-center space-y-4">
            <CheckCircle className="h-10 w-10 text-emerald-600 mx-auto" />
            <p className="text-sm text-stone-700">Your password has been updated. You can now sign in.</p>
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              Go to sign in
            </button>
          </div>
        )}

        {ready === false && (
          <p className="text-center text-sm">
            <Link to="/login" className="text-emerald-700 font-medium hover:text-emerald-800">Back to sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}
