// NOTE: Filename retained as geminiService.ts to prevent breaking imports,
// but implementation uses OpenAI GPT-4o Mini as configured in the project.

import { scraperRateLimiter, aiGenerationRateLimiter, getSessionIdentifier } from './rateLimiter';

const API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY || '';

interface Message {
  role: 'user' | 'model' | 'system';
  text: string;
}

const callOpenAI = async (messages: any[], model: string = 'gpt-4o-mini', temperature: number = 0.7) => {
  if (!API_KEY) throw new Error("Missing OpenAI API Key");

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: temperature,
      max_tokens: 1000,
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'OpenAI API Error');
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

export const generateBotResponse = async (
  systemPrompt: string,
  history: { role: 'user' | 'model'; text: string }[],
  lastMessage: string,
  modelName: string = 'gpt-4o-mini',
  context?: string
): Promise<string> => {
  try {
    let finalSystemPrompt = systemPrompt;
    if (context) {
      finalSystemPrompt += `\n\nCONTEXT FROM KNOWLEDGE BASE:\n${context}\n\nINSTRUCTIONS: Answer strictly based on the provided context if relevant. If the answer is not in the context, use your general knowledge but mention you are unsure.`;
    }

    const messages = [
      { role: 'system', content: finalSystemPrompt },
      ...history.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.text
      }))
    ];

    // Ensure the last message isn't duplicated if it's already in history
    if (history.length === 0 || history[history.length - 1].text !== lastMessage) {
        messages.push({ role: 'user', content: lastMessage });
    }

    return await callOpenAI(messages, modelName);
  } catch (error) {
    console.error("AI Generation Error:", error);
    return "I'm having trouble connecting to my brain right now. Please check your API configuration.";
  }
};

export const scrapeWebsiteContent = async (
  url: string,
  options?: {
    maxLength?: number;
    onProgress?: (stage: string) => void;
    userId?: string;
    bypassRateLimit?: boolean;
  }
): Promise<string> => {
  const maxLength = options?.maxLength || 30000; // Increased default limit
  const onProgress = options?.onProgress;
  const userId = options?.userId;
  const bypassRateLimit = options?.bypassRateLimit || false;

  try {
    // 0. Rate Limiting Check
    if (!bypassRateLimit) {
      const identifier = getSessionIdentifier(userId);
      const rateCheck = scraperRateLimiter.checkLimit(identifier);

      if (!rateCheck.allowed) {
        const waitTime = Math.ceil((rateCheck.resetTime - Date.now()) / 1000);
        throw new Error(`Rate limit exceeded. ${rateCheck.message} Please wait ${waitTime} seconds.`);
      }

      onProgress?.(`Rate limit: ${rateCheck.remaining} requests remaining`);
    }

    // 1. Validate URL
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    // Basic URL validation
    try {
      new URL(targetUrl);
    } catch {
      throw new Error(`Invalid URL format: ${url}`);
    }

    onProgress?.("Fetching website content...");

    // 2. Use Jina Reader to get clean Markdown
    const scrapeResponse = await fetch(`https://r.jina.ai/${targetUrl}`, {
      headers: {
        'Accept': 'text/plain',
      },
    });

    if (!scrapeResponse.ok) {
      if (scrapeResponse.status === 404) {
        throw new Error(`Website not found (404): ${targetUrl}`);
      } else if (scrapeResponse.status === 403) {
        throw new Error(`Access forbidden (403): The website blocks automated access`);
      } else if (scrapeResponse.status >= 500) {
        throw new Error(`Server error (${scrapeResponse.status}): The website is temporarily unavailable`);
      }
      throw new Error(`Scraping failed with status: ${scrapeResponse.status}`);
    }

    const rawMarkdown = await scrapeResponse.text();

    if (!rawMarkdown || rawMarkdown.length < 50) {
      throw new Error(`Insufficient content retrieved from ${url}. The page may be empty or blocked.`);
    }

    onProgress?.("Analyzing content with AI...");

    // 3. Intelligently truncate if needed (keep first and last portions)
    let contentToAnalyze = rawMarkdown;
    let wasTruncated = false;

    if (rawMarkdown.length > maxLength) {
      wasTruncated = true;
      const halfMax = Math.floor(maxLength / 2);
      contentToAnalyze = rawMarkdown.substring(0, halfMax) +
        "\n\n[... CONTENT TRUNCATED ...]\n\n" +
        rawMarkdown.substring(rawMarkdown.length - halfMax);
    }

    // 4. Use AI to summarize and structure the data for a Knowledge Base
    const summary = await generateBotResponse(
      "You are a Data Extraction Expert. Extract and organize key information from website content into a clear, structured format that a chatbot can use to answer questions.",
      [],
      `Extract and format the following information from this website:\n\n` +
      `1. Business/Organization Name & Description\n` +
      `2. Main Services/Products/Offerings\n` +
      `3. Contact Information (Phone, Email, Address, Social Media)\n` +
      `4. Operating Hours (if available)\n` +
      `5. Pricing/Rates (if available)\n` +
      `6. Key Features/Benefits\n` +
      `7. Important Policies or Terms\n` +
      `8. Any other relevant facts\n\n` +
      `Format as clear bullet points under each category. Only include information that is actually present.\n\n` +
      `WEBSITE CONTENT:\n${contentToAnalyze}\n\n` +
      `${wasTruncated ? 'Note: Content was truncated due to length. Focus on the most important information.' : ''}`,
      'gpt-4o-mini'
    );

    onProgress?.("Complete!");

    // Add metadata about the scrape
    const metadata = `\n\n---\nSource: ${targetUrl}\nScraped: ${new Date().toLocaleString()}\nContent Size: ${(rawMarkdown.length / 1024).toFixed(1)}KB${wasTruncated ? ' (truncated)' : ''}`;

    return summary + metadata;
  } catch (error: any) {
    console.error("Scraping Error:", error);
    onProgress?.("Error");

    // Provide specific error messages
    if (error.message) {
      throw new Error(error.message);
    }
    throw new Error(`Unable to scrape ${url}. Please check the URL and try again.`);
  }
};

