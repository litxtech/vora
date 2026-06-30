import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import type { AdminDashboardStats } from '@/features/admin/types';
import { TIP_LINE_ENABLED } from '@/features/tip-line/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AccentKey = 'success' | 'accent' | 'primary' | 'warning' | 'danger';

type ActionItem = {
  label: string;
  hint: string;
  key: keyof AdminDashboardStats;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  accentKey: AccentKey;
};

const PRIORITY_ACTIONS: ActionItem[] = [
  {
    label: 'Şikayet',
    hint: 'Kullanıcı bildirimleri incelenmeli',
    key: 'pending_reports',
    icon: 'flag',
    href: '/admin/reports',
    accentKey: 'warning',
  },
  {
    label: 'Kurumsal doğrulama',
    hint: 'İşletme belgeleri onayı bekliyor',
    key: 'pending_verifications',
    icon: 'shield-checkmark',
    href: '/admin/businesses',
    accentKey: 'danger',
  },
  {
    label: 'Kimlik doğrulama',
    hint: 'KYC başvuruları bekliyor',
    key: 'pending_identity_verifications',
    icon: 'id-card',
    href: '/admin/identity-verification',
    accentKey: 'danger',
  },
  {
    label: 'Muhabir başvurusu',
    hint: 'Basın kartı başvuruları',
    key: 'pending_reporter_apps',
    icon: 'newspaper',
    href: '/admin/reporter',
    accentKey: 'primary',
  },
  {
    label: 'Reklam onayı',
    hint: 'Yayın öncesi reklam incelemesi',
    key: 'pending_ads',
    icon: 'megaphone',
    href: '/admin/ads',
    accentKey: 'warning',
  },
  {
    label: 'İtiraz',
    hint: 'Moderasyon kararı itirazları',
    key: 'pending_appeals',
    icon: 'hand-left',
    href: '/admin/appeals',
    accentKey: 'danger',
  },
  ...(TIP_LINE_ENABLED
    ? [
        {
          label: 'Platform İhbar',
          hint: 'Anonim ihbarlar incelenmeli',
          key: 'pending_tips' as const,
          icon: 'eye-off' as const,
          href: '/admin/centers',
          accentKey: 'warning' as const,
        },
      ]
    : []),
  {
    label: 'VCTS itirazı',
    hint: 'Trafik ceza itirazları',
    key: 'disputed_vcts',
    icon: 'finger-print',
    href: '/admin/vcts',
    accentKey: 'danger',
  },
  {
    label: 'Haber doğrulama',
    hint: 'Doğrulama bekleyen haberler',
    key: 'pending_post_verifications',
    icon: 'shield',
    href: '/admin/news-verification',
    accentKey: 'primary',
  },
  {
    label: 'AI inceleme',
    hint: 'Yapay zeka moderasyon kuyruğu',
    key: 'ai_review_queue',
    icon: 'sparkles',
    href: '/admin/ai-moderation',
    accentKey: 'warning',
  },
  {
    label: 'Destek talebi',
    hint: 'Açık destek biletleri',
    key: 'pending_support_tickets',
    icon: 'chatbubbles',
    href: '/admin/support',
    accentKey: 'primary',
  },
];

const ACCENT_RANK: Record<AccentKey, number> = {
  danger: 0,
  warning: 1,
  primary: 2,
  accent: 3,
  success: 4,
};

export function sumModerationQueue(stats: AdminDashboardStats) {
  return PRIORITY_ACTIONS.reduce((sum, item) => sum + stats[item.key], 0);
}

export function getPendingActions(stats: AdminDashboardStats) {
  return PRIORITY_ACTIONS.filter((item) => stats[item.key] > 0).sort((a, b) => {
    const rankDiff = ACCENT_RANK[a.accentKey] - ACCENT_RANK[b.accentKey];
    if (rankDiff !== 0) return rankDiff;
    return stats[b.key] - stats[a.key];
  });
}

export function getFirstPendingActionHref(stats: AdminDashboardStats): string | null {
  return getPendingActions(stats)[0]?.href ?? null;
}

function resolveAccent(accentKey: AccentKey, colors: ReturnType<typeof useTheme>['colors']) {
  switch (accentKey) {
    case 'success':
      return colors.success;
    case 'accent':
      return colors.accent;
    case 'warning':
      return colors.warning;
    case 'danger':
      return colors.danger;
    default:
      return colors.primary;
  }
}

type Props = {
  stats: AdminDashboardStats;
};

export function AdminUrgentActionsPanel({ stats }: Props) {
  const { colors } = useTheme();
  const moderationTotal = sumModerationQueue(stats);

  const pendingActions = getPendingActions(stats);

  if (pendingActions.length === 0) {
    return (
      <GlassCard style={styles.clearCard}>
        <View style={[styles.clearIcon, { backgroundColor: `${colors.success}18` }]}>
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
        </View>
        <View style={styles.clearTexts}>
          <Text variant="label">Kuyruk temiz</Text>
          <Text secondary variant="caption">
            Bekleyen moderasyon işlemi yok — tüm kategoriler güncel.
          </Text>
        </View>
      </GlassCard>
    );
  }

  const hasCritical = pendingActions.some((item) => item.accentKey === 'danger');

  return (
    <GlassCard style={styles.panel} padded={false}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={[styles.headerIcon, { backgroundColor: `${colors.warning}18` }]}>
          <Ionicons name="flash" size={20} color={colors.warning} />
        </View>
        <View style={styles.headerTexts}>
          <Text variant="label" style={styles.headerTitle}>
            Acil işlemler
          </Text>
          <Text secondary variant="caption">
            {hasCritical ? 'Kritik öncelikli kuyruk' : 'Onay veya inceleme gereken'} ·{' '}
            {pendingActions.length} kategori
          </Text>
        </View>
        <View style={[styles.totalBadge, { backgroundColor: `${colors.warning}20`, borderColor: `${colors.warning}44` }]}>
          <Text variant="caption" style={{ color: colors.warning, fontWeight: '800' }}>
            {moderationTotal}
          </Text>
        </View>
      </View>

      <View style={styles.list}>
        {pendingActions.map((item, index) => {
          const accent = resolveAccent(item.accentKey, colors);
          const count = stats[item.key];
          const isLast = index === pendingActions.length - 1;

          return (
            <Pressable
              key={item.key}
              style={({ pressed }) => [styles.rowPressable, pressed && { backgroundColor: `${colors.primary}08` }]}
              onPress={() => router.push(item.href as never)}
            >
              <View style={[styles.row, !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <View style={[styles.rowIcon, { backgroundColor: `${accent}16`, borderColor: `${accent}30` }]}>
                  <Ionicons name={item.icon} size={18} color={accent} />
                </View>

                <View style={styles.rowTexts}>
                  <Text variant="label" style={styles.rowLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text secondary variant="caption" numberOfLines={1}>
                    {item.hint}
                  </Text>
                </View>

                <View style={[styles.countPill, { backgroundColor: `${accent}18` }]}>
                  <Text variant="caption" style={{ color: accent, fontWeight: '800' }}>
                    {count.toLocaleString('tr-TR')}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  panel: { overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: { flex: 1, minWidth: 0, gap: 2 },
  headerTitle: { fontWeight: '800', letterSpacing: -0.2 },
  totalBadge: {
    borderWidth: 1,
    borderRadius: radius.full,
    minWidth: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  list: {},
  rowPressable: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTexts: { flex: 1, minWidth: 0, gap: 1 },
  rowLabel: { fontWeight: '700' },
  countPill: {
    minWidth: 32,
    height: 26,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  clearCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  clearIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearTexts: { flex: 1, gap: 2 },
});
