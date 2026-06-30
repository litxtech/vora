import type { AppShareChannel, AppSharePlatform, AppStoreLinksConfig } from '@/features/app-share/types';

type BuildTrackedStoreUrlInput = {
  config: AppStoreLinksConfig;
  platform: AppSharePlatform;
  channel: AppShareChannel;
  referrerId?: string | null;
};

function appendSearchParams(url: URL, entries: Record<string, string>): void {
  for (const [key, value] of Object.entries(entries)) {
    if (value) url.searchParams.set(key, value);
  }
}

export function buildTrackedStoreUrl({
  config,
  platform,
  channel,
  referrerId,
}: BuildTrackedStoreUrlInput): string | null {
  const baseUrl = platform === 'ios' ? config.ios_url : config.android_url;
  if (!baseUrl) return null;

  try {
    const url = new URL(baseUrl);
    const medium = [config.utm_medium, channel].filter(Boolean).join('_');

    appendSearchParams(url, {
      utm_source: config.utm_source,
      utm_medium: medium,
      utm_campaign: config.utm_campaign,
      utm_content: referrerId?.trim() ?? '',
    });

    if (platform === 'android') {
      const referrer = [
        `utm_source=${encodeURIComponent(config.utm_source)}`,
        `utm_medium=${encodeURIComponent(medium)}`,
        `utm_campaign=${encodeURIComponent(config.utm_campaign)}`,
        referrerId ? `utm_content=${encodeURIComponent(referrerId)}` : null,
      ]
        .filter(Boolean)
        .join('&');

      if (referrer) {
        url.searchParams.set('referrer', referrer);
      }
    }

    return url.toString();
  } catch {
    return baseUrl;
  }
}

export function buildAppShareMessage(input: {
  config: AppStoreLinksConfig;
  platform: AppSharePlatform;
  channel: AppShareChannel;
  referrerId?: string | null;
}): string | null {
  const storeUrl = buildTrackedStoreUrl(input);
  if (!storeUrl) return null;

  const lines = [input.config.share_message.trim(), storeUrl].filter(Boolean);
  return lines.join('\n\n');
}
