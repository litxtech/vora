import { lazy, Suspense, type ComponentType } from 'react';
import { RouteLoadingFallback } from '@/lib/navigation/RouteLoadingFallback';

export function createLazyScreen<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
) {
  const LazyScreen = lazy(loader);

  function LazyScreenRoute(props: P) {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <LazyScreen {...props} />
      </Suspense>
    );
  }

  return LazyScreenRoute;
}
