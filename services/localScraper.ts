import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const DEFAULT_SCRIPT_PATH = process.env.LOCAL_SCRAPER_PATH || 'C:\\SCRAPER\\scrape_cli.py';
const DEFAULT_PYTHON = process.env.LOCAL_SCRAPER_PYTHON || 'python';

const parseIntEnv = (name: string, fallback: number) => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseFloatEnv = (name: string, fallback: number) => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

type LocalScrapeResult = {
  content: string;
  source: 'local-scraper';
};

export async function scrapeWithLocalScraper(url: string): Promise<LocalScrapeResult | null> {
  const scriptPath = DEFAULT_SCRIPT_PATH;
  try {
    await access(scriptPath, fsConstants.F_OK);
  } catch {
    return null;
  }

  const maxPages = parseIntEnv('LOCAL_SCRAPER_MAX_PAGES', 6);
  const maxDepth = parseIntEnv('LOCAL_SCRAPER_MAX_DEPTH', 1);
  const timeoutSec = parseFloatEnv('LOCAL_SCRAPER_TIMEOUT_SEC', 12);
  const delayMs = parseIntEnv('LOCAL_SCRAPER_DELAY_MS', 150);
  const maxChars = parseIntEnv('LOCAL_SCRAPER_MAX_CHARS', 120000);
  const execTimeoutMs = parseIntEnv('LOCAL_SCRAPER_EXEC_TIMEOUT_MS', 45000);

  const args = [
    scriptPath,
    '--url',
    url,
    '--max-pages',
    String(maxPages),
    '--max-depth',
    String(maxDepth),
    '--timeout',
    String(timeoutSec),
    '--delay-ms',
    String(delayMs),
    '--max-chars',
    String(maxChars),
  ];

  try {
    const { stdout } = await execFileAsync(DEFAULT_PYTHON, args, {
      timeout: execTimeoutMs,
      maxBuffer: 5 * 1024 * 1024,
      windowsHide: true,
    });

    const trimmed = stdout.trim();
    if (!trimmed) return null;

    let parsed: { content?: string } | string;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return { content: trimmed, source: 'local-scraper' };
    }

    if (typeof parsed === 'object' && parsed && typeof parsed.content === 'string' && parsed.content.trim()) {
      return { content: parsed.content, source: 'local-scraper' };
    }

    return null;
  } catch (error) {
    console.error('Local scraper failed:', error);
    return null;
  }
}
