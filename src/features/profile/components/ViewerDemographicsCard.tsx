import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { ProfileCollapsibleSection } from '@/features/profile/components/shared/ProfileCollapsibleSection';
import {
  fetchViewerDemographics,
  type DemographicBucket,
  type ViewerDemographics,
} from '@/features/profile/services/viewerDemographics';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const PREMIUM_GOLD = '#FFB300';

type ViewerDemographicsCardProps = {
  enabled: boolean;
  layout?: 'collapsible' | 'section';
  autoLoad?: boolean;
};

function DemographicBars({ title, items }: { title: string; items: DemographicBucket[] }) {
  const { colors } = useTheme();

  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text variant="label" style={styles.sectionTitle}>
        {title}
      </Text>
      {items.map((item) => (
        <View key={`${title}-${item.key}`} style={styles.row}>
          <View style={styles.rowMeta}>
            <Text variant="caption" numberOfLines={1} style={styles.rowLabel}>
              {item.label}
            </Text>
            <Text variant="caption" secondary>
              %{item.percent}
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: `${colors.border}` }]}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.max(item.percent, 4)}%`,
                  backgroundColor: PREMIUM_GOLD,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

export function ViewerDemographicsCard({
  enabled,
  layout = 'collapsible',
  autoLoad = false,
}: ViewerDemographicsCardProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ViewerDemographics | null>(null);

  const load = useCallback(async () => {
    if (!enabled || loaded || loading) return;
    setLoading(true);
    setError(null);
    const result = await fetchViewerDemographics();
    setLoading(false);
    setLoaded(true);
    if (result.error) {
      setError(result.error);
      return;
    }
    setData(result.data);
  }, [enabled, loaded, loading]);

  const handleExpandedChange = useCallback(
    (expanded: boolean) => {
      if (expanded) void load();
    },
    [load],
  );

  useEffect(() => {
    if (enabled && autoLoad) void load();
  }, [autoLoad, enabled, load]);

  if (!enabled) return null;

  const premiumTag = (
    <View style={styles.premiumTag}>
      <Text variant="caption" style={{ color: PREMIUM_GOLD, fontSize: 10, fontWeight: '700' }}>
        Premium
      </Text>
    </View>
  );

  const body = loading ? (
    <View style={styles.centered}>
      <ActivityIndicator color={PREMIUM_GOLD} />
    </View>
  ) : error ? (
    <Text secondary variant="caption">
      {error}
    </Text>
  ) : !data || data.totalViewers === 0 ? (
    <Text secondary variant="caption">
      Henüz yeterli izleyici verisi yok. Gönderi, reel veya profil görüntülendikçe demografi burada
      görünür.
    </Text>
  ) : (
    <View style={styles.content}>
      <View style={[styles.summary, { backgroundColor: `${PREMIUM_GOLD}14`, borderColor: `${PREMIUM_GOLD}33` }]}>
        <Text variant="h3" style={{ color: PREMIUM_GOLD, fontWeight: '800' }}>
          {data.totalViewers}
        </Text>
        <Text secondary variant="caption">
          benzersiz izleyici
        </Text>
      </View>

      <DemographicBars title="Cinsiyet" items={data.gender} />
      <DemographicBars title="Yaş grubu" items={data.ageGroups} />
      <DemographicBars title="Bölge" items={data.regions} />
      {data.districts.length > 0 ? <DemographicBars title="İlçe" items={data.districts} /> : null}

      <Text secondary variant="caption" style={styles.note}>
        Yalnızca profilinde cinsiyet, doğum tarihi veya konum bilgisi paylaşan izleyiciler dahil edilir.
        Belirtmeyenler “Bilinmiyor” olarak gösterilir.
      </Text>
    </View>
  );

  if (layout === 'section') return body;

  return (
    <ProfileCollapsibleSection
      title="İzleyici Demografisi"
      icon="people-outline"
      iconColor={PREMIUM_GOLD}
      onExpandedChange={handleExpandedChange}
      trailing={premiumTag}
    >
      {body}
    </ProfileCollapsibleSection>
  );
}

const styles = StyleSheet.create({
  premiumTag: {
    backgroundColor: 'rgba(255,179,0,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  content: {
    gap: spacing.md,
  },
  summary: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 2,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  row: {
    gap: spacing.xs,
  },
  rowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowLabel: {
    flex: 1,
  },
  track: {
    height: 8,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
  note: {
    lineHeight: 18,
    marginTop: spacing.xs,
  },
});
