export const REGIONS = [
  { id: 'amasya', name: 'Amasya', phase: 3 },
  { id: 'artvin', name: 'Artvin', phase: 1 },
  { id: 'bartin', name: 'Bartın', phase: 3 },
  { id: 'bayburt', name: 'Bayburt', phase: 3 },
  { id: 'bolu', name: 'Bolu', phase: 3 },
  { id: 'corum', name: 'Çorum', phase: 3 },
  { id: 'duzce', name: 'Düzce', phase: 3 },
  { id: 'giresun', name: 'Giresun', phase: 1 },
  { id: 'gumushane', name: 'Gümüşhane', phase: 3 },
  { id: 'karabuk', name: 'Karabük', phase: 3 },
  { id: 'kastamonu', name: 'Kastamonu', phase: 3 },
  { id: 'ordu', name: 'Ordu', phase: 2 },
  { id: 'rize', name: 'Rize', phase: 1 },
  { id: 'samsun', name: 'Samsun', phase: 2 },
  { id: 'sinop', name: 'Sinop', phase: 3 },
  { id: 'tokat', name: 'Tokat', phase: 3 },
  { id: 'trabzon', name: 'Trabzon', phase: 1 },
  { id: 'zonguldak', name: 'Zonguldak', phase: 3 },
] as const;

export type RegionId = (typeof REGIONS)[number]['id'];

export const PHASE_1_REGIONS = REGIONS.filter((r) => r.phase === 1);
export const PHASE_2_REGIONS = REGIONS.filter((r) => r.phase === 2);
export const PHASE_3_REGIONS = REGIONS.filter((r) => r.phase === 3);

export const DEFAULT_REGION_ID: RegionId = 'trabzon';

export function resolveMarketplaceRegionId(regionId: string | null | undefined): RegionId {
  if (regionId && REGIONS.some((r) => r.id === regionId)) {
    return regionId as RegionId;
  }
  return DEFAULT_REGION_ID;
}

export function regionNameById(id: string | null | undefined): string | undefined {
  if (!id) return undefined;
  return REGIONS.find((r) => r.id === id)?.name ?? id;
}
