import type { FeedAuthor } from '@/features/feed/types';
import type {
  IncidentGraphData,
  IncidentGraphItem,
  IncidentGraphTimelineEntry,
  IncidentThread,
} from '@/features/incidents/types';
import type { RegionId } from '@/constants/regions';
import type { UserRole } from '@/types/database';

function hoursAgo(hours: number): string {
  return new Date(Date.now() - 1000 * 60 * 60 * hours).toISOString();
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - 1000 * 60 * minutes).toISOString();
}

function reporter(
  id: string,
  username: string,
  fullName: string,
  role: UserRole = 'verified_reporter',
): FeedAuthor {
  return {
    id,
    username,
    fullName,
    avatarUrl: null,
    role,
    isVerified: true,
  };
}

const TRABZON_REPORTER = reporter('demo-author-trabzon', 'trabzon_gundem', 'Trabzon Gündem');
const RIZE_REPORTER = reporter('demo-author-rize', 'rize_haber', 'Rize Haber Merkezi');
const GIRESUN_REPORTER = reporter('demo-author-giresun', 'giresun_ajans', 'Giresun Ajans');
const CITIZEN = reporter('demo-author-citizen', 'karadenizli42', 'Ayşe K.', 'user');

export const DEMO_INCIDENT_IDS = [
  'demo-incident-traffic-1',
  'demo-incident-flood-1',
  'demo-incident-power-1',
] as const;

const DEMO_GRAPH_ITEMS: IncidentGraphItem[] = [
  {
    id: 'demo-incident-traffic-1',
    title: "Sahil Yolu'nda yoğun trafik",
    description:
      'Meydan istikametinde kaza sonrası tek şerit ulaşıma açık. Alternatif güzergah: Hopa yolu.',
    severity: 'high',
    status: 'verified',
    regionId: 'trabzon',
    latitude: 41.002,
    longitude: 39.73,
    createdAt: hoursAgo(2.5),
    verificationCount: 14,
    updateCount: 3,
    latestUpdateAt: minutesAgo(18),
    isDemo: true,
  },
  {
    id: 'demo-incident-flood-1',
    title: "İyidere'de sel uyarısı",
    description:
      'Sağanak nedeniyle dereler taşma seviyesine yaklaştı. Vatandaşların dere kenarından uzak durması önerilir.',
    severity: 'critical',
    status: 'open',
    regionId: 'rize',
    latitude: 41.048,
    longitude: 40.518,
    createdAt: hoursAgo(1.2),
    verificationCount: 8,
    updateCount: 2,
    latestUpdateAt: minutesAgo(42),
    isDemo: true,
  },
  {
    id: 'demo-incident-power-1',
    title: 'Enerji kesintisi — Merkez ilçe',
    description:
      'Bakım çalışması nedeniyle bazı mahallelerde elektrik kesintisi yaşanıyor. Tahmini süre: 2 saat.',
    severity: 'medium',
    status: 'open',
    regionId: 'giresun',
    latitude: 40.913,
    longitude: 38.39,
    createdAt: hoursAgo(0.8),
    verificationCount: 5,
    updateCount: 2,
    latestUpdateAt: minutesAgo(55),
    isDemo: true,
  },
];

