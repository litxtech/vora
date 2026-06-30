import { fetchMyJobSeekerProfile } from '@/features/job-seekers/services/seekerData';
import { getOrCreateDirectConversation } from '@/features/messaging/services/conversationData';
import { sendMessage } from '@/features/messaging/services/messageData';
import { APPLICATION_STATUS_LABELS } from '@/features/personnel-center/constants';
import {
  formatApplicationMessage,
  normalizeApplicationForm,
} from '@/features/personnel-center/services/applicationFormUtils';
import {
  buildPersonnelShareMetadata,
  personnelShareMessageType,
  sendPersonnelListingCard,
} from '@/features/personnel-center/services/personnelShareData';
import type {
  ApplicantProfileSnapshot,
  EmployerApplication,
  JobApplication,
  JobApplicationFormData,
  JobApplicationStatus,
  ListingType,
} from '@/features/personnel-center/types';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database';
import { supabaseErrorMessage } from '@/lib/errors';

export { APPLICATION_STATUS_LABELS };

function formatProfileSummary(snapshot: ApplicantProfileSnapshot): string {
  const lines = [
    `Ad Soyad: ${snapshot.firstName} ${snapshot.lastName}`.trim(),
    snapshot.age ? `Yaş: ${snapshot.age}` : null,
    snapshot.email ? `E-posta: ${snapshot.email}` : null,
    snapshot.phone ? `Telefon: ${snapshot.phone}` : null,
    snapshot.resume ? `Özgeçmiş:\n${snapshot.resume}` : null,
    snapshot.title,
    [snapshot.occupation, snapshot.experienceYears != null ? `${snapshot.experienceYears} yıl deneyim` : null]
      .filter(Boolean)
      .join(' · '),
    snapshot.skills.length ? `Yetenekler: ${snapshot.skills.slice(0, 6).join(', ')}` : null,
    snapshot.education ? `Eğitim: ${snapshot.education}` : null,
    snapshot.salaryExpectation ? `Maaş beklentisi: ${snapshot.salaryExpectation}` : null,
    snapshot.isReady ? 'Hemen çalışmaya hazır' : null,
    snapshot.intro ? snapshot.intro.slice(0, 240) : null,
  ].filter(Boolean);

  return lines.join('\n');
}

const EMPTY_SEEKER_SNAPSHOT = {
  title: null,
  occupation: null,
  experienceYears: null,
  skills: [] as string[],
  education: null,
  intro: null,
  isReady: false,
  salaryExpectation: null,
} satisfies Omit<ApplicantProfileSnapshot, keyof JobApplicationFormData>;

export async function buildApplicantProfileSnapshot(
  applicantId: string,
  form: JobApplicationFormData,
  options?: { includeSeekerProfile?: boolean },
): Promise<ApplicantProfileSnapshot> {
  const normalized = normalizeApplicationForm(form);
  if (!options?.includeSeekerProfile) {
    return { ...normalized, ...EMPTY_SEEKER_SNAPSHOT };
  }

  const seekerProfile = await fetchMyJobSeekerProfile(applicantId);

  return {
    ...normalized,
    title: seekerProfile?.title ?? null,
    occupation: seekerProfile?.occupation ?? null,
    experienceYears: seekerProfile?.experienceYears ?? null,
    skills: seekerProfile?.skills ?? [],
    education: seekerProfile?.education ?? null,
    intro: seekerProfile?.intro ?? null,
    isReady: seekerProfile?.isReady ?? false,
    salaryExpectation: seekerProfile?.salaryExpectation ?? null,
  };
}

export async function submitJobApplication(
  listingType: ListingType,
  listingId: string,
  applicantId: string,
  form: JobApplicationFormData,
  options?: { attachProfile?: boolean },
): Promise<{ error: string | null; conversationId?: string; applicationId?: string }> {
  if (listingId.startsWith('demo-')) return { error: null };

  const table = listingType === 'job' ? 'job_listings' : 'staff_requests';
  const { data: listing } = await supabase
    .from(table)
    .select('author_id, title, status')
    .eq('id', listingId)
    .maybeSingle();

  if (!listing?.author_id) {
    return { error: 'İlan bulunamadı.' };
  }

  if (listing.status === 'filled') {
    return { error: 'Bu ilan için pozisyon doldu.' };
  }

  if (listing.status !== 'published') {
    return { error: 'Bu ilan artık başvuru kabul etmiyor.' };
  }

  if (listing.author_id === applicantId) {
    return { error: 'Kendi ilanınıza başvuramazsınız.' };
  }

  const { conversationId, error: convError } = await getOrCreateDirectConversation(listing.author_id);
  if (convError || !conversationId) {
    return { error: convError ?? 'Sohbet oluşturulamadı.' };
  }

  const attachProfile = options?.attachProfile === true;
  const normalizedForm = normalizeApplicationForm(form);
  const profileSnapshot = await buildApplicantProfileSnapshot(applicantId, normalizedForm, {
    includeSeekerProfile: attachProfile,
  });
  const message = formatApplicationMessage(normalizedForm);
  const prefix = listingType === 'job' ? 'İş başvurusu' : 'Personel başvurusu';
  const bodyParts = [`[${prefix}]`, message];
  if (attachProfile && (profileSnapshot.title || profileSnapshot.skills.length > 0 || profileSnapshot.intro)) {
    bodyParts.push('', '— Profil özeti —', formatProfileSummary(profileSnapshot));
  }
  const body = bodyParts.join('\n');

  const cardResult = await sendPersonnelListingCard(
    conversationId,
    applicantId,
    listingType,
    listingId,
    body,
  );
  if (cardResult.error) return { error: cardResult.error };

  const insertPayload: Database['public']['Tables']['job_applications']['Insert'] = {
    applicant_id: applicantId,
    employer_id: listing.author_id,
    message,
    conversation_id: conversationId,
    status: 'sent',
    applicant_profile_snapshot: profileSnapshot,
    ...(listingType === 'job'
      ? { job_id: listingId, staff_request_id: undefined }
      : { staff_request_id: listingId, job_id: undefined }),
  };

  const { data: application, error: appError } = await supabase
    .from('job_applications')
    .insert(insertPayload)
    .select('id')
    .single();

  if (appError) {
    if (appError.code === '23505') {
      return { error: 'Bu ilana zaten başvurdunuz.', conversationId };
    }
    return { error: appError.message, conversationId };
  }

  await supabase.from('user_achievements').upsert(
    { user_id: applicantId, achievement_key: 'first_job_application' },
    { onConflict: 'user_id,achievement_key', ignoreDuplicates: true },
  );

  return { error: null, conversationId, applicationId: application?.id };
}

