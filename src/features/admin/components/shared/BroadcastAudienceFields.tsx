import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { REGIONS } from '@/constants/regions';
import { ROLE_LABELS } from '@/constants/roles';
import type { UserRole } from '@/types/database';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import {
  BROADCAST_AUDIENCE_HINTS,
  BROADCAST_AUDIENCE_OPTIONS,
  type BroadcastAudienceFilter,
  type BroadcastAudienceSegment,
} from '@/features/admin/constants/broadcastAudience';
import { spacing } from '@/constants/theme';

const REGION_OPTIONS = [
  { id: 'all' as const, label: 'Tüm şehirler' },
  ...REGIONS.map((r) => ({ id: r.id as string, label: r.name })),
];

const ROLE_OPTIONS = [
  { id: 'all' as const, label: 'Tüm roller' },
  ...(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => ({ id: role, label: ROLE_LABELS[role] })),
];

type Props = {
  audience: BroadcastAudienceFilter;
  onChange: (next: BroadcastAudienceFilter) => void;
};

export function BroadcastAudienceFields({ audience, onChange }: Props) {
  const hint = BROADCAST_AUDIENCE_HINTS[audience.segment];

  return (
    <View style={styles.wrap}>
      <Text secondary variant="caption">
        Hedef kitle
      </Text>
      <AdminFilterChip
        options={BROADCAST_AUDIENCE_OPTIONS}
        value={audience.segment}
        onChange={(segment) => onChange({ ...audience, segment: segment as BroadcastAudienceSegment })}
      />
      {hint ? (
        <Text secondary variant="caption">
          {hint}
        </Text>
      ) : null}
      <Text secondary variant="caption">
        Şehir filtresi
      </Text>
      <AdminFilterChip
        options={REGION_OPTIONS}
        value={audience.regionId ?? 'all'}
        onChange={(regionId) =>
          onChange({ ...audience, regionId: regionId === 'all' ? null : regionId })
        }
      />
      <Text secondary variant="caption">
        Rol filtresi
      </Text>
      <AdminFilterChip
        options={ROLE_OPTIONS}
        value={audience.role ?? 'all'}
        onChange={(role) =>
          onChange({ ...audience, role: role === 'all' ? null : (role as UserRole) })
        }
      />
      <AdminFilterChip
        options={[
          { id: 'optional', label: 'Push token şart değil' },
          { id: 'required', label: 'Yalnızca push token olanlar' },
        ]}
        value={audience.requirePushToken ? 'required' : 'optional'}
        onChange={(value) => onChange({ ...audience, requirePushToken: value === 'required' })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
});
