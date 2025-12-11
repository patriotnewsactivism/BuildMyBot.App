// scrape-url Edge Function
// Server-side URL scraping that bypasses CORS issues
// Uses Jina.ai reader for clean text extraction and GPT-4o-mini for summarization

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  url: string;
  summarize?: boolean;
}

// SSRF Protection: Block private IPs, localhost, and cloud metadata endpoints
function isBlockedUrl(urlString: string): { blocked: boolean; reason?: string } {
  try {
    const parsedUrl = new URL(urlString);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Block localhost and loopback
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return { blocked: true, reason: 'Localhost URLs are not allowed' };
    }

    // Block cloud metadata endpoints
    const metadataHosts = [
      '169.254.169.254',  // AWS/GCP metadata
      'metadata.google.internal',
      'metadata.google',
      '100.100.100.200',  // Alibaba Cloud metadata
      'fd00:ec2::254',    // AWS IPv6 metadata
    ];
    if (metadataHosts.includes(hostname)) {
      return { blocked: true, reason: 'Cloud metadata endpoints are not allowed' };
    }

    // Block private IP ranges
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [, a, b, c, d] = ipv4Match.map(Number);
      // 10.0.0.0/8
      if (a === 10) return { blocked: true, reason: 'Private IP addresses are not allowed' };
      // 172.16.0.0/12
      if (a === 172 && b >= 16 && b <= 31) return { blocked: true, reason: 'Private IP addresses are not allowed' };
      // 192.168.0.0/16
      if (a === 192 && b === 168) return { blocked: true, reason: 'Private IP addresses are not allowed' };
      // 127.0.0.0/8
      if (a === 127) return { blocked: true, reason: 'Loopback addresses are not allowed' };
      // 0.0.0.0/8
      if (a === 0) return { blocked: true, reason: 'Invalid IP address' };
      // 169.254.0.0/16 (link-local)
      if (a === 169 && b === 254) return { blocked: true, reason: 'Link-local addresses are not allowed' };
    }

    // Block internal/intranet hostnames
    if (hostname.endsWith('.internal') || hostname.endsWith('.local') || hostname.endsWith('.localhost')) {
      return { blocked: true, reason: 'Internal hostnames are not allowed' };
    }

    // Block file:// and other non-http protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { blocked: true, reason: 'Only HTTP and HTTPS protocols are allowed' };
    }

    return { blocked: false };
  } catch {
    return { blocked: true, reason: 'Invalid URL format' };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    let { url, summarize = true } = body;

    if (!url) {
      return new Response(
        JSON.stringify({ error: "Missing required field: url" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize URL
    if (!url.startsWith("http")) {
      url = "https://" + url;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SSRF Protection: Check if URL is blocked
    const blockCheck = isBlockedUrl(url);
    if (blockCheck.blocked) {
      return new Response(
        JSON.stringify({ error: blockCheck.reason || "URL is not allowed" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Scraping URL: ${url}`);

    // Try multiple scraping methods
    let rawText = "";
    let scrapingMethod = "";

    // Method 1: Jina.ai Reader (best for clean text extraction)
    try {
      const jinaUrl = `https://r.jina.ai/${url}`;
      const jinaResponse = await fetch(jinaUrl, {
        headers: {
          "Accept": "text/plain",
          "User-Agent": "Mozilla/5.0 (compatible; BuildMyBot/1.0)",
        },
      });

      if (jinaResponse.ok) {
        rawText = await jinaResponse.text();
        scrapingMethod = "jina";
        console.log(`Jina scrape successful: ${rawText.length} chars`);
      }
    } catch (e) {
      console.warn("Jina scraping failed:", e.message);
    }

    // Method 2: Direct fetch with standard headers
    if (!rawText || rawText.length < 100) {
      try {
        const directResponse = await fetch(url, {
          headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });

        if (directResponse.ok) {
          const html = await directResponse.text();
          // Basic HTML to text conversion
          rawText = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          scrapingMethod = "direct";
          console.log(`Direct scrape successful: ${rawText.length} chars`);
        }
      } catch (e) {
        console.warn("Direct scraping failed:", e.message);
      }
    }

    if (!rawText || rawText.length < 100) {
      return new Response(
        JSON.stringify({
          error: "Failed to scrape website. The URL might be blocked, require authentication, or have strict security policies.",
          suggestion: "Try copying the content manually and pasting it as text, or upload a PDF/document from the website.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Truncate to prevent excessive token usage
    const truncatedText = rawText.substring(0, 15000);

    // If summarize is true, use GPT-4o-mini to extract structured content
    let finalContent = truncatedText;

    if (summarize) {
      try {
        const summaryResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are a precise Data Extractor. Extract and organize key business/organization information clearly and concisely. Format the output in clean sections.",
              },
              {
                role: "user",
                content: `Analyze this website content and extract key details:
1. Organization/Business Name & Description
2. Key Services/Products/Features
3. Contact Info (Email, Phone, Address, Hours)
4. Any important facts, policies, or FAQs

WEBSITE CONTENT:
${truncatedText}`,
              },
            ],
            temperature: 0.3,
            max_tokens: 2000,
          }),
        });

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          finalContent = summaryData.choices[0]?.message?.content || truncatedText;
          console.log("Summarization successful");
        }
      } catch (e) {
        console.warn("Summarization failed, using raw text:", e.message);
      }
    }

    // Track usage
    await supabase.from("usage_events").insert({
      user_id: user.id,
      event_type: "scrape_url",
      quantity: 1,
      metadata: { url, method: scrapingMethod, content_length: finalContent.length },
    });

    return new Response(
      JSON.stringify({
        content: finalContent,
        url,
        method: scrapingMethod,
        rawLength: rawText.length,
        summarized: summarize,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in scrape-url:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
