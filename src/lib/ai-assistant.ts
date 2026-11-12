/**
 * Client for the Isoko Link AI Agricultural Assistant edge function.
 * Calls the server-side function which handles AI + glossary fallback.
 */

export type AssistantAction =
  | 'explain_term'
  | 'translate'
  | 'explain_product'
  | 'listing_tips'
  | 'price_calc';

export interface AssistantResponse {
  response: string;
  source: 'ai' | 'glossary';
  message?: string;
  error?: string;
}

export interface ProductContext {
  name: string;
  description: string;
  price: number;
  unit: string;
  quantity_available?: number;
}

export interface CalcContext {
  pricePerUnit: number;
  quantity: number;
}

export async function callAssistant(
  action: AssistantAction,
  lang: 'en' | 'rw',
  data?: {
    term?: string;
    phrase?: string;
    product?: ProductContext;
    calc?: CalcContext;
  }
): Promise<AssistantResponse> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, lang, ...data }),
    });

    if (!res.ok) {
      return {
        response: lang === 'rw'
          ? 'Serivisi y\'AI ntiyaboneze kuri ubu. Ongera ugerageze.'
          : 'The AI service is unavailable right now. Please try again.',
        source: 'glossary',
        error: `HTTP ${res.status}`,
      };
    }

    const json = await res.json();
    if (json.error) {
      return {
        response: lang === 'rw'
          ? 'Hari ikibazo. Ongera ugerageze.'
          : 'Something went wrong. Please try again.',
        source: 'glossary',
        error: json.error,
      };
    }

    return {
      response: json.response || '',
      source: json.source || 'glossary',
      message: json.message,
    };
  } catch {
    return {
      response: lang === 'rw'
        ? 'Ntibyabuze ukwihuza. Ongera ugerageze.'
        : 'Connection failed. Please try again.',
      source: 'glossary',
      error: 'network',
    };
  }
}
