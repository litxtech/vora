import { demoArrayFallback } from '@/lib/demo/demoData';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import type { VolunteerCategory, VolunteerTeam } from '@/features/volunteer/constants';

export type VolunteerTeamDetail = VolunteerTeam & {
  regionId?: string;
  isMember: boolean;
};

export async function fetchVolunteerTeams(
  regionId: string | null,
  category?: VolunteerCategory | 'all',
): Promise<VolunteerTeam[]> {
  if (!regionId) return demoArrayFallback(DEMO_TEAMS);

  let query = supabase
    .from('volunteer_teams')
    .select('id, category, name, description, member_count, is_active')
    .eq('region_id', regionId)
    .eq('is_active', true)
    .eq('is_suspended', false)
    .order('member_count', { ascending: false });

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error || !data?.length) return demoArrayFallback(DEMO_TEAMS);

  return data.map((row) => ({
    id: row.id,
    category: row.category as VolunteerCategory,
    name: row.name,
    description: row.description,
    memberCount: row.member_count,
    isActive: row.is_active,
  }));
}

export async function fetchVolunteerTeamById(
  teamId: string,
  userId?: string | null,
): Promise<VolunteerTeamDetail | null> {
  const { data, error } = await supabase
    .from('volunteer_teams')
    .select('id, region_id, category, name, description, member_count, is_active')
    .eq('id', teamId)
    .eq('is_active', true)
    .eq('is_suspended', false)
    .maybeSingle();

  if (error || !data) return null;

  let isMember = false;
  if (userId) {
    const { data: membership } = await supabase
      .from('volunteer_team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .maybeSingle();
    isMember = Boolean(membership);
  }

  return {
    id: data.id,
    regionId: data.region_id,
    category: data.category as VolunteerCategory,
    name: data.name,
    description: data.description,
    memberCount: data.member_count,
    isActive: data.is_active,
    isMember,
  };
}

export async function joinVolunteerTeam(
  teamId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('volunteer_team_members').insert({
    team_id: teamId,
    user_id: userId,
  });

  if (!error) return { error: null };
  if (error.code === '23505') return { error: 'Bu ekibe zaten üyesiniz.' };
  return { error: supabaseErrorMessage(error.message) };
}

export async function leaveVolunteerTeam(
  teamId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('volunteer_team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);

  return { error: error ? supabaseErrorMessage(error.message) : null };
}

const DEMO_TEAMS: VolunteerTeam[] = [
  { id: 'v1', category: 'search_rescue', name: 'Trabzon AFAD Gönüllüleri', description: 'Afet ve arama kurtarma', memberCount: 124, isActive: true },
  { id: 'v2', category: 'blood_donation', name: 'Kızılay Trabzon', description: 'Kan bağışı organizasyonu', memberCount: 89, isActive: true },
  { id: 'v3', category: 'veterinary', name: 'Hayvan Dostları', description: 'Sokak hayvanları desteği', memberCount: 45, isActive: true },
];
