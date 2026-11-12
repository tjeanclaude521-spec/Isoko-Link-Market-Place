import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PasswordInput } from '@/components/PasswordInput';

type Stage = 'loading' | 'invite' | 'password' | 'enroll' | 'challenge' | 'done' | 'error';

export function AdminSetupPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('loading');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        setStage('password');
      } else {
        setStage('invite');
      }
    };

    void init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session) setStage('password');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const requestInvite = async (action: 'send' | 'resend' = 'send') => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-bootstrap`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const result: { message?: string; error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Invitation unavailable');
      setMessage(result.message ?? 'Check your email for the secure setup invitation.');
    } catch (cause) {
      console.error('admin setup invitation failed', cause);
      setError('The setup invitation is not available right now. Please try again later.');
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8 || password !== confirm) {
      setError(password.length < 8 ? 'Your password must be at least 8 characters.' : 'The passwords do not match.');
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      console.error('admin password update failed', updateError);
      setError(
        updateError.message
          ? `Your password could not be saved: ${updateError.message}`
          : 'Your password could not be saved. Please request a new invitation.',
      );
      return;
    }
    setStage('enroll');
    await beginMfa();
  };

  const beginMfa = async () => {
    setError('');
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError || !factors) {
      setStage('error');
      setError('Authenticator setup could not be started. Please try again.');
      return;
    }
    for (const factor of factors.totp) await supabase.auth.mfa.unenroll({ factorId: factor.id });
    const { data: enrollment, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Isoko Link admin',
    });
    if (enrollError || !enrollment) {
      setStage('error');
      setError('Authenticator setup could not be started. Please try again.');
      return;
    }
    setFactorId(enrollment.id);
    setQrCode(enrollment.totp.qr_code);
    setSecret(enrollment.totp.secret);
    setStage('enroll');
  };

  const verifyAndClaim = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    if (verifyError) {
      setBusy(false);
      setCode('');
      setError('That code did not work. Check your authenticator app and try again.');
      return;
    }
    const { error: claimError } = await supabase.rpc('claim_admin_bootstrap');
    setBusy(false);
    if (claimError) {
      console.error('admin bootstrap claim failed', claimError);
      setError('Administrator setup could not be completed. This invitation may already be used.');
      return;
    }
    setStage('done');
  };

  if (stage === 'loading') return <FullScreenMessage><Loader2 className="h-5 w-5 animate-spin" /> Checking your setup invitation...</FullScreenMessage>;
  if (stage === 'invite') {
    return (
      <FullScreenCard title="Set up your Isoko Link administrator account">
        <p className="text-sm text-stone-600">Request the one-time invitation for the approved administrator email address.</p>
        {message && <Notice icon={<CheckCircle className="h-4 w-4" />} text={message} success />}
        {error && <Notice icon={<AlertCircle className="h-4 w-4" />} text={error} />}
        {!message && <button onClick={() => requestInvite('send')} disabled={busy} className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">{busy ? 'Sending invitation...' : 'Send setup invitation'}</button>}
        {message && <button onClick={() => requestInvite('resend')} disabled={busy} className="w-full rounded-lg border border-emerald-300 px-4 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">{busy ? 'Sending fresh link...' : 'Resend setup invitation'}</button>}
        <Link to="/login" className="block text-center text-sm font-medium text-emerald-700">Back to sign in</Link>
      </FullScreenCard>
    );
  }
  if (stage === 'password') {
    return (
      <FullScreenCard title="Choose your administrator password">
        <p className="text-sm text-stone-600">Create a password only you know. The setup link can be used once.</p>
        {error && <Notice icon={<AlertCircle className="h-4 w-4" />} text={error} />}
        <form onSubmit={savePassword} className="space-y-4">
          <PasswordInput required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
          <PasswordInput required value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Repeat your password" autoComplete="new-password" />
          <button disabled={busy} className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">{busy ? 'Saving password...' : 'Continue to authenticator setup'}</button>
        </form>
      </FullScreenCard>
    );
  }
  if (stage === 'enroll' || stage === 'challenge') {
    return (
      <FullScreenCard title="Secure your administrator account">
        <div className="flex items-center gap-3 text-sm text-stone-600"><ShieldCheck className="h-5 w-5 text-emerald-600" />Authenticator-app verification is required for every admin area.</div>
        {error && <Notice icon={<AlertCircle className="h-4 w-4" />} text={error} />}
        {stage === 'enroll' && <><p className="text-sm text-stone-600">Scan this QR code with an authenticator app, then enter the six-digit code it displays.</p><img src={qrCode} alt="Authenticator setup QR code" className="mx-auto h-44 w-44 rounded-lg border border-stone-200 p-2" /><p className="break-all rounded-lg bg-stone-50 p-2 font-mono text-xs text-stone-600">{secret}</p></>}
        <form onSubmit={verifyAndClaim} className="space-y-3"><input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} placeholder="6-digit code" className="w-full rounded-lg border border-stone-300 px-3 py-3 text-center tracking-widest outline-none focus:ring-2 focus:ring-emerald-500" /><button disabled={busy || code.length !== 6} className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">{busy ? 'Verifying...' : 'Verify and finish setup'}</button></form>
      </FullScreenCard>
    );
  }
  if (stage === 'done') return <FullScreenCard title="Administrator account ready"><Notice icon={<CheckCircle className="h-4 w-4" />} text="Your account is protected with an authenticator app." success /><button onClick={() => navigate('/admin')} className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700">Open administrator dashboard</button></FullScreenCard>;
  return <FullScreenCard title="Setup unavailable"><Notice icon={<AlertCircle className="h-4 w-4" />} text={error || 'Please request a new setup invitation.'} /><Link to="/login" className="block text-center text-sm font-medium text-emerald-700">Back to sign in</Link></FullScreenCard>;
}

function Notice({ icon, text, success = false }: { icon: React.ReactNode; text: string; success?: boolean }) {
  return <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${success ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{icon}<span>{text}</span></div>;
}

function FullScreenCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-12"><div className="w-full max-w-md space-y-5 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"><h1 className="text-xl font-bold text-stone-800">{title}</h1>{children}</div></div>;
}

function FullScreenMessage({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center gap-2 bg-stone-50 text-sm text-stone-500">{children}</div>;
}
