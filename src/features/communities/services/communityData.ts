import { DEMO_COMMUNITIES } from '@/features/communities/constants';
import { isDemoDataEnabled } from '@/lib/demo/demoData';
import type {
  Community,
  CommunityDetail,
  CommunityMember,
  CommunityMemberRole,
  CommunityRule,
  CreateCommunityInput,
} from '@/features/communities/types';
import type { FeedItem } from '@/features/feed/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type CommunityRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  icon_url: string | null;
  region_id: string | null;
  category: string;
  visibility: string;
  member_count: number;
  post_count: number;
  created_by: string;
  rules_summary: string | null;
  conversation_id: string | null;
  created_at: string;
  is_suspended?: boolean;
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

function mapCommunity(row: CommunityRow, myRole: CommunityMemberRole | null = null): Community {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    coverUrl: row.cover_url,
    iconUrl: row.icon_url,
    regionId: row.region_id,
    category: row.category as Community['category'],
    visibility: row.visibility as Community['visibility'],
    memberCount: row.member_count,
    postCount: row.post_count,
    createdBy: row.created_by,
    rulesSummary: row.rules_summary,
    conversationId: row.conversation_id,
    createdAt: row.created_at,
    myRole,
    isMember: myRole !== null,
  };
}

export async function fetchCommunities(
  userId: string | null,
  regionId?: string | null,
): Promise<Community[]> {
  let query = supabase
    .from('communities')
    .select('*')
    .eq('is_suspended', false)
    .order('member_count', { ascending: false })
    .limit(50);

  if (regionId) {
    query = query.or(`region_id.eq.${regionId},region_id.is.null`);
  }

  const { data, error } = await query;
  if (error || !data?.length) {
    if (!isDemoDataEnabled()) return [];
    return DEMO_COMMUNITIES.map((demo, index) => ({
      id: `demo-community-${index}`,
      name: demo.name,
      slug: demo.slug,
      description: demo.description,
      coverUrl: null,
      iconUrl: null,
      regionId: demo.regionId,
      category: demo.category,
      visibility: 'public' as const,
      memberCount: 100 + index * 50,
      postCount: 20 + index * 10,
      createdBy: 'demo',
      rulesSummary: 'Saygılı olun, spam yapmayın.',
      createdAt: new Date().toISOString(),
      conversationId: null,
      myRole: null,
      isMember: false,
    }));
  }

  const rows = data as CommunityRow[];
  const ids = rows.map((r) => r.id);

  const membershipMap = new Map<string, CommunityMemberRole>();
  if (userId && ids.length) {
    const { data: memberships } = await supabase
      .from('community_members')
      .select('community_id, role')
      .eq('user_id', userId)
      .in('community_id', ids);

    for (const m of memberships ?? []) {
      membershipMap.set(m.community_id, m.role as CommunityMemberRole);
    }
  }

  return rows.map((row) => mapCommunity(row, membershipMap.get(row.id) ?? null));
}

