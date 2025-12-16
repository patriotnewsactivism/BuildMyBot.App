import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini Client
// The API Key is injected automatically by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateBotResponse = async (
  systemPrompt: string,
  history: { role: 'user' | 'model'; text: string }[],
  lastMessage: string,
  modelName: string = 'gemini-2.5-flash',
  context?: string
): Promise<string> => {
  try {
    const fullSystemInstruction = context 
      ? `${systemPrompt}\n\n### KNOWLEDGE BASE:\n${context}\n\n### INSTRUCTIONS:\nAnswer strictly based on the provided Knowledge Base. If the answer is not in the text, state that you do not have that information.`
      : systemPrompt;

    // We use generateContent for single-turn or stateless multi-turn if we manage history manually.
    // However, keeping history management simple here by concatenating for context or using chats.
    // For specific control, we will map the history to the Gemini format manually in the prompt or use chat.
    
    // Constructing a chat-like history for the model
    let prompt = "";
    history.forEach(msg => {
       prompt += `${msg.role === 'model' ? 'Assistant' : 'User'}: ${msg.text}\n`;
    });
    prompt += `User: ${lastMessage}\nAssistant:`;

    const response = await ai.models.generateContent({
      model: modelName.includes('gemini') ? modelName : 'gemini-2.5-flash', // Fallback if legacy ID passed
      contents: prompt,
      config: {
        systemInstruction: fullSystemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "I apologize, but I couldn't generate a response.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to the AI service right now. Please check your internet connection.";
  }
};

export const scrapeWebsiteContent = async (url: string): Promise<string> => {
  if (!url) return "";

  try {
    let targetUrl = url;
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    // 1. Scrape using Jina via CORS Proxy to avoid browser blocking
    const proxyUrl = 'https://corsproxy.io/?';
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;
    
    const scrapeResponse = await fetch(proxyUrl + encodeURIComponent(jinaUrl));
    
    if (!scrapeResponse.ok) throw new Error("Failed to scrape website.");
    
    const rawText = await scrapeResponse.text();
    const truncatedText = rawText.substring(0, 30000); // Gemini has a huge context window

    // 2. Summarize using Gemini 2.5 Flash
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze this website content and extract structured data:\n1. Business Name & Description\n2. Key Services\n3. Contact Info\n4. Pricing/Hours\n\nCONTENT:\n${truncatedText}`,
        config: {
            systemInstruction: 'You are a precise Data Extractor. Extract business facts from raw HTML/Text.',
        }
    });

    return response.text || rawText.substring(0, 1000);

  } catch (error: any) {
    console.error("Scrape Error:", error);
    throw new Error("Failed to scrape website. " + (error.message || ""));
  }
};

export const generateMarketingContent = async (type: string, topic: string, tone: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Write a ${type} about ${topic}. Return ONLY the content, no filler.`,
            config: {
                systemInstruction: `You are an expert Copywriter. Tone: ${tone}.`,
                temperature: 0.8
            }
        });
        return response.text || "";
    } catch (e) {
        console.error(e);
        return "Failed to generate content.";
    }
};

export const generateWebsiteStructure = async (businessName: string, description: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate landing page structure for "${businessName}". Description: ${description}`,
            config: {
                systemInstruction: 'You are a Website Builder AI. Output JSON only.',
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
                    required: ['headline', 'subheadline', 'features', 'ctaText']
                }
            }
        });
        return response.text || "{}";
    } catch (e) {
        console.error(e);
        throw e;
    }
};