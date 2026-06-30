import { DEFAULT_APP_STORE_LINKS } from '@/features/app-share/constants';
import type { AppStoreLinksConfig } from '@/features/app-share/types';

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

export function parseAppStoreLinksConfig(raw: unknown): AppStoreLinksConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_APP_STORE_LINKS };
  }

  const obj = raw as Record<string, unknown>;

  return {
    ios_url: asString(obj.ios_url, DEFAULT_APP_STORE_LINKS.ios_url),
    android_url: asString(obj.android_url, ''),
    title: asString(obj.title, DEFAULT_APP_STORE_LINKS.title),
    subtitle: asString(obj.subtitle, DEFAULT_APP_STORE_LINKS.subtitle),
    share_message: asString(obj.share_message, DEFAULT_APP_STORE_LINKS.share_message),
    utm_source: asString(obj.utm_source, DEFAULT_APP_STORE_LINKS.utm_source),
    utm_medium: asString(obj.utm_medium, DEFAULT_APP_STORE_LINKS.utm_medium),
    utm_campaign: asString(obj.utm_campaign, DEFAULT_APP_STORE_LINKS.utm_campaign),
    admin_note: asString(obj.admin_note, ''),
  };
}
