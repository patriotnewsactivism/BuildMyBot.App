// NOTE: Filename retained as geminiService.ts to prevent breaking imports,
// but implementation uses OpenAI GPT-4o Mini as configured in the project.

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

export const scrapeWebsiteContent = async (url: string): Promise<string> => {
  try {
    // 1. Validate URL
    let targetUrl = url;
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    // 2. Use Jina Reader to get clean Markdown
    const scrapeResponse = await fetch(`https://r.jina.ai/${targetUrl}`);
    if (!scrapeResponse.ok) {
      throw new Error(`Scraping failed with status: ${scrapeResponse.status}`);
    }
    
    const rawMarkdown = await scrapeResponse.text();

    // 3. If content is too long, truncate it for the prompt
    const truncatedContent = rawMarkdown.substring(0, 15000); 

    // 4. Use AI to summarize and structure the data for a Knowledge Base
    const summary = await generateBotResponse(
      "You are a Data Extraction Expert. Your job is to extract key business information from website content.",
      [],
      `Please extract the following from this website content and format it as a concise list of facts suitable for a chatbot knowledge base:\n1. Business Name & Description\n2. Key Services/Products\n3. Contact Info (Phone, Email, Address)\n4. Operating Hours\n5. Pricing/Offers (if available)\n\nWEBSITE CONTENT:\n${truncatedContent}`,
      'gpt-4o-mini'
    );

    return summary;
  } catch (error) {
    console.error("Scraping Error:", error);
    return `Unable to scrape ${url}. It might be blocked or unavailable. Please add information manually.`;
  }
};

// Legacy alias for compatibility
export const simulateWebScrape = scrapeWebsiteContent;

export const generateMarketingContent = async (type: string, topic: string, tone: string): Promise<string> => {
  const prompt = `Write a ${tone} ${type} about ${topic}. Keep it engaging, high-converting, and formatted correctly for the platform.`;
  return await generateBotResponse("You are a world-class Copywriter.", [], prompt);
};

export const generateWebsiteStructure = async (businessName: string, description: string): Promise<string> => {
  const prompt = `Generate a JSON structure for a landing page for "${businessName}". Description: ${description}.
  Return ONLY valid JSON with no markdown formatting.
  Format: { "headline": "...", "subheadline": "...", "features": ["...", "...", "..."], "ctaText": "..." }`;
  
  const response = await callOpenAI([{ role: 'user', content: prompt }]);
  // Clean up code blocks if present
  return response.replace(/```json/g, '').replace(/```/g, '').trim();
};
