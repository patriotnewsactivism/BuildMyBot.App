import {
  getApiKey,
  normalizeUrl,
  tryScrapeText,
  sanitizeMessages
} from "./helpers";

// -----------------------------------------------------------
// SUMMARIZE WEBPAGE CONTENT
// -----------------------------------------------------------

const summarizeContent = async (text: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  const truncated = text.substring(0, 4000);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Summarize the website content clearly. Extract: business purpose, services, contact info, pricing, hours, or key offerings."
        },
        { role: "user", content: truncated }
      ]
    })
  });

  if (!response.ok) throw new Error("Failed to summarize content.");
  const data = await response.json();

  return data.choices?.[0]?.message?.content || truncated.substring(0, 1000);
};

// -----------------------------------------------------------
// FALLBACK OCR FROM SCREENSHOT
// -----------------------------------------------------------

const performVisionFallback = async (url: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing.");

  const screenshot = `https://image.thum.io/get/width/1200/${encodeURIComponent(
    url
  )}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an OCR assistant. Extract business info from the screenshot."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Extract business name, description, services, pricing, contact info, and hours."
            },
            {
              type: "image_url",
              image_url: { url: screenshot }
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) throw new Error("OCR screenshot failed.");
  const data = await response.json();

  return data.choices?.[0]?.message?.content || "";
};

// -----------------------------------------------------------
// MAIN WEBSITE SCRAPER
// -----------------------------------------------------------

export const scrapeWebsite = async (url: string): Promise<string> => {
  try {
    const cleanUrl = normalizeUrl(url);
    if (!cleanUrl) throw new Error("Invalid URL.");

    try {
      const raw = await tryScrapeText(cleanUrl);
      return await summarizeContent(raw);
    } catch (err) {
      console.warn("HTML scrape failed — using OCR fallback.", err);
      return await performVisionFallback(cleanUrl);
    }
  } catch (error: any) {
    throw new Error("Failed to scrape website: " + (error.message || ""));
  }
};

// -----------------------------------------------------------
// COMPATIBILITY EXPORT: scrapeWebsiteContent (legacy import)
// -----------------------------------------------------------

export const scrapeWebsiteContent = async (url: string) => {
  return await scrapeWebsite(url);
};

// -----------------------------------------------------------
// MULTI-TURN CHAT: generateBotResponse (Option B)
// -----------------------------------------------------------

export const generateBotResponse = async (
  messages: { role: "system" | "user" | "assistant"; content: string }[]
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing.");

  const cleanMessages = sanitizeMessages(messages);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: cleanMessages
    })
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
};

// -----------------------------------------------------------
// MARKETING CONTENT GENERATOR
// -----------------------------------------------------------

export const generateMarketingContent = async (
  type: string,
  topic: string,
  tone: string
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "Error: API Key missing.";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `You are an expert copywriter. Tone: ${tone}.` },
          {
            role: "user",
            content: `Write a ${type} about ${topic}. Return only the content.`
          }
        ]
      })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch {
    return "Failed to generate content.";
  }
};

// -----------------------------------------------------------
// WEBSITE STRUCTURE GENERATOR
// -----------------------------------------------------------

export const generateWebsiteStructure = async (
  businessName: string,
  description: string
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing.");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a Website Builder AI. Output JSON with keys: headline, subheadline, features[], ctaText."
        },
        {
          role: "user",
          content: `Build a landing page structure for ${businessName}. Description: ${description}`
        }
      ]
    })
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "{}";
};