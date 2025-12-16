/// <reference types="vitest" />
import { createServer, IncomingMessage } from 'http';

const projectId = 'demo-buildmybot';
const emulatorBase = `http://127.0.0.1:5001/${projectId}/us-central1`;

const startStubServer = (port: number) => {
  let lastAuthHeader = '';
  let lastPath = '';

  const server = createServer((req: IncomingMessage, res) => {
    lastAuthHeader = req.headers['authorization'] as string;
    lastPath = req.url ?? '';

    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, path: lastPath, body: body ? JSON.parse(body) : null }));
    });
  });

  return {
    listen: () =>
      new Promise<void>(resolve => {
        server.listen(port, resolve);
      }),
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()));
      }),
    get lastAuthHeader() {
      return lastAuthHeader;
    },
    get lastPath() {
      return lastPath;
    }
  };
};

describe('proxyToProviders function', () => {
  const stubPort = 9393;
  const stubServer = startStubServer(stubPort);

  beforeAll(async () => {
    if (!process.env.FIREBASE_EMULATOR_HUB) {
      throw new Error('Functions emulator must be running via firebase emulators:exec');
    }

    await stubServer.listen();
  });

  afterAll(async () => {
    await stubServer.close();
  });

  it('rejects requests without authentication', async () => {
    const response = await fetch(`${emulatorBase}/proxyToProviders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'openai', path: '/chat/completions' })
    });

    expect(response.status).toBe(401);
  });

  it('proxies an allowed OpenAI request when authenticated', async () => {
    const response = await fetch(`${emulatorBase}/proxyToProviders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emulator-Uid': 'tester'
      },
      body: JSON.stringify({
        provider: 'openai',
        path: '/chat/completions',
        method: 'POST',
        body: { message: 'hello' }
      })
    });

    const payload = (await response.json()) as { data: { ok: boolean; path: string } };

    expect(response.status).toBe(200);
    expect(payload.data.ok).toBe(true);
    expect(payload.data.path).toContain('/chat/completions');
    expect(stubServer.lastAuthHeader).toContain('Bearer');
  });

  it('blocks access to disallowed provider paths', async () => {
    const response = await fetch(`${emulatorBase}/proxyToProviders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emulator-Uid': 'tester'
      },
      body: JSON.stringify({ provider: 'openai', path: '/v1/unauthorized' })
    });

    expect(response.status).toBe(400);
  });
});
