
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
  if (!API_KEY) return "Configuration Error: OPENAI_API_KEY is missing. Please check your cloud deployment settings.";

  try {
    // Inject Context into System Prompt if available
    let finalSystemPrompt = systemPrompt;
    
    if (context && context.trim().length > 0) {
      // Check if the crawl failed and we need to rely on internal training data
      if (context.includes("[SYSTEM_CRAWL_ERROR")) {
         finalSystemPrompt += `\n\n[IMPORTANT INSTRUCTION]\nThe user wanted to train this bot on a specific URL, but the live crawler was blocked. \nHowever, YOU (the AI) likely have internal training data about this entity/website.\n\nACT AS IF you have read the website. Answer the user's questions specifically about the business/entity implied by the conversation or the URL if mentioned. Be confident and specific.`;
      } else {
         // Standard RAG (Retrieval Augmented Generation)
         finalSystemPrompt += `\n\n[KNOWLEDGE BASE / WEBSITE CONTENT]\nThe following is the scraped content from the business's website. Use ONLY this information to answer questions if possible. If the answer is not in this text, fall back to your general knowledge but mention you aren't 100% sure.\n\n--- START OF CONTENT ---\n${context}\n--- END OF CONTENT ---`;
      }
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
        return "I'm having trouble connecting to the AI service right now.";
    }

    return data.choices[0]?.message?.content || "No response generated.";

  } catch (error) {
    console.error("OpenAI Network Error:", error);
    return "Network error. Please check your connection.";
  }
};

export const generateMarketingContent = async (
  type: 'email' | 'social' | 'ad' | 'website' | 'viral-thread' | 'story',
  topic: string,
  tone: string
): Promise<string> => {
  if (!API_KEY) return "Simulated Content: Please add OPENAI_API_KEY to your environment variables.";

  try {
    let prompt = `Act as a world-class marketing copywriter. Write a ${tone} ${type} about ${topic}. Keep it engaging and conversion-focused.`;
    
    if (type === 'viral-thread') {
        prompt = `Write a viral Twitter/X thread about ${topic}. Use a hook in the first tweet, short punchy sentences, and a call to action at the end. Tone: ${tone}.`;
    } else if (type === 'story') {
        prompt = `Write a script for a 15-second Instagram/TikTok Story about ${topic}. Include visual cues in brackets [like this]. Tone: ${tone}.`;
    }

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
