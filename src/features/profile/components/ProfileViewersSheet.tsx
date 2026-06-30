import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { ProfileEmptyState } from '@/features/profile/components/shared/ProfileEmptyState';
import { formatFeedTime } from '@/features/feed/utils';
import { PREMIUM_FEATURES } from '@/features/profile/services/premiumService';
import { hasPremiumEntitlement } from '@/features/profile/services/premiumAccess';
import { fetchRecentProfileViewers } from '@/features/profile/services/profileViews';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ProfileViewer = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  viewedAt: string;
};

type ProfileViewersSheetProps = {
  profileId: string;
  isPremium?: boolean;
  visible: boolean;
  onClose: () => void;
};

const VIEWER_FEATURE = PREMIUM_FEATURES.find((f) => f.icon === 'eye-outline');

export function ProfileViewersSheet({ profileId, isPremium = false, visible, onClose }: ProfileViewersSheetProps) {
  const { colors, isDark } = useTheme();
  const unlocked = hasPremiumEntitlement(isPremium);
  const [viewers, setViewers] = useState<ProfileViewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const list = await fetchRecentProfileViewers(profileId, 30);
    setViewers(list);
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    if (unlocked) void load();
    else setLoading(false);
  }, [visible, profileId, unlocked, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return viewers;
    return viewers.filter(
      (v) =>
        v.username.toLowerCase().includes(q) ||
        (v.fullName?.toLowerCase().includes(q) ?? false),
    );
  }, [viewers, query]);

  const openProfile = (viewerId: string) => {
    onClose();
    router.push(`/user/${viewerId}` as never);
  };

  const renderViewer = ({ item }: { item: ProfileViewer }) => (
    <Pressable
      onPress={() => openProfile(item.id)}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <GlassCard style={styles.viewerCard} padded={false}>
        <View style={styles.viewerRow}>
          <ProfileAvatar username={item.username} avatarUrl={item.avatarUrl} size={48} />
          <View style={styles.viewerMeta}>
            <Text variant="label" numberOfLines={1}>
              {item.fullName ?? item.username}
            </Text>
            <Text secondary variant="caption" numberOfLines={1}>
              @{item.username}
            </Text>
          </View>
          <View style={styles.timeWrap}>
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
              {formatFeedTime(item.viewedAt)}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );

  const premiumGate = (
    <View style={styles.premiumGate}>
      <LinearGradient
        colors={['rgba(255,179,0,0.28)', 'rgba(255,143,0,0.08)']}
        style={styles.premiumHero}
      >
        <View style={styles.premiumIconWrap}>
          <LinearGradient colors={['#FFB300', '#FF8F00']} style={styles.premiumIcon}>
            <Ionicons name="eye" size={26} color="#fff" />
          </LinearGradient>
        </View>
        <Text variant="h3" style={styles.premiumTitle}>
          Kimler baktı?
        </Text>
        <Text secondary variant="caption" style={styles.premiumSubtitle}>
          {VIEWER_FEATURE?.text ?? 'Profilinizi kimlerin görüntülediğini görün.'}
        </Text>
      </LinearGradient>

      <GlassCard style={styles.featureCard}>
        <View style={styles.featureRow}>
          <View style={[styles.featureIcon, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="eye-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.featureText}>
            <Text variant="label">Son ziyaretçiler listesi</Text>
            <Text secondary variant="caption">
              {VIEWER_FEATURE?.usageHint ?? 'Profil ziyaretçileri bölümünde listelenir'}
            </Text>
          </View>
        </View>
        <View style={[styles.featureDivider, { backgroundColor: colors.border }]} />
        <View style={styles.featureRow}>
          <View style={[styles.featureIcon, { backgroundColor: 'rgba(255,179,0,0.18)' }]}>
            <Ionicons name="diamond-outline" size={18} color="#FFB300" />
          </View>
          <View style={styles.featureText}>
            <Text variant="label">Premium avantajları</Text>
            <Text secondary variant="caption">
              İstatistikler, öne çıkarma ve altın çerçeve dahil
            </Text>
          </View>
        </View>
      </GlassCard>

      <Button
        title="Premium'a Geç"
        onPress={() => {
          onClose();
          router.push('/settings/premium' as never);
        }}
      />
    </View>
  );

  const listHeader = unlocked ? (
    <View style={styles.listHeader}>
      <View style={[styles.statPill, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}33` }]}>
        <Text variant="label" style={{ color: colors.primary, fontSize: 18 }}>
          {viewers.length}
        </Text>
        <Text variant="caption" style={{ color: colors.primary, fontSize: 10 }}>
          son ziyaretçi
        </Text>
      </View>

      <View style={[styles.searchRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Ziyaretçi ara…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  ) : null;

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <LinearGradient
              colors={[`${colors.primary}33`, `${colors.primary}08`]}
              style={styles.headerIcon}
            >
              <Ionicons name="eye-outline" size={22} color={colors.primary} />
            </LinearGradient>
            <View style={styles.headerText}>
              <Text variant="h3">Son Ziyaretçiler</Text>
              <Text variant="caption" secondary>
                {unlocked
                  ? loading
                    ? 'Yükleniyor…'
                    : viewers.length > 0
                      ? `${viewers.length} kişi profilinizi görüntüledi`
                      : 'Henüz kayıtlı ziyaretçi yok'
                  : 'Premium ile açılır'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {!unlocked ? (
            premiumGate
          ) : loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text secondary variant="caption">
                Ziyaretçiler yükleniyor…
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => `${item.id}-${item.viewedAt}`}
              renderItem={renderViewer}
              ListHeaderComponent={listHeader}
              ListEmptyComponent={
                <ProfileEmptyState
                  title={query ? 'Sonuç yok' : 'Henüz ziyaretçi yok'}
                  message={
                    query
                      ? 'Aramanızla eşleşen ziyaretçi bulunamadı.'
                      : 'Profilinizi görüntüleyen kullanıcılar burada listelenir.'
                  }
                  icon={query ? 'search-outline' : 'eye-outline'}
                />
              }
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '82%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.35)',
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  listHeader: {
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  statPill: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  viewerCard: {
    marginBottom: 0,
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  viewerMeta: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  timeWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  premiumGate: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  premiumHero: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  premiumIconWrap: {
    marginBottom: spacing.xs,
  },
  premiumIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTitle: {
    textAlign: 'center',
  },
  premiumSubtitle: {
    textAlign: 'center',
    maxWidth: 280,
  },
  featureCard: {
    gap: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  featureDivider: {
    height: StyleSheet.hairlineWidth,
  },
});
