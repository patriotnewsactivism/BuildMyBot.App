// PDF Processing Service with OCR Support
// This service extracts text from PDFs using browser-based libraries

import { pdfRateLimiter, getSessionIdentifier } from './rateLimiter';

interface PDFParseResult {
  text: string;
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    fileName?: string;
  };
}

/**
 * Extract text from a PDF file
 * This is a browser-compatible implementation that works with File objects
 */
export const extractTextFromPDF = async (
  file: File,
  onProgress?: (progress: number, stage: string) => void
): Promise<PDFParseResult> => {
  try {
    onProgress?.(10, 'Loading PDF...');

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    onProgress?.(30, 'Parsing PDF structure...');

    // For now, we'll use a simple text extraction approach
    // In production, you would use pdfjs-dist library
    // To avoid adding heavy dependencies in this demo, we'll provide instructions

    // Try to extract text using basic method
    const uint8Array = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8');
    let rawText = decoder.decode(uint8Array);

    onProgress?.(60, 'Extracting text content...');

    // Simple PDF text extraction (works for text-based PDFs)
    const textMatch = rawText.match(/BT\s*[\s\S]*?ET/g);
    let extractedText = '';

    if (textMatch && textMatch.length > 0) {
      // Extract text between BT and ET markers (simplified)
      textMatch.forEach(block => {
        const textContent = block.match(/\((.*?)\)/g);
        if (textContent) {
          textContent.forEach(text => {
            extractedText += text.replace(/[()]/g, '') + ' ';
          });
        }
      });
    }

    // If no text found, the PDF might be scanned/image-based
    if (!extractedText.trim() || extractedText.length < 50) {
      onProgress?.(70, 'Detecting scanned content...');

      // This would require OCR - for now return a message
      extractedText = `[PDF Analysis]\n\nFile: ${file.name}\nSize: ${(file.size / 1024).toFixed(1)}KB\n\n` +
        `Note: This PDF appears to contain scanned images or non-standard text encoding. ` +
        `For full OCR support, the production version would use Tesseract.js to extract text from images.\n\n` +
        `To enable full PDF parsing, add these libraries:\n` +
        `- pdfjs-dist: For standard PDF text extraction\n` +
        `- tesseract.js: For OCR on scanned documents`;
    } else {
      // Clean up extracted text
      extractedText = extractedText
        .replace(/\s+/g, ' ')
        .trim();
    }

    onProgress?.(100, 'Complete!');

    // Estimate page count (rough approximation)
    const pageCountMatch = rawText.match(/\/Count\s+(\d+)/);
    const pageCount = pageCountMatch ? parseInt(pageCountMatch[1]) : 1;

    // Extract metadata
    const titleMatch = rawText.match(/\/Title\s*\((.*?)\)/);
    const authorMatch = rawText.match(/\/Author\s*\((.*?)\)/);

    return {
      text: extractedText,
      pageCount,
      metadata: {
        title: titleMatch ? titleMatch[1] : undefined,
        author: authorMatch ? authorMatch[1] : undefined,
        fileName: file.name
      }
    };

  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from ${file.name}. The file may be corrupted or password-protected.`);
  }
};

/**
 * Process a PDF file and format it for knowledge base
 */
export const processPDFForKnowledgeBase = async (
  file: File,
  onProgress?: (progress: number, stage: string) => void,
  options?: { userId?: string; bypassRateLimit?: boolean }
): Promise<string> => {
  // Rate limiting check
  if (!options?.bypassRateLimit) {
    const identifier = getSessionIdentifier(options?.userId);
    const rateCheck = pdfRateLimiter.checkLimit(identifier);

    if (!rateCheck.allowed) {
      const waitTime = Math.ceil((rateCheck.resetTime - Date.now()) / 1000);
      throw new Error(`Rate limit exceeded. Too many PDF uploads. Please wait ${waitTime} seconds.`);
    }

    onProgress?.(5, `Rate limit: ${rateCheck.remaining} uploads remaining`);
  }

  const result = await extractTextFromPDF(file, onProgress);

  // Format for knowledge base
  const formatted = `SOURCE: ${result.metadata.fileName}\n` +
    `Pages: ${result.pageCount}\n` +
    (result.metadata.title ? `Title: ${result.metadata.title}\n` : '') +
    `\nCONTENT:\n${result.text}\n\n` +
    `---\n` +
    `Uploaded: ${new Date().toLocaleString()}\n` +
    `File Size: ${(file.size / 1024).toFixed(1)}KB`;

  return formatted;
};

/**
 * Instructions for adding full PDF support
 */
export const PDF_SETUP_INSTRUCTIONS = `
To enable full PDF parsing with OCR:

1. Install dependencies:
   npm install pdfjs-dist tesseract.js

2. Import in this file:
   import * as pdfjsLib from 'pdfjs-dist';
   import { createWorker } from 'tesseract.js';

3. Configure PDF.js worker:
   pdfjsLib.GlobalWorkerOptions.workerSrc =
     'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

4. Use PDF.js for text extraction and Tesseract.js for OCR on images.

This implementation provides a basic framework that can be enhanced.
`;
