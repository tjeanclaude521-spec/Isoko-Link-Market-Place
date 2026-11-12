import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const SITE_URL = "https://isoko-link-agricultu-w1wk.bolt.host";
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = (body as { action?: string }).action ?? "send";

    const { data: bootstrap, error: readError } = await admin
      .from("admin_bootstrap")
      .select("id, allowed_email, status, invited_user_id")
      .eq("id", true)
      .maybeSingle();
    if (readError) throw readError;
    if (!bootstrap || bootstrap.status === "claimed") {
      return json({ error: "This setup invitation is no longer available." }, 410);
    }

    const redirectTo = `${SITE_URL}/admin/setup`;

    if (action === "resend") {
      if (bootstrap.status !== "invited") {
        return json({ error: "No sent invitation to resend." }, 400);
      }
      const recoverResponse = await fetch(
        `${supabaseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
        {
          method: "POST",
          headers: { apikey: anonKey, "Content-Type": "application/json" },
          body: JSON.stringify({ email: bootstrap.allowed_email }),
        },
      );
      if (!recoverResponse.ok) {
        throw new Error(`Recovery email request failed with status ${recoverResponse.status}`);
      }

      const { error: updateError } = await admin
        .from("admin_bootstrap")
        .update({ invited_at: new Date().toISOString() })
        .eq("id", true);
      if (updateError) throw updateError;

      return json({ ok: true, message: "A fresh setup invitation has been sent to your email." });
    }

    // Default action: send (first-time only)
    if (bootstrap.status === "invited") {
      return json({ ok: true, message: "The setup invitation has already been sent. Use resend if the link is expired." });
    }

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      bootstrap.allowed_email,
      { redirectTo },
    );
    if (inviteError || !invited.user) throw inviteError ?? new Error("Invitation was not created");

    const { error: updateError } = await admin
      .from("admin_bootstrap")
      .update({ status: "invited", invited_user_id: invited.user.id, invited_at: new Date().toISOString() })
      .eq("id", true)
      .eq("status", "pending");
    if (updateError) throw updateError;

    return json({ ok: true, message: "The setup invitation has been sent." });
  } catch (error) {
    console.error("admin-bootstrap error", error);
    return json({ error: "The setup invitation could not be sent. Please try again." }, 500);
  }
});
