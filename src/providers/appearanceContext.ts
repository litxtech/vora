import { createContext, useContext } from 'react';
import type { AppAppearanceConfig } from '@/features/app-appearance/types';

export type AppearanceContextValue = {
  isReady: boolean;
  config: AppAppearanceConfig;
  refresh: () => Promise<void>;
};

export const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance AppearanceProvider içinde kullanılmalı.');
  }
  return context;
}

export function useAppearanceOptional(): AppearanceContextValue | null {
  return useContext(AppearanceContext);
}
