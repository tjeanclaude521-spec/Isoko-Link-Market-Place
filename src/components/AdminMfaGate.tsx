import { useEffect, useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Stage = 'loading' | 'verified' | 'enroll' | 'challenge' | 'error';

export function AdminMfaGate({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<Stage>('loading');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const init = async () => {
    setStage('loading');
    setError('');
    const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError || !aal) {
      setStage('error');
      setError('Could not check two-step verification. Please refresh and try again.');
      return;
    }
    if (aal.currentLevel === 'aal2') {
      setStage('verified');
      return;
    }

    const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors();
    if (factorError || !factors) {
      setStage('error');
      setError('Could not load your authenticator setup. Please refresh and try again.');
      return;
    }

    const verified = factors.totp.find((f) => f.status === 'verified');
    if (verified) {
      setFactorId(verified.id);
      setStage('challenge');
      return;
    }

    for (const stale of factors.totp) {
      await supabase.auth.mfa.unenroll({ factorId: stale.id });
    }
    const { data: enrollment, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Isoko Link admin',
    });
    if (enrollError || !enrollment) {
      setStage('error');
      setError('Could not start authenticator setup. Please try again.');
      return;
    }
    setFactorId(enrollment.id);
    setQrCode(enrollment.totp.qr_code);
    setSecret(enrollment.totp.secret);
    setStage('enroll');
  };

  useEffect(() => {
    init();
  }, []);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setBusy(false);
    if (verifyError) {
      setCode('');
      setError('That code did not work. Check your authenticator app and try again.');
      return;
    }
    setStage('verified');
  };

  if (stage === 'verified') return <>{children}</>;

  if (stage === 'loading') {
    return (
      <div className="flex items-center justify-center py-24 text-stone-500 gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking verification...
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-stone-800">Two-step verification</h1>
            <p className="text-sm text-stone-500">Security tools need a code from your authenticator app.</p>
          </div>
        </div>

        {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

        {stage === 'enroll' && (
          <div className="space-y-3 text-sm text-stone-700">
            <p>Scan this QR code with an authenticator app, or enter the key manually, then type the 6-digit code below.</p>
            <div className="flex justify-center">
              <img src={qrCode} alt="Authenticator setup QR code" className="h-44 w-44 rounded-lg border border-stone-200 bg-white p-2" />
            </div>
            <p className="break-all rounded-lg bg-stone-50 border border-stone-200 p-2 font-mono text-xs text-stone-600">{secret}</p>
          </div>
        )}

        {stage === 'error' ? (
          <button onClick={init} className="w-full px-4 py-2.5 rounded-lg border border-stone-300 text-sm font-medium hover:bg-stone-50">
            Try again
          </button>
        ) : (
          <form onSubmit={verify} className="space-y-3">
            <input
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="6-digit code"
              className="w-full px-3 py-2.5 rounded-lg border border-stone-300 text-sm text-center tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {busy ? 'Verifying...' : 'Verify and continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
