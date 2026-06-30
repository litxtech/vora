export const VORA_APP_NAME = 'Vora';

export type BrandedPushPresentation = {
  title: string;
  subtitle?: string;
  body: string;
  imageUrl: string | null;
};

function pickString(data: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return null;
}

export function pickPushActorAvatarUrl(data: Record<string, unknown>): string | null {
  return pickString(data, 'actor_avatar_url', 'actorAvatarUrl');
}

export function pickPushContentImageUrl(data: Record<string, unknown>): string | null {
  const actorAvatar = pickPushActorAvatarUrl(data);
  const candidates = [
    pickString(data, 'content_image_url', 'contentImageUrl'),
    pickString(data, 'thumbnail_url', 'thumbnailUrl'),
    pickString(data, 'image_url', 'imageUrl'),
  ].filter(Boolean) as string[];

  for (const url of candidates) {
    if (actorAvatar && url === actorAvatar) continue;
    return url;
  }
  return null;
}

const MESSAGE_EVENT_TYPES = new Set(['message', 'group_message']);
const CALL_EVENT_TYPES = new Set(['call_incoming', 'call_video']);

function usesActorAvatarAsRichImage(eventType: string): boolean {
  return MESSAGE_EVENT_TYPES.has(eventType) || CALL_EVENT_TYPES.has(eventType);
}

export function pickPushRichImageUrl(data: Record<string, unknown>, eventType: string): string | null {
  const content = pickPushContentImageUrl(data);
  if (content) return content;

  if (usesActorAvatarAsRichImage(eventType)) {
    return pickPushActorAvatarUrl(data) ?? pickString(data, 'image_url', 'imageUrl');
  }

  return null;
}

export function pickPushHeadline(rawTitle: string, data: Record<string, unknown>): string {
  return (
    pickString(data, 'sender_name', 'senderName', 'sender_label', 'senderLabel') ??
    rawTitle.trim()
  );
}

export function buildBrandedPushPresentation(
  rawTitle: string,
  rawBody: string,
  data: Record<string, unknown> = {},
): BrandedPushPresentation {
  const headline = pickPushHeadline(rawTitle, data);
  const eventType = String(data.eventType ?? data.event_type ?? '');
  const imageUrl = pickPushRichImageUrl(data, eventType);
  const showSubtitle = headline.length > 0 && headline !== VORA_APP_NAME;

  return {
    title: VORA_APP_NAME,
    subtitle: showSubtitle ? headline : undefined,
    body: rawBody,
    imageUrl,
  };
}

export function formatAndroidPushBody(presentation: BrandedPushPresentation): string {
  if (!presentation.subtitle) return presentation.body;
  if (presentation.body.startsWith(presentation.subtitle)) return presentation.body;
  return `${presentation.subtitle}\n${presentation.body}`;
}
