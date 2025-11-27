import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
};

/**
 * Sanitize user input for plain text (removes all HTML)
 */
export const sanitizeText = (input: string): string => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
};

/**
 * Sanitize URL to prevent javascript: and data: URIs
 */
export const sanitizeUrl = (url: string): string => {
  const cleaned = url.trim();

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = cleaned.toLowerCase();

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return '';
    }
  }

  return cleaned;
};

/**
 * Validate and sanitize email address
 */
export const sanitizeEmail = (email: string): string => {
  const cleaned = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(cleaned) ? cleaned : '';
};

/**
 * Escape special characters for safe display
 */
export const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * Sanitize user-generated bot system prompts
 */
export const sanitizeSystemPrompt = (prompt: string): string => {
  // Remove any potential injection attempts
  let cleaned = sanitizeText(prompt);

  // Limit length
  const maxLength = 2000;
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
  }

  return cleaned;
};

/**
 * Sanitize knowledge base content
 */
export const sanitizeKnowledgeBase = (content: string): string => {
  // Allow more formatting for knowledge base but still sanitize
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'code', 'pre'],
    ALLOWED_ATTR: []
  });
};
