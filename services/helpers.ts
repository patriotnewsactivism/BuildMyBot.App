export const getApiKey = (): string => {
  // Use Vite's import.meta.env for browser environment
  return import.meta.env.VITE_OPENAI_API_KEY || "";
};

export const normalizeUrl = (url: string): string => {
  if (!url) return "";
  let clean = url.trim();
  if (!clean.startsWith("http")) clean = "https://" + clean;
  return clean;
};

// Simple HTML scraper
export const tryScrapeText = async (url: string): Promise<string> => {
  const response = await fetch(url);
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