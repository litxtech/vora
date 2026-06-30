import type { JobType, MilitaryStatus } from '@/features/personnel-center/types';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database';
import { supabaseErrorMessage } from '@/lib/errors';

export type JobSeekerProfile = {
  id: string;
  title: string;
  occupation: string;
  experienceYears: number;
  isVisibleOnMap: boolean;
  phoneVisible: boolean;
  intro: string | null;
  skills: string[];
  jobTypes: JobType[];
  education: string | null;
  languages: string[];
  drivingLicense: boolean;
  militaryStatus: MilitaryStatus | null;
  salaryExpectation: string | null;
  isReady: boolean;
};

export async function fetchMyJobSeekerProfile(userId: string): Promise<JobSeekerProfile | null> {
  const { data } = await supabase
    .from('job_seekers')
    .select(
      `id, title, occupation, experience_years, is_visible_on_map, phone_visible,
       intro, description, skills, job_types, education, languages, driving_license,
       military_status, salary_expectation, is_ready`,
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    occupation: data.occupation,
    experienceYears: data.experience_years,
    isVisibleOnMap: data.is_visible_on_map,
    phoneVisible: data.phone_visible,
    intro: data.intro ?? data.description ?? null,
    skills: data.skills ?? [],
    jobTypes: (data.job_types ?? []) as JobType[],
    education: data.education ?? null,
    languages: data.languages ?? [],
    drivingLicense: data.driving_license ?? false,
    militaryStatus: data.military_status as MilitaryStatus | null,
    salaryExpectation: data.salary_expectation ?? null,
    isReady: data.is_ready ?? false,
  };
}

export async function upsertJobSeekerProfile(input: {
  userId: string;
  regionId: string;
  title: string;
  occupation: string;
  experienceYears: number;
  intro?: string;
  skills?: string[];
  jobTypes?: JobType[];
  education?: string;
  languages?: string[];
  drivingLicense?: boolean;
  militaryStatus?: MilitaryStatus | null;
  salaryExpectation?: string;
  isReady?: boolean;
  latitude?: number;
  longitude?: number;
  district?: string;
  phoneVisible?: boolean;
  isVisibleOnMap: boolean;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('job_seekers').upsert(
    {
      user_id: input.userId,
      region_id: input.regionId,
      title: input.title,
      occupation: input.occupation,
      experience_years: input.experienceYears,
      intro: input.intro ?? null,
      description: input.intro ?? null,
      skills: input.skills ?? [],
      job_types: input.jobTypes ?? [],
      education: input.education ?? null,
      languages: input.languages ?? [],
      driving_license: input.drivingLicense ?? false,
      military_status: input.militaryStatus ?? null,
      salary_expectation: input.salaryExpectation ?? null,
      is_ready: input.isReady ?? false,
      district: input.district ?? null,
      phone_visible: input.phoneVisible ?? false,
      is_visible_on_map: input.isVisibleOnMap,
      status: 'published',
    },
    { onConflict: 'user_id' },
  );

  if (!error && input.latitude != null && input.longitude != null) {
    await supabase.rpc('set_job_seeker_location', {
      seeker_user_id: input.userId,
      lng: input.longitude,
      lat: input.latitude,
    });
  }

  return { error: supabaseErrorMessage(error) };
}

export type JobSeekerDetailsUpdate = {
  occupation?: string;
  experienceYears?: number;
  phoneVisible?: boolean;
  title?: string;
  intro?: string;
  skills?: string[];
  jobTypes?: JobType[];
  education?: string;
  languages?: string[];
  drivingLicense?: boolean;
  militaryStatus?: MilitaryStatus | null;
  salaryExpectation?: string;
  isReady?: boolean;
};

export type PublicJobSeekerProfile = JobSeekerProfile & {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  trustScore: number | null;
  district: string | null;
  regionId: string;
  phone: string | null;
  createdAt: string;
};

export async function fetchPublicJobSeekerProfile(id: string): Promise<PublicJobSeekerProfile | null> {
  const { data } = await supabase
    .from('job_seekers')
    .select(
      `id, user_id, title, occupation, experience_years, is_visible_on_map, phone_visible,
       intro, description, skills, job_types, education, languages, driving_license,
       military_status, salary_expectation, is_ready, district, region_id, created_at,
       profiles!job_seekers_user_id_fkey (full_name, username, avatar_url, trust_score, phone)`,
    )
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();

  if (!data) return null;

  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

  return {
    id: data.id,
    userId: data.user_id,
    displayName: profile?.full_name ?? profile?.username ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    trustScore: profile?.trust_score ?? null,
    title: data.title,
    occupation: data.occupation,
    experienceYears: data.experience_years,
    isVisibleOnMap: data.is_visible_on_map,
    phoneVisible: data.phone_visible,
    intro: data.intro ?? data.description ?? null,
    skills: data.skills ?? [],
    jobTypes: (data.job_types ?? []) as JobType[],
    education: data.education ?? null,
    languages: data.languages ?? [],
    drivingLicense: data.driving_license ?? false,
    militaryStatus: data.military_status as MilitaryStatus | null,
    salaryExpectation: data.salary_expectation ?? null,
    isReady: data.is_ready ?? false,
    district: data.district,
    regionId: data.region_id,
    phone: data.phone_visible ? profile?.phone ?? null : null,
    createdAt: data.created_at,
  };
}

export async function updateJobSeekerDetails(
  userId: string,
  input: JobSeekerDetailsUpdate,
): Promise<{ error: string | null }> {
  const payload: Database['public']['Tables']['job_seekers']['Update'] = {};
  if (input.occupation != null) payload.occupation = input.occupation;
  if (input.experienceYears != null) payload.experience_years = input.experienceYears;
  if (input.phoneVisible != null) payload.phone_visible = input.phoneVisible;
  if (input.title != null) payload.title = input.title;
  if (input.intro != null) {
    payload.intro = input.intro;
    payload.description = input.intro;
  }
  if (input.skills != null) payload.skills = input.skills;
  if (input.jobTypes != null) payload.job_types = input.jobTypes;
  if (input.education != null) payload.education = input.education;
  if (input.languages != null) payload.languages = input.languages;
  if (input.drivingLicense != null) payload.driving_license = input.drivingLicense;
  if (input.militaryStatus !== undefined) payload.military_status = input.militaryStatus;
  if (input.salaryExpectation != null) payload.salary_expectation = input.salaryExpectation;
  if (input.isReady != null) payload.is_ready = input.isReady;

  const { error } = await supabase.from('job_seekers').update(payload).eq('user_id', userId);
  return { error: supabaseErrorMessage(error) };
}

export async function setJobSeekerVisibility(
  userId: string,
  visible: boolean,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('job_seekers')
    .update({ is_visible_on_map: visible })
    .eq('user_id', userId);

  return { error: supabaseErrorMessage(error) };
}
