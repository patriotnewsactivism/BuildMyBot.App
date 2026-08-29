import { supabase } from './supabaseClient';

export interface Base44SuperagentResult {
  conversationId: string;
  messageId: string | null;
  content: string;
}

export interface Base44SuperagentOptions {
  conversationId?: string;
  fileUrls?: string[];
  timeoutMs?: number;
}

/**
 * Calls BuildMyBot's authenticated server-side Base44 proxy. The Base44 API
 * credential never reaches the browser; this client sends only the current
 * Supabase session token so the server can enforce BASE44_ALLOWED_EMAILS.
 */
export async function callBase44Superagent(
  task: string,
  options: Base44SuperagentOptions = {},
): Promise<Base44SuperagentResult> {
  const prompt = task.trim();
  if (!prompt) throw new Error('Base44 Superagent task must not be empty');
  if (!supabase) throw new Error('Supabase authentication is not configured');

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error('Sign in before using the internal Base44 Superagent');

  const response = await fetch('/api/base44-agent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      task: prompt,
      conversationId: options.conversationId,
      fileUrls: options.fileUrls ?? [],
      timeoutMs: options.timeoutMs,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as
    | Base44SuperagentResult
    | { error?: string };
  if (!response.ok) {
    throw new Error(
      'error' in payload && payload.error
        ? payload.error
        : `Base44 Superagent request failed (${response.status})`,
    );
  }

  return payload as Base44SuperagentResult;
}
