import type { REALTIME_SUBSCRIBE_STATES, RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

/** Aynı isimli kanal yeniden kullanıldığında subscribe sonrası .on() hatasını önler. */
export async function removeSupabaseChannelsByPrefix(prefix: string): Promise<void> {
  const topicPrefix = `realtime:${prefix}`;
  for (const channel of [...supabase.getChannels()]) {
    if (channel.topic === topicPrefix || channel.topic.startsWith(topicPrefix)) {
      await supabase.removeChannel(channel);
    }
  }
}

export async function subscribeSupabaseChannel(
  channelName: string,
  bind: (channel: RealtimeChannel) => RealtimeChannel,
  onStatus?: (status: REALTIME_SUBSCRIBE_STATES, err?: Error) => void,
): Promise<RealtimeChannel> {
  await removeSupabaseChannelsByPrefix(channelName);
  const channel = bind(supabase.channel(channelName));
  await new Promise<void>((resolve, reject) => {
    channel.subscribe((status, err) => {
      onStatus?.(status, err);
      if (status === 'SUBSCRIBED') resolve();
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        reject(err ?? new Error(`Channel ${channelName}: ${status}`));
      }
    });
  });
  return channel;
}
