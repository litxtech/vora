import { APP_FEATURE_BY_ID, APP_FEATURE_REGISTRY } from '@/features/feature-flags/constants';
import { isFeatureForcedHidden } from '@/features/feature-flags/services/featureFlagsCore';
import type { FeatureVisibilityMap } from '@/features/feature-flags/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type FeatureFlagRow = {
  feature_id: string;
  is_button_visible: boolean;
};

export async function fetchFeatureVisibility(): Promise<FeatureVisibilityMap> {
  const { data, error } = await supabase
    .from('app_feature_flags')
    .select('feature_id, is_button_visible');

  if (error) {
    console.warn('[FeatureFlags] fetch failed:', error.message);
    return buildDefaultMap();
  }

  return mergeVisibility(data ?? []);
}

export function mergeVisibility(rows: FeatureFlagRow[]): FeatureVisibilityMap {
  const map: FeatureVisibilityMap = {};

  for (const feature of APP_FEATURE_REGISTRY) {
    const row = rows.find((entry) => entry.feature_id === feature.id);
    const visible = row?.is_button_visible ?? true;
    map[feature.id] = isFeatureForcedHidden(feature.id) ? false : visible;
  }

  return map;
}

function buildDefaultMap(): FeatureVisibilityMap {
  return Object.fromEntries(
    APP_FEATURE_REGISTRY.map((feature) => [
      feature.id,
      isFeatureForcedHidden(feature.id) ? false : true,
    ]),
  );
}

export async function updateFeatureVisibility(
  featureId: string,
  isButtonVisible: boolean,
  updatedBy: string,
): Promise<{ error: string | null }> {
  const def = APP_FEATURE_BY_ID[featureId];
  const { error } = await supabase.from('app_feature_flags').upsert(
    {
      feature_id: featureId,
      label: def?.label ?? featureId,
      feature_group: def?.group ?? 'actions',
      is_button_visible: isButtonVisible,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'feature_id' },
  );

  return { error: supabaseErrorMessage(error) };
}
