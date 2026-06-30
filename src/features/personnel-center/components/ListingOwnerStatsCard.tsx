import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { PERSONNEL_ACCENT } from '@/features/personnel-center/constants';
import {
  fetchListingOwnerStats,
  type ListingOwnerStats,
} from '@/features/personnel-center/services/listingOwnerStats';
import type { ListingType } from '@/features/personnel-center/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  listingType: ListingType;
  listingId: string;
};

function StatTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: `${accent}10`, borderColor: `${accent}22` }]}>
      <Ionicons name={icon} size={16} color={accent} />
      <Text variant="caption" muted>
        {label}
      </Text>
      <Text variant="label" style={{ color: colors.text }}>
        {value}
      </Text>
    </View>
  );
}

export function ListingOwnerStatsCard({ listingType, listingId }: Props) {
  const [stats, setStats] = useState<ListingOwnerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchListingOwnerStats(listingType, listingId).then((data) => {
      if (active) {
        setStats(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [listingId, listingType]);

  return (
    <GlassCard style={[styles.card, { borderColor: `${PERSONNEL_ACCENT}33` }]}>
      <View style={styles.header}>
        <Ionicons name="analytics-outline" size={18} color={PERSONNEL_ACCENT} />
        <Text variant="label">İlan performansı</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={PERSONNEL_ACCENT} style={styles.loader} />
      ) : stats ? (
        <View style={styles.grid}>
          <StatTile icon="eye-outline" label="Görüntülenme" value={String(stats.viewCount)} accent={PERSONNEL_ACCENT} />
          <StatTile
            icon="trending-up-outline"
            label="Son 7 gün"
            value={String(stats.viewsLast7Days)}
            accent={PERSONNEL_ACCENT}
          />
          <StatTile
            icon="document-text-outline"
            label="Başvuru"
            value={String(stats.applicationsTotal)}
            accent={PERSONNEL_ACCENT}
          />
          <StatTile
            icon="time-outline"
            label="Bekleyen"
            value={String(stats.applicationsPending)}
            accent={PERSONNEL_ACCENT}
          />
          <StatTile
            icon="checkmark-circle-outline"
            label="Onaylı"
            value={String(stats.applicationsAccepted)}
            accent={PERSONNEL_ACCENT}
          />
        </View>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  loader: {
    paddingVertical: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    width: '47%',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm,
    gap: 2,
  },
});
