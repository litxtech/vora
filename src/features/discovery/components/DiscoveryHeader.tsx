import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { DISCOVERY_FEATURE } from '@/features/discovery/featureFlags';
import { FeedIconButton } from '@/features/feed/components/shared/FeedIconButton';
import { FeatureGate } from '@/features/feature-flags/components/FeatureGate';
import { MapHeaderButton } from '@/features/map/components/MapHeaderButton';
import { IncidentsHeaderButton } from '@/features/incidents/components/IncidentsHeaderButton';
import { DISCOVERY_PERIODS, DISCOVERY_SCOPES, DISCOVERY_USER_SEARCH_PLACEHOLDER } from '@/features/discovery/constants';
import { useDiscoveryStore } from '@/features/discovery/store/discoveryStore';
import { VoraAiDiscoveryButton } from '@/features/vora-ai/components/VoraAiDiscoveryPanel';
import { REGIONS } from '@/constants/regions';
import { glassSurface, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function DiscoveryHeader() {
  const { colors } = useTheme();
  const { requireAuth } = useRequireAuth();
  const scope = useDiscoveryStore((s) => s.scope);
  const period = useDiscoveryStore((s) => s.period);
  const regionId = useDiscoveryStore((s) => s.regionId);
  const userSearchOpen = useDiscoveryStore((s) => s.userSearchOpen);
  const userSearchQuery = useDiscoveryStore((s) => s.userSearchQuery);
  const setScope = useDiscoveryStore((s) => s.setScope);
  const setPeriod = useDiscoveryStore((s) => s.setPeriod);
  const setRegionId = useDiscoveryStore((s) => s.setRegionId);
  const setUserSearchOpen = useDiscoveryStore((s) => s.setUserSearchOpen);
  const setUserSearchQuery = useDiscoveryStore((s) => s.setUserSearchQuery);
  const closeUserSearch = useDiscoveryStore((s) => s.closeUserSearch);

  const [locationOpen, setLocationOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);

  const communitiesVisible = useFeatureVisible('communities');
  const discoverAgendaVisible = useFeatureVisible('discover');
  const showUserSearch = useFeatureVisible(DISCOVERY_FEATURE.userSearch);
  const showVoraAi = useFeatureVisible(DISCOVERY_FEATURE.voraAi);
  const showLocationFilter = useFeatureVisible(DISCOVERY_FEATURE.locationFilter);
  const showPeriodFilter = useFeatureVisible(DISCOVERY_FEATURE.periodFilter);
  const showAgendaChip = useFeatureVisible(DISCOVERY_FEATURE.agendaChip);
  const showCommunitiesChip = useFeatureVisible(DISCOVERY_FEATURE.communitiesChip);
  const showHeaderMap = useFeatureVisible(DISCOVERY_FEATURE.headerMap);
  const showHeaderIncidents = useFeatureVisible(DISCOVERY_FEATURE.headerIncidents);

  const regionName = REGIONS.find((r) => r.id === regionId)?.name ?? 'Bölge';
  const periodLabel = DISCOVERY_PERIODS.find((p) => p.id === period)?.label ?? 'Son 7 Gün';
  const locationLabel = scope === 'karadeniz' ? 'Karadeniz Geneli' : regionName;
  const scopeLabel = DISCOVERY_SCOPES.find((s) => s.id === scope)?.label ?? 'İl Bazlı';

  return (
    <View style={styles.wrap}>
      <View style={styles.topBar}>
        <View style={styles.titleBlock}>
          <Text variant="h3" style={styles.title}>
            Keşfet
          </Text>
          <Text secondary variant="caption" numberOfLines={1}>
            {locationLabel} · {periodLabel}
          </Text>
        </View>

        <View style={styles.topActions}>
          {showHeaderIncidents ? (
            <FeatureGate featureId="feed-header-incidents">
              <IncidentsHeaderButton regionId={regionId} />
            </FeatureGate>
          ) : null}
          {showHeaderMap ? (
            <FeatureGate featureId="feed-header-map">
              <MapHeaderButton />
            </FeatureGate>
          ) : null}
          {showVoraAi ? <VoraAiDiscoveryButton regionId={regionId} /> : null}
          {showUserSearch ? (
            <FeedIconButton
              icon={userSearchOpen ? 'close-outline' : 'search-outline'}
              compact
              onPress={async () => {
                if (!userSearchOpen && !(await requireAuth('Kullanıcı arama'))) return;
                if (userSearchOpen) {
                  closeUserSearch();
                } else {
                  setUserSearchOpen(true);
                }
              }}
            />
          ) : null}
        </View>
      </View>

      {userSearchOpen && showUserSearch ? (
        <View style={[styles.searchWrap, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={DISCOVERY_USER_SEARCH_PLACEHOLDER}
            placeholderTextColor={colors.textMuted}
            value={userSearchQuery}
            onChangeText={setUserSearchQuery}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            keyboardType="default"
            textAlignVertical="center"
          />
          {userSearchQuery.length > 0 ? (
            <Pressable onPress={() => setUserSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!userSearchOpen ? (
        <View style={styles.filterRow}>
          {showLocationFilter ? (
            <FilterChip
              icon="location-outline"
              label={locationLabel}
              accent={colors.primary}
              onPress={() => setLocationOpen(true)}
            />
          ) : null}
          {showPeriodFilter ? (
            <FilterChip
              icon="time-outline"
              label={periodLabel}
              accent={colors.warning}
              onPress={() => setPeriodOpen(true)}
            />
          ) : null}
          {discoverAgendaVisible && showAgendaChip ? (
            <FilterChip
              icon="trending-up"
              label="Gündem"
              accent={colors.warning}
              onPress={() => router.push('/agenda' as never)}
            />
          ) : null}
          {communitiesVisible && showCommunitiesChip ? (
            <FilterChip
              icon="people-outline"
              label="Topluluk"
              accent={colors.primary}
              onPress={() => router.push('/communities' as never)}
            />
          ) : null}
          <View style={[styles.scopeHint, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text variant="caption" secondary numberOfLines={1}>
              {scopeLabel}
            </Text>
          </View>
        </View>
      ) : null}

      <PickerModal visible={locationOpen} onClose={() => setLocationOpen(false)} title="Konum">
        <View style={[styles.segmented, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          {DISCOVERY_SCOPES.map((item) => {
            const active = scope === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setScope(item.id)}
                style={[styles.segment, active && { backgroundColor: colors.primary }]}
              >
                <Text
                  variant="caption"
                  style={{
                    color: active ? '#fff' : colors.textSecondary,
                    fontWeight: active ? '700' : '500',
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {scope === 'region' ? (
          <View style={styles.optionList}>
            {REGIONS.map((region) => {
              const active = regionId === region.id;
              return (
                <Pressable
                  key={region.id}
                  style={[styles.option, active && { backgroundColor: `${colors.primary}14` }]}
                  onPress={async () => {
                    setRegionId(region.id);
                    setLocationOpen(false);
                  }}
                >
                  <Text style={active ? { color: colors.primary, fontWeight: '600' } : undefined}>{region.name}</Text>
                  {active ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Pressable
            style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
            onPress={() => setLocationOpen(false)}
          >
            <Text variant="label" style={{ color: '#fff' }}>
              Tamam
            </Text>
          </Pressable>
        )}
      </PickerModal>

      <PickerModal visible={periodOpen} onClose={() => setPeriodOpen(false)} title="Zaman aralığı">
        {DISCOVERY_PERIODS.map((item) => {
          const active = period === item.id;
          return (
            <Pressable
              key={item.id}
              style={[styles.option, active && { backgroundColor: `${colors.warning}18` }]}
              onPress={async () => {
                setPeriod(item.id);
                setPeriodOpen(false);
              }}
            >
              <Text style={active ? { color: colors.warning, fontWeight: '600' } : undefined}>{item.label}</Text>
              {active ? <Ionicons name="checkmark-circle" size={20} color={colors.warning} /> : null}
            </Pressable>
          );
        })}
      </PickerModal>
    </View>
  );
}

function FilterChip({
  icon,
  label,
  accent,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accent: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
    >
      <Ionicons name={icon} size={13} color={accent} />
      <Text variant="caption" style={{ fontWeight: '600' }} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
    </Pressable>
  );
}

function PickerModal({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const { colors, mode } = useTheme();
  const surface = glassSurface[mode];

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surfaceElevated }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.sheetHandle, { backgroundColor: surface.handle }]} />
          <View style={styles.sheetHeader}>
            <Text variant="h3">{title}</Text>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: `${colors.textMuted}22` }]}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    letterSpacing: -0.3,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    margin: 0,
    minHeight: 22,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    maxWidth: '46%',
  },
  scopeHint: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetList: {
    maxHeight: 420,
    gap: spacing.sm,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 3,
    gap: 3,
    marginBottom: spacing.md,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  optionList: {
    gap: spacing.xs,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  confirmBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
});
