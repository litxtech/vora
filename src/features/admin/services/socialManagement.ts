import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type CommunityAdminRow = {
  id: string;
  name: string;
  slug: string;
  category: string;
  region_id: string | null;
  member_count: number;
  post_count: number;
  is_suspended: boolean;
  created_by: string;
  owner_username: string;
  created_at: string;
};

export async function fetchAdminCommunities(
  search?: string,
  limit = 30,
  offset = 0,
): Promise<CommunityAdminRow[]> {
  const { data, error } = await supabase.rpc('admin_list_communities', {
    p_limit: limit,
    p_offset: offset,
    p_search: search?.trim() || null,
  });
  if (error || !data) return [];
  return data as CommunityAdminRow[];
}

export async function suspendCommunity(
  communityId: string,
  suspend: boolean,
  reason?: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_suspend_community', {
    p_community_id: communityId,
    p_suspend: suspend,
    p_reason: reason ?? null,
  });
  return { error: supabaseErrorMessage(error) };
}

export type ChannelAdminRow = {
  id: string;
  name: string;
  slug: string;
  channel_type: string;
  region_id: string | null;
  subscriber_count: number;
  is_verified: boolean;
  is_suspended: boolean;
  owner_id: string;
  owner_username: string;
  created_at: string;
};

export async function fetchAdminChannels(): Promise<ChannelAdminRow[]> {
  const { data, error } = await supabase.rpc('admin_list_channels', { p_limit: 50 });
  if (error || !data) return [];
  return data as ChannelAdminRow[];
}

export async function verifyChannel(channelId: string, verified: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_verify_channel', {
    p_channel_id: channelId,
    p_verified: verified,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function suspendChannel(
  channelId: string,
  suspend: boolean,
  reason?: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_suspend_channel', {
    p_channel_id: channelId,
    p_suspend: suspend,
    p_reason: reason ?? null,
  });
  return { error: supabaseErrorMessage(error) };
}
