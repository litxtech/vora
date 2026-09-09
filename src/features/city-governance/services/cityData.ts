import type { RegionId } from '@/constants/regions';
import { regionNameById } from '@/constants/regions';
import type {
  CityLeaderSummary,
  CityMembership,
  CityMembershipRole,
  CityMembershipStatus,
  CityOverview,
} from '@/features/city-governance/types';
import { fetchActiveCityElection } from '@/features/city-governance/services/cityElections';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type RegionRow = {
  id: string;
  slug: string | null;
  name: string;
  country_code: string;
  region_label: string | null;
  description: string | null;
  cover_image_url: string | null;
  icon_url: string | null;
  member_count: number;
  active_count: number;
  governance_status: string;
};

type LeaderRow = {
  user_id: string;
  role: CityMembershipRole;
  profiles: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  }[] | null;
};

type MembershipRow = {
  id: string;
  region_id: string;
  user_id: string;
  role: CityMembershipRole;
  status: CityMembershipStatus;
  joined_at: string;
};

function unwrapProfile(row: LeaderRow['profiles']) {
  if (!row) return null;
  return Array.isArray(row) ? row[0] ?? null : row;
}

function mapLeader(regionId: RegionId, row: LeaderRow | null): CityLeaderSummary | null {
  if (!row) return null;
  const profile = unwrapProfile(row.profiles);
  if (!profile) return null;
  return {
    userId: profile.id,
    username: profile.username,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    regionId,
    regionName: regionNameById(regionId) ?? regionId,
  };
}

export async function fetchCityOverview(
  slug: string,
  viewerUserId: string | null,
): Promise<CityOverview | null> {
  const normalizedSlug = slug.trim().toLowerCase();

  const { data: region, error: regionError } = await supabase
    .from('regions')
    .select(
      'id, slug, name, country_code, region_label, description, cover_image_url, icon_url, member_count, active_count, governance_status',
    )
    .or(`slug.eq.${normalizedSlug},id.eq.${normalizedSlug}`)
    .maybeSingle();

  if (regionError) throw new Error(supabaseErrorMessage(regionError));
  if (!region) return null;

  const regionRow = region as RegionRow;
  const regionId = regionRow.id as RegionId;

  const [leaderResult, membershipResult, activeCountResult, primaryCityResult, activeElection] =
    await Promise.all([
    supabase
      .from('city_memberships')
      .select('user_id, role, profiles:user_id (id, username, full_name, avatar_url)')
      .eq('region_id', regionId)
      .eq('status', 'active')
      .eq('role', 'leader')
      .maybeSingle(),
    viewerUserId
      ? supabase
          .from('city_memberships')
          .select('id, region_id, user_id, role, status, joined_at')
          .eq('region_id', regionId)
          .eq('user_id', viewerUserId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.rpc('get_city_active_count', { p_region_id: regionId }),
    viewerUserId
      ? supabase.from('profiles').select('primary_city_id').eq('id', viewerUserId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    fetchActiveCityElection(regionId).catch(() => null),
  ]);

  if (leaderResult.error) throw new Error(supabaseErrorMessage(leaderResult.error));
  if (membershipResult.error) throw new Error(supabaseErrorMessage(membershipResult.error));

  const membership = membershipResult.data as MembershipRow | null;
  const activeCount =
    typeof activeCountResult.data === 'number' ? activeCountResult.data : regionRow.active_count;

  return {
    id: regionId,
    slug: regionRow.slug ?? regionId,
    name: regionRow.name,
    countryCode: regionRow.country_code,
    regionLabel: regionRow.region_label ?? 'Karadeniz',
    description: regionRow.description,
    coverImageUrl: regionRow.cover_image_url,
    iconUrl: regionRow.icon_url,
    memberCount: regionRow.member_count,
    activeCount,
    governanceStatus: regionRow.governance_status as CityOverview['governanceStatus'],
    leader: mapLeader(regionId, leaderResult.data as LeaderRow | null),
    council: {
      memberCount: 0,
      openAgendaCount: 0,
      votingCount: 0,
    },
    activeElection,
    isMember: membership?.status === 'active',
    myRole: membership?.status === 'active' ? membership.role : null,
    myMembershipStatus: membership?.status ?? null,
    isPrimaryCity: primaryCityResult.data?.primary_city_id === regionId,
  };
}

export async function joinCity(regionId: RegionId): Promise<CityMembership> {
  const { data, error } = await supabase.rpc('join_city', { p_region_id: regionId });
  if (error) throw new Error(supabaseErrorMessage(error));

  const row = data as MembershipRow;
  return {
    id: row.id,
    regionId: row.region_id as RegionId,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at,
  };
}

export async function leaveCity(regionId: RegionId): Promise<void> {
  const { error } = await supabase.rpc('leave_city', { p_region_id: regionId });
  if (error) throw new Error(supabaseErrorMessage(error));
}

export async function fetchActiveCityLeader(
  regionId: RegionId,
): Promise<CityLeaderSummary | null> {
  const { data, error } = await supabase
    .from('city_memberships')
    .select('user_id, role, profiles:user_id (id, username, full_name, avatar_url)')
    .eq('region_id', regionId)
    .eq('status', 'active')
    .eq('role', 'leader')
    .maybeSingle();

  if (error) throw new Error(supabaseErrorMessage(error));
  return mapLeader(regionId, data as LeaderRow | null);
}

export async function fetchUserCityLeaderBadge(
  userId: string,
): Promise<CityLeaderSummary | null> {
  const badges = await fetchCityLeaderBadgesByUserIds([userId]);
  return badges.get(userId) ?? null;
}

export async function fetchCityLeaderBadgesByUserIds(
  userIds: string[],
): Promise<Map<string, CityLeaderSummary>> {
  const uniqueIds = [...new Set(userIds.filter((id) => id && !id.startsWith('demo-')))];
  if (!uniqueIds.length) return new Map();

  const { data, error } = await supabase
    .from('city_memberships')
    .select('region_id, user_id, role, profiles:user_id (id, username, full_name, avatar_url)')
    .in('user_id', uniqueIds)
    .eq('status', 'active')
    .eq('role', 'leader');

  if (error) throw new Error(supabaseErrorMessage(error));

  const map = new Map<string, CityLeaderSummary>();
  for (const row of data ?? []) {
    const typed = row as LeaderRow & { user_id: string; region_id: string };
    const leader = mapLeader(typed.region_id as RegionId, typed);
    if (leader) map.set(typed.user_id, leader);
  }
  return map;
}
