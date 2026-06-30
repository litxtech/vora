import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { LiveSupportChatPanel } from '@/features/live-support/components/LiveSupportChatPanel';
import { RideRefundReservationPicker } from '@/features/rides/components/RideRefundReservationPicker';
import { RideRefundSummarySection } from '@/features/rides/components/RideRefundSummarySection';
import { myReservationsPath, RIDES_ACCENT } from '@/features/rides/constants';
import { fetchPassengerReservations } from '@/features/rides/services/reservationData';
import {
  buildRideRefundLiveDraft,
  buildRideRefundTicketBody,
  fetchRideRefundContext,
  type RideRefundContext,
} from '@/features/rides/services/refundContextData';
import type { RideReservation } from '@/features/rides/types';
import { normalizeRouteParam } from '@/features/rides/utils/routeParams';
import { MIN_SUPPORT_MESSAGE_LENGTH, MIN_SUPPORT_SUBJECT_LENGTH } from '@/features/support/constants';
import { submitSupportTicket } from '@/features/support/services/supportTickets';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type RefundTab = 'chat' | 'form';

const REFUND_SUPPORT_PAYMENT_STATUSES = new Set([
  'held',
  'released',
  'refund_pending',
  'refunded',
  'card_saved',
  'charge_pending',
]);

function pickDefaultReservation(
  reservations: RideReservation[],
  reservationId?: string,
  tripId?: string,
): RideReservation | null {
  if (reservationId) {
    return reservations.find((row) => row.id === reservationId) ?? null;
  }
  if (tripId) {
    return reservations.find((row) => row.tripId === tripId) ?? null;
  }
  return reservations[0] ?? null;
}

