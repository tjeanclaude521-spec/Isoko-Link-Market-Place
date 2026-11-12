import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, RefreshCw, ShieldAlert, Unlock, Link2 } from 'lucide-react';
import { AdminMfaGate } from '@/components/AdminMfaGate';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-security`;

interface SecurityEvent {
  id: string;
  event_type: string;
  created_at: string;
  cooldown_minutes: number | null;
  has_lock: boolean;
  account: { label: string; role: string | null };
  source: string;
}

interface SearchUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
}

async function callAdminSecurity(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Your session has expired. Please sign in again.');
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error ?? 'Request failed. Please try again.');
  return data;
}

function SecurityConsole() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [recoveryLink, setRecoveryLink] = useState('');

  const loadEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await callAdminSecurity({ action: 'list_events', limit: 100 });
      setEvents(data.events ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load security events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const clearLock = async (eventId: string) => {
    setError('');
    try {
      await callAdminSecurity({ action: 'clear_lock', event_id: eventId });
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear the cooldown.');
    }
  };

  const searchUsers = async () => {
    setError('');
    try {
      const data = await callAdminSecurity({ action: 'search_users', query });
      setUsers(data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.');
    }
  };

  const issueRecovery = async (userId: string) => {
    setError('');
    setRecoveryLink('');
    try {
      const data = await callAdminSecurity({ action: 'recovery_link', user_id: userId });
      setRecoveryLink(data.action_link);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create a recovery link.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold text-stone-800 mt-2 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-emerald-600" /> Login security
          </h1>
        </div>
        <button onClick={loadEvents} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-300 text-sm hover:bg-stone-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

      <section className="bg-white rounded-xl border border-stone-200 p-5 space-y-3">
        <h2 className="font-semibold text-stone-800">Account recovery</h2>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or phone"
            className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm"
          />
          <button onClick={searchUsers} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
            Search
          </button>
        </div>
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between text-sm border-t border-stone-100 pt-2">
            <span className="text-stone-700">{u.full_name || 'No name'} · {u.email} · {u.phone || 'no phone'} · {u.role}</span>
            <button onClick={() => issueRecovery(u.id)} className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800">
              <Link2 className="h-4 w-4" /> Create reset link
            </button>
          </div>
        ))}
        {recoveryLink && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-stone-700 break-all">
            One-time reset link (share privately with the account owner, then discard): {recoveryLink}
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-200 font-semibold text-stone-800">Recent activity</div>
        {loading ? (
          <p className="p-5 text-sm text-stone-500">Loading...</p>
        ) : events.length === 0 ? (
          <p className="p-5 text-sm text-stone-500">No suspicious activity recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-stone-600 text-left">
                <tr>
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2">Event</th>
                  <th className="px-4 py-2">Account</th>
                  <th className="px-4 py-2">Source</th>
                  <th className="px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} className="border-t border-stone-100">
                    <td className="px-4 py-2 text-stone-600 whitespace-nowrap">{new Date(ev.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-stone-800">
                      {ev.event_type.replace(/_/g, ' ')}
                      {ev.cooldown_minutes ? <span className="text-stone-500"> ({ev.cooldown_minutes} min)</span> : null}
                    </td>
                    <td className="px-4 py-2 text-stone-600">
                      {ev.account.label}
                      {ev.account.role ? <span className="text-stone-400"> · {ev.account.role}</span> : null}
                    </td>
                    <td className="px-4 py-2 text-stone-500 font-mono text-xs">{ev.source}</td>
                    <td className="px-4 py-2">
                      {ev.has_lock ? (
                        <button onClick={() => clearLock(ev.id)} className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800">
                          <Unlock className="h-4 w-4" /> Clear cooldown
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function AdminSecurityPage() {
  return (
    <AdminMfaGate>
      <SecurityConsole />
    </AdminMfaGate>
  );
}
