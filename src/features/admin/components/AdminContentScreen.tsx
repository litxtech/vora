import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import {
  AdminCommentContentCard,
  AdminPostContentCard,
  AdminReelContentCard,
} from '@/features/admin/components/content/AdminContentCard';
import { AdminContentPreviewSheet } from '@/features/admin/components/content/AdminContentPreviewSheet';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminStatCard } from '@/features/admin/components/shared/AdminStatCard';
import {
  fetchAdminComments,
  fetchAdminPosts,
  fetchAdminReels,
  moderateContent,
  updatePostStatus,
  updateReelStatus,
  type AdminCommentRow,
  type AdminContentStatusFilter,
  type AdminContentTab,
  type AdminPostRow,
  type AdminReelRow,
} from '@/features/admin/services/contentManagement';
import {
  ADMIN_CONTENT_STATUS_FILTERS,
  ADMIN_CONTENT_TABS,
  type AdminContentPreview,
} from '@/features/admin/services/contentPresentation';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

function InfoBanner() {
  const { colors } = useTheme();
  return (
    <GlassCard style={[styles.infoBanner, { borderColor: `${colors.accent}33` }]}>
      <View style={styles.infoRow}>
        <Ionicons name="document-text-outline" size={20} color={colors.accent} />
        <View style={styles.infoText}>
          <Text variant="label">İçerik moderasyonu</Text>
          <Text secondary variant="caption">
            Gönderi, reel ve yorumları önizleyin; durumlarını kontrol edin ve gerekirse gizleyin veya kaldırın.
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

export function AdminContentScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [tab, setTab] = useState<AdminContentTab>('posts');
  const [statusFilter, setStatusFilter] = useState<AdminContentStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [posts, setPosts] = useState<AdminPostRow[]>([]);
  const [reels, setReels] = useState<AdminReelRow[]>([]);
  const [comments, setComments] = useState<AdminCommentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<AdminContentPreview | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      if (tab === 'posts') {
        const { data, error: fetchError } = await fetchAdminPosts(50, statusFilter, search);
        setPosts(data);
        setError(fetchError);
      } else if (tab === 'reels') {
        const { data, error: fetchError } = await fetchAdminReels(50, statusFilter, search);
        setReels(data);
        setError(fetchError);
      } else {
        const { data, error: fetchError } = await fetchAdminComments(50, search);
        setComments(data);
        setError(fetchError);
      }

      setLoading(false);
      setRefreshing(false);
    },
    [tab, statusFilter, search],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const itemCount = tab === 'posts' ? posts.length : tab === 'reels' ? reels.length : comments.length;

  const summary = useMemo(() => {
    const source = tab === 'posts' ? posts : tab === 'reels' ? reels : [];
    if (tab === 'comments') {
      return { published: comments.length, hidden: 0, removed: 0 };
    }
    return {
      published: source.filter((item) => item.status === 'published').length,
      hidden: source.filter((item) => item.status === 'hidden').length,
      removed: source.filter((item) => item.status === 'removed').length,
    };
  }, [tab, posts, reels, comments]);

  const runModeration = (id: string, action: 'warn' | 'hide' | 'remove') => {
    if (!user) return;

    const labels = { warn: 'Uyarı gönder', hide: 'Gizle', remove: 'Kaldır' };
    Alert.alert('İçerik moderasyonu', `${labels[action]} işlemi uygulansın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Uygula',
        style: action === 'warn' ? 'default' : 'destructive',
        onPress: async () => {
          setBusyId(id);
          const targetType = tab === 'reels' ? 'reel' : tab === 'comments' ? 'comment' : 'post';
          if (tab === 'posts' && action !== 'warn') {
            await updatePostStatus(id, action === 'remove' ? 'removed' : 'hidden');
          } else if (tab === 'reels' && action !== 'warn') {
            await updateReelStatus(id, action === 'remove' ? 'removed' : 'hidden');
          }
          const { error: modError, warning } = await moderateContent(
            user.id,
            targetType,
            id,
            action,
            'Admin içerik yönetimi',
          );
          setBusyId(null);
          if (modError) Alert.alert('Hata', modError);
          else {
            setPreview(null);
            if (action === 'warn' && warning) {
              Alert.alert(
                'Uyarı gönderildi',
                `Kullanıcıya bildirim iletildi (${warning.strike}/${warning.max_strikes}).`,
              );
            }
            void load(true);
          }
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="İçerik Yönetimi"
      subtitle="Gönderi, reel ve yorum moderasyonu"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <InfoBanner />
      <AdminFilterChip options={ADMIN_CONTENT_TABS} value={tab} onChange={setTab} />

      {tab !== 'comments' ? (
        <AdminFilterChip options={ADMIN_CONTENT_STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
      ) : null}

      <AdminSearchInput
        value={search}
        onChangeText={setSearch}
        placeholder={
          tab === 'posts' ? 'Gönderi başlığı veya metin ara...' : tab === 'reels' ? 'Reel açıklaması ara...' : 'Yorum metni ara...'
        }
      />

      {loading ? (
        <AdminEmptyState loading />
      ) : error ? (
        <AdminEmptyState title="Veri yüklenemedi" message={error} icon="document-text-outline" />
      ) : itemCount === 0 ? (
        <AdminEmptyState
          title="İçerik yok"
          message="Seçili filtreye uygun içerik bulunamadı."
          icon="documents-outline"
        />
      ) : (
        <>
          {tab !== 'comments' ? (
            <View style={styles.summary}>
              <AdminStatCard label="Yayında" value={summary.published} icon="checkmark-circle" accent={colors.success} />
              <AdminStatCard label="Gizli" value={summary.hidden} icon="eye-off" accent={colors.warning} />
              <AdminStatCard label="Kaldırıldı" value={summary.removed} icon="trash" accent={colors.danger} />
            </View>
          ) : null}

          <AdminSectionHeader
            title={tab === 'posts' ? 'Gönderiler' : tab === 'reels' ? 'Reels' : 'Yorumlar'}
            hint={`${itemCount} kayıt`}
          />

          {tab === 'posts'
            ? posts.map((item) => (
                <AdminPostContentCard
                  key={item.id}
                  item={item}
                  busy={busyId === item.id}
                  onPreview={() => setPreview({ type: 'post', item })}
                  onWarn={() => runModeration(item.id, 'warn')}
                  onHide={() => runModeration(item.id, 'hide')}
                  onRemove={() => runModeration(item.id, 'remove')}
                />
              ))
            : null}

          {tab === 'reels'
            ? reels.map((item) => (
                <AdminReelContentCard
                  key={item.id}
                  item={item}
                  busy={busyId === item.id}
                  onPreview={() => setPreview({ type: 'reel', item })}
                  onWarn={() => runModeration(item.id, 'warn')}
                  onHide={() => runModeration(item.id, 'hide')}
                  onRemove={() => runModeration(item.id, 'remove')}
                />
              ))
            : null}

          {tab === 'comments'
            ? comments.map((item) => (
                <AdminCommentContentCard
                  key={item.id}
                  item={item}
                  busy={busyId === item.id}
                  onPreview={() => setPreview({ type: 'comment', item })}
                  onWarn={() => runModeration(item.id, 'warn')}
                />
              ))
            : null}
        </>
      )}

      <AdminContentPreviewSheet
        preview={preview}
        onClose={() => setPreview(null)}
        onWarn={(id) => runModeration(id, 'warn')}
        onHide={(id) => runModeration(id, 'hide')}
        onRemove={(id) => runModeration(id, 'remove')}
        busyId={busyId}
      />
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  infoBanner: { gap: spacing.sm },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, gap: 4 },
  summary: { gap: spacing.xs },
});
