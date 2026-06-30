import { DEMO_CHANNELS } from '@/features/channels/constants';
import { isDemoDataEnabled } from '@/lib/demo/demoData';
import type {
  Channel,
  ChannelPost,
  CreateChannelInput,
  CreateChannelPostInput,
} from '@/features/channels/types';
import { supabase } from '@/lib/supabase/client';

type ChannelRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  channel_type: string;
  region_id: string | null;
  business_id: string | null;
  owner_id: string;
  avatar_url: string | null;
  subscriber_count: number;
  post_count: number;
  is_verified: boolean;
  created_at: string;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function mapChannel(
  row: ChannelRow,
  extras: { isSubscribed?: boolean; notifyEnabled?: boolean; canPost?: boolean } = {},
): Channel {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    channelType: row.channel_type as Channel['channelType'],
    regionId: row.region_id,
    businessId: row.business_id,
    ownerId: row.owner_id,
    avatarUrl: row.avatar_url,
    subscriberCount: row.subscriber_count,
    postCount: row.post_count,
    isVerified: row.is_verified,
    isSubscribed: extras.isSubscribed ?? false,
    notifyEnabled: extras.notifyEnabled ?? true,
    canPost: extras.canPost ?? false,
    createdAt: row.created_at,
  };
}

function demoChannels(): Channel[] {
  if (!isDemoDataEnabled()) return [];
  return DEMO_CHANNELS.map((demo, index) => ({
    id: `demo-channel-${index}`,
    name: demo.name,
    slug: demo.slug,
    description: demo.description,
    channelType: demo.channelType,
    regionId: demo.regionId,
    businessId: null,
    ownerId: 'demo',
    avatarUrl: null,
    subscriberCount: 500 + index * 200,
    postCount: 10 + index * 5,
    isVerified: demo.isVerified,
    isSubscribed: false,
    notifyEnabled: true,
    canPost: false,
    createdAt: new Date().toISOString(),
  }));
}

async function enrichChannels(rows: ChannelRow[], userId: string | null): Promise<Channel[]> {
  if (!userId || rows.length === 0) {
    return rows.map((r) => mapChannel(r));
  }

  const ids = rows.map((r) => r.id);
  const [subs, admins] = await Promise.all([
    supabase
      .from('channel_subscribers')
      .select('channel_id, notify_enabled')
      .eq('user_id', userId)
      .in('channel_id', ids),
    supabase
      .from('channel_admins')
      .select('channel_id, can_post')
      .eq('user_id', userId)
      .in('channel_id', ids),
  ]);

  const subMap = new Map((subs.data ?? []).map((s) => [s.channel_id, s.notify_enabled]));
  const adminSet = new Set((admins.data ?? []).map((a) => a.channel_id));

  return rows.map((row) =>
    mapChannel(row, {
      isSubscribed: subMap.has(row.id),
      notifyEnabled: subMap.get(row.id) ?? true,
      canPost: row.owner_id === userId || adminSet.has(row.id),
    }),
  );
}

export async function fetchChannels(
  userId: string | null,
  channelType?: string | null,
  regionId?: string | null,
): Promise<Channel[]> {
  let query = supabase
    .from('channels')
    .select('*')
    .order('subscriber_count', { ascending: false })
    .limit(50);

  if (channelType) query = query.eq('channel_type', channelType);
  if (regionId) query = query.or(`region_id.eq.${regionId},region_id.is.null`);

  const { data, error } = await query;
  if (error || !data?.length) return demoChannels();

  return enrichChannels(data as ChannelRow[], userId);
}

export async function fetchSubscribedChannels(userId: string): Promise<Channel[]> {
  const { data: subs } = await supabase
    .from('channel_subscribers')
    .select('channel_id, notify_enabled, channels (*)')
    .eq('user_id', userId)
    .order('subscribed_at', { ascending: false });

  if (!subs?.length) return [];

  return subs
    .map((s) => {
      const ch = Array.isArray(s.channels) ? s.channels[0] : s.channels;
      if (!ch) return null;
      return mapChannel(ch as ChannelRow, {
        isSubscribed: true,
        notifyEnabled: s.notify_enabled,
        canPost: (ch as ChannelRow).owner_id === userId,
      });
    })
    .filter((c): c is Channel => c !== null);
}

