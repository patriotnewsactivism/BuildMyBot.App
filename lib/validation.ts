// Input validation utilities to prevent injection attacks and malicious input

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates system prompts for bots to prevent prompt injection attacks
 */
export function validateSystemPrompt(prompt: string): ValidationResult {
  // Length validation
  if (prompt.length < 20) {
    return { valid: false, error: 'System prompt must be at least 20 characters' };
  }
  if (prompt.length > 2000) {
    return { valid: false, error: 'System prompt must be under 2000 characters' };
  }

  // Detect prompt injection patterns
  const injectionPatterns = [
    /ignore\s+all\s+(previous|above|prior)\s+instructions/i,
    /disregard\s+(previous|all|your)\s+instructions/i,
    /forget\s+everything/i,
    /new\s+instructions:/i,
    /system:\s*you\s+are\s+now/i,
    /<script>/i,
    /javascript:/i,
    /\bon\w+\s*=/i, // Event handlers like onclick=
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(prompt)) {
      return {
        valid: false,
        error: 'System prompt contains potentially malicious content. Please rephrase.',
      };
    }
  }

  // Ensure prompt doesn't try to extract system information
  const dataExfiltrationPatterns = [
    /print\s+(all|entire)\s+(knowledge|database)/i,
    /list\s+all\s+(users|customers|api\s*keys)/i,
    /reveal\s+(sensitive|confidential|secret)/i,
    /show\s+me\s+(all|the)\s+(data|information)/i,
  ];

  for (const pattern of dataExfiltrationPatterns) {
    if (pattern.test(prompt)) {
      return {
        valid: false,
        error: 'System prompt attempts to access restricted information.',
      };
    }
  }

  return { valid: true };
}

/**
 * Validates and sanitizes email addresses
 */
export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (email.length > 255) {
    return { valid: false, error: 'Email too long' };
  }

  return { valid: true };
}

/**
 * Validates and sanitizes phone numbers
 */
export function validatePhone(phone: string): ValidationResult {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length < 10 || cleaned.length > 15) {
    return { valid: false, error: 'Phone number must be 10-15 digits' };
  }

  return { valid: true };
}

/**
 * Validates URLs to prevent SSRF and XSS attacks
 */
export function validateUrl(url: string): ValidationResult {
  try {
    const parsed = new URL(url);

    // Only allow HTTP(S) protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
    }

    // Prevent localhost/private IP addresses for security
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.')
    ) {
      return { valid: false, error: 'Private/local URLs are not allowed' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validates hex color codes
 */
export function validateColor(color: string): ValidationResult {
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

  if (!hexColorRegex.test(color)) {
    return { valid: false, error: 'Invalid color format. Use hex format like #3B82F6' };
  }

  return { valid: true };
}

/**
 * Validates temperature value for AI models
 */
export function validateTemperature(temperature: number): ValidationResult {
  if (temperature < 0 || temperature > 1) {
    return { valid: false, error: 'Temperature must be between 0 and 1' };
  }

  return { valid: true };
}

/**
 * Validates AI model names
 */
export function validateModel(model: string): ValidationResult {
  const allowedModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];

  if (!allowedModels.includes(model)) {
    return { valid: false, error: `Model must be one of: ${allowedModels.join(', ')}` };
  }

  return { valid: true };
}

/**
 * Sanitizes text input by removing HTML tags and dangerous characters
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

/**
 * Validates bot name
 */
export function validateBotName(name: string): ValidationResult {
  if (name.length < 3) {
    return { valid: false, error: 'Bot name must be at least 3 characters' };
  }

  if (name.length > 100) {
    return { valid: false, error: 'Bot name must be under 100 characters' };
  }

  // Ensure name contains only alphanumeric characters, spaces, and basic punctuation
  const nameRegex = /^[a-zA-Z0-9\s\-_.,!?]+$/;
  if (!nameRegex.test(name)) {
    return { valid: false, error: 'Bot name contains invalid characters' };
  }

  return { valid: true };
}