export function RideRefundRequestScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tripId?: string | string[]; reservationId?: string | string[] }>();
  const routeReservationId = normalizeRouteParam(params.reservationId);
  const routeTripId = normalizeRouteParam(params.tripId);

  const [tab, setTab] = useState<RefundTab>('chat');
  const [reservations, setReservations] = useState<RideReservation[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(routeReservationId ?? null);
  const [context, setContext] = useState<RideRefundContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [subject, setSubject] = useState('Yolculuk iade talebi');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadReservations = useCallback(async () => {
    if (!user?.id) {
      setReservations([]);
      setReservationsLoading(false);
      return;
    }

    setReservationsLoading(true);
    const rows = await fetchPassengerReservations(user.id);
    const eligible = rows.filter((row) => REFUND_SUPPORT_PAYMENT_STATUSES.has(row.paymentStatus));
    setReservations(eligible.length > 0 ? eligible : rows);
    setReservationsLoading(false);

    setSelectedReservationId((current) => {
      if (current && (eligible.length > 0 ? eligible : rows).some((row) => row.id === current)) {
        return current;
      }
      const fallback = pickDefaultReservation(
        eligible.length > 0 ? eligible : rows,
        routeReservationId,
        routeTripId,
      );
      return fallback?.id ?? null;
    });
  }, [routeReservationId, routeTripId, user?.id]);

  useEffect(() => {
    void loadReservations();
  }, [loadReservations]);

  const loadContext = useCallback(async () => {
    if (!user?.id || !selectedReservationId) {
      setContext(null);
      setContextLoading(false);
      return;
    }

    const selected = reservations.find((row) => row.id === selectedReservationId);
    setContextLoading(true);
    const next = await fetchRideRefundContext({
      userId: user.id,
      reservationId: selectedReservationId,
      tripId: selected?.tripId ?? routeTripId,
    });
    setContext(next);
    setContextLoading(false);
  }, [reservations, routeTripId, selectedReservationId, user?.id]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const handleSelectReservation = useCallback((reservation: RideReservation) => {
    setSelectedReservationId(reservation.id);
    setSummaryExpanded(false);
  }, []);

  const liveDraft = useMemo(
    () => (context ? buildRideRefundLiveDraft(context) : undefined),
    [context],
  );

  const canSubmit =
    subject.trim().length >= MIN_SUPPORT_SUBJECT_LENGTH &&
    message.trim().length >= MIN_SUPPORT_MESSAGE_LENGTH &&
    !loading;

  const handleSubmit = () => {
    if (!context) {
      Alert.alert('Rezervasyon gerekli', 'İade talebi için bir rezervasyon seçmelisiniz.');
      return;
    }

    const body = buildRideRefundTicketBody(context, message);

    Alert.alert('İade talebi gönder', 'Talebiniz destek ekibine iletilecek. Onaylıyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Gönder',
        onPress: async () => {
          setLoading(true);
          const { ticketId, error } = await submitSupportTicket('Ödeme / Bakiye', subject.trim(), body);
          setLoading(false);

          if (error) {
            Alert.alert('Hata', error);
            return;
          }

          Alert.alert(
            'Talep iletildi',
            'İade talebiniz incelenecek. Onay sonrası ödemeniz 3–7 iş günü içinde kartınıza yansıyabilir; süre bankanıza göre değişir.',
          );
          if (ticketId) router.replace(`/support/${ticketId}` as never);
          else router.back();
        },
      },
    ]);
  };

  const chatPanelKey = context?.reservation.id ?? selectedReservationId ?? 'none';

  return (
    <View style={[styles.page, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ScreenBackButton />
        <View style={styles.headerCopy}>
          <Text variant="label" style={styles.headerTitle}>
            Yolculuk iade & destek
          </Text>
          <Text variant="caption" secondary numberOfLines={1}>
            Canlı sohbet veya resmi iade talebi
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <RideRefundReservationPicker
        reservations={reservations}
        selectedId={selectedReservationId}
        loading={reservationsLoading}
        onSelect={handleSelectReservation}
      />

      {!reservationsLoading && reservations.length === 0 ? (
        <View style={styles.emptyActions}>
          <Button
            title="Rezervasyonlarım"
            variant="outline"
            onPress={() => router.push(myReservationsPath() as never)}
            fullWidth={false}
          />
        </View>
      ) : null}

      {contextLoading ? (
        <View style={[styles.contextLoading, { borderBottomColor: colors.border }]}>
          <Text secondary variant="caption">
            Seçilen rezervasyon yükleniyor…
          </Text>
        </View>
      ) : context ? (
        <RideRefundSummarySection
          context={context}
          expanded={summaryExpanded}
          onToggle={() => setSummaryExpanded((value) => !value)}
        />
      ) : selectedReservationId && !contextLoading ? (
        <View style={[styles.contextLoading, { borderBottomColor: colors.border }]}>
          <Text secondary variant="caption">
            Rezervasyon detayı yüklenemedi. Başka bir rezervasyon seçin.
          </Text>
        </View>
      ) : null}

      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {(
          [
            { id: 'chat' as const, label: 'Canlı destek', icon: 'chatbubbles-outline' as const },
            { id: 'form' as const, label: 'Resmi talep', icon: 'document-text-outline' as const },
          ] as const
        ).map((item) => {
          const active = tab === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setTab(item.id)}
              style={[
                styles.tab,
                active && { backgroundColor: `${RIDES_ACCENT}18`, borderColor: `${RIDES_ACCENT}44` },
              ]}
            >
              <Ionicons name={item.icon} size={14} color={active ? RIDES_ACCENT : colors.textMuted} />
              <Text
                variant="caption"
                style={{
                  color: active ? RIDES_ACCENT : colors.textMuted,
                  fontWeight: active ? '700' : '500',
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'chat' ? (
        <View style={styles.chatPane}>
          <LiveSupportChatPanel
            key={chatPanelKey}
            embedded
            initialTopic="billing"
            suggestedDraft={liveDraft}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.formScroll}
          contentContainerStyle={[styles.formContent, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          <GlassCard style={styles.formCard}>
            <Text secondary variant="caption" style={styles.formNote}>
              Resmi iade talebi destek ekibine kayıt olarak iletilir. Hızlı yanıt için «Canlı destek»
              sekmesini kullanabilirsiniz.
            </Text>
            <Input label="Konu" value={subject} onChangeText={setSubject} />
            <Input
              label="Açıklama"
              value={message}
              onChangeText={setMessage}
              multiline
              placeholder="İade talebinizin nedenini, yaşanan sorunu ve varsa kanıtları yazın…"
              style={{ minHeight: 120, textAlignVertical: 'top' }}
            />
            <Button
              title="İade talebini gönder"
              onPress={handleSubmit}
              loading={loading}
              disabled={!canSubmit || !context}
            />
          </GlassCard>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontSize: 16,
  },
  headerSpacer: {
    width: 40,
  },
  emptyActions: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  contextLoading: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    padding: 3,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chatPane: {
    flex: 1,
    minHeight: 0,
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: spacing.md,
  },
  formCard: {
    gap: spacing.md,
  },
  formNote: {
    lineHeight: 18,
  },
});
