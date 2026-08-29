const DEFAULT_AGENT_ID = '6a515f4e071e32fc10378575';
const BASE44_AGENT_API = 'https://app.base44.com/api/agents';
const DEFAULT_TIMEOUT_MS = 45_000;
const MAX_TIMEOUT_MS = 50_000;
const POLL_INTERVAL_MS = 1_000;

function base44Key() {
  return (process.env.BASE44_SUPERAGENT_API_KEY || '').trim();
}

function agentId() {
  return (process.env.BASE44_SUPERAGENT_ID || DEFAULT_AGENT_ID).trim();
}

function timeoutMs(requested) {
  const envDefault = Number(process.env.BASE44_SUPERAGENT_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const candidate = Number.isFinite(Number(requested)) ? Number(requested) : envDefault;
  return Math.min(MAX_TIMEOUT_MS, Math.max(1_000, Math.floor(candidate || DEFAULT_TIMEOUT_MS)));
}

function supabaseConfig() {
  return {
    url: (
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      ''
    ).replace(/\/$/, ''),
    anonKey:
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      '',
  };
}

function allowedEmails() {
  return new Set(
    (process.env.BASE44_ALLOWED_EMAILS || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function requireAllowedUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    throw error;
  }

  const { url, anonKey } = supabaseConfig();
  if (!url || !anonKey) {
    const error = new Error('Supabase auth verification is not configured on the server');
    error.statusCode = 503;
    throw error;
  }

  const allowlist = allowedEmails();
  if (allowlist.size === 0) {
    const error = new Error('BASE44_ALLOWED_EMAILS is not configured; Base44 access is fail-closed');
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const error = new Error('Invalid or expired session');
    error.statusCode = 401;
    throw error;
  }

  const user = await response.json();
  const email = String(user.email || '').trim().toLowerCase();
  if (!email || !allowlist.has(email)) {
    const error = new Error('This account is not authorized to use the internal Base44 Superagent');
    error.statusCode = 403;
    throw error;
  }
  return user;
}

async function base44Fetch(path, init, signal) {
  const key = base44Key();
  if (!key) {
    const error = new Error('BASE44_SUPERAGENT_API_KEY is not configured');
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch(
    `${BASE44_AGENT_API}/${encodeURIComponent(agentId())}${path}`,
    {
      ...(init || {}),
      signal,
      headers: {
        'Content-Type': 'application/json',
        api_key: key,
        ...((init && init.headers) || {}),
      },
    },
  );
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`Base44 Superagent API ${response.status}: ${text.slice(0, 500)}`);
    error.statusCode = response.status >= 500 ? 502 : response.status;
    throw error;
  }
  return text ? JSON.parse(text) : {};
}

function conversationIdFrom(value) {
  return (value && (value.id || value.conversation_id)) || null;
}

function assistantMessages(conversation) {
  return Array.isArray(conversation && conversation.messages)
    ? conversation.messages.filter(
        (message) => message && message.role === 'assistant' && typeof message.content === 'string',
      )
    : [];
}

function newestNewAssistant(conversation, priorIds, priorCount) {
  const assistants = assistantMessages(conversation);
  for (let index = assistants.length - 1; index >= 0; index -= 1) {
    const message = assistants[index];
    if (message.id && !priorIds.has(message.id)) return message;
  }
  return assistants.length > priorCount ? assistants[assistants.length - 1] : null;
}

async function getConversation(conversationId, signal) {
  return base44Fetch(
    `/conversations/${encodeURIComponent(conversationId)}`,
    { method: 'GET' },
    signal,
  );
}

async function createConversation(signal) {
  const conversation = await base44Fetch(
    '/conversations',
    { method: 'POST', body: '{}' },
    signal,
  );
  const id = conversationIdFrom(conversation);
  if (!id) throw new Error('Base44 did not return a conversation id');
  return id;
}

async function callSuperagent({ task, conversationId, fileUrls, requestedTimeout }) {
  const controller = new AbortController();
  const waitMs = timeoutMs(requestedTimeout);
  const timer = setTimeout(() => controller.abort(), waitMs);

  try {
    let id = String(conversationId || '').trim();
    let before = { messages: [] };
    if (id) before = await getConversation(id, controller.signal);
    else id = await createConversation(controller.signal);

    const priorAssistants = assistantMessages(before);
    const priorIds = new Set(priorAssistants.map((message) => message.id).filter(Boolean));

    await base44Fetch(
      `/conversations/${encodeURIComponent(id)}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          role: 'user',
          content: task,
          file_urls: Array.isArray(fileUrls) ? fileUrls : [],
        }),
      },
      controller.signal,
    );

    while (!controller.signal.aborted) {
      const conversation = await getConversation(id, controller.signal);
      const reply = newestNewAssistant(conversation, priorIds, priorAssistants.length);
      if (reply && reply.content) {
        return {
          conversationId: id,
          messageId: reply.id || null,
          content: reply.content,
        };
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    throw new Error(`Base44 Superagent did not complete within ${waitMs}ms`);
  } catch (error) {
    if (controller.signal.aborted) {
      const timeoutError = new Error(`Base44 Superagent request timed out after ${waitMs}ms`);
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await requireAllowedUser(req);

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const task = typeof body.task === 'string' ? body.task.trim() : '';
    if (!task) return res.status(400).json({ error: 'task is required' });
    if (task.length > 100_000) return res.status(400).json({ error: 'task is too large' });

    const fileUrls = Array.isArray(body.fileUrls)
      ? body.fileUrls.filter((value) => typeof value === 'string').slice(0, 10)
      : [];

    const result = await callSuperagent({
      task,
      conversationId: body.conversationId,
      fileUrls,
      requestedTimeout: body.timeoutMs,
    });
    return res.status(200).json(result);
  } catch (error) {
    const status = Number(error && error.statusCode) || 500;
    const message = error instanceof Error ? error.message : String(error);
    return res.status(status).json({ error: message });
  }
}
