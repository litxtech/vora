import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type ListRenderItem,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type CenterTab = { id: string; label: string; icon: string };

type CenterShellBaseProps = {
  title: string;
  subtitle: string;
  tabs?: CenterTab[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onCreate?: () => void;
  createLabel?: string;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  emptyMessage?: string;
  hasContent?: boolean;
  children: ReactNode;
  headerExtra?: ReactNode;
  /** Form ekranlarında açıklama gibi alt alanların klavye altında kalmaması için */
  keyboardAware?: boolean;
  keyboardBottomOffset?: number;
  /** Sanallaştırılmış liste boşken gösterilecek özel içerik (varsayılan boş kart yerine). */
  listEmptyContent?: ReactNode;
};

type CenterShellListProps<T> = {
  listData: readonly T[];
  renderListItem: ListRenderItem<T>;
  listKeyExtractor: (item: T, index: number) => string;
};

type CenterShellProps<T = unknown> = CenterShellBaseProps &
  (CenterShellListProps<T> | { listData?: never; renderListItem?: never; listKeyExtractor?: never });

function isVirtualizedList<T>(
  props: CenterShellProps<T>,
): props is CenterShellBaseProps & CenterShellListProps<T> {
  return props.listData !== undefined && props.renderListItem !== undefined;
}

export function CenterShell<T = unknown>(props: CenterShellProps<T>) {
  const {
    title,
    subtitle,
    tabs,
    activeTab,
    onTabChange,
    loading = false,
    error,
    onRefresh,
    onCreate,
    createLabel = 'Oluştur',
    emptyIcon = 'folder-open-outline',
    emptyMessage = 'Henüz içerik yok.',
    hasContent = false,
    children,
    headerExtra,
    keyboardAware = false,
    keyboardBottomOffset = 24,
    listEmptyContent,
  } = props;

  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isEmpty = !loading && !error && !hasContent;
  const virtualized = isVirtualizedList(props);

  const renderStatusBody = () => {
    if (loading && isEmpty) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      );
    }
    if (error) {
      return (
        <GlassCard style={styles.empty}>
          <Text secondary>{error}</Text>
          {onRefresh ? <Button title="Yenile" variant="outline" onPress={onRefresh} /> : null}
        </GlassCard>
      );
    }
    if (listEmptyContent) {
      return listEmptyContent;
    }
    if (isEmpty) {
      return (
        <GlassCard style={styles.empty}>
          <Ionicons name={emptyIcon} size={32} color={colors.textMuted} />
          <Text secondary>{emptyMessage}</Text>
          {onCreate ? <Button title={createLabel} onPress={onCreate} /> : null}
        </GlassCard>
      );
    }
    return null;
  };

  const renderBody = () => {
    const status = renderStatusBody();
    if (status) return status;
    return children;
  };

  const pageStyle = [
    styles.page,
    { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
  ];

  const refreshControl = onRefresh ? (
    <AppRefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.primary} />
  ) : undefined;

  const header = (
    <>
      <AuthHeader title={title} subtitle={subtitle} />
      {headerExtra}
      {tabs && tabs.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
          {tabs.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => onTabChange?.(t.id)}
              style={[
                styles.tab,
                {
                  borderColor: activeTab === t.id ? colors.primary : colors.border,
                  backgroundColor:
                    activeTab === t.id ? 'rgba(30,136,229,0.12)' : colors.surface,
                },
              ]}
            >
              <Ionicons
                name={t.icon as keyof typeof Ionicons.glyphMap}
                size={16}
                color={activeTab === t.id ? colors.primary : colors.textMuted}
              />
              <Text
                variant="caption"
                style={{ color: activeTab === t.id ? colors.primary : colors.textSecondary }}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {onCreate && !isEmpty ? (
        <Button title={createLabel} onPress={onCreate} style={styles.createBtn} />
      ) : null}
    </>
  );

  if (keyboardAware) {
    return (
      <GradientBackground>
        <KeyboardAwareScrollView
          contentContainerStyle={pageStyle}
          keyboardShouldPersistTaps="handled"
          bottomOffset={keyboardBottomOffset}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
        >
          {header}
          <View style={styles.content}>{renderBody()}</View>
        </KeyboardAwareScrollView>
      </GradientBackground>
    );
  }

  if (virtualized) {
    const { listData, renderListItem, listKeyExtractor } = props;
    const showList = !error && !(loading && isEmpty);

    const renderListEmpty = () => {
      const status = renderStatusBody();
      if (status) return <View style={styles.content}>{status}</View>;
      if (listEmptyContent) return <View style={styles.content}>{listEmptyContent}</View>;
      return null;
    };

    return (
      <GradientBackground>
        <FlatList
          data={showList ? [...listData] : []}
          keyExtractor={listKeyExtractor}
          renderItem={renderListItem}
          refreshControl={refreshControl}
          contentContainerStyle={pageStyle}
          ListHeaderComponent={header}
          ListEmptyComponent={renderListEmpty}
          initialNumToRender={8}
          windowSize={9}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
        />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <FlatList
        data={[{ key: 'content' }]}
        keyExtractor={(item) => item.key}
        refreshControl={refreshControl}
        contentContainerStyle={pageStyle}
        ListHeaderComponent={header}
        renderItem={() => <View style={styles.content}>{renderBody()}</View>}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing.lg, gap: spacing.md },
  tabBar: { marginVertical: spacing.sm },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  createBtn: { marginBottom: spacing.sm },
  content: { gap: spacing.md },
  center: { paddingVertical: spacing.xxl, alignItems: 'center' },
  empty: { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
});