export async function fetchMyCommunities(userId: string): Promise<Community[]> {
  const { data: memberships } = await supabase
    .from('community_members')
    .select('community_id, role, communities (*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });

  if (!memberships?.length) return [];

  return memberships
    .map((m) => {
      const community = Array.isArray(m.communities) ? m.communities[0] : m.communities;
      if (!community) return null;
      return mapCommunity(community as CommunityRow, m.role as CommunityMemberRole);
    })
    .filter((c): c is Community => c !== null);
}

export async function fetchCommunityDetail(
  communityId: string,
  userId: string | null,
): Promise<CommunityDetail | null> {
  if (communityId.startsWith('demo-community-')) {
    if (!isDemoDataEnabled()) return null;
    const index = parseInt(communityId.replace('demo-community-', ''), 10);
    const demo = DEMO_COMMUNITIES[index];
    if (!demo) return null;
    return {
      id: communityId,
      name: demo.name,
      slug: demo.slug,
      description: demo.description,
      coverUrl: null,
      iconUrl: null,
      regionId: demo.regionId,
      category: demo.category,
      visibility: 'public',
      memberCount: 100,
      postCount: 20,
      createdBy: 'demo',
      rulesSummary: 'Saygılı olun, spam yapmayın.',
      createdAt: new Date().toISOString(),
      conversationId: null,
      myRole: null,
      isMember: false,
      rules: [
        { id: '1', title: 'Saygı', content: 'Tüm üyelere saygılı davranın.', sortOrder: 1 },
        { id: '2', title: 'Spam yasağı', content: 'Reklam ve spam içerik paylaşmayın.', sortOrder: 2 },
      ],
      posts: [],
      members: [],
    };
  }

  const { data: community } = await supabase
    .from('communities')
    .select('*')
    .eq('id', communityId)
    .maybeSingle();

  if (!community) return null;

  let myRole: CommunityMemberRole | null = null;
  if (userId) {
    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', communityId)
      .eq('user_id', userId)
      .maybeSingle();
    myRole = (membership?.role as CommunityMemberRole) ?? null;
  }

  const [{ data: rules }, { data: posts }, { data: memberRows }] = await Promise.all([
    supabase
      .from('community_rules')
      .select('id, title, content, sort_order')
      .eq('community_id', communityId)
      .order('sort_order'),
    supabase
      .from('posts')
      .select(
        `id, author_id, region_id, title, content, media_urls, category, district, location_label,
         latitude, longitude, like_count, comment_count, quote_count, save_count, view_count, created_at,
         profiles!posts_author_id_fkey (id, username, full_name, avatar_url, role, is_verified)`,
      )
      .eq('community_id', communityId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('community_members')
      .select(
        `user_id, role, joined_at,
         profiles!community_members_user_id_fkey (username, full_name, avatar_url)`,
      )
      .eq('community_id', communityId)
      .order('joined_at', { ascending: true })
      .limit(100),
  ]);

  const feedPosts: FeedItem[] = ((posts ?? []) as unknown as Array<{
    id: string;
    author_id: string;
    region_id: string;
    title: string | null;
    content: string;
    media_urls: string[];
    category: string;
    district: string | null;
    location_label: string | null;
    latitude: number | null;
    longitude: number | null;
    like_count: number;
    comment_count: number;
    quote_count: number;
    save_count: number;
    view_count: number;
    created_at: string;
    profiles: FeedItem['author'] | FeedItem['author'][] | null;
  }>).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: `post-${row.id}`,
      sourceType: 'post' as const,
      sourceId: row.id,
      author: profile ?? {
        id: row.author_id,
        username: 'kullanici',
        fullName: null,
        avatarUrl: null,
        role: 'user',
        isVerified: false,
      },
      title: row.title,
      content: row.content,
      mediaUrls: row.media_urls ?? [],
      category: row.category as FeedItem['category'],
      regionId: row.region_id,
      district: row.district,
      locationLabel: row.location_label,
      latitude: row.latitude,
      longitude: row.longitude,
      likeCount: row.like_count,
      commentCount: row.comment_count,
      quoteCount: row.quote_count,
      saveCount: row.save_count,
      viewCount: row.view_count,
      createdAt: row.created_at,
      isLiked: false,
      isSaved: false,
      isFollowing: false,
      quotedPost: null,
    };
  });

  return {
    ...mapCommunity(community as CommunityRow, myRole),
    rules: ((rules ?? []) as { id: string; title: string; content: string; sort_order: number }[]).map(
      (r): CommunityRule => ({
        id: r.id,
        title: r.title,
        content: r.content,
        sortOrder: r.sort_order,
      }),
    ),
    posts: feedPosts,
    members: mapCommunityMembers(memberRows ?? []),
  };
}

function mapCommunityMembers(
  rows: Array<{
    user_id: string;
    role: string;
    joined_at: string;
    profiles: { username: string; full_name: string | null; avatar_url: string | null } | { username: string; full_name: string | null; avatar_url: string | null }[] | null;
  }>,
): CommunityMember[] {
  const roleOrder: Record<CommunityMemberRole, number> = {
    owner: 0,
    admin: 1,
    moderator: 2,
    member: 3,
  };

  return rows
    .map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        userId: row.user_id,
        username: profile?.username ?? 'kullanici',
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        role: row.role as CommunityMemberRole,
        joinedAt: row.joined_at,
      };
    })
    .sort((a, b) => roleOrder[a.role] - roleOrder[b.role] || a.joinedAt.localeCompare(b.joinedAt));
}

