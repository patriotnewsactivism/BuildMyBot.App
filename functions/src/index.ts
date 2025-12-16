import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { z } from 'zod';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

type ProviderKey = 'openai' | 'generic';

type ProviderConfig = {
  baseUrl: string;
  apiKeyEnv: string;
  allowedPaths: RegExp[];
  authHeader: string;
  formatKey?: (key: string) => string;
};

const escapeForRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildPathRegexes = (rawPrefixes?: string): RegExp[] => {
  if (!rawPrefixes) return [];
  return rawPrefixes
    .split(',')
    .map(prefix => prefix.trim())
    .filter(Boolean)
    .map(prefix => new RegExp(`^${escapeForRegex(prefix)}`));
};

const genericAllowedPrefixes = buildPathRegexes(process.env.GENERIC_ALLOWED_PATH_PREFIXES);

const PROVIDERS: Record<ProviderKey, ProviderConfig> = {
  openai: {
    baseUrl: process.env.OPENAI_API_BASE ?? 'https://api.openai.com/v1/',
    apiKeyEnv: 'OPENAI_API_KEY',
    allowedPaths: [
      /^\/?chat\/completions/,
      /^\/?audio\/transcriptions/,
      /^\/?images\/generations/
    ],
    authHeader: 'authorization',
    formatKey: key => `Bearer ${key}`
  },
  generic: {
    baseUrl: process.env.GENERIC_PROXY_BASE_URL ?? '',
    apiKeyEnv: 'GENERIC_API_KEY',
    allowedPaths: genericAllowedPrefixes,
    authHeader: 'authorization',
    formatKey: key => (key.startsWith('Bearer ') ? key : `Bearer ${key}`)
  }
};

const requestSchema = z.object({
  provider: z.enum(['openai', 'generic']),
  path: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  body: z.union([z.record(z.any()), z.string()]).optional(),
  headers: z.record(z.string()).optional()
});

type AuthContext = {
  uid: string;
};

const ensureLeadingSlash = (value: string): string => (value.startsWith('/') ? value : `/${value}`);
const trimTrailingSlash = (value: string): string => (value.endsWith('/') ? value.slice(0, -1) : value);

const headerAllowList = new Set([
  'content-type',
  'openai-organization',
  'openai-beta',
  'accept'
]);

const resolveHttpStatus = (error: functions.https.HttpsError): number => {
  const typedError = error as functions.https.HttpsError & { httpErrorCode?: { status: number } };
  return typedError.httpErrorCode?.status ?? 500;
};

const authenticateRequest = async (req: functions.Request): Promise<AuthContext> => {
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    const emulatorUid = req.header('x-emulator-uid');
    if (emulatorUid) {
      return { uid: emulatorUid };
    }
  }

  const authHeader = req.header('authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    throw new functions.https.HttpsError('unauthenticated', 'A Bearer token is required.');
  }

  const token = authHeader.replace(/^Bearer /i, '');
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return { uid: decoded.uid };
  } catch (error) {
    functions.logger.warn('Token verification failed', { error });
    throw new functions.https.HttpsError('unauthenticated', 'Invalid authentication token.');
  }
};

const validatePath = (path: string, allowed: RegExp[]): string => {
  const normalized = ensureLeadingSlash(path);
  const isAllowed = allowed.some(pattern => pattern.test(normalized));
  if (!isAllowed) {
    throw new functions.https.HttpsError('invalid-argument', 'Requested path is not allowed.');
  }
  return normalized;
};

const buildHeaders = (config: ProviderConfig, apiKey: string, providedHeaders?: Record<string, string>) => {
  const sanitized: Record<string, string> = {};

  if (providedHeaders) {
    for (const [key, value] of Object.entries(providedHeaders)) {
      const lowerKey = key.toLowerCase();
      if (headerAllowList.has(lowerKey)) {
        sanitized[lowerKey] = value;
      }
    }
  }

  sanitized[config.authHeader.toLowerCase()] = config.formatKey ? config.formatKey(apiKey) : apiKey;
  if (!sanitized['content-type'] && config.authHeader.toLowerCase() !== 'content-type') {
    sanitized['content-type'] = 'application/json';
  }

  return sanitized;
};

export const proxyToProviders = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.set('Allow', 'POST');
    res.status(405).json({ error: 'Only POST is allowed.' });
    return;
  }

  try {
    const authContext = await authenticateRequest(req);
    functions.logger.info('Proxy request received', { provider: req.body?.provider, uid: authContext.uid });

    const parsedBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const payload = requestSchema.parse(parsedBody ?? {});
    const providerConfig = PROVIDERS[payload.provider];

    if (!providerConfig || !providerConfig.baseUrl) {
      throw new functions.https.HttpsError('failed-precondition', `${payload.provider} provider is not configured.`);
    }

    if (!providerConfig.allowedPaths.length) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `${payload.provider} allowed paths are not configured.`
      );
    }

    const apiKey = process.env[providerConfig.apiKeyEnv];
    if (!apiKey) {
      throw new functions.https.HttpsError('failed-precondition', `${providerConfig.apiKeyEnv} is not set.`);
    }

    const targetPath = validatePath(payload.path, providerConfig.allowedPaths);
    const targetUrl = `${trimTrailingSlash(providerConfig.baseUrl)}${targetPath}`;
    const headers = buildHeaders(providerConfig, apiKey, payload.headers);

    const response = await fetch(targetUrl, {
      method: payload.method,
      headers,
      body: payload.method === 'GET' ? undefined : typeof payload.body === 'string' ? payload.body : JSON.stringify(payload.body ?? {})
    });

    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    const responsePayload = isJson ? await response.json() : await response.text();

    res.status(response.status).json({
      provider: payload.provider,
      status: response.status,
      data: responsePayload
    });
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      res.status(resolveHttpStatus(error)).json({ error: error.message });
      return;
    }
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues });
      return;
    }

    functions.logger.error('Proxy invocation failed', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});