const DEMO_THREADS: Record<string, IncidentThread> = {
  'demo-incident-traffic-1': {
    id: 'demo-incident-traffic-1',
    title: "Sahil Yolu'nda yoğun trafik",
    description:
      'Meydan istikametinde kaza sonrası tek şerit ulaşıma açık. Alternatif güzergah: Hopa yolu.',
    severity: 'high',
    status: 'verified',
    regionId: 'trabzon',
    latitude: 41.002,
    longitude: 39.73,
    mediaUrls: [],
    reporter: TRABZON_REPORTER,
    createdAt: hoursAgo(2.5),
    verificationCount: 2,
    isDemo: true,
    updates: [
      {
        id: 'demo-update-traffic-1',
        incidentId: 'demo-incident-traffic-1',
        author: TRABZON_REPORTER,
        updateType: 'initial',
        content:
          'Karadeniz Sahil Yolu Meydan mevkiinde iki aracın karıştığı kaza nedeniyle trafik yavaş ilerliyor.',
        mediaUrls: [],
        createdAt: hoursAgo(2.5),
      },
      {
        id: 'demo-update-traffic-2',
        incidentId: 'demo-incident-traffic-1',
        author: CITIZEN,
        updateType: 'update',
        content: 'Çekici geldi, sağ şerit açıldı. Akış yavaş ama devam ediyor.',
        mediaUrls: [],
        createdAt: hoursAgo(1.1),
      },
      {
        id: 'demo-update-traffic-3',
        incidentId: 'demo-incident-traffic-1',
        author: TRABZON_REPORTER,
        updateType: 'update',
        content: 'Emniyet ekipleri olay yerinde. Sürücülere sabırlı olmaları çağrısı yapıldı.',
        mediaUrls: [],
        createdAt: minutesAgo(18),
      },
    ],
    verifications: [
      {
        id: 'demo-verify-traffic-1',
        verifier: CITIZEN,
        note: 'Meydan tarafından geçtim, trafik gerçekten yoğun.',
        createdAt: hoursAgo(1.8),
      },
      {
        id: 'demo-verify-traffic-2',
        verifier: reporter('demo-author-traffic', 'trafik_takip', 'Trafik Takip'),
        note: null,
        createdAt: hoursAgo(1.2),
      },
    ],
  },
  'demo-incident-flood-1': {
    id: 'demo-incident-flood-1',
    title: "İyidere'de sel uyarısı",
    description:
      'Sağanak nedeniyle dereler taşma seviyesine yaklaştı. Vatandaşların dere kenarından uzak durması önerilir.',
    severity: 'critical',
    status: 'open',
    regionId: 'rize',
    latitude: 41.048,
    longitude: 40.518,
    mediaUrls: [],
    reporter: RIZE_REPORTER,
    createdAt: hoursAgo(1.2),
    verificationCount: 2,
    isDemo: true,
    updates: [
      {
        id: 'demo-update-flood-1',
        incidentId: 'demo-incident-flood-1',
        author: RIZE_REPORTER,
        updateType: 'initial',
        content:
          'İyidere ilçesinde etkili sağanak sonrası derelerin seviyesi yükseldi. AFAD ekipleri bölgede.',
        mediaUrls: [],
        createdAt: hoursAgo(1.2),
      },
      {
        id: 'demo-update-flood-2',
        incidentId: 'demo-incident-flood-1',
        author: RIZE_REPORTER,
        updateType: 'update',
        content: 'Dere kenarındaki tarım arazilerinde su birikintileri oluştu. Hasar tespiti sürüyor.',
        mediaUrls: [],
        createdAt: minutesAgo(42),
      },
    ],
    verifications: [
      {
        id: 'demo-verify-flood-1',
        verifier: reporter('demo-author-rize-vol', 'rize_gonullu', 'Rize Gönüllü'),
        note: 'Bölgedeyiz, su seviyesi hâlâ yüksek.',
        createdAt: hoursAgo(0.9),
      },
      {
        id: 'demo-verify-flood-2',
        verifier: CITIZEN,
        note: null,
        createdAt: minutesAgo(50),
      },
    ],
  },
  'demo-incident-power-1': {
    id: 'demo-incident-power-1',
    title: 'Enerji kesintisi — Merkez ilçe',
    description:
      'Bakım çalışması nedeniyle bazı mahallelerde elektrik kesintisi yaşanıyor. Tahmini süre: 2 saat.',
    severity: 'medium',
    status: 'open',
    regionId: 'giresun',
    latitude: 40.913,
    longitude: 38.39,
    mediaUrls: [],
    reporter: GIRESUN_REPORTER,
    createdAt: hoursAgo(0.8),
    verificationCount: 1,
    isDemo: true,
    updates: [
      {
        id: 'demo-update-power-1',
        incidentId: 'demo-incident-power-1',
        author: GIRESUN_REPORTER,
        updateType: 'initial',
        content:
          'Merkez ilçede planlı bakım kapsamında elektrik kesintisi başladı. Etkilenen mahalleler: Çınarlar, Aksu, Kale.',
        mediaUrls: [],
        createdAt: hoursAgo(0.8),
      },
      {
        id: 'demo-update-power-2',
        incidentId: 'demo-incident-power-1',
        author: GIRESUN_REPORTER,
        updateType: 'update',
        content: 'TEDAŞ ekipleri sahada. Kesintinin 2 saat içinde sona ermesi bekleniyor.',
        mediaUrls: [],
        createdAt: minutesAgo(55),
      },
    ],
    verifications: [
      {
        id: 'demo-verify-power-1',
        verifier: CITIZEN,
        note: 'Çınarlar mahallesindeyim, elektrik yok.',
        createdAt: minutesAgo(30),
      },
    ],
  },
};

function buildTimeline(items: IncidentGraphItem[]): IncidentGraphTimelineEntry[] {
  const entries: IncidentGraphTimelineEntry[] = [];

  for (const item of items) {
    const thread = DEMO_THREADS[item.id];
    if (!thread) continue;
    for (const update of thread.updates) {
      if (update.updateType === 'initial') continue;
      entries.push({
        id: update.id,
        incidentId: item.id,
        incidentTitle: item.title,
        updateType: update.updateType,
        content: update.content,
        createdAt: update.createdAt,
      });
    }
  }

  return entries
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);
}

function filterByRegion(items: IncidentGraphItem[], regionId?: RegionId | null): IncidentGraphItem[] {
  if (!regionId) return [...items];
  return items.filter((item) => item.regionId === regionId);
}

export function getDemoIncidentGraph(regionId?: RegionId | null): IncidentGraphData {
  const incidents = filterByRegion(DEMO_GRAPH_ITEMS, regionId);
  return {
    incidents,
    timeline: buildTimeline(incidents),
    activeCount: incidents.length,
  };
}

export function getDemoIncidentCount(regionId?: RegionId | null): number {
  return filterByRegion(DEMO_GRAPH_ITEMS, regionId).length;
}

export function getDemoIncidentThread(id: string): IncidentThread | null {
  return DEMO_THREADS[id] ?? null;
}
