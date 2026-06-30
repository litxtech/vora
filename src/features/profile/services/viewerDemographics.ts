import { GENDER_OPTIONS } from '@/constants/registration';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type DemographicBucket = {
  key: string;
  label: string;
  count: number;
  percent: number;
};

export type ViewerDemographics = {
  totalViewers: number;
  gender: DemographicBucket[];
  ageGroups: DemographicBucket[];
  regions: DemographicBucket[];
  districts: DemographicBucket[];
};

const AGE_GROUP_LABELS: Record<string, string> = {
  unknown: 'Bilinmiyor',
  under_18: '18 yaş altı',
  '18_24': '18–24',
  '25_34': '25–34',
  '35_44': '35–44',
  '45_54': '45–54',
  '55_plus': '55+',
};

const GENDER_LABELS: Record<string, string> = {
  unknown: 'Bilinmiyor',
  ...Object.fromEntries(GENDER_OPTIONS.map((option) => [option.id, option.label])),
};

type RawBucket = { key: string; count: number; label?: string };

function withPercents(rows: RawBucket[], labelForKey: (key: string, row: RawBucket) => string): DemographicBucket[] {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (total === 0) return [];

  return rows.map((row) => ({
    key: row.key,
    label: row.label ?? labelForKey(row.key, row),
    count: row.count,
    percent: Math.round((row.count / total) * 100),
  }));
}

function parseBuckets(raw: unknown, labelForKey: (key: string, row: RawBucket) => string): DemographicBucket[] {
  if (!Array.isArray(raw)) return [];
  const rows = raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as RawBucket;
      if (typeof row.key !== 'string' || typeof row.count !== 'number') return null;
      return row;
    })
    .filter((row): row is RawBucket => row !== null);

  return withPercents(rows, labelForKey);
}

export async function fetchViewerDemographics(): Promise<{
  data: ViewerDemographics | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('get_viewer_demographics');

  if (error) {
    return { data: null, error: supabaseErrorMessage(error)! };
  }

  if (!data || typeof data !== 'object') {
    return { data: null, error: 'Demografi verisi alınamadı' };
  }

  const payload = data as {
    total_viewers?: number;
    gender?: unknown;
    age_groups?: unknown;
    regions?: unknown;
    districts?: unknown;
  };

  const totalViewers = payload.total_viewers ?? 0;

  return {
    data: {
      totalViewers,
      gender: parseBuckets(payload.gender, (key) => GENDER_LABELS[key] ?? key),
      ageGroups: parseBuckets(payload.age_groups, (key) => AGE_GROUP_LABELS[key] ?? key),
      regions: parseBuckets(payload.regions, (key, row) => row.label ?? key),
      districts: parseBuckets(payload.districts, (key, row) => row.label ?? key),
    },
    error: null,
  };
}
