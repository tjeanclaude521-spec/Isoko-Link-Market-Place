import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function tokenAal(token: string): string | null {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), "=")));
    return typeof payload.aal === "string" ? payload.aal : null;
  } catch {
    return null;
  }
}

async function requireAdmin(req: Request): Promise<{ id: string } | null> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: userData, error } = await admin.auth.getUser(token);
  if (error || !userData.user) return null;
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profileError || profile?.role !== "admin") return null;
  return { id: userData.user.id, aal: tokenAal(token) };
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "hidden";
  return `${local.slice(0, 2)}***@${domain}`;
}

function maskPhone(phone: string): string {
  return `***${phone.replace(/\D/g, "").slice(-3)}`;
}

function shortRef(hash: string | null): string {
  return hash ? hash.slice(0, 8) : "n/a";
}

async function listEvents(limit: number) {
  const { data: events, error } = await admin
    .from("security_events")
    .select("id, event_type, account_key, ip_key, user_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const userIds = [...new Set((events ?? []).map((e) => e.user_id).filter(Boolean))] as string[];
  const { data: profiles, error: profileError } = userIds.length
    ? await admin.from("profiles").select("id, email, phone, role").in("id", userIds)
    : { data: [], error: null };
  if (profileError) throw profileError;

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return (events ?? []).map((e) => {
    const profile = e.user_id ? byId.get(e.user_id) : undefined;
    const label = profile?.email
      ? maskEmail(profile.email)
      : profile?.phone
        ? maskPhone(profile.phone)
        : `Unlinked account ${shortRef(e.account_key)}`;
    return {
      id: e.id,
      event_type: e.event_type,
      created_at: e.created_at,
      cooldown_minutes: typeof e.details?.cooldown_minutes === "number" ? e.details.cooldown_minutes : null,
      has_lock: Array.isArray(e.details?.lock_keys) && e.details.lock_keys.length > 0,
      account: profile ? { label, role: profile.role } : { label, role: null },
      source: `Source ${shortRef(e.ip_key)}`,
    };
  });
}

async function clearLock(eventId: string, adminId: string) {
  const { data: event, error } = await admin
    .from("security_events")
    .select("id, user_id, details")
    .eq("id", eventId)
    .maybeSingle();
  if (error) throw error;
  if (!event) return json({ error: "Event not found." }, 404);

  const keys = Array.isArray(event.details?.lock_keys)
    ? (event.details.lock_keys as unknown[]).filter((k): k is string => typeof k === "string")
    : [];
  if (keys.length === 0) return json({ error: "This event has no lock to clear." }, 400);

  const { error: clearError } = await admin
    .from("login_attempts")
    .update({ failed_count: 0, strikes: 0, locked_until: null, last_failed_at: null, updated_at: new Date().toISOString() })
    .in("scope_key", keys);
  if (clearError) throw clearError;

  const { error: logError } = await admin.from("security_events").insert({
    event_type: "lock_cleared",
    user_id: event.user_id,
    details: { cleared_by: adminId, source_event_id: event.id },
  });
  if (logError) throw logError;

  return json({ ok: true });
}

async function searchUsers(query: string) {
  const term = query.trim().slice(0, 100).replace(/[%_,()]/g, "");
  if (term.length < 2) return json({ users: [] });
  const pattern = `%${term}%`;
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, email, phone, role")
    .or(`full_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
    .limit(20);
  if (error) throw error;
  return json({ users: data ?? [] });
}

async function issueRecoveryLink(userId: string, adminId: string) {
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, email")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!profile) return json({ error: "Account not found." }, 404);

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: profile.email,
  });
  if (linkError || !link?.properties?.action_link) throw linkError ?? new Error("No link returned");

  const { error: logError } = await admin.from("security_events").insert({
    event_type: "recovery_link_issued",
    user_id: profile.id,
    details: { issued_by: adminId },
  });
  if (logError) throw logError;

  return json({ action_link: link.properties.action_link });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const adminUser = await requireAdmin(req);
    if (!adminUser) return json({ error: "Not authorized." }, 403);
    if (adminUser.aal !== "aal2") {
      return json({ error: "Two-step verification is required for this area.", mfa_required: true }, 403);
    }

    const body = await req.json();
    if (body?.action === "list_events") {
      const limit = Math.min(Math.max(Number(body.limit) || 100, 1), 200);
      return json({ events: await listEvents(limit) });
    }
    if (body?.action === "clear_lock" && typeof body.event_id === "string") {
      return await clearLock(body.event_id, adminUser.id);
    }
    if (body?.action === "search_users" && typeof body.query === "string") {
      return await searchUsers(body.query);
    }
    if (body?.action === "recovery_link" && typeof body.user_id === "string") {
      return await issueRecoveryLink(body.user_id, adminUser.id);
    }
    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("admin-security error", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
