import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { ADMIN_MENU_SECTIONS, type AdminMenuAccent } from '@/features/admin/constants';
import { filterAdminMenuSections } from '@/features/admin/services/adminMenuSearch';
import type { PermissionMap } from '@/features/admin/services/adminPermissions';
import type { AdminDashboardStats } from '@/features/admin/types';
import { TIP_LINE_ENABLED } from '@/features/tip-line/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import type { UserRole } from '@/types/database';

type Props = {
  isAdmin: boolean;
  permissions?: PermissionMap | null;
  role?: UserRole | null;
  query?: string;
  stats?: AdminDashboardStats | null;
};

const MENU_BADGE_KEYS: Partial<Record<string, keyof AdminDashboardStats>> = {
  reports: 'pending_reports',
  businesses: 'pending_verifications',
  'identity-verification': 'pending_identity_verifications',
  reporter: 'pending_reporter_apps',
  ads: 'pending_ads',
  appeals: 'pending_appeals',
  ...(TIP_LINE_ENABLED ? { centers: 'pending_tips' as const } : {}),
  vcts: 'disputed_vcts',
  'news-verification': 'pending_post_verifications',
  'ai-moderation': 'ai_review_queue',
  support: 'pending_support_tickets',
};

function resolveAccentColor(accent: AdminMenuAccent | undefined, colors: ReturnType<typeof useTheme>['colors']) {
  switch (accent) {
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'danger':
      return colors.danger;
    case 'accent':
      return colors.accent;
    default:
      return colors.primary;
  }
}

export function AdminMenuGrid({ isAdmin, permissions = null, role = null, query = '', stats = null }: Props) {
  const { colors } = useTheme();
  const sections = filterAdminMenuSections(query, isAdmin, permissions, role);
  const hasQuery = query.trim().length > 0;

  if (hasQuery && sections.length === 0) {
    return (
      <GlassCard style={styles.emptyCard}>
        <Ionicons name="search-outline" size={24} color={colors.textMuted} />
        <Text secondary variant="caption">
          Modül listesinde &quot;{query.trim()}&quot; için eşleşme yok.
        </Text>
      </GlassCard>
    );
  }

  return (
    <View style={styles.sections}>
      {sections.map((section) => {
        if (section.items.length === 0) return null;

        return (
          <GlassCard key={section.title} style={styles.sectionCard} padded={false}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Text variant="label" style={styles.sectionTitle}>
                {section.title}
              </Text>
              <Text secondary variant="caption">
                {section.items.length} modül
              </Text>
            </View>

            <View style={styles.launcherGrid}>
              {section.items.map((item) => {
                const accent = resolveAccentColor(item.accent, colors);
                const badgeKey = MENU_BADGE_KEYS[item.id];
                const badgeCount = badgeKey && stats ? stats[badgeKey] : 0;

                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [styles.launcherItem, pressed && styles.launcherPressed]}
                    onPress={() => router.push(item.href as never)}
                  >
                    <View style={styles.iconStack}>
                      <View style={[styles.iconCircle, { backgroundColor: `${accent}16`, borderColor: `${accent}30` }]}>
                        <Ionicons name={item.icon} size={20} color={accent} />
                      </View>
                      {badgeCount > 0 ? (
                        <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.surface }]}>
                          <Text variant="caption" style={styles.badgeText}>
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </Text>
                        </View>
                      ) : null}
                      {item.adminOnly ? (
                        <View style={[styles.adminDot, { backgroundColor: colors.warning }]} />
                      ) : null}
                    </View>
                    <Text variant="caption" numberOfLines={2} style={styles.launcherLabel}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sections: { gap: spacing.sm },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  sectionCard: { overflow: 'hidden' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: { fontWeight: '800', letterSpacing: -0.2 },
  launcherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  launcherItem: {
    width: '31%',
    flexGrow: 1,
    minWidth: '30%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
  },
  launcherPressed: { opacity: 0.75 },
  iconStack: {
    position: 'relative',
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  adminDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  launcherLabel: {
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 14,
    fontSize: 11,
  },
});
