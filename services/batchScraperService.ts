/**
 * Batch URL Scraper Service
 * Allows scraping multiple URLs efficiently with progress tracking
 */

import { scrapeWebsiteContent } from './geminiService';

export interface BatchScrapeResult {
  url: string;
  success: boolean;
  data?: string;
  error?: string;
  timestamp: number;
  contentSize?: number;
}

export interface BatchScrapeProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  currentUrl?: string;
  stage?: string;
}

/**
 * Scrape multiple URLs in sequence
 * @param urls - Array of URLs to scrape
 * @param onProgress - Progress callback
 * @param options - Scraping options
 * @returns Array of results for each URL
 */
export async function batchScrapeUrls(
  urls: string[],
  onProgress?: (progress: BatchScrapeProgress) => void,
  options?: {
    maxLength?: number;
    delayBetweenRequests?: number;
    stopOnError?: boolean;
    userId?: string;
  }
): Promise<BatchScrapeResult[]> {
  const results: BatchScrapeResult[] = [];
  const delayMs = options?.delayBetweenRequests || 2000; // 2 second delay by default
  const stopOnError = options?.stopOnError || false;

  let successful = 0;
  let failed = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    // Update progress
    onProgress?.({
      total: urls.length,
      completed: i,
      successful,
      failed,
      currentUrl: url,
      stage: 'scraping'
    });

    try {
      const data = await scrapeWebsiteContent(url, {
        maxLength: options?.maxLength,
        userId: options?.userId,
        onProgress: (stage) => {
          onProgress?.({
            total: urls.length,
            completed: i,
            successful,
            failed,
            currentUrl: url,
            stage
          });
        }
      });

      successful++;
      results.push({
        url,
        success: true,
        data,
        timestamp: Date.now(),
        contentSize: data.length
      });

    } catch (error: any) {
      failed++;
      results.push({
        url,
        success: false,
        error: error.message || 'Unknown error',
        timestamp: Date.now()
      });

      if (stopOnError) {
        break;
      }
    }

    // Delay between requests to avoid overwhelming the system
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // Final progress update
  onProgress?.({
    total: urls.length,
    completed: urls.length,
    successful,
    failed,
    stage: 'complete'
  });

  return results;
}

/**
 * Scrape URLs from a sitemap
 * @param sitemapUrl - URL to sitemap.xml
 * @param maxUrls - Maximum number of URLs to scrape from sitemap
 * @returns Array of scraped content
 */
export async function scrapeSitemap(
  sitemapUrl: string,
  maxUrls: number = 10,
  onProgress?: (progress: BatchScrapeProgress) => void,
  options?: {
    maxLength?: number;
    userId?: string;
  }
): Promise<BatchScrapeResult[]> {
  try {
    // Fetch sitemap
    const response = await fetch(sitemapUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.status}`);
    }

    const sitemapXml = await response.text();

    // Extract URLs from sitemap (simple regex-based extraction)
    const urlMatches = sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g);
    const urls = Array.from(urlMatches)
      .map(match => match[1])
      .filter(url => url && url.startsWith('http'))
      .slice(0, maxUrls);

    if (urls.length === 0) {
      throw new Error('No valid URLs found in sitemap');
    }

    // Scrape all URLs from sitemap
    return await batchScrapeUrls(urls, onProgress, {
      ...options,
      delayBetweenRequests: 3000 // Longer delay for sitemap scraping
    });

  } catch (error: any) {
    throw new Error(`Sitemap scraping failed: ${error.message}`);
  }
}

/**
 * Extract URLs from a webpage for crawling
 * @param baseUrl - URL to extract links from
 * @param maxLinks - Maximum number of links to extract
 * @returns Array of URLs found on the page
 */
export async function extractLinksFromPage(
  baseUrl: string,
  maxLinks: number = 20
): Promise<string[]> {
  try {
    // Use Jina Reader to get clean content
    const response = await fetch(`https://r.jina.ai/${baseUrl}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    const markdown = await response.text();

    // Extract URLs from markdown links [text](url)
    const linkMatches = markdown.matchAll(/\[.*?\]\((https?:\/\/[^\)]+)\)/g);
    const urls = Array.from(linkMatches)
      .map(match => match[1])
      .filter(url => {
        try {
          const parsedUrl = new URL(url);
          const baseUrlObj = new URL(baseUrl);
          // Only include links from same domain
          return parsedUrl.hostname === baseUrlObj.hostname;
        } catch {
          return false;
        }
      })
      .slice(0, maxLinks);

    return [...new Set(urls)]; // Remove duplicates

  } catch (error: any) {
    throw new Error(`Link extraction failed: ${error.message}`);
  }
}

/**
 * Crawl a website (scrape main page + linked pages)
 * @param startUrl - Starting URL
 * @param maxPages - Maximum pages to crawl
 * @param onProgress - Progress callback
 * @returns Array of scraped content
 */
export async function crawlWebsite(
  startUrl: string,
  maxPages: number = 5,
  onProgress?: (progress: BatchScrapeProgress) => void,
  options?: {
    maxLength?: number;
    userId?: string;
  }
): Promise<BatchScrapeResult[]> {
  // First, scrape the main page
  const mainResult = await batchScrapeUrls([startUrl], onProgress, options);

  if (!mainResult[0].success || maxPages <= 1) {
    return mainResult;
  }

  // Extract links from main page
  try {
    const links = await extractLinksFromPage(startUrl, maxPages - 1);

    if (links.length === 0) {
      return mainResult;
    }

    // Scrape linked pages
    const linkedResults = await batchScrapeUrls(
      links,
      (progress) => {
        onProgress?.({
          total: 1 + links.length,
          completed: 1 + progress.completed,
          successful: 1 + progress.successful - (mainResult[0].success ? 0 : 1),
          failed: progress.failed + (mainResult[0].success ? 0 : 1),
          currentUrl: progress.currentUrl,
          stage: progress.stage
        });
      },
      options
    );

    return [...mainResult, ...linkedResults];

  } catch (error) {
    console.error('Crawling error:', error);
    // Return at least the main page result
    return mainResult;
  }
}

/**
 * Validate and clean a list of URLs
 * @param urls - Array of URLs (can include duplicates, invalid URLs, etc.)
 * @returns Cleaned array of valid, unique URLs
 */
export function cleanUrlList(urls: string[]): string[] {
  const validUrls = new Set<string>();

  for (const url of urls) {
    try {
      const trimmed = url.trim();
      if (!trimmed) continue;

      // Add https:// if missing
      const fullUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;

      // Validate URL
      new URL(fullUrl);

      validUrls.add(fullUrl);
    } catch {
      // Skip invalid URLs
      continue;
    }
  }

  return Array.from(validUrls);
}

/**
 * Parse URLs from text (extract all URLs mentioned in text)
 * @param text - Text containing URLs
 * @returns Array of extracted URLs
 */
export function extractUrlsFromText(text: string): string[] {
  // Match URLs in text
  const urlRegex = /https?:\/\/[^\s<>"]+|www\.[^\s<>"]+/g;
  const matches = text.match(urlRegex) || [];

  return cleanUrlList(matches);
}

export default {
  batchScrapeUrls,
  scrapeSitemap,
  extractLinksFromPage,
  crawlWebsite,
  cleanUrlList,
  extractUrlsFromText
};
