export interface LeadDetection {
  email?: string;
  phone?: string;
  name?: string;
  transcript?: string;
}

const INTENT_KEYWORDS = ['demo', 'pricing', 'quote', 'call', 'meeting', 'appointment', 'book'];

export const extractLeadDetection = (text: string): LeadDetection | null => {
  if (!text) return null;
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const phoneMatch = text.match(/(\+?\d[\d\s().-]{6,}\d)/);

  if (!emailMatch && !phoneMatch) return null;

  const normalizedText = text.trim();
  const name = normalizedText.split(/[\s,.!]/).filter(Boolean)[0];

  return {
    email: emailMatch ? emailMatch[1] : undefined,
    phone: phoneMatch ? phoneMatch[1].replace(/[^\d+]/g, '') : undefined,
    name: name && name.length > 1 ? name : undefined,
    transcript: normalizedText,
  };
};

export const calculateLeadScore = (payload: LeadDetection): number => {
  let score = 40;

  if (payload.email) score += 25;
  if (payload.phone) score += 20;

  if (payload.transcript) {
    const text = payload.transcript.toLowerCase();
    const intentHits = INTENT_KEYWORDS.filter((keyword) => text.includes(keyword)).length;
    score += Math.min(intentHits * 5, 15);

    if (text.length > 160) score += 5;
  }

  return Math.min(99, Math.max(0, score));
};

export const getScoreBand = (score: number): 'Hot' | 'Warm' | 'Cold' => {
  if (score >= 80) return 'Hot';
  if (score >= 60) return 'Warm';
  return 'Cold';
};

