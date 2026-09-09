import { isPhoneCandidate } from './phone';

export type RichTextSegment =
  | { kind: 'text'; value: string }
  | { kind: 'phone'; value: string; display: string }
  | { kind: 'url'; value: string; display: string }
  | { kind: 'mention'; value: string; display: string }
  | { kind: 'hashtag'; value: string; display: string };

export type SplitOptions = {
  mentions?: boolean;
  hashtags?: boolean;
};

/** http(s):// , www. veya yaygın TLD'li çıplak alan adlarını yakalar. */
const URL_REGEX =
  /\b(?:https?:\/\/|www\.)[^\s<>"'`]+|[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|me|tr|co|app|dev|link|xyz|info|biz|edu|gov|tv|shop|store)(?:\/[^\s<>"'`]*)?/gi;

const PHONE_CANDIDATE_REGEX = /\+?\(?\d[\d\s().-]{7,18}\d/g;

const MENTION_HASHTAG_REGEX = /(@[a-z0-9_.-]+|#[\p{L}\p{N}_]+)/giu;

const URL_TAIL_PUNCT = /[.,;:!?'"”’»]/;

/** URL eşleşmesinin sonundaki noktalama işaretlerini metne geri bırakır. */
function trimUrlTail(url: string): string {
  let end = url.length;
  while (end > 0 && URL_TAIL_PUNCT.test(url[end - 1])) {
    end -= 1;
  }
  // Dengeli kapanış parantezini koru (ör. wikipedia (...) linkleri)
  while (
    end > 0 &&
    url[end - 1] === ')' &&
    (url.slice(0, end).match(/\(/g)?.length ?? 0) < (url.slice(0, end).match(/\)/g)?.length ?? 0)
  ) {
    end -= 1;
  }
  return url.slice(0, end);
}

type Candidate = { start: number; end: number; seg: RichTextSegment };

/** Düz metin parçasını @mention / #hashtag alt parçalarına böler. */
function splitTokens(text: string, options: SplitOptions): RichTextSegment[] {
  if (!options.mentions && !options.hashtags) return [{ kind: 'text', value: text }];
  if (!text) return [{ kind: 'text', value: text }];

  const parts = text.split(MENTION_HASHTAG_REGEX);
  const out: RichTextSegment[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (options.mentions && part.startsWith('@') && part.length > 1) {
      out.push({ kind: 'mention', value: part.slice(1), display: part });
    } else if (options.hashtags && part.startsWith('#') && part.length > 1) {
      out.push({ kind: 'hashtag', value: part.slice(1), display: part });
    } else {
      out.push({ kind: 'text', value: part });
    }
  }
  return out.length > 0 ? out : [{ kind: 'text', value: text }];
}

/** Metni düz metin / telefon / URL (+ opsiyonel mention/hashtag) parçalarına böler. */
export function splitMessageText(text: string, options: SplitOptions = {}): RichTextSegment[] {
  if (!text) return [{ kind: 'text', value: '' }];

  const candidates: Candidate[] = [];

  for (const match of text.matchAll(URL_REGEX)) {
    const index = match.index ?? 0;
    // E-posta adreslerinin alan adı kısmını linke çevirme
    if (index > 0 && text[index - 1] === '@') continue;
    const trimmed = trimUrlTail(match[0]);
    if (!trimmed || !/[a-z]/i.test(trimmed)) continue;
    candidates.push({
      start: index,
      end: index + trimmed.length,
      seg: { kind: 'url', value: trimmed, display: trimmed },
    });
  }

  for (const match of text.matchAll(PHONE_CANDIDATE_REGEX)) {
    const raw = match[0];
    const index = match.index ?? 0;
    if (!isPhoneCandidate(raw)) continue;
    candidates.push({
      start: index,
      end: index + raw.length,
      seg: { kind: 'phone', value: raw.trim(), display: raw.trim() },
    });
  }

  if (candidates.length === 0) return splitTokens(text, options);

  // URL'leri telefonlara tercih et, çakışan eşleşmeleri ele
  candidates.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    if (a.seg.kind === b.seg.kind) return b.end - a.end;
    return a.seg.kind === 'url' ? -1 : 1;
  });

  const segments: RichTextSegment[] = [];
  let cursor = 0;
  for (const candidate of candidates) {
    if (candidate.start < cursor) continue;
    if (candidate.start > cursor) {
      segments.push(...splitTokens(text.slice(cursor, candidate.start), options));
    }
    segments.push(candidate.seg);
    cursor = candidate.end;
  }
  if (cursor < text.length) {
    segments.push(...splitTokens(text.slice(cursor), options));
  }

  return segments;
}

/** Önizleme için metindeki ilk URL'yi döndürür (yoksa null). */
export function firstUrlInText(text: string): string | null {
  for (const segment of splitMessageText(text)) {
    if (segment.kind === 'url') return segment.value;
  }
  return null;
}

/**
 * Yazılırken oluşan yarım URL'leri (https://w, www.lit …) önizleme fetch'inden ayıklar.
 * Tıklanabilir metin segmentleri etkilenmez — yalnızca network preview için.
 */
export function isPreviewableUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length < 8) return false;

  try {
    const withProto = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : trimmed.toLowerCase().startsWith('www.')
        ? `https://${trimmed}`
        : trimmed.includes('.')
          ? `https://${trimmed}`
          : trimmed;
    const parsed = new URL(withProto);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

    const host = parsed.hostname.toLowerCase();
    if (!host || host === 'localhost') return false;
    if (!host.includes('.')) return false;

    const labels = host.split('.').filter(Boolean);
    if (labels.length < 2) return false;

    const tld = labels[labels.length - 1] ?? '';
    if (tld.length < 2 || !/^[a-z]{2,}$/i.test(tld)) return false;

    // www. / www.com gibi henüz yazılmamış hostlar
    const registrable = labels[labels.length - 2] ?? '';
    if (!registrable || registrable.length < 2) return false;

    return true;
  } catch {
    return false;
  }
}

