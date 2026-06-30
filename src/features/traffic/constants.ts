import type { TrafficReportType } from '@/features/traffic/types';

export type { TrafficReportType };

export type TrafficReport = {
  id: string;
  reportType: TrafficReportType;
  title: string;
  description: string | null;
  district: string | null;
  confirmCount: number;
  createdAt: string;
  expiresAt: string;
};

export const TRAFFIC_TYPES: Record<TrafficReportType, { label: string; icon: string; color: string }> = {
  accident: { label: 'Kaza', icon: 'warning', color: '#E53935' },
  roadwork: { label: 'Yol Çalışması', icon: 'construct', color: '#FB8C00' },
  radar: { label: 'Radar', icon: 'speedometer', color: '#5C6BC0' },
  congestion: { label: 'Yoğunluk', icon: 'car', color: '#F9A825' },
};

export const TRAFFIC_REPORT_TTL_HOURS = 4;
