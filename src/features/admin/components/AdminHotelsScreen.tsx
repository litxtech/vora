import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  adminDeleteHotelReview,
  adminModerateHotelListing,
  fetchAdminHotelListings,
  fetchAdminHotelReviews,
  type AdminHotelListingRow,
  type AdminHotelReviewRow,
} from '@/features/hotel-center/services/adminHotels';
import { spacing } from '@/constants/theme';

type Tab = 'listings' | 'reviews';

const TABS = [
  { id: 'listings' as const, label: 'İlanlar' },
  { id: 'reviews' as const, label: 'Yorumlar' },
];

const STATUS_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'published', label: 'Yayında' },
  { id: 'paused', label: 'Duraklatılmış' },
  { id: 'draft', label: 'Taslak' },
];

export function AdminHotelsScreen() {
  const [tab, setTab] = useState<Tab>('listings');
  const [statusFilter, setStatusFilter] = useState('all');
  const [listings, setListings] = useState<AdminHotelListingRow[]>([]);
  const [reviews, setReviews] = useState<AdminHotelReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    if (tab === 'listings') {
      setListings(await fetchAdminHotelListings(statusFilter));
    } else {
      setReviews(await fetchAdminHotelReviews());
    }

    setLoading(false);
    setRefreshing(false);
  }, [tab, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const moderate = (item: AdminHotelListingRow, action: 'pause' | 'publish' | 'feature' | 'unfeature') => {
    setActionId(item.id);
    void adminModerateHotelListing(item.id, action).then(({ error }) => {
      setActionId(null);
      if (error) Alert.alert('Hata', error);
      else void load(true);
    });
  };

  const deleteReview = (item: AdminHotelReviewRow) => {
    Alert.alert('Yorumu sil', `${item.hotel_name} — @${item.reviewer_username}`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          setActionId(item.id);
          const { error } = await adminDeleteHotelReview(item.id);
          setActionId(null);
          if (error) Alert.alert('Hata', error);
          else await load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="Otel İlanları"
      subtitle="Otel merkezi ilan moderasyonu ve yorum yönetimi"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <AdminFilterChip options={TABS} value={tab} onChange={setTab} />
      {tab === 'listings' ? (
        <AdminFilterChip options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />
      ) : null}

      {loading ? (
        <AdminEmptyState loading />
      ) : tab === 'listings' ? (
        listings.length === 0 ? (
          <AdminEmptyState title="İlan yok" message="Filtreye uygun otel ilanı bulunamadı." icon="bed-outline" />
        ) : (
          listings.map((item) => (
            <GlassCard key={item.id} style={styles.card}>
              <Text variant="label">{item.name}</Text>
              <Text variant="caption" muted>
                @{item.owner_username} · {item.region_id} · {item.status}
                {item.is_featured ? ' · Öne çıkan' : ''}
              </Text>
              <Text variant="caption" secondary>
                {item.price_per_night} ₺/gece · ★ {item.avg_rating} ({item.review_count}) · {item.view_count} görüntülenme
              </Text>
              <View style={styles.actions}>
                <AdminActionChip
                  label="Sahip"
                  icon="person-outline"
                  onPress={() => router.push(`/admin/users/${item.owner_id}` as Href)}
                />
                {item.status === 'published' ? (
                  <AdminActionChip
                    label="Duraklat"
                    icon="pause-outline"
                    tone="warning"
                    onPress={() => moderate(item, 'pause')}
                  />
                ) : (
                  <AdminActionChip
                    label="Yayınla"
                    icon="checkmark-circle-outline"
                    tone="success"
                    onPress={() => moderate(item, 'publish')}
                  />
                )}
                <AdminActionChip
                  label={item.is_featured ? 'Öne çıkarmayı kaldır' : 'Öne çıkar'}
                  icon="star-outline"
                  onPress={() => moderate(item, item.is_featured ? 'unfeature' : 'feature')}
                />
              </View>
            </GlassCard>
          ))
        )
      ) : reviews.length === 0 ? (
        <AdminEmptyState title="Yorum yok" message="Otel yorumu bulunamadı." icon="chatbubble-outline" />
      ) : (
        reviews.map((item) => (
          <GlassCard key={item.id} style={styles.card}>
            <Text variant="label">{item.hotel_name}</Text>
            <Text variant="caption" muted>
              @{item.reviewer_username} · ★ {item.rating}
            </Text>
            {item.comment ? (
              <Text variant="body" secondary>
                {item.comment}
              </Text>
            ) : null}
            <View style={styles.actions}>
              <AdminActionChip
                label={actionId === item.id ? '...' : 'Sil'}
                icon="trash-outline"
                tone="danger"
                onPress={() => deleteReview(item)}
              />
            </View>
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
});
