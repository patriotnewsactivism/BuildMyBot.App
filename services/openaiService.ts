import { supabase } from './supabaseClient';

// Use process.env provided by Vite define config to avoid import.meta issues
const getApiKey = () => process.env.VITE_OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const getSupabaseUrl = () => process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

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

  // Method 1: Try Edge Function (server-side, no CORS issues)
  const supabaseUrl = getSupabaseUrl();
  if (supabase && supabaseUrl) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        console.log("Attempting server-side scrape via Edge Function...");
        const response = await fetch(`${supabaseUrl}/functions/v1/scrape-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ url, summarize: true }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.content) {
            console.log(`Server-side scrape successful (${data.method}): ${data.content.length} chars`);
            return data.content;
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.warn("Edge Function scrape failed:", errorData.error || response.statusText);
        }
      }
    } catch (e: any) {
      console.warn("Edge Function unavailable, falling back to client-side:", e.message);
    }
  }

  // Method 2: Fall back to client-side scraping with CORS proxies
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  try {
    let targetUrl = url;
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    // Try to scrape using multiple CORS proxies
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;

    // List of CORS proxies to try (in order of reliability)
    const corsProxies = [
      (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    ];

    let rawText = '';

    for (const proxyFn of corsProxies) {
      try {
        const proxyUrl = proxyFn(jinaUrl);
        const scrapeResponse = await fetch(proxyUrl, {
          headers: {
            'Accept': 'text/plain, text/html, */*',
          }
        });

        if (scrapeResponse.ok) {
          rawText = await scrapeResponse.text();
          if (rawText && rawText.length > 100) {
            break; // Success, exit the loop
          }
        }
      } catch (e: any) {
        console.warn("Proxy failed, trying next:", e.message);
      }
    }

    // If all proxies failed, try direct Jina.ai call (may work in some environments)
    if (!rawText || rawText.length < 100) {
      try {
        const directResponse = await fetch(jinaUrl, {
          headers: {
            'Accept': 'text/plain, text/html, */*',
          }
        });
        if (directResponse.ok) {
          rawText = await directResponse.text();
        }
      } catch (e) {
        console.warn("Direct Jina call failed:", e);
      }
    }

    if (!rawText || rawText.length < 100) {
      throw new Error("All scraping methods failed. The URL might be blocked, require authentication, or have strict security policies.");
    }

    const truncatedText = rawText.substring(0, 15000); // Limit context window for cost/speed

    // Summarize using GPT-4o-mini to create structured knowledge
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
    return data.choices[0]?.message?.content || rawText.substring(0, 1000);

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