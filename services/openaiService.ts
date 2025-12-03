
// Use process.env provided by Vite define config to avoid import.meta issues
const getApiKey = () => process.env.VITE_OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

export const generateBotResponse = async (
  systemPrompt: string,
  history: { role: 'user' | 'model'; text: string }[],
  lastMessage: string,
  modelName: string = 'gpt-4o-mini',
  context?: string,
  botId?: string
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "Error: API Key is missing. Please check your configuration.";

  // Construct messages
  const messages: any[] = [
    { role: 'system', content: systemPrompt }
  ];

  if (context) {
    messages[0].content += `\n\n### KNOWLEDGE BASE:\n${context}\n\n### INSTRUCTIONS:\nAnswer strictly based on the provided Knowledge Base. If the answer is not in the text, state that you do not have that information.`;
  }

  history.forEach(msg => {
    messages.push({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.text
    });
  });

  messages.push({ role: 'user', content: lastMessage });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || response.statusText);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  } catch (error: any) {
    console.error("OpenAI Error:", error);
    return "I'm having trouble connecting to the AI service right now. Please check your internet connection or API Key.";
  }
};

export const scrapeWebsiteContent = async (url: string): Promise<string> => {
  if (!url) return "";
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  try {
    let targetUrl = url;
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    // 1. Scrape using Jina (Free tier, robust scraping)
    const scrapeResponse = await fetch(`https://r.jina.ai/${targetUrl}`);
    if (!scrapeResponse.ok) {
      const statusText = scrapeResponse.statusText || 'Unknown error';
      throw new Error(`Failed to scrape website: ${statusText}. The URL may be invalid or blocked.`);
    }

    const rawText = await scrapeResponse.text();

    // Validate we got actual content
    if (!rawText || rawText.trim().length < 100) {
      throw new Error("Website returned insufficient content. The page may be empty or require JavaScript.");
    }

    // Smart truncation: Try to cut at sentence boundary, not mid-sentence
    let truncatedText = rawText;
    if (rawText.length > 30000) {
      // Find last period before 30000 chars to avoid cutting mid-sentence
      const cutPoint = rawText.lastIndexOf('.', 30000);
      truncatedText = cutPoint > 20000 ? rawText.substring(0, cutPoint + 1) : rawText.substring(0, 30000);
    }

    // 2. Extract comprehensive knowledge using GPT-4o-mini
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                {
                  role: 'system',
                  content: 'You are an expert Knowledge Extraction AI. Your job is to read website content and extract ALL useful information that would help a chatbot answer customer questions accurately. Be comprehensive and thorough.'
                },
                {
                  role: 'user',
                  content: `Extract comprehensive knowledge from this website content. Include:\n\n1. Business/Organization Overview (name, description, mission)\n2. Products & Services (detailed list with descriptions)\n3. Contact Information (address, phone, email, hours)\n4. Pricing & Plans (if mentioned)\n5. Policies (shipping, returns, privacy, terms)\n6. FAQs and common customer questions\n7. Any other important facts a customer service bot should know\n\nFormat the output as clear, factual statements that can be used to train an AI assistant. Be specific and include all relevant details.\n\n=== WEBSITE CONTENT ===\n${truncatedText}\n\n=== END CONTENT ===\n\nExtracted Knowledge:`
                }
            ],
            temperature: 0.3  // Lower temperature for more factual extraction
        })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || response.statusText;
      throw new Error(`AI extraction failed: ${errorMsg}`);
    }

    const data = await response.json();
    const extractedContent = data.choices[0]?.message?.content;

    // Validate extraction produced meaningful content
    if (!extractedContent || extractedContent.trim().length < 50) {
      throw new Error("Content extraction produced insufficient knowledge. The website may not contain useful information.");
    }

    return extractedContent;

  } catch (error: any) {
    console.error("Scrape Error:", error);
    // Re-throw with original message to preserve specific error details
    throw error;
  }
};

export const generateMarketingContent = async (type: string, topic: string, tone: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "Error: API Key missing.";

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: `You are an expert Copywriter. Tone: ${tone}.` },
                    { role: 'user', content: `Write a ${type} about ${topic}. Return ONLY the content, no filler.` }
                ]
            })
        });
        const data = await response.json();
        return data.choices[0]?.message?.content || "";
    } catch (e) {
        return "Failed to generate content.";
    }
};

export const generateWebsiteStructure = async (businessName: string, description: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                response_format: { type: "json_object" },
                messages: [
                    { role: 'system', content: 'You are a Website Builder AI. Output JSON only with keys: headline, subheadline, features (array of strings), ctaText.' },
                    { role: 'user', content: `Generate landing page structure for "${businessName}". Description: ${description}` }
                ]
            })
        });
        const data = await response.json();
        return data.choices[0]?.message?.content || "{}";
    } catch (e) {
        console.error(e);
        throw e;
    }
};

// Legacy alias
export const simulateWebScrape = scrapeWebsiteContent;
