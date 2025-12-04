
// OpenAI Service - Handles AI interactions
// In production, routes through Supabase Edge Functions for security
// Falls back to direct API calls in development with local API key

const getSupabaseUrl = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
};

const getSupabaseAnonKey = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
};

// Check if we should use Edge Functions (production) or direct API (dev)
const useEdgeFunctions = () => {
  const supabaseUrl = getSupabaseUrl();
  // Use Edge Functions if Supabase is configured and not localhost placeholder
  return supabaseUrl &&
         !supabaseUrl.includes('your-project') &&
         supabaseUrl.includes('supabase.co');
};

// Legacy: Get API key for direct calls (development only)
const getApiKey = () => process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';

export const generateBotResponse = async (
  systemPrompt: string,
  history: { role: 'user' | 'model'; text: string }[],
  lastMessage: string,
  modelName: string = 'gpt-4o-mini',
  context?: string,
  botId?: string
): Promise<string> => {

  // Try Edge Function first (secure, production)
  if (useEdgeFunctions() && botId) {
    try {
      const response = await fetch(`${getSupabaseUrl()}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getSupabaseAnonKey()}`,
        },
        body: JSON.stringify({
          botId,
          messages: history,
          lastMessage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.response || '';
      }
      // Fall through to direct API if edge function fails
      console.warn('Edge function failed, falling back to direct API');
    } catch (e) {
      console.warn('Edge function error, falling back to direct API:', e);
    }
  }

  // Fallback: Direct API call (development mode)
  const apiKey = getApiKey();
  if (!apiKey) {
    return "Error: API Key is missing. Please configure OPENAI_API_KEY in your environment or deploy Supabase Edge Functions.";
  }

  // Build messages array
  let systemContent = systemPrompt;
  if (context) {
    systemContent += `\n\n### KNOWLEDGE BASE:\n${context}\n\n### INSTRUCTIONS:\nAnswer based on the provided Knowledge Base when relevant. If the answer is not in the text, you may provide general assistance.`;
  }

  const messages: any[] = [
    { role: 'system', content: systemContent }
  ];

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
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || response.statusText);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  } catch (error: any) {
    console.error("OpenAI Error:", error);
    return "I'm having trouble connecting to the AI service right now. Please try again.";
  }
};

export const scrapeWebsiteContent = async (url: string): Promise<string> => {
  if (!url) return "";

  // Try Edge Function first (secure, production)
  if (useEdgeFunctions()) {
    try {
      const response = await fetch(`${getSupabaseUrl()}/functions/v1/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getSupabaseAnonKey()}`,
        },
        body: JSON.stringify({ url, summarize: true }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.content || '';
      }
      console.warn('Scrape edge function failed, falling back to direct method');
    } catch (e) {
      console.warn('Scrape edge function error:', e);
    }
  }

  // Fallback: Direct scraping (development mode)
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing - configure OPENAI_API_KEY or deploy Edge Functions");

  try {
    let targetUrl = url;
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    // Use Jina AI for content extraction
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;

    // Use CORS proxy for browser-based requests
    const proxyUrl = 'https://corsproxy.io/?';
    const scrapeResponse = await fetch(proxyUrl + encodeURIComponent(jinaUrl));

    if (!scrapeResponse.ok) throw new Error("Failed to scrape website.");

    const rawText = await scrapeResponse.text();
    const truncatedText = rawText.substring(0, 20000);

    // Summarize using GPT-4o-mini
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a precise Data Extractor. Extract and organize key business information.' },
                { role: 'user', content: `Analyze this content and extract:\n1. Business Name & Description\n2. Key Services\n3. Contact Info\n4. Pricing/Hours\n5. FAQs\n\nCONTENT:\n${truncatedText}` }
            ],
            temperature: 0.3
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

    // Try Edge Function approach for production
    if (useEdgeFunctions()) {
      // For now, marketing content uses direct API as it doesn't need bot context
      // Could be moved to Edge Function in future
    }

    if (!apiKey) return "Error: API Key missing. Please configure your environment.";

    const prompts: Record<string, string> = {
      'email': `Write a compelling ${tone.toLowerCase()} email campaign about ${topic}. Include subject line, body, and call-to-action.`,
      'social': `Write a ${tone.toLowerCase()} social media post about ${topic}. Make it engaging and include relevant hashtags.`,
      'ad': `Write ${tone.toLowerCase()} ad copy about ${topic}. Include headline, body text, and CTA. Keep it concise and persuasive.`,
      'viral-thread': `Write a viral Twitter/X thread about ${topic} in a ${tone.toLowerCase()} tone. Start with a hook, include 5-7 tweets, and end with a call-to-action.`,
      'story': `Write a 15-second video script for Instagram/TikTok about ${topic}. Tone: ${tone.toLowerCase()}. Include visual directions and spoken text.`
    };

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
                    { role: 'system', content: `You are an expert marketing copywriter. Create high-converting, engaging content. Tone: ${tone}.` },
                    { role: 'user', content: prompts[type] || `Write ${type} content about ${topic} in a ${tone.toLowerCase()} tone.` }
                ],
                temperature: 0.8
            })
        });
        const data = await response.json();
        return data.choices[0]?.message?.content || "";
    } catch (e) {
        return "Failed to generate content. Please try again.";
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
                    {
                      role: 'system',
                      content: 'You are a Website Builder AI. Output JSON only with keys: headline (string), subheadline (string), features (array of 3 strings), ctaText (string), sections (array of {title, content}).'
                    },
                    {
                      role: 'user',
                      content: `Generate a professional landing page structure for "${businessName}". Business description: ${description}. Make it compelling and conversion-focused.`
                    }
                ],
                temperature: 0.7
            })
        });
        const data = await response.json();
        return data.choices[0]?.message?.content || "{}";
    } catch (e) {
        console.error(e);
        throw e;
    }
};

// Legacy alias for backwards compatibility
export const simulateWebScrape = scrapeWebsiteContent;
