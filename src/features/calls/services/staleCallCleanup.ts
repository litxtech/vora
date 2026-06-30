import { leaveAgoraChannel } from '@/features/calls/services/agoraCallEngine';
import { deactivateCallAudioMode } from '@/features/calls/services/callAudioMode';
import { stopCallRingtone } from '@/features/calls/services/callRingtonePlayer';
import { endCall } from '@/features/calls/services/callService';
import { useCallStore } from '@/features/calls/store/callStore';
import { supabase } from '@/lib/supabase/client';

/** Uygulama kapatıldıktan sonra açık kalan accepted oturumları sonlandır. */
export async function cleanupStaleAcceptedCalls(userId: string): Promise<void> {
  const store = useCallStore.getState();
  if (store.isJoined && store.session?.status === 'accepted') {
    return;
  }

  const { data, error } = await supabase
    .from('call_sessions')
    .select('id')
    .eq('status', 'accepted')
    .or(`caller_id.eq.${userId},callee_id.eq.${userId}`);

  if (error || !data?.length) return;

  await Promise.allSettled(data.map((row) => endCall(row.id)));
  await stopCallRingtone();
  await leaveAgoraChannel();
  await deactivateCallAudioMode();
  useCallStore.getState().reset();
}
