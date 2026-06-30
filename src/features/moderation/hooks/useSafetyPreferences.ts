import { useMemo } from 'react';
import type { SafetyPreferences } from '@/features/moderation/types';
import { useAuth } from '@/providers/AuthProvider';

const DEFAULT_PREFS: SafetyPreferences = {
  show_sensitive_content: false,
  blur_sensitive_content: true,
};

export function useSafetyPreferences(): SafetyPreferences {
  const { profile } = useAuth();

  return useMemo(() => {
    const raw = profile?.safety_preferences as Partial<SafetyPreferences> | undefined;
    if (!raw) return DEFAULT_PREFS;
    return {
      show_sensitive_content: raw.show_sensitive_content ?? false,
      blur_sensitive_content: raw.blur_sensitive_content ?? true,
    };
  }, [profile?.safety_preferences]);
}