export async function fetchMyApplications(applicantId: string): Promise<JobApplication[]> {
  const { data } = await supabase
    .from('job_applications')
    .select(
      `id, status, message, created_at, updated_at, job_id, staff_request_id,
       employer_id, conversation_id,
       job_listings (title),
       staff_requests (title)`,
    )
    .eq('applicant_id', applicantId)
    .order('created_at', { ascending: false });

  const employerIds = [...new Set((data ?? []).map((row) => row.employer_id))];
  const employerNames = new Map<string, string>();

  if (employerIds.length > 0) {
    const { data: employers } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', employerIds);

    for (const e of employers ?? []) {
      employerNames.set(e.id, e.full_name ?? e.username ?? 'İşveren');
    }
  }

  return (data ?? []).map((row) =>
    mapApplicationRow(row as unknown as Parameters<typeof mapApplicationRow>[0], employerNames),
  );
}

function mapApplicationRow(
  row: {
    id: string;
    status: string;
    message: string | null;
    created_at: string;
    updated_at: string;
    job_id: string | null;
    staff_request_id: string | null;
    employer_id: string;
    conversation_id: string | null;
    job_listings: { title: string } | { title: string }[] | null;
    staff_requests: { title: string } | { title: string }[] | null;
  },
  employerNames: Map<string, string>,
): JobApplication {
  const listingType: ListingType = row.job_id ? 'job' : 'staff';
  const listingId = row.job_id ?? row.staff_request_id ?? '';
  const jobListing = Array.isArray(row.job_listings) ? row.job_listings[0] : row.job_listings;
  const staffListing = Array.isArray(row.staff_requests) ? row.staff_requests[0] : row.staff_requests;

  return {
    id: row.id,
    status: row.status as JobApplicationStatus,
    message: row.message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    listingType,
    listingId,
    listingTitle: jobListing?.title ?? staffListing?.title ?? 'İlan',
    employerId: row.employer_id,
    employerName: employerNames.get(row.employer_id) ?? null,
    conversationId: row.conversation_id,
  };
}

function parseProfileSnapshot(raw: unknown): ApplicantProfileSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  return {
    firstName: typeof row.firstName === 'string' ? row.firstName : '',
    lastName: typeof row.lastName === 'string' ? row.lastName : '',
    age: typeof row.age === 'string' ? row.age : '',
    email: typeof row.email === 'string' ? row.email : '',
    phone: typeof row.phone === 'string' ? row.phone : '',
    resume: typeof row.resume === 'string' ? row.resume : '',
    title: typeof row.title === 'string' ? row.title : null,
    occupation: typeof row.occupation === 'string' ? row.occupation : null,
    experienceYears: typeof row.experienceYears === 'number' ? row.experienceYears : null,
    skills: Array.isArray(row.skills) ? row.skills.filter((s): s is string => typeof s === 'string') : [],
    education: typeof row.education === 'string' ? row.education : null,
    intro: typeof row.intro === 'string' ? row.intro : null,
    isReady: row.isReady === true,
    salaryExpectation: typeof row.salaryExpectation === 'string' ? row.salaryExpectation : null,
  };
}

export async function countPendingIncomingApplications(employerId: string): Promise<number> {
  const { count } = await supabase
    .from('job_applications')
    .select('id', { count: 'exact', head: true })
    .eq('employer_id', employerId)
    .in('status', ['sent', 'reviewing']);

  return count ?? 0;
}

