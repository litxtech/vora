import { findDemoMarker, POI_CATEGORY_LABELS } from '@/features/map/constants';
import { jobTypeLabel } from '@/features/map/services/mapData';
import type { MapDetailType } from '@/features/map/types';
import { supabase } from '@/lib/supabase/client';

export type MapDetailRecord = {
  type: MapDetailType;
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
  createdAt?: string;
  isDemo?: boolean;
  fields: { label: string; value: string }[];
};

function regionName(id: string | null | undefined): string | undefined {
  if (!id) return undefined;
  const names: Record<string, string> = {
    trabzon: 'Trabzon',
    rize: 'Rize',
    giresun: 'Giresun',
    ordu: 'Ordu',
    samsun: 'Samsun',
    artvin: 'Artvin',
  };
  return names[id] ?? id;
}

function formatDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return new Date(value).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function severityLabel(value: string): string {
  const map: Record<string, string> = {
    low: 'Düşük',
    medium: 'Orta',
    high: 'Yüksek',
    critical: 'Kritik',
  };
  return map[value] ?? value;
}

function statusLabelIncident(value: string): string {
  const map: Record<string, string> = {
    open: 'Açık',
    verified: 'Doğrulandı',
    resolved: 'Çözüldü',
    dismissed: 'Reddedildi',
  };
  return map[value] ?? value;
}

function demoToRecord(type: MapDetailType, sourceId: string): MapDetailRecord | null {
  const demo = findDemoMarker(sourceId);
  if (!demo) return null;

  const fields: { label: string; value: string }[] = [
    { label: 'Konum', value: `${demo.latitude.toFixed(4)}, ${demo.longitude.toFixed(4)}` },
  ];

  if (demo.meta?.severity) {
    fields.unshift({ label: 'Önem', value: severityLabel(String(demo.meta.severity)) });
  }
  if (demo.meta?.verified) {
    fields.unshift({ label: 'Durum', value: 'Doğrulanmış işletme' });
  }
  if (demo.meta?.jobType) {
    fields.unshift({ label: 'Çalışma', value: jobTypeLabel(String(demo.meta.jobType)) });
  }
  if (demo.meta?.salaryRange) {
    fields.unshift({ label: 'Maaş', value: String(demo.meta.salaryRange) });
  }
  if (demo.meta?.category) {
    fields.unshift({ label: 'Tür', value: POI_CATEGORY_LABELS[String(demo.meta.category)] ?? String(demo.meta.category) });
  }

  return {
    type,
    id: sourceId,
    title: demo.title,
    subtitle: demo.subtitle,
    description: demo.description,
    latitude: demo.latitude,
    longitude: demo.longitude,
    isDemo: true,
    fields,
  };
}

