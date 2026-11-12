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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ACCOUNT_IP_THRESHOLD = 5;
const ACCOUNT_LOG_THRESHOLD = 10;
const SUSPICIOUS_LOG_THRESHOLD = 3;
const IP_THRESHOLD = 50;
const BASE_COOLDOWN_MIN = 15;
const MAX_COOLDOWN_MIN = 1440;
const IP_BLOCK_MIN = 15;
const MINUTE = 60_000;
const WINDOW_MS = { account_ip: 30 * MINUTE, account: 60 * MINUTE, ip: 60 * MINUTE };
const STRIKE_DECAY_MS = 24 * 60 * MINUTE;
const GENERIC_FAILURE = "Incorrect phone/email or password.";
const RECOVERY_MESSAGE =
  "If an account matches those details, a password reset link has been sent. Accounts without an email address must contact the Isoko Link team for help.";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const encoder = new TextEncoder();

async function hashKey(scope: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SERVICE_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${scope}|${value}`));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

type Identifier = { kind: "email" | "phone"; value: string };

function normalizeIdentifier(raw: string): Identifier | null {
  const v = raw.trim();
  if (v.includes("@")) {
    if (v.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return null;
    return { kind: "email", value: v.toLowerCase() };
  }
  let digits = v.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "250" + digits.slice(1);
  if (!/^250\d{9}$/.test(digits)) return null;
  return { kind: "phone", value: digits };
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("cf-connecting-ip") || "unknown";
}

async function resolveEmails(ident: Identifier): Promise<string[]> {
  if (ident.kind === "email") return [ident.value];
  const { data, error } = await admin.rpc("get_emails_by_phone", { p_phone: "+" + ident.value });
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  // RETURNS TABLE rpcs return row objects ({ email: "..." }), not strings
  return data
    .map((row) => (typeof row === "object" && row !== null ? (row as { email?: unknown }).email : row))
    .filter((e): e is string => typeof e === "string" && e.length > 0);
}

async function resolveEmail(ident: Identifier): Promise<string | null> {
  const emails = await resolveEmails(ident);
  return emails.length > 0 ? emails[0] : null;
}

async function activeLockUntil(keys: string[]): Promise<number> {
  const { data, error } = await admin
    .from("login_attempts")
    .select("locked_until")
    .in("scope_key", keys)
    .gt("locked_until", new Date().toISOString());
  if (error) throw error;
  return (data ?? []).reduce(
    (max, row) => Math.max(max, Date.parse(row.locked_until)),
    0,
  );
}

async function logEvent(
  eventType: string,
  accountKey: string,
  ipKey: string,
  userId: string | null,
  details: Record<string, unknown>,
) {
  const { error } = await admin.from("security_events").insert({
    event_type: eventType,
    account_key: accountKey,
    ip_key: ipKey,
    user_id: userId,
    details,
  });
  if (error) console.error("security event insert failed", error.message);
}

async function recordFailure(
  scope: "account_ip" | "account" | "ip",
  key: string,
  context: { accountKey: string; ipKey: string; userId: string | null },
) {
  const now = Date.now();
  const { data: existing, error: readError } = await admin
    .from("login_attempts")
    .select("failed_count, strikes, last_failed_at")
    .eq("scope_key", key)
    .maybeSingle();
  if (readError) throw readError;

  const last = existing?.last_failed_at ? Date.parse(existing.last_failed_at) : 0;
  let failed = now - last > WINDOW_MS[scope] ? 0 : existing?.failed_count ?? 0;
  let strikes = now - last > STRIKE_DECAY_MS ? 0 : existing?.strikes ?? 0;
  failed += 1;

  let lockedUntil: number | null = null;
  let eventType: string | null = null;
  let details: Record<string, unknown> = { scope, lock_keys: [key] };

  if (scope === "account_ip" && failed >= ACCOUNT_IP_THRESHOLD) {
    const minutes = Math.min(BASE_COOLDOWN_MIN * 2 ** strikes, MAX_COOLDOWN_MIN);
    lockedUntil = now + minutes * MINUTE;
    strikes += 1;
    failed = 0;
    eventType = "cooldown_started";
    details = { ...details, cooldown_minutes: minutes };
  } else if (scope === "ip" && failed >= IP_THRESHOLD) {
    lockedUntil = now + IP_BLOCK_MIN * MINUTE;
    failed = 0;
    eventType = "ip_temporarily_blocked";
  } else if (scope === "account_ip" && failed === SUSPICIOUS_LOG_THRESHOLD) {
    eventType = "repeated_failed_login";
  } else if (scope === "account" && failed === ACCOUNT_LOG_THRESHOLD) {
    eventType = "suspicious_account_activity";
  }

  const { error: writeError } = await admin.from("login_attempts").upsert({
    scope_key: key,
    scope,
    failed_count: failed,
    strikes,
    locked_until: lockedUntil ? new Date(lockedUntil).toISOString() : null,
    last_failed_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString(),
  });
  if (writeError) throw writeError;

  if (eventType) {
    await logEvent(eventType, context.accountKey, context.ipKey, context.userId, details);
  }
}

async function clearCounters(keys: string[]) {
  const { error } = await admin
    .from("login_attempts")
    .update({ failed_count: 0, strikes: 0, locked_until: null, last_failed_at: null, updated_at: new Date().toISOString() })
    .in("scope_key", keys);
  if (error) throw error;
}

function minutesLeft(untilMs: number): number {
  return Math.max(1, Math.ceil((untilMs - Date.now()) / MINUTE));
}

async function verifyTurnstile(token: unknown, ip: string): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return true;
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return false;
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip !== "unknown") form.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const data = await res.json().catch(() => null);
  return data?.success === true;
}

async function profileIdForEmail(email: string | null): Promise<string | null> {
  if (!email) return null;
  const { data } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  return data?.id ?? null;
}

async function handleSignIn(body: { identifier?: unknown; password?: unknown; captchaToken?: unknown }, ip: string) {
  if (typeof body.identifier !== "string" || typeof body.password !== "string") {
    return json({ error: GENERIC_FAILURE }, 400);
  }
  if (body.identifier.length > 320 || body.password.length === 0 || body.password.length > 256) {
    return json({ error: GENERIC_FAILURE }, 400);
  }
  if (!(await verifyTurnstile(body.captchaToken, ip))) {
    return json({ error: "Verification failed. Please complete the check and try again." }, 400);
  }

  const ident = normalizeIdentifier(body.identifier);
  const identValue = ident ? `${ident.kind}:${ident.value}` : `raw:${body.identifier.trim().toLowerCase()}`;
  const accountKey = await hashKey("account", identValue);
  const ipKey = await hashKey("ip", ip);
  const pairKey = await hashKey("account_ip", `${identValue}|${ip}`);

  const lockUntil = await activeLockUntil([pairKey, accountKey, ipKey]);
  if (lockUntil > Date.now()) {
    return json(
      {
        error: `Too many failed attempts. Please try again in ${minutesLeft(lockUntil)} minute(s).`,
        retry_after_minutes: minutesLeft(lockUntil),
      },
      429,
    );
  }

  const candidateEmails = ident ? await resolveEmails(ident) : [];

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let session: { access_token: string; refresh_token: string } | null = null;
  let signedInUserId: string | null = null;

  for (const email of candidateEmails) {
    const { data, error } = await anon.auth.signInWithPassword({ email, password: body.password });
    if (!error && data?.session && data.user) {
      session = { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
      signedInUserId = data.user.id;
      break;
    }
  }

  if (!session || !signedInUserId) {
    const failureContext = { accountKey, ipKey, userId: await profileIdForEmail(candidateEmails[0] ?? null) };
    await recordFailure("account_ip", pairKey, failureContext);
    await recordFailure("account", accountKey, failureContext);
    await recordFailure("ip", ipKey, failureContext);
    return json({ error: GENERIC_FAILURE }, 401);
  }

  await clearCounters([pairKey, accountKey]);

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role, full_name")
    .eq("id", signedInUserId)
    .maybeSingle();
  if (profileError) throw profileError;

  return json({
    session,
    profile: profile ?? null,
  });
}

async function handleRecovery(body: { identifier?: unknown; redirectTo?: unknown; captchaToken?: unknown }, ip: string) {
  if (typeof body.identifier !== "string" || body.identifier.length > 320) {
    return json({ message: RECOVERY_MESSAGE });
  }
  if (!(await verifyTurnstile(body.captchaToken, ip))) {
    return json({ error: "Verification failed. Please complete the check and try again." }, 400);
  }
  const ipKey = await hashKey("ip", ip);
  const recoveryIpKey = await hashKey("recovery_ip", ip);
  const lockUntil = await activeLockUntil([recoveryIpKey]);
  if (lockUntil > Date.now()) {
    return json({ error: "Too many requests. Please try again later." }, 429);
  }

  const ident = normalizeIdentifier(body.identifier);
  const identValue = ident ? `${ident.kind}:${ident.value}` : `raw:${body.identifier.trim().toLowerCase()}`;
  const accountKey = await hashKey("account", identValue);
  await recordFailure("ip", recoveryIpKey, { accountKey, ipKey, userId: null });

  const email = ident ? await resolveEmail(ident) : null;
  if (email) {
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    const userId = profile?.id ?? null;

    if (email.endsWith("@isoko.link")) {
      await logEvent("recovery_requires_admin", accountKey, ipKey, userId, { reason: "no_real_email" });
    } else {
      const redirectTo = typeof body.redirectTo === "string" ? body.redirectTo : undefined;
      const anon = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await anon.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) console.error("reset email failed", error.message);
      await logEvent("recovery_requested", accountKey, ipKey, userId, {});
    }
  }

  return json({ message: RECOVERY_MESSAGE });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const ip = clientIp(req);
    if (body?.action === "sign_in") return await handleSignIn(body, ip);
    if (body?.action === "request_recovery") return await handleRecovery(body, ip);
    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("auth-gateway error", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
