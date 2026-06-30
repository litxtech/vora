import { demoArrayFallback } from '@/lib/demo/demoData';
import { supabase } from '@/lib/supabase/client';
import type { TrafficReport, TrafficReportType } from '@/features/traffic/constants';

export async function fetchTrafficReports(
  regionId: string | null,
  type?: TrafficReportType | 'all',
): Promise<TrafficReport[]> {
  if (!regionId) return demoArrayFallback(DEMO_TRAFFIC);

  let query = supabase
    .from('traffic_reports')
    .select('id, report_type, title, description, district, confirm_count, created_at, expires_at')
    .eq('region_id', regionId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(40);

  if (type && type !== 'all') {
    query = query.eq('report_type', type);
  }

  const { data, error } = await query;
  if (error || !data?.length) return demoArrayFallback(DEMO_TRAFFIC);

  return data.map((row) => ({
    id: row.id,
    reportType: row.report_type as TrafficReportType,
    title: row.title,
    description: row.description,
    district: row.district,
    confirmCount: row.confirm_count,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }));
}

const DEMO_TRAFFIC: TrafficReport[] = [
  {
    id: 'demo-t1',
    reportType: 'accident',
    title: 'Bordo Mavi Bulvarı trafik kazası',
    description: 'İki araç çarpıştı, trafik yavaş',
    district: 'Ortahisar',
    confirmCount: 7,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 4 * 3600000).toISOString(),
  },
  {
    id: 'demo-t2',
    reportType: 'radar',
    title: 'Sahil yolu radar noktası',
    description: null,
    district: 'Akçaabat',
    confirmCount: 3,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    expiresAt: new Date(Date.now() + 3 * 3600000).toISOString(),
  },
];
