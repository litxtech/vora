import { APP_APPEARANCE_CONFIG_KEY } from '@/features/app-appearance/constants';
import { parseAppearanceConfig } from '@/features/app-appearance/utils/parseAppearanceConfig';
import type { AppAppearanceConfig } from '@/features/app-appearance/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function fetchAppAppearanceConfig(): Promise<AppAppearanceConfig> {
  const { data, error } = await supabase.rpc('get_app_appearance_config');
  if (error || !data) {
    return parseAppearanceConfig(null);
  }
  return parseAppearanceConfig(data);
}

export async function updateAppAppearanceConfig(
  config: AppAppearanceConfig,
): Promise<{ error: string | null }> {
  const payload = {
    version: 2,
    colors: config.colors,
    gradients: config.gradients,
    spacing: config.spacing,
    radius: config.radius,
    typography: config.typography,
    tab_bar: config.tab_bar,
    feed: config.feed,
    centers_hub: config.centers_hub,
    branding: config.branding,
    lobby: config.lobby,
    trust_vacation_promo: config.trust_vacation_promo,
    admin_note: config.admin_note ?? '',
  };

  const { error } = await supabase.rpc('admin_update_system_config', {
    p_key: APP_APPEARANCE_CONFIG_KEY,
    p_value: payload,
  });

  return { error: supabaseErrorMessage(error) };
}
