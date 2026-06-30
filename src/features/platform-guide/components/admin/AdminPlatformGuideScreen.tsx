import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { PLATFORM_GUIDE_CATEGORY_META } from '@/features/platform-guide/constants';
import {
  deletePlatformGuide,
  fetchAdminPlatformGuides,
} from '@/features/platform-guide/services/platformGuideAdmin';
import type { PlatformGuideAdminRow } from '@/features/platform-guide/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

function GuideAdminRow({
  guide,
  onEdit,
  onDelete,
}: {
  guide: PlatformGuideAdminRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const meta = PLATFORM_GUIDE_CATEGORY_META[guide.category];

  return (
    <GlassCard style={styles.row}>
      <View style={styles.rowHeader}>
        <View style={[styles.iconWrap, { backgroundColor: `${meta.accent}22` }]}>
          <Ionicons
            name={(guide.icon as keyof typeof Ionicons.glyphMap) || meta.icon}
            size={20}
            color={meta.accent}
          />
        </View>
        <View style={styles.rowContent}>
          <Text variant="label">{guide.title}</Text>
          <Text secondary variant="caption" numberOfLines={2}>
            {guide.summary || 'Özet eklenmemiş'}
          </Text>
          <Text variant="caption" style={{ color: guide.isPublished ? colors.success : colors.warning }}>
            {guide.isPublished ? 'Yayında' : 'Taslak'} · {meta.label}
          </Text>
        </View>
      </View>
      <View style={styles.rowActions}>
        <AdminActionChip label="Düzenle" icon="create-outline" compact onPress={onEdit} />
        <AdminActionChip label="Sil" icon="trash-outline" tone="danger" compact onPress={onDelete} />
      </View>
    </GlassCard>
  );
}

export function AdminPlatformGuideScreen() {
  const [guides, setGuides] = useState<PlatformGuideAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const { data, error } = await fetchAdminPlatformGuides();
    if (error) Alert.alert('Hata', error);
    setGuides(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = (guide: PlatformGuideAdminRow) => {
    Alert.alert('Rehberi sil', `"${guide.title}" kalıcı olarak silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deletePlatformGuide(guide.id);
          if (error) Alert.alert('Hata', error);
          else void load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="Platform Rehberi"
      subtitle="Cüzdan, puan ve özellik tanıtımlarını yönetin"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <GlassCard style={styles.topActions}>
        <AdminSectionHeader
          title="Rehberler"
          hint="Bildirim gönderirken özet alanı push önizlemesi olarak kullanılır"
        />
        <AdminActionChip
          label="Yeni rehber"
          icon="add-outline"
          tone="primary"
          onPress={() => router.push('/admin/platform-guide/edit/new' as Href)}
        />
      </GlassCard>

      {loading && guides.length === 0 ? (
        <AdminEmptyState loading />
      ) : guides.length === 0 ? (
        <AdminEmptyState
          title="Henüz rehber yok"
          message="Kullanıcılara platformu tanıtmak için ilk rehberi oluşturun."
          icon="book-outline"
        />
      ) : (
        <View style={styles.list}>
          {guides.map((guide) => (
            <GuideAdminRow
              key={guide.id}
              guide={guide}
              onEdit={() => router.push(`/admin/platform-guide/edit/${guide.id}` as Href)}
              onDelete={() => handleDelete(guide)}
            />
          ))}
        </View>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  topActions: { gap: spacing.sm },
  list: { gap: spacing.sm },
  row: { gap: spacing.md },
  rowHeader: { flexDirection: 'row', gap: spacing.md },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1, gap: spacing.xs },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
