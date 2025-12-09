// Use process.env provided by Vite define config to avoid import.meta issues
const getApiKey = () => process.env.VITE_OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

export const generateBotResponse = async (
  systemPrompt: string,
  history: { role: 'user' | 'model'; text: string }[],
  lastMessage: string,
  modelName: string = 'gpt-4o-mini',
  context?: string
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "Configuration Error: OpenAI API Key is missing. Please check your environment variables.";

  // Construct messages
  const messages: any[] = [
    { role: 'system', content: systemPrompt }
  ];

  if (context) {
    messages[0].content += `\n\n### KNOWLEDGE BASE (Use this to answer):\n${context}\n\n### INSTRUCTIONS:\nAnswer strictly based on the provided Knowledge Base. If the answer is not in the text, state that you do not have that information.`;
  }

  history.forEach(msg => {
    messages.push({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.text
    });
  });

  messages.push({ role: 'user', content: lastMessage });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error("OpenAI API Error:", err);
        throw new Error(err.error?.message || response.statusText);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  } catch (error: any) {
    console.error("OpenAI Service Error:", error);
    return "I'm having trouble connecting to my AI brain right now. Please check your internet connection or API Key configuration.";
  }
};

export const scrapeWebsiteContent = async (url: string): Promise<string> => {
  if (!url) return "";
  const apiKey = getApiKey();

  // Scraping itself is public, but summarization and OCR require the OpenAI key.
  if (!apiKey) throw new Error("API Key missing");

  const normalizeUrl = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return "";
    return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  };

  const tryScrapeText = async (targetUrl: string) => {
    const noProtocol = targetUrl.replace(/^https?:\/\//, "");
    const attempts = [
      `https://r.jina.ai/${targetUrl}`,
      `https://r.jina.ai/https://${noProtocol}`,
      `https://r.jina.ai/http://${noProtocol}`,
      // CORS proxy fallback for environments that block direct fetches
      `https://corsproxy.io/?${encodeURIComponent(`https://r.jina.ai/${targetUrl}`)}`,
      `https://corsproxy.io/?${encodeURIComponent(`https://r.jina.ai/https://${noProtocol}`)}`,
    ];

    for (const attempt of attempts) {
      try {
        const response = await fetch(attempt);
        if (!response.ok) continue;
        const text = await response.text();
        if (text && text.trim().length > 0) return text;
      } catch (err) {
        console.warn("Scrape attempt failed", attempt, err);
      }
    }

    throw new Error("All text scrape attempts failed");
  };

  const summarizeContent = async (content: string) => {
    const truncatedText = content.substring(0, 15000); // Limit context window for cost/speed

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a precise Data Extractor. Extract business facts.' },
          { role: 'user', content: `Analyze this content and extract key business details:\n1. Business Name & Description\n2. Key Services/Products\n3. Contact Info (Email, Phone, Address)\n4. Pricing/Hours (if available)\n\nCONTENT:\n${truncatedText}` }
        ]
      })
    });

    if (!response.ok) throw new Error("Failed to summarize content.");
    const data = await response.json();
    return data.choices[0]?.message?.content || truncatedText.substring(0, 1000);
  };

  const performVisionFallback = async (targetUrl: string) => {
    // Lightweight screenshot endpoint (no API key). Only used when HTML scraping fails.
    const screenshotUrl = `https://image.thum.io/get/width/1200/${encodeURIComponent(targetUrl)}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an OCR and data extraction assistant. Read the screenshot and pull key business facts.' },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'The direct scrape failed. Read this screenshot and extract: business name/description, services, contact info (email/phone/address), and any pricing or hours.'
              },
              {
                type: 'image_url',
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

  try {
    const targetUrl = normalizeUrl(url);
    if (!targetUrl) throw new Error("Invalid URL");

    try {
      const rawText = await tryScrapeText(targetUrl);
      return await summarizeContent(rawText);
    } catch (scrapeErr) {
      console.warn("HTML scrape failed, falling back to screenshot OCR", scrapeErr);
      return await performVisionFallback(targetUrl);
    }
  } catch (error: any) {
    console.error("Scrape Error:", error);
    throw new Error("Failed to scrape website. " + (error.message || ""));
  }
};

export const generateMarketingContent = async (type: string, topic: string, tone: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "Error: API Key missing.";

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: `You are an expert Copywriter. Tone: ${tone}.` },
                    { role: 'user', content: `Write a ${type} about ${topic}. Return ONLY the content, no filler. Keep it engaging and high-converting.` }
                ]
            })
        });
        const data = await response.json();
        return data.choices[0]?.message?.content || "";
    } catch (e) {
        return "Failed to generate content.";
    }
};

export const generateWebsiteStructure = async (businessName: string, description: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                response_format: { type: "json_object" },
                messages: [
                    { role: 'system', content: 'You are a Website Builder AI. Output JSON only with keys: headline, subheadline, features (array of strings), ctaText.' },
                    { role: 'user', content: `Generate landing page structure for "${businessName}". Description: ${description}` }
                ]
            })
        });
        const data = await response.json();
        return data.choices[0]?.message?.content || "{}";
    } catch (e) {
        console.error(e);
        throw e;
    }
};

// Legacy alias
export const simulateWebScrape = scrapeWebsiteContent;