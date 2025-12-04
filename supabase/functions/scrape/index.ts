// Supabase Edge Function: Website Scraping
// Securely scrapes websites and extracts knowledge base content

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ScrapeRequest {
  url: string;
  summarize?: boolean;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const { url, summarize = true }: ScrapeRequest = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let targetUrl = url;
    if (!targetUrl.startsWith("http")) {
      targetUrl = "https://" + targetUrl;
    }

    // Use Jina AI's reader for clean content extraction
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;

    const scrapeResponse = await fetch(jinaUrl, {
      headers: {
        "Accept": "text/plain",
      },
    });

    if (!scrapeResponse.ok) {
      throw new Error(`Failed to scrape website: ${scrapeResponse.status}`);
    }

    const rawText = await scrapeResponse.text();

    // Limit content size for processing
    const truncatedText = rawText.substring(0, 25000);

    if (!summarize) {
      return new Response(
        JSON.stringify({ content: truncatedText }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Summarize and extract key information using GPT-4o-mini
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a precise Data Extractor. Extract and organize key business information that would be useful for an AI chatbot's knowledge base. Format the output as clear, factual statements.",
          },
          {
            role: "user",
            content: `Analyze this website content and extract key information including:\n1. Business Name & Description\n2. Products/Services Offered\n3. Contact Information (phone, email, address)\n4. Business Hours\n5. Pricing (if available)\n6. Unique Selling Points\n7. FAQs or common questions addressed\n\nFormat each piece of information as a standalone fact that can be used by an AI assistant.\n\nWEBSITE CONTENT:\n${truncatedText}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || "Failed to summarize content");
    }

    const openaiData = await openaiResponse.json();
    const summarizedContent = openaiData.choices?.[0]?.message?.content || truncatedText.substring(0, 2000);

    return new Response(
      JSON.stringify({
        content: summarizedContent,
        rawLength: rawText.length,
        url: targetUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Scrape function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to scrape website" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
