import { router, type Href } from 'expo-router';
import type { CenterDef } from '@/features/centers/types';

export function navigateToCenter(route: CenterDef['route']) {
  router.push(route as Href);
}
