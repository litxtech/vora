import { VORA_AI_MODULES, type VoraAiModuleId } from '@/features/vora-ai/constants';
import type { VoraAiSettingsMap } from '@/features/vora-ai/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type AiSettingRow = {
  module: string;
  enabled: boolean;
};

export function buildDefaultVoraAiSettings(): VoraAiSettingsMap {
  const map = Object.fromEntries(VORA_AI_MODULES.map((m) => [m.id, true])) as VoraAiSettingsMap;
  map.master = true;
  map.presence = false;
  return map;
}

export async function fetchVoraAiSettings(): Promise<VoraAiSettingsMap> {
  const { data, error } = await supabase.from('ai_settings').select('module, enabled');

  if (error) {
    console.warn('[VoraAI] settings fetch failed:', error.message);
    return buildDefaultVoraAiSettings();
  }

  const map = buildDefaultVoraAiSettings();
  for (const row of (data ?? []) as AiSettingRow[]) {
    if (row.module in map) {
      map[row.module as VoraAiModuleId] = row.enabled;
    }
  }
  return map;
}

export async function updateVoraAiModule(
  module: VoraAiModuleId,
  enabled: boolean,
  updatedBy: string,
): Promise<{ error: string | null }> {
  const label = VORA_AI_MODULES.find((m) => m.id === module)?.label ?? module;
  const { error } = await supabase.from('ai_settings').upsert(
    { module, label, enabled, updated_by: updatedBy, updated_at: new Date().toISOString() },
    { onConflict: 'module' },
  );

  return { error: supabaseErrorMessage(error) };
}

export async function recordAiMemory(
  userId: string,
  memoryKey: string,
  value: unknown,
): Promise<void> {
  await supabase.from('ai_memories').upsert(
    { user_id: userId, memory_key: memoryKey, value, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,memory_key' },
  );
}

export async function fetchVoraAiMapOverlay(regionId: string) {
  const { data, error } = await supabase
    .from('ai_map_data')
    .select('id, data_type, latitude, longitude, payload')
    .eq('region_id', regionId)
    .gt('expires_at', new Date().toISOString());

  if (error) return [];
  return (data ?? [])
    .filter((row) => row.latitude != null && row.longitude != null)
    .map((row) => ({
      id: row.id as string,
      latitude: row.latitude as number,
      longitude: row.longitude as number,
      dataType: row.data_type as 'trend' | 'density' | 'live_event' | 'news_pin',
      label: (row.payload as { label?: string })?.label ?? row.data_type,
      intensity: (row.payload as { intensity?: number })?.intensity,
    }));
}
