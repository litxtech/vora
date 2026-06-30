import type { IncidentUpdate } from '@/features/incidents/types';

export const INCIDENT_ACCENT = '#E53935';
export const INCIDENT_ACCENT_DARK = '#C62828';
export const INCIDENT_GRADIENT = [INCIDENT_ACCENT, INCIDENT_ACCENT_DARK] as const;
export const INCIDENT_HERO_GRADIENT = ['#E53935E8', '#C62828CC', '#880E4F99'] as const;

export const INCIDENT_GRAPH_SLOGAN = 'Şehrin nabzı tek ekranda.';
export const INCIDENT_GRAPH_TITLE = 'Canlı Nabız';
export const INCIDENT_GRAPH_SUBTITLE =
  'Haberler, doğrulamalar, trafik ve yardım kayıtları tek olay dosyasında birleşir.';

export const INCIDENT_GRAPH_ACTIVE_STATUSES = ['open', 'verified'] as const;

export const INCIDENT_SEVERITY: Record<
  string,
  { label: string; color: string; icon: 'alert-circle' | 'warning' | 'flame' }
> = {
  low: { label: 'Düşük', color: '#43A047', icon: 'alert-circle' },
  medium: { label: 'Orta', color: '#F9A825', icon: 'warning' },
  high: { label: 'Yüksek', color: '#FB8C00', icon: 'warning' },
  critical: { label: 'Kritik', color: '#E53935', icon: 'flame' },
};

export const INCIDENT_STATUS: Record<string, { label: string; color: string }> = {
  open: { label: 'Açık', color: '#E53935' },
  verified: { label: 'Doğrulandı', color: '#43A047' },
  resolved: { label: 'Çözüldü', color: '#64748B' },
  dismissed: { label: 'Reddedildi', color: '#64748B' },
};

export const INCIDENT_UPDATE_LABELS: Record<IncidentUpdate['updateType'], string> = {
  initial: 'İlk bildirim',
  update: 'Gelişme',
  photo: 'Fotoğraf',
  video: 'Video',
  verification: 'Doğrulama',
};

export const INCIDENT_GRAPH_LIST_LIMIT = 40;
export const INCIDENT_GRAPH_TIMELINE_LIMIT = 20;

export const INCIDENT_MEDIA_BUCKET = 'incident-media';
export const INCIDENT_MAX_MEDIA = 4;
export const INCIDENT_VIDEO_MAX_DURATION_SEC = 120;
export const INCIDENT_VIDEO_MAX_UPLOAD_BYTES = 52428800; // 50 MB

/** Canlı Nabız örnek/önizleme verileri kapalı — yalnızca gerçek olaylar gösterilir. */
export function incidentGraphDemoEnabled(): boolean {
  return false;
}
