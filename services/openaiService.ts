import { getApiKey, normalizeUrl, tryScrapeText } from "./helpers"; 
// ^ adjust imports if needed

// ---------------------------
// SUMMARIZATION FUNCTION (FIX)
// ---------------------------

const summarizeContent = async (text: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  const truncatedText = text.substring(0, 4000);

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
          content: "Summarize this webpage content concisely. Extract the business purpose, services, contact info, and essential details."
        },
        {
          role: "user",
          content: truncatedText
        }
      ]
    })
  });

  if (!response.ok) throw new Error("Failed to summarize content.");
  const data = await response.json();

  return data.choices?.[0]?.message?.content || truncatedText.substring(0, 1000);
};

// --------------------------------------
// FALLBACK: OCR SCREENSHOT EXTRACTION
// --------------------------------------

const performVisionFallback = async (targetUrl: string) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  const screenshotUrl = `https://image.thum.io/get/width/1200/${encodeURIComponent(targetUrl)}`;

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
          content: "You are an OCR and data extraction assistant. Analyze the screenshot and extract key business facts."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "The HTML scrape failed. Extract: business name, services, contact info, pricing, and hours."
            },
            {
              type: "image_url",
              image_url: { url: screenshotUrl }
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) throw new Error("Failed to OCR screenshot.");
  const data = await response.json();

  return data.choices[0]?.message?.content || "";
};

// --------------------------------------
// MAIN SCRAPE FUNCTION
// --------------------------------------

export const scrapeWebsite = async (url: string): Promise<string> => {
  try {
    const targetUrl = normalizeUrl(url);
    if (!targetUrl) throw new Error("Invalid URL");

    try {
      const rawText = await tryScrapeText(targetUrl);
      return await summarizeContent(rawText);
    } catch (scrapeErr) {
      console.warn("HTML scrape failed, using screenshot OCR fallback:", scrapeErr);
      return await performVisionFallback(targetUrl);
    }

  } catch (error: any) {
    console.error("Scrape Error:", error);
    throw new Error("Failed to scrape website. " + (error.message || ""));
  }
};

// -------------------------------------------------------
// AI MARKETING CONTENT GENERATOR
// -------------------------------------------------------

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
          { role: "system", content: `You are an expert copywriter. Tone: ${tone}` },
          { role: "user", content: `Write a ${type} about ${topic}. Return ONLY the content.` }
        ]
      })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";

  } catch (e) {
    return "Failed to generate content.";
  }
};

// -------------------------------------------------------
// WEBSITE STRUCTURE GENERATOR
// -------------------------------------------------------

export const generateWebsiteStructure = async (
  businessName: string,
  description: string
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  try {
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
              "You are a Website Builder AI. Output JSON only with keys: headline, subheadline, features (array), ctaText."
          },
          {
            role: "user",
            content: `Generate landing page structure for "${businessName}". Description: ${description}`
          }
        ]
      })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "{}";

  } catch (e) {
    console.error("Website structure generation failed:", e);
    throw e;
  }
};