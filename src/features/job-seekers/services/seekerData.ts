import { supabase } from '@/lib/supabase/client';

export type JobSeekerProfile = {
  id: string;
  title: string;
  occupation: string;
  experienceYears: number;
  isVisibleOnMap: boolean;
};

export async function fetchMyJobSeekerProfile(userId: string): Promise<JobSeekerProfile | null> {
  const { data } = await supabase
    .from('job_seekers')
    .select('id, title, occupation, experience_years, is_visible_on_map')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    occupation: data.occupation,
    experienceYears: data.experience_years,
    isVisibleOnMap: data.is_visible_on_map,
  };
}

export async function upsertJobSeekerProfile(input: {
  userId: string;
  regionId: string;
  title: string;
  occupation: string;
  experienceYears: number;
  description?: string;
  latitude?: number;
  longitude?: number;
  district?: string;
  isVisibleOnMap: boolean;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('job_seekers').upsert(
    {
      user_id: input.userId,
      region_id: input.regionId,
      title: input.title,
      occupation: input.occupation,
      experience_years: input.experienceYears,
      description: input.description ?? null,
      district: input.district ?? null,
      is_visible_on_map: input.isVisibleOnMap,
      status: 'published',
    },
    { onConflict: 'user_id' },
  );

  return { error: error?.message ?? null };
}

export async function setJobSeekerVisibility(
  userId: string,
  visible: boolean,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('job_seekers')
    .update({ is_visible_on_map: visible })
    .eq('user_id', userId);

  return { error: error?.message ?? null };
}
