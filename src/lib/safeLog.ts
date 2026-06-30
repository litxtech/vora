const SENSITIVE_KEY = /(token|password|secret|authorization|api[_-]?key|session|cookie|iban|credential)/i;

function sanitizeValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (value.length > 120 && /^[\w+/=-]+\.[\w+/=-]+\./.test(value)) {
      return '[redacted-jwt]';
    }
    if (value.startsWith('eyJ') && value.length > 40) return '[redacted-jwt]';
    return value;
  }
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (typeof value === 'object') return sanitizeRecord(value as Record<string, unknown>);
  return value;
}

function sanitizeRecord(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (SENSITIVE_KEY.test(key)) {
      out[key] = '[redacted]';
    } else {
      out[key] = sanitizeValue(value);
    }
  }
  return out;
}

/** Production'da sessiz; yalnızca geliştirmede hassas alanları maskeleyerek loglar. */
export function devLog(tag: string, message: string, detail?: Record<string, unknown>): void {
  if (!__DEV__) return;
  if (detail) {
    console.log(`[${tag}] ${message}`, sanitizeRecord(detail));
  } else {
    console.log(`[${tag}] ${message}`);
  }
}

export function devWarn(tag: string, message: string, detail?: unknown): void {
  if (!__DEV__) return;
  if (detail !== undefined) {
    console.warn(`[${tag}] ${message}`, typeof detail === 'object' && detail !== null
      ? sanitizeRecord(detail as Record<string, unknown>)
      : detail);
  } else {
    console.warn(`[${tag}] ${message}`);
  }
}

export function devError(tag: string, message: string, error?: unknown): void {
  if (!__DEV__) return;
  if (error instanceof Error) {
    console.error(`[${tag}] ${message}`, error.message);
  } else if (error !== undefined) {
    console.warn(`[${tag}] ${message}`, error);
  } else {
    console.error(`[${tag}] ${message}`);
  }
}
