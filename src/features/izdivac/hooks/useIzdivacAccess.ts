import { hasIzdivacGrant } from '@/features/izdivac/utils';
import { useAuth } from '@/providers/AuthProvider';

/** Admin tarafından izdivaç erişimi verilmiş kullanıcı — merkez butonu görünür. */
export function useIzdivacAccess(): boolean {
  const { profile } = useAuth();
  return hasIzdivacGrant(profile);
}
