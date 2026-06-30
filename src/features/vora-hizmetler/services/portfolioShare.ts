import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import type { ProviderPortfolioItem, ProviderPublicWork } from '@/features/vora-hizmetler/types';
import {
  buildPublicWorkShareContent,
  publicWorkMediaUrls,
} from '@/features/vora-hizmetler/services/providerWorkData';

function isRemoteUri(uri: string): boolean {
  return /^https?:\/\//i.test(uri);
}

export function buildPortfolioShareContent(item: ProviderPortfolioItem): string {
  return buildPublicWorkShareContent({
    id: item.id,
    source: 'portfolio',
    title: item.title,
    description: item.description,
    beforeImageUrl: item.beforeImageUrl,
    afterImageUrl: item.afterImageUrl,
    mediaUrls: item.mediaUrls,
    completedAt: item.createdAt,
  });
}

export function portfolioItemMediaUrls(item: ProviderPortfolioItem): string[] {
  return publicWorkMediaUrls({
    id: item.id,
    source: 'portfolio',
    title: item.title,
    description: item.description,
    beforeImageUrl: item.beforeImageUrl,
    afterImageUrl: item.afterImageUrl,
    mediaUrls: item.mediaUrls,
    completedAt: item.createdAt,
  });
}

async function cacheRemoteImage(uri: string, index: number): Promise<string | null> {
  if (!isRemoteUri(uri)) return uri;

  const ext = uri.split('?')[0]?.split('.').pop()?.toLowerCase() || 'jpg';
  const dest = new File(Paths.cache, `hizmet-portfolio-share-${Date.now()}-${index}.${ext}`);

  try {
    const downloaded = await File.downloadFileAsync(uri, dest);
    return downloaded.exists ? downloaded.uri : null;
  } catch {
    return null;
  }
}

async function prepareComposeMediaUris(urls: string[]): Promise<string[]> {
  const results = await Promise.all(urls.map((url, index) => cacheRemoteImage(url, index)));
  return results.filter((uri): uri is string => Boolean(uri));
}

export async function sharePortfolioItemToFeed(item: ProviderPortfolioItem): Promise<void> {
  await sharePublicWorkToFeed({
    id: item.id,
    source: 'portfolio',
    title: item.title,
    description: item.description,
    beforeImageUrl: item.beforeImageUrl,
    afterImageUrl: item.afterImageUrl,
    mediaUrls: item.mediaUrls,
    completedAt: item.createdAt,
  });
}

export async function sharePublicWorkToFeed(item: ProviderPublicWork): Promise<void> {
  const sourceUrls = publicWorkMediaUrls(item).slice(0, 4);
  const mediaUris = await prepareComposeMediaUris(sourceUrls);

  router.push({
    pathname: '/compose',
    params: {
      content: buildPublicWorkShareContent(item),
      ...(mediaUris.length ? { mediaUris: mediaUris.join(',') } : {}),
    },
  } as never);
}

export function openProviderComposePost(): void {
  router.push({
    pathname: '/compose',
    params: {
      content: 'Vora Hizmetler\'de yeni bir iş tamamladım.\n\n#VoraHizmetler',
    },
  } as never);
}
