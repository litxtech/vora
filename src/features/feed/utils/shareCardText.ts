type ShareCardTextOptions = {
  hasMedia: boolean;
  charsPerLine?: number;
};

type ShareCardTextResult = {
  display: string;
  isTruncated: boolean;
  lineBudget: number;
};

const CHARS_PER_LINE_MEDIA = 40;
const CHARS_PER_LINE_TEXT_ONLY = 38;

const LINES_MEDIA_MIN = 4;
const LINES_MEDIA_MAX = 6;
const LINES_TEXT_MIN = 6;
const LINES_TEXT_MAX = 14;

const SENTENCE_END_RE = /[.!?…]+["')\]]*(?=\s|$)/g;

function normalizeShareText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function resolveLineBudget(charCount: number, hasMedia: boolean): number {
  if (hasMedia) {
    if (charCount <= 120) return LINES_MEDIA_MIN;
    if (charCount <= 220) return 5;
    return LINES_MEDIA_MAX;
  }

  if (charCount <= 100) return LINES_TEXT_MIN;
  if (charCount <= 280) return 8;
  if (charCount <= 480) return 10;
  if (charCount <= 720) return 12;
  return LINES_TEXT_MAX;
}

function findLastSentenceEnd(text: string): number | null {
  let lastEnd: number | null = null;
  let match: RegExpExecArray | null;
  SENTENCE_END_RE.lastIndex = 0;
  while ((match = SENTENCE_END_RE.exec(text)) !== null) {
    lastEnd = match.index + match[0].length;
  }
  return lastEnd;
}

function truncateAtCleanBoundary(text: string, charBudget: number): string {
  if (text.length <= charBudget) return text;

  const window = text.slice(0, charBudget);
  const minKeep = Math.floor(charBudget * 0.55);

  const paragraphBreak = window.lastIndexOf('\n\n');
  if (paragraphBreak >= minKeep) {
    return text.slice(0, paragraphBreak).trimEnd();
  }

  const lineBreak = window.lastIndexOf('\n');
  if (lineBreak >= minKeep) {
    return text.slice(0, lineBreak).trimEnd();
  }

  const sentenceEnd = findLastSentenceEnd(window);
  if (sentenceEnd !== null && sentenceEnd >= minKeep) {
    return text.slice(0, sentenceEnd).trimEnd();
  }

  const lastSpace = window.lastIndexOf(' ');
  if (lastSpace >= minKeep) {
    return text.slice(0, lastSpace).trimEnd();
  }

  return window.trimEnd();
}

/** Paylaşım kartı için temiz sınırda kısaltılmış metin ve satır bütçesi. */
export function prepareShareCardText(
  text: string,
  options: ShareCardTextOptions,
): ShareCardTextResult {
  const normalized = normalizeShareText(text);
  if (!normalized) {
    return { display: '', isTruncated: false, lineBudget: options.hasMedia ? LINES_MEDIA_MIN : LINES_TEXT_MIN };
  }

  const charsPerLine = options.charsPerLine ?? (options.hasMedia ? CHARS_PER_LINE_MEDIA : CHARS_PER_LINE_TEXT_ONLY);
  const lineBudget = resolveLineBudget(normalized.length, options.hasMedia);
  const charBudget = lineBudget * charsPerLine;

  if (normalized.length <= charBudget) {
    return { display: normalized, isTruncated: false, lineBudget };
  }

  const clipped = truncateAtCleanBoundary(normalized, charBudget);
  return {
    display: `${clipped}…`,
    isTruncated: true,
    lineBudget,
  };
}

export function shareCardContentLineHeight(hasMedia: boolean): number {
  return hasMedia ? 21 : 23;
}

export function shareCardContentFontSize(hasMedia: boolean): number {
  return hasMedia ? 14 : 15;
}
