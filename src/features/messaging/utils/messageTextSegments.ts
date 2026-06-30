import { isPhoneCandidate } from './phoneInText';

export type RichTextSegment =
  | { kind: 'text'; value: string }
  | { kind: 'phone'; value: string; display: string }
  | { kind: 'url'; value: string; display: string };

/** http(s):// , www. veya yaygın TLD'li çıplak alan adlarını yakalar. */
const URL_REGEX =
  /\b(?:https?:\/\/|www\.)[^\s<>"'`]+|[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|me|tr|co|app|dev|link|xyz|info|biz|edu|gov|tv|shop|store)(?:\/[^\s<>"'`]*)?/gi;

const PHONE_CANDIDATE_REGEX = /\+?\(?\d[\d\s().-]{7,18}\d/g;

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

/** Mesaj metnini düz metin / telefon / URL parçalarına böler. */
export function splitMessageText(text: string): RichTextSegment[] {
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

  if (candidates.length === 0) return [{ kind: 'text', value: text }];

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
      segments.push({ kind: 'text', value: text.slice(cursor, candidate.start) });
    }
    segments.push(candidate.seg);
    cursor = candidate.end;
  }
  if (cursor < text.length) {
    segments.push({ kind: 'text', value: text.slice(cursor) });
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