export async function joinCommunity(communityId: string, userId: string): Promise<void> {
  if (communityId.startsWith('demo-')) return;
  await supabase.from('community_members').upsert({
    community_id: communityId,
    user_id: userId,
    role: 'member',
  });
}

export async function leaveCommunity(communityId: string, userId: string): Promise<void> {
  if (communityId.startsWith('demo-')) return;
  await supabase
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', userId);
}

export async function createCommunity(
  input: CreateCommunityInput,
  userId: string,
): Promise<Community | null> {
  const slug = slugify(input.name);

  const { data, error } = await supabase
    .from('communities')
    .insert({
      name: input.name,
      slug,
      description: input.description,
      region_id: input.regionId,
      category: input.category,
      created_by: userId,
      rules_summary: input.rulesSummary,
    })
    .select('*')
    .single();

  if (error || !data) return null;

  await supabase.from('community_members').insert({
    community_id: data.id,
    user_id: userId,
    role: 'owner',
  });

  if (input.rulesSummary.trim()) {
    await supabase.from('community_rules').insert({
      community_id: data.id,
      title: 'Topluluk Kuralları',
      content: input.rulesSummary,
      sort_order: 1,
    });
  }

  return mapCommunity(data as CommunityRow, 'owner');
}

export async function ensureCommunityConversation(
  communityId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('communities')
    .select('conversation_id, created_by, name')
    .eq('id', communityId)
    .maybeSingle();

  if (!data) return null;
  if (data.conversation_id) return data.conversation_id;

  const { data: convId, error } = await supabase.rpc('create_community_conversation', {
    p_community_id: communityId,
    p_creator_id: data.created_by,
    p_title: data.name,
  });

  if (error) return null;
  return convId as string;
}

export async function addCommunityMember(
  communityId: string,
  userId: string,
): Promise<{ error: string | null }> {
  if (communityId.startsWith('demo-')) {
    return { error: 'Demo toplulukta üye eklenemez.' };
  }

  const { error } = await supabase.rpc('add_community_member', {
    p_community_id: communityId,
    p_user_id: userId,
  });

  return { error: supabaseErrorMessage(error) };
}

export async function addCommunityMembers(
  communityId: string,
  userIds: string[],
): Promise<{ added: number; error: string | null }> {
  let added = 0;
  for (const userId of userIds) {
    const { error } = await addCommunityMember(communityId, userId);
    if (error) return { added, error };
    added += 1;
  }
  return { added, error: null };
}

export async function updateCommunityMemberRole(
  communityId: string,
  memberId: string,
  role: CommunityMemberRole,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('update_community_member_role', {
    p_community_id: communityId,
    p_member_id: memberId,
    p_new_role: role,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function removeCommunityMember(
  communityId: string,
  memberId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('remove_community_member', {
    p_community_id: communityId,
    p_member_id: memberId,
  });
  return { error: supabaseErrorMessage(error) };
}

export function canManageCommunity(role: CommunityMemberRole | null): boolean {
  return role === 'owner' || role === 'admin' || role === 'moderator';
}

export function canAdminCommunity(role: CommunityMemberRole | null): boolean {
  return role === 'owner' || role === 'admin';
}

export function canEditCommunityBranding(role: CommunityMemberRole | null): boolean {
  return role === 'owner';
}

export function canAssignCommunityRoles(role: CommunityMemberRole | null): boolean {
  return role === 'owner';
}

export async function updateCommunityBranding(
  communityId: string,
  patch: { coverUrl?: string | null; iconUrl?: string | null },
): Promise<{ error: string | null }> {
  if (communityId.startsWith('demo-')) {
    return { error: 'Demo toplulukta düzenleme yapılamaz.' };
  }

  const { error } = await supabase.rpc('update_community_branding', {
    p_community_id: communityId,
    p_cover_url: patch.coverUrl ?? null,
    p_icon_url: patch.iconUrl ?? null,
  });

  return { error: supabaseErrorMessage(error) };
}
