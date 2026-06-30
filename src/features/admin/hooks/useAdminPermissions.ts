import { useCallback, useEffect, useState } from 'react';
import { fetchMyPermissions } from '@/features/admin/services/phase2Management';
import type { PermissionMap } from '@/features/admin/services/adminPermissions';
import { useAuth } from '@/providers/AuthProvider';
import { canModerate } from '@/constants/roles';

type AdminPermissionsState =
  | { status: 'loading'; permissions: null }
  | { status: 'ready'; permissions: PermissionMap }
  | { status: 'error'; permissions: null };

export function useAdminPermissions(enabled = true) {
  const { profile } = useAuth();
  const [state, setState] = useState<AdminPermissionsState>({ status: 'loading', permissions: null });

  const load = useCallback(async () => {
    if (!enabled || !profile?.role || !canModerate(profile.role)) {
      setState({ status: 'ready', permissions: {} });
      return;
    }

    setState((current) => ({ status: 'loading', permissions: current.permissions }));
    const permissions = await fetchMyPermissions();
    setState({ status: 'ready', permissions });
  }, [enabled, profile?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    permissions: state.permissions,
    loading: state.status === 'loading',
    refresh: load,
  };
}
