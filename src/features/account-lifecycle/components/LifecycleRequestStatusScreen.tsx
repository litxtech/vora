import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import {
  LIFECYCLE_REQUEST_STATUS_LABELS,
  LIFECYCLE_REQUEST_TYPE_LABELS,
} from '@/features/account-lifecycle/constants';
import { formatDeletedAccountDate } from '@/features/account-deletion/utils';
import { markNotificationClicked } from '@/features/notifications/services/notificationData';
import { supabase } from '@/lib/supabase/client';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type LifecycleRequestDetail = {
  id: string;
  request_type: string;
  message: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
};

const STATUS_STEPS = ['pending', 'in_progress', 'approved', 'rejected', 'closed'] as const;

async function fetchLifecycleRequest(id: string): Promise<LifecycleRequestDetail | null> {
  const { data, error } = await supabase
    .from('account_lifecycle_requests')
    .select('id, request_type, message, status, admin_note, created_at, resolved_at')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return data as LifecycleRequestDetail;
}

export function LifecycleRequestStatusScreen() {
  const { colors } = useTheme();
  const { id, notificationId } = useLocalSearchParams<{ id: string; notificationId?: string }>();
  const [request, setRequest] = useState<LifecycleRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setRequest(await fetchLifecycleRequest(id));
    if (notificationId) {
      await markNotificationClicked(notificationId);
    }
    setLoading(false);
  }, [id, notificationId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !request) {
    return (
      <GradientBackground>
        <View style={styles.centered}>
          <Text secondary>{loading ? 'Yükleniyor…' : 'Talep bulunamadı'}</Text>
        </View>
      </GradientBackground>
    );
  }

  const currentStepIndex = STATUS_STEPS.indexOf(request.status as (typeof STATUS_STEPS)[number]);
  const statusLabel = LIFECYCLE_REQUEST_STATUS_LABELS[request.status] ?? request.status;
  const typeLabel =
    LIFECYCLE_REQUEST_TYPE_LABELS[request.request_type as keyof typeof LIFECYCLE_REQUEST_TYPE_LABELS] ??
    request.request_type;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <AuthHeader title="Hesap Talebi" subtitle={statusLabel} showBack />

        <GlassCard style={styles.card}>
          <View style={[styles.statusBanner, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}33` }]}>
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            <Text variant="label" style={{ color: colors.primary }}>
              {statusLabel}
            </Text>
          </View>
          <View style={styles.timeline}>
            {STATUS_STEPS.map((step, index) => {
              const done = currentStepIndex >= 0 && index <= currentStepIndex;
              return (
                <View key={step} style={styles.timelineStep}>
                  <View style={[styles.dot, { backgroundColor: done ? colors.primary : colors.border }]} />
                  <Text variant="caption" style={{ color: done ? colors.text : colors.textMuted }}>
                    {LIFECYCLE_REQUEST_STATUS_LABELS[step] ?? step}
                  </Text>
                </View>
              );
            })}
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text variant="label">{typeLabel}</Text>
          <Text variant="caption" secondary>
            Gönderildi: {formatDeletedAccountDate(request.created_at)}
          </Text>
          <View style={[styles.messageBox, { backgroundColor: `${colors.primary}08`, borderColor: colors.border }]}>
            <Text variant="body">{request.message}</Text>
          </View>
          {request.admin_note ? (
            <View style={[styles.adminNote, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}33` }]}>
              <Text variant="caption" style={{ color: colors.success, fontWeight: '700' }}>
                Yönetim yanıtı
              </Text>
              <Text variant="body">{request.admin_note}</Text>
            </View>
          ) : null}
          {request.resolved_at ? (
            <Text variant="caption" muted>
              Sonuç: {formatDeletedAccountDate(request.resolved_at)}
            </Text>
          ) : null}
        </GlassCard>

        <Button
          title="Destek Merkezi"
          variant="outline"
          onPress={() =>
            router.push({
              pathname: '/support/create',
              params: { category: 'account', subject: typeLabel, lifecycleRequestId: request.id },
            } as never)
          }
        />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
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
