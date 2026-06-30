import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import {
  formatSupportTicketCategory,
  SUPPORT_TICKET_STATUS_LABELS,
} from '@/features/support/constants';
import { fetchSupportTicket } from '@/features/support/services/supportTickets';
import type { SupportTicketRow } from '@/features/support/types';
import { formatDeletedAccountDate } from '@/features/account-deletion/utils';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const STATUS_STEPS = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'] as const;

export function SupportTicketDetailScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ticket, setTicket] = useState<SupportTicketRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setTicket(await fetchSupportTicket(id));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !ticket) {
    return (
      <GradientBackground>
        <View style={styles.centered}>
          <Text secondary>{loading ? 'Yükleniyor…' : 'Talep bulunamadı'}</Text>
        </View>
      </GradientBackground>
    );
  }

  const currentStepIndex = STATUS_STEPS.indexOf(ticket.status);

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader title="Destek Talebi" subtitle={SUPPORT_TICKET_STATUS_LABELS[ticket.status]} showBack />

        <GlassCard style={styles.card}>
          <View style={[styles.statusBanner, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}33` }]}>
            <Ionicons name="sync-outline" size={18} color={colors.primary} />
            <Text variant="label" style={{ color: colors.primary }}>
              {SUPPORT_TICKET_STATUS_LABELS[ticket.status]}
            </Text>
          </View>

          <View style={styles.timeline}>
            {STATUS_STEPS.map((step, index) => {
              const done = index <= currentStepIndex;
              const active = index === currentStepIndex;
              return (
                <View key={step} style={styles.timelineStep}>
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: done ? colors.primary : colors.border,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  />
                  <Text variant="caption" style={{ color: done ? colors.text : colors.textMuted }}>
                    {SUPPORT_TICKET_STATUS_LABELS[step]}
                  </Text>
                </View>
              );
            })}
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text variant="label">{ticket.subject}</Text>
          <Text variant="caption" secondary>
            {formatSupportTicketCategory(ticket.category)} · {formatDeletedAccountDate(ticket.created_at)}
          </Text>
          <View style={[styles.messageBox, { backgroundColor: `${colors.primary}08`, borderColor: colors.border }]}>
            <Text variant="body">{ticket.message}</Text>
          </View>
          {ticket.admin_note ? (
            <View style={[styles.adminNote, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}33` }]}>
              <Text variant="caption" style={{ color: colors.success, fontWeight: '700' }}>
                Destek yanıtı
              </Text>
              <Text variant="body">{ticket.admin_note}</Text>
            </View>
          ) : null}
          {ticket.resolved_at ? (
            <Text variant="caption" muted>
              Sonuçlandırma: {formatDeletedAccountDate(ticket.resolved_at)}
            </Text>
          ) : null}
        </GlassCard>

        {ticket.status === 'closed' || ticket.status === 'resolved' ? (
          <Button
            title="Yeni Destek Talebi"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/support/create',
                params: { category: ticket.category, subject: ticket.subject },
              } as never)
            }
          />
        ) : (
          <Button
            title="Ek Bilgi Gönder"
            variant="outline"
            onPress={() =>
              router.push({
                pathname: '/support/create',
                params: {
                  category: ticket.category,
                  subject: `${ticket.subject} (ek bilgi)`,
                  lifecycleRequestId: ticket.lifecycle_request_id ?? undefined,
                },
              } as never)
            }
          />
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    gap: spacing.md,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  timeline: {
    gap: spacing.xs,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  messageBox: {
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  adminNote: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
});
