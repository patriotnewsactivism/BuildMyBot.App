export const normalizeUrl = (url: string): string => {
  if (!url) return "";
  let clean = url.trim();
  if (!clean.startsWith("http")) clean = "https://" + clean;
  return clean;
};

export const isSafeHttpUrl = (url: string): boolean => {
  try {
    const sanitized = url.trim();
    const hasProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(sanitized);
    const candidate = hasProtocol ? sanitized : normalizeUrl(sanitized);

    const parsed = new URL(candidate);

    if (!['http:', 'https:'].includes(parsed.protocol)) return false;

    const blockedHosts = ['localhost', '127.0.0.1', '::1'];
    if (blockedHosts.includes(parsed.hostname.toLowerCase())) return false;

    const privateRanges = [/^10\./, /^192\.168\./, /^172\.(1[6-9]|2[0-9]|3[0-1])\./, /^169\.254\./];
    if (privateRanges.some((pattern) => pattern.test(parsed.hostname))) return false;

    return true;
  } catch {
    return false;
  }
};

// Simple HTML scraper
export const tryScrapeText = async (url: string): Promise<string> => {
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Failed to fetch content for ${url}`);
  }
  return await response.text();
};

// Clean messages for safety & formatting
export const sanitizeMessages = (
  messages: { role: "system" | "user" | "assistant"; content: string }[]
) => {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content?.toString()?.slice(0, 4000) || ""
  }));
};
