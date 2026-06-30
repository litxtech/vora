const GRADIENT_FALLBACK = '#6366F1';

function isValidColor(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !value.includes('undefined');
}

/** LinearGradient — Android native katmanında geçersiz renk NPE yapar. */
export function asGradientColors(
  colors: readonly (string | undefined | null)[],
  min = 2,
): string[] {
  const cleaned = colors.map((color) => (isValidColor(color) ? color : GRADIENT_FALLBACK));
  while (cleaned.length < min) {
    cleaned.push(GRADIENT_FALLBACK);
  }
  return cleaned;
}

/** Tema renginden yarı saydam hex — primary henüz yüklenmediyse güvenli fallback. */
export function themedAlphaHex(color: string | undefined, alpha: string, fallback = GRADIENT_FALLBACK): string {
  const base = isValidColor(color) ? color : fallback;
  return `${base}${alpha}`;
}