// Legacy alias for compatibility
export const simulateWebScrape = scrapeWebsiteContent;

export const generateMarketingContent = async (
  type: string,
  topic: string,
  tone: string,
  options?: { userId?: string; bypassRateLimit?: boolean }
): Promise<string> => {
  // Rate limiting check
  if (!options?.bypassRateLimit) {
    const identifier = getSessionIdentifier(options?.userId);
    const rateCheck = aiGenerationRateLimiter.checkLimit(identifier);

    if (!rateCheck.allowed) {
      const waitTime = Math.ceil((rateCheck.resetTime - Date.now()) / 1000);
      throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds.`);
    }
  }

  const prompt = `Write a ${tone} ${type} about ${topic}. Keep it engaging, high-converting, and formatted correctly for the platform.`;
  return await generateBotResponse("You are a world-class Copywriter.", [], prompt);
};

export const generateWebsiteStructure = async (
  businessName: string,
  description: string,
  options?: { userId?: string; bypassRateLimit?: boolean }
): Promise<string> => {
  // Rate limiting check
  if (!options?.bypassRateLimit) {
    const identifier = getSessionIdentifier(options?.userId);
    const rateCheck = aiGenerationRateLimiter.checkLimit(identifier);

    if (!rateCheck.allowed) {
      const waitTime = Math.ceil((rateCheck.resetTime - Date.now()) / 1000);
      throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds.`);
    }
  }

  const prompt = `Generate a JSON structure for a landing page for "${businessName}". Description: ${description}.
  Return ONLY valid JSON with no markdown formatting.
  Format: { "headline": "...", "subheadline": "...", "features": ["...", "...", "..."], "ctaText": "..." }`;

  const response = await callOpenAI([{ role: 'user', content: prompt }]);
  // Clean up code blocks if present
  return response.replace(/```json/g, '').replace(/```/g, '').trim();
};
