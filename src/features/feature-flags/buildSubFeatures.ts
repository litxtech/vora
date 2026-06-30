import type { AppFeatureDef, FeatureGroup, FeatureKind } from '@/features/feature-flags/types';

type TabLike = { id: string; label: string };

export function featureTabId(parentId: string, tabId: string): string {
  return `${parentId}.tab.${tabId}`;
}

export function featureSectionId(parentId: string, sectionId: string): string {
  return `${parentId}.section.${sectionId}`;
}

export function featureControlId(parentId: string, controlId: string): string {
  return `${parentId}.control.${controlId}`;
}

export function buildTabSubFeatures(
  parentId: string,
  group: FeatureGroup,
  tabs: TabLike[],
): AppFeatureDef[] {
  return tabs.map((tab) => ({
    id: featureTabId(parentId, tab.id),
    label: tab.label,
    group,
    parentId,
    kind: 'tab' as const,
    hint: `${parentId} sekmesi`,
  }));
}

/** Üst sekmenin altındaki alt sekmeler (ör. Yardım → Talepler → Kan). */
export function buildNestedTabSubFeatures(
  parentFeatureId: string,
  group: FeatureGroup,
  tabs: TabLike[],
): AppFeatureDef[] {
  return tabs.map((tab) => ({
    id: featureTabId(parentFeatureId, tab.id),
    label: tab.label,
    group,
    parentId: parentFeatureId,
    kind: 'tab' as const,
    hint: 'Alt sekme',
  }));
}

export function buildSectionSubFeature(
  parentId: string,
  group: FeatureGroup,
  sectionId: string,
  label: string,
  hint?: string,
): AppFeatureDef {
  return {
    id: featureSectionId(parentId, sectionId),
    label,
    group,
    parentId,
    kind: 'screen',
    hint,
  };
}

export function buildControlSubFeature(
  parentId: string,
  group: FeatureGroup,
  controlId: string,
  label: string,
  hint?: string,
): AppFeatureDef {
  return {
    id: featureControlId(parentId, controlId),
    label,
    group,
    parentId,
    kind: 'control',
    hint,
  };
}
