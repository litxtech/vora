import { findDemoMarker } from '@/features/map/constants';
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

    default:
      return null;
  }
}