export async function fetchMapDetail(
  type: MapDetailType,
  id: string,
  isDemo = false,
): Promise<MapDetailRecord | null> {
  if (isDemo || id.startsWith('demo-')) {
    return demoToRecord(type, id);
  }

  switch (type) {
    case 'incidents': {
      const { data } = await supabase
        .from('incident_reports')
        .select('id, title, description, severity, status, region_id, latitude, longitude, created_at')
        .eq('id', id)
        .maybeSingle();
      if (!data) return null;
      return {
        type,
        id: data.id,
        title: data.title,
        subtitle: severityLabel(data.severity),
        description: data.description,
        latitude: data.latitude,
        longitude: data.longitude,
        createdAt: data.created_at,
        fields: [
          { label: 'Önem', value: severityLabel(data.severity) },
          { label: 'Durum', value: statusLabelIncident(data.status) },
          { label: 'Bölge', value: regionName(data.region_id) ?? '—' },
          { label: 'Bildirim', value: formatDate(data.created_at) ?? '—' },
        ],
      };
    }

    case 'posts': {
      const { data } = await supabase
        .from('posts')
        .select('id, title, content, region_id, view_count, latitude, longitude, created_at, author_id')
        .eq('id', id)
        .maybeSingle();
      if (!data) return null;

      const { data: author } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', data.author_id)
        .maybeSingle();

      const authorLabel = author?.full_name ?? (author?.username ? `@${author.username}` : '—');

      return {
        type,
        id: data.id,
        title: data.title ?? 'Paylaşım',
        subtitle: authorLabel,
        description: data.content,
        latitude: data.latitude,
        longitude: data.longitude,
        createdAt: data.created_at,
        fields: [
          { label: 'Yazar', value: authorLabel },
          { label: 'Bölge', value: regionName(data.region_id) ?? '—' },
          { label: 'Görüntülenme', value: String(data.view_count) },
          { label: 'Paylaşım', value: formatDate(data.created_at) ?? '—' },
        ],
      };
    }

    case 'businesses': {
      const { data } = await supabase
        .from('businesses')
        .select('id, name, category, description, phone, address, is_verified, region_id, latitude, longitude, created_at')
        .eq('id', id)
        .maybeSingle();
      if (!data) return null;
      return {
        type,
        id: data.id,
        title: data.name,
        subtitle: data.category,
        description: data.description ?? undefined,
        latitude: data.latitude,
        longitude: data.longitude,
        createdAt: data.created_at,
        fields: [
          { label: 'Kategori', value: data.category },
          { label: 'Telefon', value: data.phone ?? '—' },
          { label: 'Adres', value: data.address ?? '—' },
          { label: 'Bölge', value: regionName(data.region_id) ?? '—' },
          { label: 'Doğrulama', value: data.is_verified ? 'Doğrulanmış' : 'Doğrulanmamış' },
        ],
      };
    }

    case 'events': {
      const { data } = await supabase
        .from('events')
        .select('id, title, description, location_name, starts_at, ends_at, region_id, latitude, longitude, created_at')
        .eq('id', id)
        .maybeSingle();
      if (!data) return null;
      return {
        type,
        id: data.id,
        title: data.title,
        subtitle: data.location_name ?? 'Etkinlik',
        description: data.description,
        latitude: data.latitude,
        longitude: data.longitude,
        createdAt: data.created_at,
        fields: [
          { label: 'Başlangıç', value: formatDate(data.starts_at) ?? '—' },
          { label: 'Bitiş', value: formatDate(data.ends_at) ?? '—' },
          { label: 'Konum', value: data.location_name ?? '—' },
          { label: 'Bölge', value: regionName(data.region_id) ?? '—' },
        ],
      };
    }

    case 'lost_found': {
      const { data } = await supabase
        .from('lost_items')
        .select('id, title, description, item_type, contact_info, status, region_id, latitude, longitude, created_at')
        .eq('id', id)
        .maybeSingle();
      if (!data) return null;
      return {
        type,
        id: data.id,
        title: data.title,
        subtitle: data.item_type === 'lost' ? 'Kayıp ilanı' : 'Buluntu ilanı',
        description: data.description,
        latitude: data.latitude,
        longitude: data.longitude,
        createdAt: data.created_at,
        fields: [
          { label: 'Tür', value: data.item_type === 'lost' ? 'Kayıp' : 'Buluntu' },
          { label: 'Durum', value: data.status === 'open' ? 'Açık' : 'Çözüldü' },
          { label: 'İletişim', value: data.contact_info ?? '—' },
          { label: 'Bölge', value: regionName(data.region_id) ?? '—' },
          { label: 'İlan', value: formatDate(data.created_at) ?? '—' },
        ],
      };
    }

    case 'jobs': {
      const { data } = await supabase
        .from('job_listings')
        .select(
          `id, title, description, job_type, salary_range, housing_provided, location_label, district,
           latitude, longitude, region_id, created_at,
           businesses (name, phone, address)`,
        )
        .eq('id', id)
        .maybeSingle();

      type JobDetailRow = {
        id: string;
        title: string;
        description: string;
        job_type: string;
        salary_range: string | null;
        housing_provided: boolean;
        location_label: string | null;
        district: string | null;
        latitude: number | null;
        longitude: number | null;
        region_id: string;
        created_at: string;
        businesses: { name: string | null; phone: string | null; address: string | null } | { name: string | null; phone: string | null; address: string | null }[] | null;
      };

      const row = data as JobDetailRow | null;
      if (!row) return null;
      const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
      return {
        type,
        id: row.id,
        title: row.title,
        subtitle: business?.name ?? row.location_label ?? 'İş ilanı',
        description: row.description,
        latitude: row.latitude,
        longitude: row.longitude,
        createdAt: row.created_at,
        fields: [
          { label: 'Pozisyon', value: row.title },
          { label: 'Maaş', value: row.salary_range ?? '—' },
          { label: 'Çalışma', value: jobTypeLabel(row.job_type) },
          { label: 'Konaklama', value: row.housing_provided ? 'Sağlanır' : '—' },
          { label: 'Konum', value: row.location_label ?? row.district ?? regionName(row.region_id) ?? '—' },
          { label: 'İşletme', value: business?.name ?? '—' },
          { label: 'İlan', value: formatDate(row.created_at) ?? '—' },
        ],
      };
    }

    case 'staff': {
      const { data } = await supabase
        .from('staff_requests')
        .select(
          `id, title, description, positions, salary_range, location_label, district,
           latitude, longitude, region_id, created_at,
           businesses (name, phone)`,
        )
        .eq('id', id)
        .maybeSingle();

      type StaffDetailRow = {
        id: string;
        title: string;
        description: string;
        positions: string[];
        salary_range: string | null;
        location_label: string | null;
        district: string | null;
        latitude: number | null;
        longitude: number | null;
        region_id: string;
        created_at: string;
        businesses: { name: string | null; phone: string | null } | { name: string | null; phone: string | null }[] | null;
      };

      const row = data as StaffDetailRow | null;
      if (!row) return null;
      const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
      return {
        type,
        id: row.id,
        title: row.title,
        subtitle: business?.name ?? 'Personel arayan',
        description: row.description,
        latitude: row.latitude,
        longitude: row.longitude,
        createdAt: row.created_at,
        fields: [
          { label: 'Pozisyonlar', value: row.positions?.join(', ') || '—' },
          { label: 'Maaş', value: row.salary_range ?? '—' },
          { label: 'Konum', value: row.location_label ?? row.district ?? regionName(row.region_id) ?? '—' },
          { label: 'İşletme', value: business?.name ?? '—' },
          { label: 'İlan', value: formatDate(row.created_at) ?? '—' },
        ],
      };
    }

    case 'job_seekers': {
      const { data } = await supabase
        .from('job_seekers')
        .select('id, title, occupation, experience_years, skills, description, district, region_id, latitude, longitude, phone_visible, created_at, user_id')
        .eq('id', id)
        .maybeSingle();

      type SeekerRow = {
        id: string;
        title: string;
        occupation: string;
        experience_years: number;
        skills: string[];
        description: string | null;
        district: string | null;
        region_id: string;
        latitude: number | null;
        longitude: number | null;
        phone_visible: boolean;
        created_at: string;
      };

      const row = data as SeekerRow | null;
      if (!row) return null;
      return {
        type,
        id: row.id,
        title: row.title,
        subtitle: row.occupation,
        description: row.description ?? undefined,
        latitude: row.latitude,
        longitude: row.longitude,
        createdAt: row.created_at,
        fields: [
          { label: 'Meslek', value: row.occupation },
          { label: 'Deneyim', value: `${row.experience_years} yıl` },
          { label: 'Beceriler', value: row.skills?.join(', ') || '—' },
          { label: 'Şehir', value: row.district ?? regionName(row.region_id) ?? '—' },
          { label: 'Telefon', value: row.phone_visible ? 'Profilde görünür' : 'Gizli' },
          { label: 'İlan', value: formatDate(row.created_at) ?? '—' },
        ],
      };
    }

    case 'emergency_pois': {
      const { data } = await supabase
        .from('emergency_pois')
        .select('id, name, category, phone, address, description, is_24h, region_id, latitude, longitude, created_at')
        .eq('id', id)
        .maybeSingle();

      type PoiRow = {
        id: string;
        name: string;
        category: keyof typeof POI_CATEGORY_LABELS;
        phone: string | null;
        address: string | null;
        description: string | null;
        is_24h: boolean;
        region_id: string;
        latitude: number;
        longitude: number;
        created_at: string;
      };

      const row = data as PoiRow | null;
      if (!row) return null;
      return {
        type,
        id: row.id,
        title: row.name,
        subtitle: POI_CATEGORY_LABELS[row.category] ?? row.category,
        description: row.description ?? undefined,
        latitude: row.latitude,
        longitude: row.longitude,
        createdAt: row.created_at,
        fields: [
          { label: 'Tür', value: POI_CATEGORY_LABELS[row.category] ?? row.category },
          { label: 'Telefon', value: row.phone ?? '—' },
          { label: 'Adres', value: row.address ?? '—' },
          { label: '7/24', value: row.is_24h ? 'Evet' : 'Hayır' },
          { label: 'Bölge', value: regionName(row.region_id) ?? '—' },
        ],
      };
    }

    default:
      return null;
  }
}
