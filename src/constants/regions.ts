export const REGIONS = [
  { id: 'trabzon', name: 'Trabzon', phase: 1 },
  { id: 'rize', name: 'Rize', phase: 1 },
  { id: 'giresun', name: 'Giresun', phase: 1 },
  { id: 'ordu', name: 'Ordu', phase: 2 },
  { id: 'samsun', name: 'Samsun', phase: 2 },
  { id: 'artvin', name: 'Artvin', phase: 2 },
] as const;

export type RegionId = (typeof REGIONS)[number]['id'];

export const PHASE_1_REGIONS = REGIONS.filter((r) => r.phase === 1);
