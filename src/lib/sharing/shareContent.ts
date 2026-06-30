import { Platform, Share } from 'react-native';
import {
  buildPostShareUrl,
  buildReelShareUrl,
  buildProfileShareUrl,
  VORA_SHARE_DOMAIN,
} from '@/lib/sharing/constants';

export { resolveSharePath } from '@/lib/sharing/resolveSharePath';

const SHARE_SNIPPET_MAX = 280;

function normalizeUsername(username: string): string {
  return username.replace(/^@/, '').trim();
}

function buildAuthorLine(username?: string, displayName?: string | null): string | null {
  const handle = username ? `@${normalizeUsername(username)}` : null;
  const name = displayName?.trim();
  if (name && handle) return `${name} (${handle})`;
  return handle ?? name ?? null;
}

function buildShareLines(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part?.trim())).join('\n\n');
}

type SharePayload = {
  message: string;
  title?: string;
};

export async function shareExternalLink(payload: SharePayload): Promise<void> {
  await Share.share(
    Platform.OS === 'android'
      ? { message: payload.message, title: payload.title ?? 'Vora' }
      : { message: payload.message },
  );
}

export async function sharePostLink(input: {
  postId: string;
  title?: string | null;
  content: string;
  authorUsername?: string;
  authorDisplayName?: string | null;
  verified?: boolean;
}): Promise<void> {
  const url = buildPostShareUrl(input.postId);
  const author = buildAuthorLine(input.authorUsername, input.authorDisplayName);
  const headline = input.title?.trim();
  const snippet = input.content.trim().replace(/\s+/g, ' ').slice(0, SHARE_SNIPPET_MAX);

  const message = buildShareLines([
    author,
    headline,
    snippet,
    input.verified ? '✓ VORA Doğrulanmış içerik' : null,
    url,
    `— ${VORA_SHARE_DOMAIN}`,
  ]);

  await shareExternalLink({
    message,
    title: headline ?? author ?? 'Vora',
  });
}

export async function shareReelLink(input: {
  reelId: string;
  caption: string;
  authorUsername?: string;
  authorDisplayName?: string | null;
}): Promise<void> {
  const url = buildReelShareUrl(input.reelId);
  const author = buildAuthorLine(input.authorUsername, input.authorDisplayName);
  const snippet = input.caption.trim().replace(/\s+/g, ' ').slice(0, SHARE_SNIPPET_MAX);

  const message = buildShareLines([
    author ? `${author} · Reels` : 'Vora Reels',
    snippet,
    url,
    `— ${VORA_SHARE_DOMAIN}`,
  ]);

  await shareExternalLink({
    message,
    title: author ? `${author} · Reels` : 'Vora Reels',
  });
}

export async function shareProfileLink(input: { username: string; displayName?: string | null }): Promise<void> {
  const url = buildProfileShareUrl(input.username);
  const author = buildAuthorLine(input.username, input.displayName);

  const message = buildShareLines([author ?? `@${normalizeUsername(input.username)}`, 'Vora profilini görüntüle', url, `— ${VORA_SHARE_DOMAIN}`]);

  await shareExternalLink({
    message,
    title: author ?? 'Vora',
  });
}
