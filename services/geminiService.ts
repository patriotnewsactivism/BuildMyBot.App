import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
const apiKey = process.env.API_KEY || ''; // Fail gracefully if not set in env during mock
const ai = new GoogleGenAI({ apiKey });

export const generateBotResponse = async (
  systemPrompt: string,
  history: { role: 'user' | 'model'; text: string }[],
  lastMessage: string,
  modelName: string = 'gemini-2.5-flash'
): Promise<string> => {
  if (!apiKey) return "API Key missing. Please configure backend.";

  try {
    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const result = await chat.sendMessage({ message: lastMessage });
    return result.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I am currently experiencing high traffic. Please try again.";
  }
};

export const generateMarketingContent = async (
  type: 'email' | 'social' | 'ad' | 'website',
  topic: string,
  tone: string
): Promise<string> => {
  if (!apiKey) return "Simulated content: Configure API Key to use real AI.";

  try {
    const prompt = `Act as a world-class marketing copywriter. Write a ${tone} ${type} about ${topic}. Keep it engaging and conversion-focused.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "Failed to generate content.";
  } catch (error) {
    console.error("Gemini Marketing Error:", error);
    return "Error generating marketing content.";
  }
};

export const generateWebsiteStructure = async (businessName: string, description: string): Promise<string> => {
   if (!apiKey) return "Simulated Website Structure";

   try {
    const prompt = `Create a single-page landing page structure for a business named "${businessName}". 
    Description: ${description}. 
    Return ONLY a JSON object with keys: "headline", "subheadline", "features" (array of strings), "ctaText".`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    
    return response.text || "{}";
   } catch (e) {
     return "{}";
   }
}