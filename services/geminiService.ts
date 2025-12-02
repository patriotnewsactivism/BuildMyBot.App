import { GoogleGenAI } from "@google/genai";

export const generateBotResponse = async (
  systemPrompt: string,
  history: { role: 'user' | 'model'; text: string }[],
  lastMessage: string,
  model: string = 'gemini-2.5-flash'
) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Format history for Gemini
    // We exclude the last message because it is sent via sendMessage
    const previousHistory = history.slice(0, -1).map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction: systemPrompt,
      },
      history: previousHistory
    });

    const response = await chat.sendMessage({ message: lastMessage });
    return response.text || "";
  } catch (error) {
    console.error("Gemini Service Error:", error);
    return "I'm having trouble connecting right now. Please try again later.";
  }
};

export const scrapeWebsiteContent = async (url: string) => {
    console.warn("scrapeWebsiteContent not implemented in geminiService");
    return "";
};

export const generateMarketingContent = async (type: string, topic: string, tone: string) => {
    console.warn("generateMarketingContent not implemented in geminiService");
    return "";
};

export const generateWebsiteStructure = async (businessName: string, description: string) => {
    console.warn("generateWebsiteStructure not implemented in geminiService");
    return "{}";
};