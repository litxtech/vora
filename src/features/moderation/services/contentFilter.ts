import { BANNED_WORDS } from '@/constants/auth';

const SPAM_PATTERNS = [
  /\b(t\.me\/|telegram\.me\/|bit\.ly\/|whatsapp\.com\/)/i,
  /(ücretsiz\s+para|bedava\s+btc|kazanın\s+hemen)/i,
];

const SUSPICIOUS_PATTERNS = [
  /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/,
  /\b0\d{3}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/,
  /(plaka\s*[:#]?\s*[0-9]{2}\s*[a-z]{1,3}\s*[0-9]{2,4})/i,
];

export type ContentScanResult = {
  allowed: boolean;
  reason: string | null;
  flags: string[];
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9ğüşıöçâîû\s]/gi, ' ');
}

export function scanContent(text: string): ContentScanResult {
  const normalized = normalize(text);
  const flags: string[] = [];

  for (const word of BANNED_WORDS) {
    if (normalized.includes(word.toLowerCase())) {
      flags.push('profanity');
      return {
        allowed: false,
        reason: 'İçerik topluluk kurallarına aykırı ifadeler içeriyor.',
        flags,
      };
    }
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      flags.push('spam');
      return {
        allowed: false,
        reason: 'Spam veya yönlendirme bağlantıları tespit edildi.',
        flags,
      };
    }
  }

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(text)) {
      flags.push('suspicious');
    }
  }

  if (flags.includes('suspicious')) {
    return {
      allowed: true,
      reason: null,
      flags,
    };
  }

  return { allowed: true, reason: null, flags: [] };
}

export function assertContentAllowed(text: string): string | null {
  const result = scanContent(text);
  return result.allowed ? null : result.reason;
}
