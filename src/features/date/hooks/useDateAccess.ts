import { useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { canAccessDate } from '@/features/date/utils';

export function useDateAccess(): boolean {
  const { profile } = useAuth();
  return useMemo(() => canAccessDate(profile), [profile]);
}
