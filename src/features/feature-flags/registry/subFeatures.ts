import * as subFeatureModules from '@/features/feature-flags/registry/subFeatureModules';
import type { AppFeatureDef } from '@/features/feature-flags/types';

function collectSubFeatures(): AppFeatureDef[] {
  return Object.values(subFeatureModules).flatMap((items) =>
    Array.isArray(items) ? items : [],
  );
}

/** Tüm merkez alt özellik tanımları — `subFeatureModules.ts` üzerinden otomatik toplanır. */
export const FEATURE_SUB_REGISTRY: AppFeatureDef[] = collectSubFeatures();
