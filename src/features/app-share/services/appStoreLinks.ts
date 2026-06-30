import { APP_STORE_LINKS_CONFIG_KEY } from '@/features/app-share/constants';
import { parseAppStoreLinksConfig } from '@/features/app-share/utils/parseAppStoreLinksConfig';
import type { AppStoreLinksConfig } from '@/features/app-share/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function fetchAppStoreLinksConfig(): Promise<AppStoreLinksConfig> {
  const { data, error } = await supabase.rpc('get_app_store_links_config');
  if (error || !data) {
    return parseAppStoreLinksConfig(null);
  }
  return parseAppStoreLinksConfig(data);
}

export async function updateAppStoreLinksConfig(
  config: AppStoreLinksConfig,
): Promise<{ error: string | null }> {
  const payload = {
    ios_url: config.ios_url.trim(),
    android_url: config.android_url.trim(),
    title: config.title.trim(),
    subtitle: config.subtitle.trim(),
    share_message: config.share_message.trim(),
    utm_source: config.utm_source.trim(),
    utm_medium: config.utm_medium.trim(),
    utm_campaign: config.utm_campaign.trim(),
    admin_note: config.admin_note?.trim() ?? '',
  };

  const { error } = await supabase.rpc('admin_update_system_config', {
    p_key: APP_STORE_LINKS_CONFIG_KEY,
    p_value: payload,
  });

  return { error: supabaseErrorMessage(error) };
}
