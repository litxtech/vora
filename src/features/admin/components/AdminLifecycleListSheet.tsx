import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import {
  LIFECYCLE_REQUEST_TYPE_LABELS,
  LIFECYCLE_STAT_FILTER_LABELS,
  type LifecycleStatFilter,
} from '@/features/account-lifecycle/constants';
import {
  fetchAccountLifecycleRequests,
  fetchLifecycleAccountsByStat,
} from '@/features/account-lifecycle/services/adminLifecycle';
import type {
  AccountLifecycleAccountRow,
  AccountLifecycleRequestRow,
} from '@/features/account-lifecycle/types';
import { formatDeletedAccountDate } from '@/features/account-deletion/utils';
import { ACCOUNT_STATUS_LABELS } from '@/features/moderation/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AdminLifecycleListSheetProps = {
  visible: boolean;
  filter: LifecycleStatFilter | null;
  onClose: () => void;
};

export function AdminLifecycleListSheet({ visible, filter, onClose }: AdminLifecycleListSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [accounts, setAccounts] = useState<AccountLifecycleAccountRow[]>([]);
  const [requests, setRequests] = useState<AccountLifecycleRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRequestList = filter === 'pending_requests';
  const title = filter ? LIFECYCLE_STAT_FILTER_LABELS[filter] : '';

  const load = useCallback(async () => {
    if (!filter) return;

    setLoading(true);
    setError(null);

    if (filter === 'pending_requests') {
      const result = await fetchAccountLifecycleRequests('pending', 50);
      setRequests(result.data);
      setAccounts([]);
      setError(result.error);
    } else {
      const result = await fetchLifecycleAccountsByStat(filter, 50);
      setAccounts(result.data);
      setRequests([]);
      setError(result.error);
    }

    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (!visible || !filter) return;
    void load();
  }, [visible, filter, load]);

  useEffect(() => {
    if (!visible) return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => sub.remove();
  }, [visible, onClose]);

  const handleAccountPress = (userId: string) => {
    onClose();
    router.push(`/admin/users/${userId}`);
  };

  const renderAccount = ({ item }: { item: AccountLifecycleAccountRow }) => {
    const statusLabel = ACCOUNT_STATUS_LABELS[item.account_status] ?? item.account_status;
    const statusColor =
      item.account_status === 'active'
        ? colors.success
        : item.account_status === 'frozen'
          ? colors.primary
          : item.account_status === 'deletion_pending'
            ? colors.warning
            : item.account_status === 'deleted'
              ? colors.danger
              : colors.textMuted;

    return (
      <Pressable onPress={() => handleAccountPress(item.id)}>
        <GlassCard style={styles.row}>
          <View style={styles.rowTop}>
            <View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="person-outline" size={16} color={colors.primary} />
            </View>
            <View style={styles.rowCopy}>
              <Text variant="label">@{item.username}</Text>
              {item.full_name ? (
                <Text secondary variant="caption" numberOfLines={1}>
                  {item.full_name}
                </Text>
              ) : null}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}44` }]}>
              <Text variant="caption" style={{ color: statusColor, fontWeight: '700', fontSize: 11 }}>
                {statusLabel}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </View>
          <View style={styles.metaRow}>
            <Text variant="caption" muted>
              Açılış: {formatDeletedAccountDate(item.created_at)}
            </Text>
            {item.deleted_at ? (
              <Text variant="caption" muted>
                Silindi: {formatDeletedAccountDate(item.deleted_at)}
              </Text>
            ) : null}
          </View>
        </GlassCard>
      </Pressable>
    );
  };

  const renderRequest = ({ item }: { item: AccountLifecycleRequestRow }) => (
    <Pressable onPress={() => handleAccountPress(item.user_id)}>
      <GlassCard style={styles.row}>
        <View style={styles.rowTop}>
          <View style={[styles.avatar, { backgroundColor: `${colors.warning}18` }]}>
            <Ionicons name="mail-outline" size={16} color={colors.warning} />
          </View>
          <View style={styles.rowCopy}>
            <Text variant="label">@{item.username}</Text>
            <Text secondary variant="caption" numberOfLines={1}>
              {LIFECYCLE_REQUEST_TYPE_LABELS[item.request_type]}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        </View>
        <Text variant="caption" muted numberOfLines={2}>
          {item.message}
        </Text>
        <Text variant="caption" muted>
          {formatDeletedAccountDate(item.created_at)}
        </Text>
      </GlassCard>
    </Pressable>
  );

  if (!visible || !filter) return null;

  return (
    <Modal
      visible
      animationType={resolveModalAnimationType('slide')}
      presentationStyle="fullScreen"
      statusBarTranslucent={Platform.OS === 'android'}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View
          style={[
            styles.topBar,
            {
              paddingTop: insets.top + spacing.sm,
              borderBottomColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text variant="label">{title}</Text>
              {!loading ? (
                <Text variant="caption" muted>
                  {isRequestList ? requests.length : accounts.length} kayıt
                </Text>
              ) : null}
            </View>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={{ color: colors.danger }}>{error}</Text>
          </View>
        ) : isRequestList ? (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={renderRequest}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Ionicons name="folder-open-outline" size={40} color={colors.textMuted} />
                <Text secondary style={styles.emptyText}>
                  Bu filtreye uygun kayıt bulunamadı.
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={accounts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={renderAccount}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Ionicons name="folder-open-outline" size={40} color={colors.textMuted} />
                <Text secondary style={styles.emptyText}>
                  Bu filtreye uygun kayıt bulunamadı.
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  headerSpacer: {
    width: 36,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  row: {
    gap: spacing.xs,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingLeft: 32 + spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
  },
});
