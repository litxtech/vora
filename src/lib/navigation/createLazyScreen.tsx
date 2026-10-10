import { useSyncExternalStore, type ComponentType, type ReactNode } from 'react';
import { DetailLoadingShell } from '@/components/ui/DetailLoadingShell';

type ScreenLoader<P extends object> = () => Promise<{ default: ComponentType<P> }>;

export type InstantRoute<P extends object> = ((props: P) => ReactNode) & {
  preload: () => Promise<void>;
};

function DefaultRouteFallback() {
  return <DetailLoadingShell gradient />;
}

/**
 * Modül hazırsa ilk kare gerçek ekran. Değilse boş Suspense yerine detay iskeleti.
 * React.lazy ilk boyada her zaman fallback gösterdiği için kullanılmıyor.
 */
export function createLazyScreen<P extends object>(
  loader: ScreenLoader<P>,
  Fallback: ComponentType = DefaultRouteFallback,
): InstantRoute<P> {
  let screen: ComponentType<P> | null = null;
  let inflight: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const getSnapshot = () => screen;

  function preload(): Promise<void> {
    if (screen) return Promise.resolve();
    if (!inflight) {
      inflight = loader()
        .then((mod) => {
          screen = mod.default;
          listeners.forEach((listener) => listener());
        })
        .catch(() => {
          inflight = null;
        });
    }
    return inflight;
  }

  function Route(props: P) {
    const Ready = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    if (!Ready) {
      void preload();
      return <Fallback />;
    }
    return <Ready {...props} />;
  }

  Route.preload = preload;
  return Route;
}
