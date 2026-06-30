import { getCurrentAppVersion, getPlatformMinVersionKey } from '@/features/system-gate/services/appVersion';
import { parseAppSystemStatus } from '@/features/system-gate/services/configParsers';
import { isVersionBelow } from '@/features/system-gate/services/versionCompare';
import type { SystemGateState } from '@/features/system-gate/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function fetchAppSystemStatus() {
  const { data, error } = await supabase.rpc('get_app_system_status');
  if (error || !data) {
    return { status: null, error: supabaseErrorMessage(error) ?? 'Sistem durumu alınamadı' };
  }

  return { status: parseAppSystemStatus(data), error: null };
}

export function resolveSystemGateState(status: ReturnType<typeof parseAppSystemStatus> | null): SystemGateState {
  if (!status) return { status: 'ok' };

  if (status.maintenance_mode.enabled) {
    return { status: 'maintenance', config: status.maintenance_mode };
  }

  const minConfig = status.min_app_version;
  if (!minConfig.enabled) return { status: 'ok' };

  const platform = getPlatformMinVersionKey();
  const minVersion = platform === 'ios' ? minConfig.ios : minConfig.android;
  const currentVersion = getCurrentAppVersion();

  if (isVersionBelow(currentVersion, minVersion)) {
    return {
      status: 'force_update',
      config: minConfig,
      currentVersion,
      minVersion,
    };
  }

  return { status: 'ok' };
}

export async function evaluateSystemGate(): Promise<SystemGateState> {
  const { status, error } = await fetchAppSystemStatus();
  if (error) return { status: 'ok' };
  return resolveSystemGateState(status);
}