export async function fetchChannelDetail(
  channelId: string,
  userId: string | null,
): Promise<{ channel: Channel; posts: ChannelPost[] } | null> {
  if (channelId.startsWith('demo-channel-')) {
    if (!isDemoDataEnabled()) return null;
    const index = parseInt(channelId.replace('demo-channel-', ''), 10);
    const demo = DEMO_CHANNELS[index];
    if (!demo) return null;
    const channel = demoChannels()[index];
    return {
      channel,
      posts: [
        {
          id: 'demo-post-1',
          channelId,
          authorId: 'demo',
          content: `${demo.name} kanalından örnek duyuru. Tek yönlü yayın — yalnızca kanal yöneticileri paylaşım yapabilir.`,
          mediaUrl: null,
          viewCount: 120,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    };
  }

  const { data: channel } = await supabase
    .from('channels')
    .select('*')
    .eq('id', channelId)
    .maybeSingle();

  if (!channel) return null;

  const [enriched, postsRes] = await Promise.all([
    enrichChannels([channel as ChannelRow], userId),
    supabase
      .from('channel_posts')
      .select('id, channel_id, author_id, content, media_url, view_count, created_at')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const posts: ChannelPost[] = ((postsRes.data ?? []) as Array<{
    id: string;
    channel_id: string;
    author_id: string;
    content: string;
    media_url: string | null;
    view_count: number;
    created_at: string;
  }>).map((p) => ({
    id: p.id,
    channelId: p.channel_id,
    authorId: p.author_id,
    content: p.content,
    mediaUrl: p.media_url,
    viewCount: p.view_count,
    createdAt: p.created_at,
  }));

  return { channel: enriched[0], posts };
}

export async function subscribeChannel(channelId: string, userId: string): Promise<void> {
  if (channelId.startsWith('demo-')) return;
  await supabase.from('channel_subscribers').upsert({
    channel_id: channelId,
    user_id: userId,
    notify_enabled: true,
  });
}

export async function unsubscribeChannel(channelId: string, userId: string): Promise<void> {
  if (channelId.startsWith('demo-')) return;
  await supabase
    .from('channel_subscribers')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_id', userId);
}

export async function toggleChannelNotifications(
  channelId: string,
  userId: string,
  enabled: boolean,
): Promise<void> {
  if (channelId.startsWith('demo-')) return;
  await supabase
    .from('channel_subscribers')
    .update({ notify_enabled: enabled })
    .eq('channel_id', channelId)
    .eq('user_id', userId);
}

export async function createChannel(
  input: CreateChannelInput,
  userId: string,
): Promise<Channel | null> {
  const { data, error } = await supabase
    .from('channels')
    .insert({
      name: input.name,
      slug: slugify(input.name),
      description: input.description,
      channel_type: input.channelType,
      region_id: input.regionId,
      owner_id: userId,
    })
    .select('*')
    .single();

  if (error || !data) return null;

  await supabase.from('channel_admins').insert({
    channel_id: data.id,
    user_id: userId,
    can_post: true,
  });

  return mapChannel(data as ChannelRow, { canPost: true, isSubscribed: false });
}

export async function publishChannelPost(
  channelId: string,
  userId: string,
  input: CreateChannelPostInput,
): Promise<ChannelPost | null> {
  if (channelId.startsWith('demo-')) return null;

  const { data, error } = await supabase
    .from('channel_posts')
    .insert({
      channel_id: channelId,
      author_id: userId,
      content: input.content,
      media_url: input.mediaUrl ?? null,
    })
    .select('id, channel_id, author_id, content, media_url, view_count, created_at')
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    channelId: data.channel_id,
    authorId: data.author_id,
    content: data.content,
    mediaUrl: data.media_url,
    viewCount: data.view_count,
    createdAt: data.created_at,
  };
}
