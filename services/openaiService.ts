import { Bot } from '../types';

const API_KEY = process.env.VITE_OPENAI_API_KEY;

// Helper for OpenAI API calls
const callOpenAI = async (messages: any[], model = 'gpt-4o-mini', jsonMode = false) => {
  if (!API_KEY) {
    console.warn("OpenAI API Key is missing. Please check your .env file.");
    // Return a mock response if no key (prevents app crash in preview without keys)
    if (jsonMode) return "{}";
    return "I cannot answer right now because my brain (API Key) is missing.";
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        response_format: jsonMode ? { type: "json_object" } : undefined
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI API Error');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI Request Failed:", error);
    throw error;
  }
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
        ...history.map(msg => ({ role: msg.role === 'model' ? 'assistant' : 'user', content: msg.text })),
        { role: 'user', content: lastMessage }
    ];

    return await callOpenAI(messages, modelName);
  } catch (error) {
    return "I'm having trouble thinking of a response right now. Please try again later.";
  }
};

export const scrapeWebsiteContent = async (url: string): Promise<string> => {
  try {
    // 1. Validate URL
    let targetUrl = url;
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    // 2. Use Jina Reader to get clean Markdown
    // We use a CORS proxy or handle it gracefully if blocked. 
    // In production, scraping should be done server-side.
    const scrapeResponse = await fetch(`https://r.jina.ai/${targetUrl}`);
    
    if (!scrapeResponse.ok) {
      throw new Error("Failed to fetch content from URL");
    }

    const rawMarkdown = await scrapeResponse.text();
    const truncatedContent = rawMarkdown.substring(0, 15000); // Limit context window

    // 3. Summarize with GPT-4o Mini
    const messages = [
        { 
            role: 'system', 
            content: 'You are a Data Extraction Expert. Extract key business information from the website content provided.' 
        },
        { 
            role: 'user', 
            content: `Extract the following from this website content and format it as a concise list of facts suitable for a chatbot knowledge base:\n1. Business Name & Description\n2. Key Services/Products\n3. Contact Info (Phone, Email, Address)\n4. Operating Hours\n5. Pricing/Offers (if available)\n\nWEBSITE CONTENT:\n${truncatedContent}` 
        }
    ];

    return await callOpenAI(messages, 'gpt-4o-mini');
  } catch (error) {
    console.error("Scraping Error:", error);
    return `Unable to scrape ${url} automatically. It might be blocked. Please add business details manually to the Knowledge Base.`;
  }
};

// Legacy alias
export const simulateWebScrape = scrapeWebsiteContent;

export const generateMarketingContent = async (type: string, topic: string, tone: string): Promise<string> => {
  const prompt = `Write a ${tone} ${type} about ${topic}. Keep it engaging, high-converting, and formatted correctly for the platform.`;
  const messages = [
      { role: 'system', content: "You are a world-class Copywriter." },
      { role: 'user', content: prompt }
  ];
  
  try {
    return await callOpenAI(messages, 'gpt-4o-mini');
  } catch (e) {
    return "Failed to generate content.";
  }
};

export const generateWebsiteStructure = async (businessName: string, description: string): Promise<string> => {
  const prompt = `Generate a JSON structure for a landing page for "${businessName}". Description: ${description}.
  Return JSON with this schema: { "headline": string, "subheadline": string, "features": string[], "ctaText": string }.`;
  
  const messages = [
      { role: 'system', content: "You are a specialized web designer AI that outputs only valid JSON." },
      { role: 'user', content: prompt }
  ];

  try {
      return await callOpenAI(messages, 'gpt-4o-mini', true);
  } catch (e) {
      return JSON.stringify({
          headline: `Welcome to ${businessName}`,
          subheadline: description,
          features: ["Service 1", "Service 2", "Service 3"],
          ctaText: "Get Started"
      });
  }
};
