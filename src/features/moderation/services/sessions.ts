import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

function getDeviceName(): string {
  const iosModel = Constants.platform?.ios?.model;
  const androidModel =
    (Constants.platform?.android as { model?: string } | undefined)?.model;
  return iosModel ?? androidModel ?? `${Platform.OS} cihaz`;
}

export async function registerCurrentSession(): Promise<{
  isNewDevice: boolean;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('register_user_session', {
    p_device_name: getDeviceName(),
    p_device_type: Platform.OS,
    p_session_key: Constants.sessionId ?? Platform.OS,
  });

  if (error) return { isNewDevice: false, error: supabaseErrorMessage(error)! };

  const result = (data ?? {}) as { is_new_device?: boolean };
  return { isNewDevice: result.is_new_device ?? false, error: null };
}

export async function touchCurrentSession(): Promise<void> {
  await supabase.rpc('touch_user_session');
}
