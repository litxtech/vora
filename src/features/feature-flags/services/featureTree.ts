import { APP_FEATURE_BY_ID, APP_FEATURE_REGISTRY } from '@/features/feature-flags/constants';
import type { AppFeatureDef, FeatureGroup, FeatureVisibilityMap } from '@/features/feature-flags/types';

export function getChildFeatures(parentId: string): AppFeatureDef[] {
  return APP_FEATURE_REGISTRY.filter((feature) => feature.parentId === parentId);
}

export function getRootFeaturesInGroup(group: FeatureGroup): AppFeatureDef[] {
  return APP_FEATURE_REGISTRY.filter((feature) => feature.group === group && !feature.parentId);
}

export function getFeatureAncestors(featureId: string): string[] {
  const ancestors: string[] = [];
  let current = APP_FEATURE_BY_ID[featureId];

  while (current?.parentId) {
    ancestors.push(current.parentId);
    current = APP_FEATURE_BY_ID[current.parentId];
  }

  return ancestors;
}

export function isDirectlyVisible(featureId: string, visibility: FeatureVisibilityMap): boolean {
  return visibility[featureId] ?? true;
}

/** Kendi bayrağı ve tüm üst özellikler açıksa görünür. */
export function isEffectivelyVisible(featureId: string, visibility: FeatureVisibilityMap): boolean {
  if (!isDirectlyVisible(featureId, visibility)) return false;

  for (const ancestorId of getFeatureAncestors(featureId)) {
    if (!isDirectlyVisible(ancestorId, visibility)) return false;
  }

  return true;
}

export function hasHiddenAncestor(featureId: string, visibility: FeatureVisibilityMap): boolean {
  return getFeatureAncestors(featureId).some((ancestorId) => !isDirectlyVisible(ancestorId, visibility));
}

export function featureBreadcrumb(featureId: string): string {
  const parts: string[] = [];
  let current = APP_FEATURE_BY_ID[featureId];

  while (current) {
    parts.unshift(current.label);
    current = current.parentId ? APP_FEATURE_BY_ID[current.parentId] : undefined;
  }

  return parts.join(' › ');
}

export function countSubFeatures(parentId: string): number {
  let count = 0;
  const walk = (id: string) => {
    for (const child of getChildFeatures(id)) {
      count += 1;
      walk(child.id);
    }
  };
  walk(parentId);
  return count;
}

export function groupChildrenByKind(
  parentId: string,
): Record<'tab' | 'screen' | 'control', AppFeatureDef[]> {
  const groups: Record<'tab' | 'screen' | 'control', AppFeatureDef[]> = {
    tab: [],
    screen: [],
    control: [],
  };

  for (const child of getChildFeatures(parentId)) {
    const kind = child.kind ?? 'control';
    if (kind === 'root' || kind === 'control') {
      groups.control.push(child);
      continue;
    }
    groups[kind].push(child);
  }

  return groups;
}

const KIND_SECTION_LABELS: Record<'tab' | 'screen' | 'control', string> = {
  tab: 'Sekmeler',
  screen: 'Bölümler',
  control: 'Alt özellikler',
};

export function kindSectionLabel(kind: 'tab' | 'screen' | 'control'): string {
  return KIND_SECTION_LABELS[kind];
}
