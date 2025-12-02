import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateBotResponse = async (
  systemPrompt: string,
  history: { role: 'user' | 'model'; text: string }[],
  lastMessage: string,
  modelName: string = 'gemini-2.5-flash',
  context?: string
): Promise<string> => {
  try {
    let finalSystemPrompt = systemPrompt;
    if (context) {
      finalSystemPrompt += `\n\nCONTEXT FROM KNOWLEDGE BASE:\n${context}\n\nINSTRUCTIONS: Answer strictly based on the provided context if relevant. If the answer is not in the context, use your general knowledge but mention you are unsure.`;
    }

    // Map history to Gemini format
    // Note: Gemini 2.5 Flash supports system instructions in the config
    // We construct the prompt by appending history
    
    // Construct the chat history for the prompt context
    let promptContext = "";
    if (history.length > 0) {
        promptContext = history.map(msg => `${msg.role === 'model' ? 'Model' : 'User'}: ${msg.text}`).join('\n') + "\n";
    }
    
    // Check if the last message is already in history to avoid duplication
    if (history.length === 0 || history[history.length - 1].text !== lastMessage) {
        promptContext += `User: ${lastMessage}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptContext,
      config: {
        systemInstruction: finalSystemPrompt,
        temperature: 0.7,
      }
    });

    return response.text || "I'm having trouble thinking of a response right now.";
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
    const truncatedContent = rawMarkdown.substring(0, 30000); 

    // 4. Use AI to summarize and structure the data for a Knowledge Base
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Please extract the following from this website content and format it as a concise list of facts suitable for a chatbot knowledge base:\n1. Business Name & Description\n2. Key Services/Products\n3. Contact Info (Phone, Email, Address)\n4. Operating Hours\n5. Pricing/Offers (if available)\n\nWEBSITE CONTENT:\n${truncatedContent}`,
        config: {
            systemInstruction: "You are a Data Extraction Expert. Your job is to extract key business information from website content.",
        }
    });

    return response.text || "Could not extract information.";
  } catch (error) {
    console.error("Scraping Error:", error);
    return `Unable to scrape ${url}. It might be blocked or unavailable. Please add information manually.`;
  }
};

// Legacy alias for compatibility
export const simulateWebScrape = scrapeWebsiteContent;

export const generateMarketingContent = async (type: string, topic: string, tone: string): Promise<string> => {
  const prompt = `Write a ${tone} ${type} about ${topic}. Keep it engaging, high-converting, and formatted correctly for the platform.`;
  
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: "You are a world-class Copywriter.",
            temperature: 0.8
        }
    });
    return response.text || "Failed to generate content.";
  } catch (e) {
      console.error(e);
      return "Error generating content.";
  }
};

export const generateWebsiteStructure = async (businessName: string, description: string): Promise<string> => {
  const prompt = `Generate a JSON structure for a landing page for "${businessName}". Description: ${description}.
  Return ONLY valid JSON with no markdown formatting.`;
  
  try {
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
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
                required: ["headline", "subheadline", "features", "ctaText"],
              }
          }
      });
      return response.text || "{}";
  } catch (e) {
      console.error(e);
      return JSON.stringify({
          headline: `Welcome to ${businessName}`,
          subheadline: description,
          features: ["Service 1", "Service 2", "Service 3"],
          ctaText: "Get Started"
      });
  }
};