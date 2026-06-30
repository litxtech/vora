import {
  INCIDENT_GRAPH_LIST_LIMIT,
  INCIDENT_GRAPH_TIMELINE_LIMIT,
  INCIDENT_GRAPH_ACTIVE_STATUSES,
} from '@/features/incidents/constants';
import {
  getDemoIncidentCount,
  getDemoIncidentGraph,
} from '@/features/incidents/constants/demoIncidents';
import type {
  IncidentGraphData,
  IncidentGraphItem,
  IncidentGraphTimelineEntry,
  IncidentUpdate,
} from '@/features/incidents/types';
import { incidentGraphDemoEnabled } from '@/features/incidents/constants';
import type { RegionId } from '@/constants/regions';
import { supabase } from '@/lib/supabase/client';

function mergeWithDemo(
  data: IncidentGraphData,
  regionId?: RegionId | null,
): IncidentGraphData {
  if (!incidentGraphDemoEnabled()) return data;

  const demo = getDemoIncidentGraph(regionId);
  const existingIds = new Set(data.incidents.map((item) => item.id));
  const demoIncidents = demo.incidents.filter((item) => !existingIds.has(item.id));
  const timelineIds = new Set(data.timeline.map((entry) => entry.id));
  const demoTimeline = demo.timeline.filter((entry) => !timelineIds.has(entry.id));

  const timeline = [...data.timeline, ...demoTimeline].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    incidents: [...data.incidents, ...demoIncidents],
    timeline: timeline.slice(0, INCIDENT_GRAPH_TIMELINE_LIMIT),
    activeCount: data.activeCount + demoIncidents.length,
  };
}

type IncidentRow = {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  region_id: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

type UpdateRow = {
  id: string;
  incident_id: string;
  update_type: IncidentUpdate['updateType'];
  content: string;
  created_at: string;
  incident_reports: { title: string } | { title: string }[] | null;
};

function countByKey(rows: { incident_id: string }[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.incident_id] = (acc[row.incident_id] ?? 0) + 1;
    return acc;
  }, {});
}

export async function fetchActiveIncidentCount(regionId?: RegionId | null): Promise<number> {
  let query = supabase
    .from('incident_reports')
    .select('id', { count: 'exact', head: true })
    .in('status', [...INCIDENT_GRAPH_ACTIVE_STATUSES]);

  if (regionId) {
    query = query.eq('region_id', regionId);
  }

  const { count, error } = await query;
  if (error) return incidentGraphDemoEnabled() ? getDemoIncidentCount(regionId) : 0;
  const liveCount = count ?? 0;
  return liveCount + (incidentGraphDemoEnabled() ? getDemoIncidentCount(regionId) : 0);
}

export async function fetchIncidentGraph(regionId?: RegionId | null): Promise<IncidentGraphData> {
  let incidentQuery = supabase
    .from('incident_reports')
    .select('id, title, description, severity, status, region_id, latitude, longitude, created_at')
    .in('status', [...INCIDENT_GRAPH_ACTIVE_STATUSES])
    .order('created_at', { ascending: false })
    .limit(INCIDENT_GRAPH_LIST_LIMIT);

  if (regionId) {
    incidentQuery = incidentQuery.eq('region_id', regionId);
  }

  const { data: incidentRows, error: incidentError } = await incidentQuery;
  if (incidentError || !incidentRows?.length) {
    return mergeWithDemo({ incidents: [], timeline: [], activeCount: 0 }, regionId);
  }

  const incidents = incidentRows as IncidentRow[];
  const incidentIds = incidents.map((row) => row.id);

  const [verificationsRes, updatesRes, timelineRes] = await Promise.all([
    supabase.from('incident_verifications').select('incident_id').in('incident_id', incidentIds),
    supabase
      .from('incident_updates')
      .select('incident_id, created_at')
      .in('incident_id', incidentIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('incident_updates')
      .select(
        `id, incident_id, update_type, content, created_at,
         incident_reports!incident_updates_incident_id_fkey (title)`,
      )
      .in('incident_id', incidentIds)
      .order('created_at', { ascending: false })
      .limit(INCIDENT_GRAPH_TIMELINE_LIMIT),
  ]);

  const verificationCounts = countByKey((verificationsRes.data ?? []) as { incident_id: string }[]);
  const updateCounts = countByKey((updatesRes.data ?? []) as { incident_id: string }[]);
  const latestUpdates: Record<string, string> = {};
  for (const row of (updatesRes.data ?? []) as { incident_id: string; created_at: string }[]) {
    if (!latestUpdates[row.incident_id]) {
      latestUpdates[row.incident_id] = row.created_at;
    }
  }

  const graphIncidents: IncidentGraphItem[] = incidents.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    severity: row.severity,
    status: row.status,
    regionId: row.region_id,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
    verificationCount: verificationCounts[row.id] ?? 0,
    updateCount: updateCounts[row.id] ?? 0,
    latestUpdateAt: latestUpdates[row.id] ?? row.created_at,
  }));

  const timeline: IncidentGraphTimelineEntry[] = ((timelineRes.data ?? []) as UpdateRow[]).map((row) => {
    const incident = row.incident_reports;
    const title = Array.isArray(incident) ? incident[0]?.title : incident?.title;
    return {
      id: row.id,
      incidentId: row.incident_id,
      incidentTitle: title ?? 'Olay',
      updateType: row.update_type,
      content: row.content,
      createdAt: row.created_at,
    };
  });

  return mergeWithDemo(
    {
      incidents: graphIncidents,
      timeline,
      activeCount: graphIncidents.length,
    },
    regionId,
  );
}
