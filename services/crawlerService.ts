
export const crawlWebsite = async (url: string): Promise<string> => {
  try {
    // Ensure URL has protocol
    let targetUrl = url;
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    // Using allorigins.win as a reliable free CORS proxy for text/html
    const encodedUrl = encodeURIComponent(targetUrl);
    const response = await fetch(`https://api.allorigins.win/get?url=${encodedUrl}`);
    const data = await response.json();

    if (!data.contents) {
      throw new Error("No content found");
    }

    // Basic HTML to Text converter
    const parser = new DOMParser();
    const doc = parser.parseFromString(data.contents, 'text/html');

    // Remove non-content elements to reduce noise
    const scripts = doc.querySelectorAll('script, style, nav, footer, iframe, noscript, svg');
    scripts.forEach(script => script.remove());

    // Get text content
    let text = doc.body.textContent || "";
    
    // Clean up whitespace (multiple spaces/newlines to single space)
    text = text.replace(/\s+/g, ' ').trim();
    
    // If text is too short, it might be a block page or empty
    if (text.length < 50) {
        throw new Error("Content too short");
    }

    // Limit length for context window (approx 8k chars is safe for demo)
    return text.substring(0, 15000); 

  } catch (error) {
    console.warn("Crawl failed or blocked, falling back to AI simulation for:", url);
    // We return a special flag that the LLM service will recognize to switch to "Internal Knowledge" mode
    return `[SYSTEM_CRAWL_ERROR: Could not access ${url} directly due to security settings. Using internal knowledge base.]`;
  }
};
