import type { ReactElement, ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import type { RefreshControlProps } from 'react-native';
import { FormKeyboardScrollView } from '@/components/keyboard/FormKeyboardScrollView';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { CITY_GOVERNANCE_ACCENT } from '@/features/city-governance/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type CityNavTabId = 'home' | 'council' | 'diplomacy' | 'history' | 'leader';

export const CITY_NAV_ITEMS: {
  id: CityNavTabId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  suffix: string;
}[] = [
  { id: 'home', label: 'Ana', icon: 'home-outline', suffix: '' },
  { id: 'council', label: 'Meclis', icon: 'business-outline', suffix: '/council' },
  { id: 'diplomacy', label: 'Diplomasi', icon: 'git-network-outline', suffix: '/diplomacy' },
  { id: 'history', label: 'Tarih', icon: 'time-outline', suffix: '/history' },
  { id: 'leader', label: 'Lider', icon: 'ribbon-outline', suffix: '/leader' },
];

type CitySurfaceCardProps = {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
};

/** Android'de blur yerine düz yüzey — daha okunaklı kartlar. */
export function CitySurfaceCard({ children, style, padded = true }: CitySurfaceCardProps) {
  const { colors } = useTheme();

  if (Platform.OS === 'android') {
    return (
      <View
        style={[
          styles.surfaceCard,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
            padding: padded ? spacing.lg : 0,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <GlassCard style={style} padded={padded}>
      {children}
    </GlassCard>
  );
}

type CityNavBarProps = {
  slug: string;
  active: CityNavTabId;
  leaderOnly?: boolean;
};

export function CityNavBar({ slug, active, leaderOnly = false }: CityNavBarProps) {
  const { colors } = useTheme();
  const items = leaderOnly ? CITY_NAV_ITEMS.filter((t) => t.id === 'leader' || t.id === 'home') : CITY_NAV_ITEMS;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.navRow}
      keyboardShouldPersistTaps="handled"
    >
      {items.map((tab) => {
        const selected = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            onPress={() => {
              if (selected) return;
              router.push(`/city/${slug}${tab.suffix}` as never);
            }}
            style={[
              styles.navChip,
              {
                backgroundColor: selected ? `${CITY_GOVERNANCE_ACCENT}22` : colors.surfaceElevated,
                borderColor: selected ? CITY_GOVERNANCE_ACCENT : colors.border,
              },
            ]}
          >
            <Ionicons
              name={tab.icon}
              size={15}
              color={selected ? CITY_GOVERNANCE_ACCENT : colors.textSecondary}
            />
            <Text
              variant="caption"
              style={{
                color: selected ? CITY_GOVERNANCE_ACCENT : colors.textSecondary,
                fontWeight: selected ? '700' : '500',
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

type CityPageShellProps = {
  slug: string;
  regionName: string;
  regionLabel?: string;
  activeTab: CityNavTabId;
  subtitle?: string;
  leaderOnlyNav?: boolean;
  hideNav?: boolean;
  children: ReactNode;
  headerExtra?: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
};

export function CityPageShell({
  slug,
  regionName,
  regionLabel = 'Karadeniz',
  activeTab,
  subtitle,
  leaderOnlyNav,
  hideNav = false,
  children,
  headerExtra,
  refreshControl,
}: CityPageShellProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <GradientBackground>
      <FormKeyboardScrollView
        contentContainerStyle={[
          styles.pageScroll,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        refreshControl={refreshControl}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={96}
        extraKeyboardSpace={spacing.lg}
      >
        <View style={styles.topRow}>
          <ScreenBackButton />
        </View>

        <View style={styles.hero}>
          <Text variant="caption" style={[styles.regionTag, { color: CITY_GOVERNANCE_ACCENT }]}>
            {regionLabel.toUpperCase()}
          </Text>
          <Text variant="h1" style={styles.cityTitle}>
            {regionName}
          </Text>
          {subtitle ? (
            <Text secondary variant="body">
              {subtitle}
            </Text>
          ) : null}
          {headerExtra}
        </View>

        {hideNav ? null : <CityNavBar slug={slug} active={activeTab} leaderOnly={leaderOnlyNav} />}

        <View style={styles.content}>{children}</View>
      </FormKeyboardScrollView>
    </GradientBackground>
  );
}

type CityActionTileProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  accent?: string;
  badge?: string;
};

export function CityActionTile({
  icon,
  title,
  subtitle,
  onPress,
  accent = CITY_GOVERNANCE_ACCENT,
  badge,
}: CityActionTileProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionTile,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={[styles.actionIconWrap, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={22} color={accent} />
      </View>
      <View style={styles.actionCopy}>
        <Text variant="label" numberOfLines={1}>
          {title}
        </Text>
        <Text secondary variant="caption" numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      {badge ? (
        <View style={[styles.actionBadge, { backgroundColor: `${accent}20` }]}>
          <Text variant="caption" style={{ color: accent, fontWeight: '700' }}>
            {badge}
          </Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export function CitySectionTitle({ title, icon }: { title: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.sectionTitle}>
      <Ionicons name={icon} size={18} color={CITY_GOVERNANCE_ACCENT} />
      <Text variant="h3">{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  surfaceCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  pageScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  topRow: {
    marginBottom: spacing.xs,
  },
  hero: {
    gap: spacing.xs,
  },
  regionTag: {
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  cityTitle: {
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  navRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  navChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: {
    gap: spacing.md,
  },
  actionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: {
    flex: 1,
    gap: 2,
  },
  actionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
