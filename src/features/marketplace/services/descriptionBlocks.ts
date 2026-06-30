import type { MarketplaceDescriptionBlock } from '@/features/marketplace/types';

export function normalizeDescriptionBlocks(
  description: string,
  blocks: MarketplaceDescriptionBlock[] | null | undefined,
): MarketplaceDescriptionBlock[] {
  if (blocks?.length) return blocks;
  const trimmed = description.trim();
  if (!trimmed) return [];
  return [{ type: 'text', content: trimmed }];
}

export function descriptionPlainText(
  description: string,
  blocks?: MarketplaceDescriptionBlock[] | null,
): string {
  const normalized = normalizeDescriptionBlocks(description, blocks);
  return normalized
    .map((block) => {
      if (block.type === 'text') return block.content;
      if (block.type === 'link') return `${block.label} ${block.url}`;
      return '';
    })
    .join('\n')
    .trim();
}

export function parseDescriptionBlocks(raw: unknown): MarketplaceDescriptionBlock[] {
  if (!Array.isArray(raw)) return [];
  const blocks: MarketplaceDescriptionBlock[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (row.type === 'text' && typeof row.content === 'string') {
      blocks.push({ type: 'text', content: row.content });
    } else if (row.type === 'link' && typeof row.label === 'string' && typeof row.url === 'string') {
      blocks.push({ type: 'link', label: row.label, url: row.url });
    } else if (row.type === 'image' && typeof row.url === 'string') {
      blocks.push({ type: 'image', url: row.url });
    } else if (row.type === 'video' && typeof row.url === 'string') {
      blocks.push({ type: 'video', url: row.url });
    }
  }
  return blocks;
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url) || url.includes('video');
}

export function extractUrlsFromText(text: string): string[] {
  return [...new Set(text.match(/https?:\/\/[^\s<>"']+/gi) ?? [])];
}
