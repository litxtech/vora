import { memo, useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { DISCOVERY_USER_SEARCH_MIN_LENGTH, DISCOVERY_USER_SUGGESTIONS_LIMIT } from '@/features/discovery/constants';
import type { DiscoveryUserResult } from '@/features/discovery/types';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { radius, spacing } from '@/constants/theme';
import { getAndroidFlatListPerfProps, getImageTargetWidth, isAndroid } from '@/lib/device/androidPerfProfile';
import { useTheme } from '@/providers/ThemeProvider';

type DiscoveryUserSearchResultsProps = {
  query: string;
  results?: DiscoveryUserResult[];
  loading: boolean;
  error: string | null;
  requiresAuth: boolean;
  suggestions?: DiscoveryUserResult[];
  suggestionsLoading?: boolean;
};

type UserRowProps = {
  user: DiscoveryUserResult;
  rank?: number;
};

const UserResultRow = memo(function UserResultRow({ user, rank }: UserRowProps) {
  const { colors } = useTheme();
  const displayName = user.fullName ?? user.username;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.rowCard,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
      onPress={() => router.push(`/u/${user.username}` as never)}
    >
      {rank != null ? (
        <View style={[styles.rankBadge, { backgroundColor: `${colors.primary}18` }]}>
          <Text variant="caption" style={{ color: colors.primary, fontWeight: '800', fontSize: 11 }}>
            {rank}
          </Text>
        </View>
      ) : null}

      <ProfileAvatar
        username={user.username}
        avatarUrl={user.avatarUrl}
        size={48}
        isVerified={user.isVerified}
        isBusinessVerified={user.isBusinessVerified}
        imageFit={user.isBusinessVerified ? 'contain' : 'cover'}
      />

      <View style={styles.meta}>
        <View style={styles.nameRow}>
          <Text variant="label" numberOfLines={1} style={styles.name}>
            {displayName}
          </Text>
          {user.isBusinessVerified ? (
            <View style={[styles.typePill, { backgroundColor: `${colors.warning}22` }]}>
              <Ionicons name="storefront" size={10} color={colors.warning} />
              <Text variant="caption" style={{ color: colors.warning, fontWeight: '700', fontSize: 10 }}>
                İşletme
              </Text>
            </View>
          ) : null}
        </View>
        <Text secondary variant="caption" numberOfLines={1}>
          @{user.username}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
});

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();

  return (
    <GlassCard style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}14` }]}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text variant="label">{title}</Text>
      {subtitle ? (
        <Text secondary variant="caption" style={styles.emptySubtitle}>
          {subtitle}
        </Text>
      ) : null}
    </GlassCard>
  );
}

function ListSectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionTitleRow}>
        <View style={[styles.sectionAccent, { backgroundColor: colors.primary }]} />
        <View style={styles.sectionCopy}>
          <Text variant="label">{title}</Text>
          {subtitle ? (
            <Text variant="caption" secondary>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function DiscoveryUserSearchResults({
  query,
  results = [],
  loading,
  error,
  requiresAuth,
  suggestions = [],
  suggestionsLoading = false,
}: DiscoveryUserSearchResultsProps) {
  const { colors } = useTheme();
  const trimmed = query.trim();
  const isSearching = trimmed.length >= DISCOVERY_USER_SEARCH_MIN_LENGTH;
  const showSuggestions = !isSearching && !suggestionsLoading && suggestions.length > 0;
  const showResults = isSearching && !loading && !error && results.length > 0;
  const listData = showResults ? results : showSuggestions ? suggestions : [];

  const listHeader = showSuggestions ? (
    <ListSectionHeader
      title="Önerilen hesaplar"
      subtitle={`Bölgenizde en popüler ${DISCOVERY_USER_SUGGESTIONS_LIMIT} hesap`}
    />
  ) : showResults ? (
    <ListSectionHeader title="Arama sonuçları" subtitle={`${results.length} kullanıcı bulundu`} />
  ) : null;

  const emptyComponent = (() => {
    if (requiresAuth) {
      return (
        <EmptyState
          icon="person-outline"
          title="Giriş yapın"
          subtitle="Kullanıcı aramak ve önerilen hesapları görmek için oturum açın."
        />
      );
    }

    if (isSearching && loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text secondary variant="caption">
            Aranıyor…
          </Text>
        </View>
      );
    }

    if (!isSearching && suggestionsLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text secondary variant="caption">
            Öneriler yükleniyor…
          </Text>
        </View>
      );
    }

    if (isSearching && error) {
      return <EmptyState icon="alert-circle-outline" title="Arama başarısız" subtitle={error} />;
    }

    if (isSearching && results.length === 0) {
      return (
        <EmptyState
          icon="person-outline"
          title="Kullanıcı bulunamadı"
          subtitle="Farklı bir isim, e-posta veya kullanıcı adı deneyin."
        />
      );
    }

    if (!isSearching && suggestions.length === 0) {
      return (
        <EmptyState
          icon="search-outline"
          title="Kullanıcı ara"
          subtitle={`İsim, e-posta veya kullanıcı adı ile arayın. En az ${DISCOVERY_USER_SEARCH_MIN_LENGTH} karakter yazın.`}
        />
      );
    }

    return null;
  })();

  const keyExtractor = useCallback((item: DiscoveryUserResult) => item.id, []);

  const renderItem = useCallback(
    ({ item, index }: { item: DiscoveryUserResult; index: number }) => (
      <UserResultRow user={item} rank={showSuggestions ? index + 1 : undefined} />
    ),
    [showSuggestions],
  );

  const ItemSeparator = useCallback(() => <View style={styles.separator} />, []);

  const listProps = {
    style: styles.list,
    data: listData,
    keyExtractor,
    renderItem,
    ListHeaderComponent: listHeader,
    ListEmptyComponent: emptyComponent,
    ItemSeparatorComponent: ItemSeparator,
    contentContainerStyle: styles.listContent,
    keyboardShouldPersistTaps: 'handled' as const,
    keyboardDismissMode: 'on-drag' as const,
    showsVerticalScrollIndicator: false,
    ...getAndroidFlatListPerfProps(),
  };

  return isAndroid() ? (
    <FlashList {...listProps} drawDistance={getImageTargetWidth('avatar') * 4} />
  ) : (
    <FlatList {...listProps} />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  separator: {
    height: spacing.sm,
  },
  sectionHead: {
    marginBottom: spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionAccent: {
    width: 3,
    height: 28,
    borderRadius: radius.full,
  },
  sectionCopy: {
    flex: 1,
    gap: 2,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  rankBadge: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    paddingVertical: 4,
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 0,
  },
  name: {
    flexShrink: 1,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  center: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  empty: {
    marginTop: spacing.md,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 18,
  },
});
