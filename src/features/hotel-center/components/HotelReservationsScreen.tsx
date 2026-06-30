import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { HotelReservationCard } from '@/features/hotel-center/components/HotelReservationCard';
import { HOTEL_ACCENT } from '@/features/hotel-center/constants';
import {
  fetchGuestReservations,
  fetchOwnerReservations,
  listPendingOwnerReceipts,
  markOwnerReceiptShared,
  markReservationCompleted,
} from '@/features/hotel-center/services/hotelReservations';
import { exportHotelReservationReceiptPdf } from '@/features/hotel-center/services/reservationReceiptExport';
import type { HotelReservation } from '@/features/hotel-center/types';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { getAndroidFlatListPerfProps } from '@/lib/device/androidPerfProfile';

type Segment = 'guest' | 'owner';

export function HotelReservationsScreen() {
  const { segment: segmentParam } = useLocalSearchParams<{ segment?: string | string[] }>();
  const initialSegment: Segment =
    (Array.isArray(segmentParam) ? segmentParam[0] : segmentParam) === 'owner' ? 'owner' : 'guest';

  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [segment, setSegment] = useState<Segment>(initialSegment);
  const [reservations, setReservations] = useState<HotelReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingReceiptId, setSharingReceiptId] = useState<string | null>(null);
  const autoReceiptHandled = useRef(false);
  const listPerf = getAndroidFlatListPerfProps();

  useEffect(() => {
    setSegment(initialSegment);
    autoReceiptHandled.current = false;
  }, [initialSegment]);

  const deliverOwnerReceipts = useCallback(async (items: HotelReservation[], autoOnly: boolean) => {
    const pending = await listPendingOwnerReceipts(items);
    if (!pending.length) return;

    const targets = autoOnly ? pending.slice(0, 1) : pending;
    if (autoOnly && autoReceiptHandled.current) return;

    for (const reservation of targets) {
      setSharingReceiptId(reservation.id);
      const result = await exportHotelReservationReceiptPdf(reservation, 'owner');
      setSharingReceiptId(null);
      if (!result.error) {
        await markOwnerReceiptShared(reservation.id);
      }
    }

    if (autoOnly) autoReceiptHandled.current = true;
  }, []);

  const load = useCallback(async () => {
    if (!user?.id) {
      setReservations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = segment === 'guest'
      ? await fetchGuestReservations(user.id)
      : await fetchOwnerReservations(user.id);
    setReservations(data);
    setLoading(false);

    if (segment === 'owner') {
      void deliverOwnerReceipts(data, true);
    }
  }, [user?.id, segment, deliverOwnerReceipts]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleShareReceipt = async (reservation: HotelReservation) => {
    setSharingReceiptId(reservation.id);
    const result = await exportHotelReservationReceiptPdf(reservation, 'owner');
    setSharingReceiptId(null);
    if (result.error) Alert.alert('Rezervasyon özeti', result.error);
    else await markOwnerReceiptShared(reservation.id);
  };

  const handleComplete = async (reservation: HotelReservation) => {
    if (!user?.id) return;
    Alert.alert(
      'Konaklama tamamlandı',
      `${reservation.reservationCode} rezervasyonunu tamamlandı olarak işaretlemek istiyor musunuz? Boş oda sayısı güncellenir.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Tamamla',
          onPress: async () => {
            const result = await markReservationCompleted(reservation.id, user.id);
            if (result.error) Alert.alert('Hata', result.error);
            else void load();
          },
        },
      ],
    );
  };

  return (
    <GradientBackground>
      <View style={[styles.page, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.topBar}>
          <ScreenBackButton onPress={() => router.back()} />
          <Text variant="h3" style={styles.title}>
            Rezervasyonlarım
          </Text>
          <View style={styles.topSpacer} />
        </View>

        <View style={styles.segmentRow}>
          {(['guest', 'owner'] as Segment[]).map((key) => {
            const active = segment === key;
            return (
              <Pressable
                key={key}
                onPress={() => setSegment(key)}
                style={[
                  styles.segment,
                  {
                    backgroundColor: active ? `${HOTEL_ACCENT}18` : colors.surface,
                    borderColor: active ? HOTEL_ACCENT : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={key === 'guest' ? 'airplane-outline' : 'business-outline'}
                  size={14}
                  color={active ? HOTEL_ACCENT : colors.textMuted}
                />
                <Text variant="caption" style={{ color: active ? HOTEL_ACCENT : colors.textMuted, fontWeight: '600' }}>
                  {key === 'guest' ? 'Konaklamalarım' : 'Gelen Rezervasyonlar'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {segment === 'owner' ? (
          <Text secondary variant="caption" style={styles.ownerHint}>
            Yeni rezervasyonlarda özet otomatik paylaşım ekranı açılır; ayrıca her rezervasyondan tekrar paylaşabilirsiniz.
          </Text>
        ) : null}

        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + spacing.xl },
            reservations.length === 0 && styles.emptyList,
          ]}
          refreshControl={<AppRefreshControl refreshing={loading} onRefresh={() => void load()} />}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
                <Text secondary variant="body">
                  {segment === 'guest'
                    ? 'Henüz rezervasyonunuz yok.'
                    : 'Otelinize gelen rezervasyon bulunmuyor.'}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <HotelReservationCard
              reservation={item}
              role={segment}
              onComplete={segment === 'owner' ? () => void handleComplete(item) : undefined}
              onShareReceipt={
                segment === 'owner' && item.ownerReceiptSentAt
                  ? () => void handleShareReceipt(item)
                  : undefined
              }
              sharingReceipt={sharingReceiptId === item.id}
            />
          )}
          {...listPerf}
        />
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: spacing.lg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: { flex: 1, textAlign: 'center', fontWeight: '800' },
  topSpacer: { width: 40 },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  ownerHint: { marginBottom: spacing.md },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
  },
  list: { gap: spacing.md },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
});
