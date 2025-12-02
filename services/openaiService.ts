import { GoogleGenAI, Type } from "@google/genai";

// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateBotResponse = async (
  systemPrompt: string,
  history: { role: 'user' | 'model'; text: string }[],
  lastMessage: string,
  modelName: string = 'gpt-4o-mini',
  context?: string
): Promise<string> => {
  // Use a Gemini model.
  const geminiModel = 'gemini-2.5-flash';

  let finalSystemPrompt = systemPrompt;
  if (context) {
    finalSystemPrompt += `\n\n### KNOWLEDGE BASE (REAL DATA):\n${context}\n\n### INSTRUCTIONS:\nAnswer strictly based on the provided Knowledge Base. If the answer is not in the text, state that you do not have that information. Do not invent facts.`;
  }

  const contents = history.map(msg => ({
    role: msg.role === 'model' ? 'model' : 'user',
    parts: [{ text: msg.text }]
  }));

  contents.push({
    role: 'user',
    parts: [{ text: lastMessage }]
  });

  try {
    const response = await genAI.models.generateContent({
      model: geminiModel,
      config: {
        systemInstruction: finalSystemPrompt,
        temperature: 0.7,
      },
      contents: contents
    });

    return response.text || "No response generated.";
  } catch (error: any) {
    return `Error: ${error.message}`;
  }
};

export const scrapeWebsiteContent = async (url: string): Promise<string> => {
  if (!url) return "";

  try {
    let targetUrl = url;
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    const scrapeResponse = await fetch(`https://r.jina.ai/${targetUrl}`);
    if (!scrapeResponse.ok) {
      throw new Error(`Failed to access ${url}.`);
    }

    const rawMarkdown = await scrapeResponse.text();
    
    if (!rawMarkdown || rawMarkdown.includes("Access denied")) {
        throw new Error("Could not retrieve readable content.");
    }

    const truncatedContent = rawMarkdown.substring(0, 30000); 

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: 'You are a precise Data Extractor. Your job is to extract business facts from website content. Output a clean, list-based summary.',
      },
      contents: [
        { 
            role: 'user', 
            parts: [{ text: `Analyze this website content and extract the following details:\n1. Business Name & One-line Description\n2. Key Services/Products\n3. Contact Details (Phone, Email, Address)\n4. Pricing/Hours (if available)\n\nWEBSITE CONTENT:\n${truncatedContent}` }]
        }
      ]
    });

    return response.text || "Content scraped but AI failed to summarize.";

  } catch (error: any) {
    console.error("Scraping Error:", error);
    throw new Error(`Scraping failed: ${error.message}`);
  }
};

// Legacy alias
export const simulateWebScrape = scrapeWebsiteContent;

export const generateMarketingContent = async (type: string, topic: string, tone: string): Promise<string> => {
  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are an expert Copywriter. Tone: ${tone}.`,
      },
      contents: [{
        role: 'user',
        parts: [{ text: `Write a ${type} about ${topic}. Return ONLY the content, no conversational filler.` }]
      }]
    });
    return response.text || "";
  } catch (error: any) {
    return `Error generating content: ${error.message}`;
  }
};

export const generateWebsiteStructure = async (businessName: string, description: string): Promise<string> => {
  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                headline: { type: Type.STRING },
                subheadline: { type: Type.STRING },
                features: { 
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
                ctaText: { type: Type.STRING }
            },
            required: ["headline", "subheadline", "features", "ctaText"]
        },
        systemInstruction: 'You are a Website Builder AI. Output JSON only.',
      },
      contents: [{
        role: 'user',
        parts: [{ text: `Generate a landing page structure for "${businessName}". Description: ${description}.` }]
      }]
    });
    return response.text || "{}";
  } catch (error) {
    console.error("Site Gen Error:", error);
    throw error;
  }
};