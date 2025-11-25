// NOTE: Filename retained as geminiService.ts to prevent breaking imports in other files,
// but the implementation has been switched to OpenAI GPT-4o Mini as requested.

const API_KEY = process.env.OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY || ''; 

export const generateBotResponse = async (
  systemPrompt: string,
  history: { role: 'user' | 'model'; text: string }[],
  lastMessage: string,
  modelName: string = 'gpt-4o-mini',
  context?: string // New: Knowledge Base context
): Promise<string> => {
  if (!API_KEY) return "Configuration Error: OPENAI_API_KEY is missing. Please set this in your Vercel environment variables.";

  try {
    // Inject Context into System Prompt if available
    let finalSystemPrompt = systemPrompt;
    if (context && context.trim().length > 0) {
      finalSystemPrompt += `\n\n[CONTEXT / KNOWLEDGE BASE]\nUse the following information to answer user questions. If the answer is not in this context, say you don't know, but offer to take their contact info.\n\n${context}`;
    }

    // Map internal roles to OpenAI roles
    const messages = [
      { role: "system", content: finalSystemPrompt },
      ...history.map(h => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.text
      })),
      { role: "user", content: lastMessage }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const data = await response.json();

    if (data.error) {
        console.error("OpenAI API Error:", data.error);
        return "I'm having trouble connecting to OpenAI right now.";
    }

    return data.choices[0]?.message?.content || "No response generated.";

  } catch (error) {
    console.error("OpenAI Network Error:", error);
    return "Network error. Please check your connection.";
  }
};

export const generateMarketingContent = async (
  type: 'email' | 'social' | 'ad' | 'website',
  topic: string,
  tone: string
): Promise<string> => {
  if (!API_KEY) return "Simulated Content: Please add OPENAI_API_KEY to your environment variables.";

  try {
    const prompt = `Act as a world-class marketing copywriter. Write a ${tone} ${type} about ${topic}. Keep it engaging and conversion-focused.`;
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8
      })
    });

    const data = await response.json();
    return data.choices[0]?.message?.content || "Failed to generate content.";
  } catch (error) {
    console.error("Marketing Gen Error:", error);
    return "Error generating marketing content.";
  }
};

export const generateWebsiteStructure = async (businessName: string, description: string): Promise<string> => {
   if (!API_KEY) return "{}";

   try {
    const prompt = `Create a single-page landing page structure for a business named "${businessName}". 
    Description: ${description}. 
    Return ONLY a JSON object (no markdown formatting) with keys: "headline", "subheadline", "features" (array of strings), "ctaText".`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        })
      });
  
      const data = await response.json();
      return data.choices[0]?.message?.content || "{}";
   } catch (e) {
     return "{}";
   }
}