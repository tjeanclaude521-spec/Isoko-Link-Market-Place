const GATEWAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-gateway`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const NETWORK_ERROR = 'Network error. Please check your connection and try again.';

type GatewaySession = { access_token: string; refresh_token: string };

async function postToGateway(body: Record<string, unknown>) {
  const response = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return { status: response.status, data };
}

export async function gatewaySignIn(
  identifier: string,
  password: string,
  captchaToken: string,
): Promise<{ session: GatewaySession | null; error: string | null }> {
  try {
    const { status, data } = await postToGateway({ action: 'sign_in', identifier, password, captchaToken });
    const session = data?.session as GatewaySession | undefined;
    if (status === 200 && session?.access_token && session?.refresh_token) {
      return { session, error: null };
    }
    const message = typeof data?.error === 'string' ? data.error : 'Sign in failed. Please try again.';
    return { session: null, error: message };
  } catch {
    return { session: null, error: NETWORK_ERROR };
  }
}

export async function requestPasswordRecovery(
  identifier: string,
  redirectTo: string,
  captchaToken: string,
): Promise<{ message: string | null; error: string | null }> {
  try {
    const { status, data } = await postToGateway({ action: 'request_recovery', identifier, redirectTo, captchaToken });
    if (status === 200 && typeof data?.message === 'string') {
      return { message: data.message, error: null };
    }
    const message = typeof data?.error === 'string' ? data.error : 'Could not send the reset link. Please try again.';
    return { message: null, error: message };
  } catch {
    return { message: null, error: NETWORK_ERROR };
  }
}