type EmployerApplicationRow = {
  id: string;
  status: string;
  message: string | null;
  created_at: string;
  updated_at: string;
  job_id: string | null;
  staff_request_id: string | null;
  applicant_id: string;
  employer_id: string;
  conversation_id: string | null;
  applicant_profile_snapshot: unknown;
  job_listings: { title: string } | { title: string }[] | null;
  staff_requests: { title: string } | { title: string }[] | null;
};

type ApplicantProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  occupation: string | null;
  trust_score: number | null;
};

type ApplicantSeekerRow = {
  user_id: string;
  experience_years: number;
  skills: string[];
  is_ready: boolean;
};

const EMPLOYER_APPLICATION_SELECT = `id, status, message, created_at, updated_at, job_id, staff_request_id,
  applicant_id, employer_id, conversation_id, applicant_profile_snapshot,
  job_listings (title),
  staff_requests (title)`;

function mapEmployerApplicationRow(
  row: EmployerApplicationRow,
  profile: ApplicantProfileRow | undefined,
  seeker: ApplicantSeekerRow | undefined,
): EmployerApplication {
  const base = mapApplicationRow(row, new Map());
  const snapshot = parseProfileSnapshot(row.applicant_profile_snapshot);

  return {
    ...base,
    applicantProfileSnapshot: snapshot,
    applicantId: row.applicant_id,
    applicantName:
      profile?.full_name ??
      profile?.username ??
      ([snapshot?.firstName, snapshot?.lastName].filter(Boolean).join(' ') || snapshot?.title) ??
      null,
    applicantAvatar: profile?.avatar_url ?? null,
    applicantOccupation: profile?.occupation ?? snapshot?.occupation ?? null,
    applicantExperienceYears: seeker?.experience_years ?? snapshot?.experienceYears ?? null,
    applicantTrustScore: profile?.trust_score ?? null,
    applicantSkills: seeker?.skills?.length ? seeker.skills : snapshot?.skills ?? [],
    applicantIsReady: seeker?.is_ready ?? snapshot?.isReady ?? false,
  };
}

export async function fetchEmployerApplicationById(
  applicationId: string,
  employerId: string,
): Promise<EmployerApplication | null> {
  const { data: row } = await supabase
    .from('job_applications')
    .select(EMPLOYER_APPLICATION_SELECT)
    .eq('id', applicationId)
    .eq('employer_id', employerId)
    .maybeSingle();

  if (!row) return null;

  const applicationRow = row as unknown as EmployerApplicationRow;
  const [profileResult, seekerResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, occupation, trust_score')
      .eq('id', applicationRow.applicant_id)
      .maybeSingle(),
    supabase
      .from('job_seekers')
      .select('user_id, experience_years, skills, is_ready')
      .eq('user_id', applicationRow.applicant_id)
      .maybeSingle(),
  ]);

  return mapEmployerApplicationRow(
    applicationRow,
    profileResult.data as ApplicantProfileRow | undefined,
    seekerResult.data as ApplicantSeekerRow | undefined,
  );
}

export async function fetchEmployerApplications(employerId: string): Promise<EmployerApplication[]> {
  const { data } = await supabase
    .from('job_applications')
    .select(EMPLOYER_APPLICATION_SELECT)
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false });

  if (!data?.length) return [];

  const applicantIds = [...new Set(data.map((row) => row.applicant_id))];
  const [profilesResult, seekersResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, occupation, trust_score')
      .in('id', applicantIds),
    supabase
      .from('job_seekers')
      .select('user_id, experience_years, skills, is_ready')
      .in('user_id', applicantIds),
  ]);

  const profileMap = new Map((profilesResult.data ?? []).map((p) => [p.id, p as ApplicantProfileRow]));
  const seekerMap = new Map((seekersResult.data ?? []).map((s) => [s.user_id, s as ApplicantSeekerRow]));

  return data.map((row) =>
    mapEmployerApplicationRow(
      row as unknown as EmployerApplicationRow,
      profileMap.get(row.applicant_id),
      seekerMap.get(row.applicant_id),
    ),
  );
}

export async function updateApplicationStatus(
  applicationId: string,
  employerId: string,
  status: JobApplicationStatus,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('job_applications')
    .update({ status })
    .eq('id', applicationId)
    .eq('employer_id', employerId);

  return { error: supabaseErrorMessage(error) };
}

export async function respondToApplication(
  applicationId: string,
  employerId: string,
  status: JobApplicationStatus,
): Promise<{ error: string | null }> {
  const result = await updateApplicationStatus(applicationId, employerId, status);
  if (result.error) return result;

  const statusMessages: Partial<Record<JobApplicationStatus, string>> = {
    reviewing: 'Başvurunuz inceleniyor.',
    interview: 'Görüşme için sizinle iletişime geçeceğiz.',
    accepted: 'Tebrikler! Başvurunuz kabul edildi.',
    rejected: 'Maalesef bu pozisyon için uygun bulunmadınız.',
  };

  const message = statusMessages[status];
  if (!message) return { error: null };

  const { data: app } = await supabase
    .from('job_applications')
    .select('conversation_id')
    .eq('id', applicationId)
    .maybeSingle();

  if (app?.conversation_id) {
    await sendMessage(app.conversation_id, employerId, `[Başvuru durumu] ${message}`);
  }

  return { error: null };
}
