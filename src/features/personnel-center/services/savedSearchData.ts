import type { JobType, ListingType, PersonnelTab } from '@/features/personnel-center/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type PersonnelSavedSearch = {
  id: string;
  label: string;
  queryText: string | null;
  district: string | null;
  jobType: JobType | null;
  housingProvided: boolean | null;
  urgentOnly: boolean;
  listingType: 'job' | 'staff' | 'both';
  notifyEnabled: boolean;
  regionId: string | null;
  createdAt: string;
};

export type SavePersonnelSearchInput = {
  userId: string;
  regionId?: string | null;
  label?: string;
  queryText?: string | null;
  district?: string | null;
  jobType?: JobType | null;
  housingProvided?: boolean | null;
  urgentOnly?: boolean;
  listingType?: 'job' | 'staff' | 'both';
};

function tabToListingType(tab: PersonnelTab): 'job' | 'staff' | 'both' {
  if (tab === 'seeking' || tab === 'urgent' || tab === 'recent' || tab === 'nearby') return 'job';
  if (tab === 'hiring') return 'staff';
  return 'both';
}

export function buildSavedSearchLabel(queryText: string, tab: PersonnelTab): string {
  const trimmed = queryText.trim();
  if (trimmed) return trimmed.slice(0, 48);
  if (tab === 'urgent') return 'Acil ilanlar';
  if (tab === 'nearby') return 'Yakınımdaki ilanlar';
  if (tab === 'hiring') return 'Personel talepleri';
  return 'İş ilanları';
}

export async function fetchSavedSearches(userId: string): Promise<PersonnelSavedSearch[]> {
  const { data } = await supabase
    .from('personnel_saved_searches')
    .select(
      'id, label, query_text, district, job_type, housing_provided, urgent_only, listing_type, notify_enabled, region_id, created_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    queryText: row.query_text,
    district: row.district,
    jobType: row.job_type as JobType | null,
    housingProvided: row.housing_provided,
    urgentOnly: row.urgent_only,
    listingType: row.listing_type as PersonnelSavedSearch['listingType'],
    notifyEnabled: row.notify_enabled,
    regionId: row.region_id,
    createdAt: row.created_at,
  }));
}

export async function savePersonnelSearch(
  input: SavePersonnelSearchInput & { tab: PersonnelTab },
): Promise<{ error: string | null; id?: string }> {
  const label = input.label?.trim() || buildSavedSearchLabel(input.queryText ?? '', input.tab);

  const { data, error } = await supabase
    .from('personnel_saved_searches')
    .insert({
      user_id: input.userId,
      region_id: input.regionId ?? null,
      label,
      query_text: input.queryText?.trim() || null,
      district: input.district ?? null,
      job_type: input.jobType ?? null,
      housing_provided: input.housingProvided ?? null,
      urgent_only: input.urgentOnly ?? input.tab === 'urgent',
      listing_type: input.listingType ?? tabToListingType(input.tab),
      notify_enabled: true,
    })
    .select('id')
    .single();

  return { error: supabaseErrorMessage(error), id: data?.id };
}

export async function removeSavedSearch(
  userId: string,
  searchId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('personnel_saved_searches')
    .delete()
    .eq('id', searchId)
    .eq('user_id', userId);

  return { error: supabaseErrorMessage(error) };
}

export async function toggleSavedSearchNotify(
  userId: string,
  searchId: string,
  enabled: boolean,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('personnel_saved_searches')
    .update({ notify_enabled: enabled })
    .eq('id', searchId)
    .eq('user_id', userId);

  return { error: supabaseErrorMessage(error) };
}

export function listingTypeFromTab(tab: PersonnelTab): ListingType | null {
  if (tab === 'seeking') return 'job';
  if (tab === 'hiring') return 'staff';
  return null;
}
