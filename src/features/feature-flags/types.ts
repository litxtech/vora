export type FeatureGroup = 'tabs' | 'centers' | 'programs' | 'social' | 'actions' | 'auth';

export type FeatureKind = 'root' | 'tab' | 'screen' | 'control';

export type FeatureId = string;

export type AppFeatureDef = {
  id: FeatureId;
  label: string;
  group: FeatureGroup;
  /** Üst özellik — kapalıysa alt öğeler de gizlenir. */
  parentId?: FeatureId;
  kind?: FeatureKind;
  /** Admin panelinde kısa açıklama */
  hint?: string;
  /** Route prefixes guarded when the feature is hidden. */
  routes?: string[];
};

export type FeatureVisibilityMap = Record<FeatureId, boolean>;

export const FEATURE_KIND_LABELS: Record<FeatureKind, string> = {
  root: 'Ana özellik',
  tab: 'Sekme',
  screen: 'Bölüm',
  control: 'Alt özellik',
};

