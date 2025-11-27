// NOTE: Filename retained as geminiService.ts to prevent breaking imports in other files,
// but the implementation has been switched to use secure Firebase Cloud Functions.

// Cloud Functions endpoint - update this after deploying functions
const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-wtp-apps.cloudfunctions.net';

export const generateBotResponse = async (
  systemPrompt: string,
  history: { role: 'user' | 'model'; text: string }[],
  lastMessage: string,
  modelName: string = 'gpt-4o-mini',
  context?: string // New: Knowledge Base context
): Promise<string> => {
  try {
    const response = await fetch(`${FUNCTIONS_URL}/generateBotResponse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemPrompt,
        history,
        lastMessage,
        modelName,
        context
      })
    });

    const data = await response.json();

    if (data.error) {
        console.error("Cloud Function Error:", data.error);
        return "I'm having trouble connecting to the AI service right now.";
    }

    return data.response || "No response generated.";

  } catch (error) {
    console.error("Network Error:", error);
    return "Network error. Please check your connection.";
  }
};

export const generateMarketingContent = async (
  type: 'email' | 'social' | 'ad' | 'website' | 'viral-thread' | 'story',
  topic: string,
  tone: string
): Promise<string> => {
  try {
    const response = await fetch(`${FUNCTIONS_URL}/generateMarketingContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        topic,
        tone
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("Cloud Function Error:", data.error);
      return "Error generating marketing content.";
    }

    return data.content || "Failed to generate content.";
  } catch (error) {
    console.error("Marketing Gen Error:", error);
    return "Error generating marketing content.";
  }
};

export const generateWebsiteStructure = async (businessName: string, description: string): Promise<string> => {
   try {
    const response = await fetch(`${FUNCTIONS_URL}/generateWebsiteStructure`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessName,
          description
        })
      });

      const data = await response.json();

      if (data.error) {
        console.error("Cloud Function Error:", data.error);
        return "{}";
      }

      return JSON.stringify(data.structure) || "{}";
   } catch (e) {
     console.error("Website Generation Error:", e);
     return "{}";
   }
}