import {
  DEFAULT_STORY_LINK_COLOR,
  STORY_LINK_COLOR_PRESETS,
} from '@/features/stories/constants/storyLinkColors';

export type StoryLinkManifest = {
  id: string;
  url: string;
  label: string;
  backgroundColor: string;
  textColor: string;
  xNorm: number;
  yNorm: number;
};

export function createStoryLinkId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `link-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function clampLinkNorm(value: number): number {
  return Math.max(0.08, Math.min(0.92, value));
}

export function defaultLinkPosition(index: number): { xNorm: number; yNorm: number } {
  return {
    xNorm: 0.5,
    yNorm: clampLinkNorm(0.68 - index * 0.1),
  };
}

export function createStoryLink(input: {
  url: string;
  label: string;
  index: number;
  backgroundColor?: string;
  textColor?: string;
}): StoryLinkManifest {
  const pos = defaultLinkPosition(input.index);
  const preset = STORY_LINK_COLOR_PRESETS.find(
    (p) => p.backgroundColor === input.backgroundColor,
  ) ?? DEFAULT_STORY_LINK_COLOR;

  return {
    id: createStoryLinkId(),
    url: input.url,
    label: input.label.trim() || 'Bağlantı',
    backgroundColor: input.backgroundColor ?? preset.backgroundColor,
    textColor: input.textColor ?? preset.textColor,
    xNorm: pos.xNorm,
    yNorm: pos.yNorm,
  };
}

export function parseStoryLinks(raw: unknown): StoryLinkManifest[] {
  if (!Array.isArray(raw)) return [];

  const links: StoryLinkManifest[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as Record<string, unknown>;
    if (typeof obj.id !== 'string' || typeof obj.url !== 'string') continue;

    const label = typeof obj.label === 'string' ? obj.label.trim() : '';
    const bg =
      typeof obj.backgroundColor === 'string'
        ? obj.backgroundColor
        : DEFAULT_STORY_LINK_COLOR.backgroundColor;
    const text =
      typeof obj.textColor === 'string' ? obj.textColor : DEFAULT_STORY_LINK_COLOR.textColor;

    links.push({
      id: obj.id,
      url: obj.url,
      label: label || 'Bağlantı',
      backgroundColor: bg,
      textColor: text,
      xNorm: clampLinkNorm(typeof obj.xNorm === 'number' ? obj.xNorm : 0.5),
      yNorm: clampLinkNorm(typeof obj.yNorm === 'number' ? obj.yNorm : 0.72),
    });
  }

  return links;
}

export function serializeStoryLinks(links: StoryLinkManifest[]): StoryLinkManifest[] {
  return links.map((link) => ({
    id: link.id,
    url: link.url,
    label: link.label.trim() || 'Bağlantı',
    backgroundColor: link.backgroundColor,
    textColor: link.textColor,
    xNorm: clampLinkNorm(link.xNorm),
    yNorm: clampLinkNorm(link.yNorm),
  }));
}
