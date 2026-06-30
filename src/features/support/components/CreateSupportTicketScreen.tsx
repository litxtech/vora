import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { rideRefundRequestPath } from '@/features/rides/constants';
import {
  formatSupportTicketCategory,
  MIN_SUPPORT_CATEGORY_LENGTH,
  MIN_SUPPORT_MESSAGE_LENGTH,
  MIN_SUPPORT_SUBJECT_LENGTH,
  SUPPORT_TICKET_CATEGORY_LABELS,
  SUPPORT_TICKET_SHORTCUTS,
} from '@/features/support/constants';
import { submitSupportTicket } from '@/features/support/services/supportTickets';
import type { SupportTicketCategory } from '@/features/support/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

function resolveInitialCategory(raw?: string): string {
  if (!raw) return '';
  if (raw in SUPPORT_TICKET_CATEGORY_LABELS) {
    return formatSupportTicketCategory(raw as SupportTicketCategory);
  }
  return raw;
}

export function CreateSupportTicketScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    category?: string;
    subject?: string;
    lifecycleRequestId?: string;
    preset?: string;
    tripId?: string;
    reservationId?: string;
  }>();
  const [category, setCategory] = useState(() => resolveInitialCategory(params.category));
  const [subject, setSubject] = useState(params.subject ?? '');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.preset !== 'ride_refund') return;
    router.replace(
      rideRefundRequestPath({
        tripId: params.tripId,
        reservationId: params.reservationId,
      }) as never,
    );
  }, [params.preset, params.reservationId, params.tripId]);

  const openShortcut = (href: string) => {
    router.push(href as never);
  };

  const canSubmit =
    category.trim().length >= MIN_SUPPORT_CATEGORY_LENGTH &&
    subject.trim().length >= MIN_SUPPORT_SUBJECT_LENGTH &&
    message.trim().length >= MIN_SUPPORT_MESSAGE_LENGTH &&
    !loading;

  const handleSubmit = () => {
    Alert.alert('Destek talebi gönder', 'Talebiniz destek ekibine iletilecek. Onaylıyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Gönder',
        onPress: async () => {
          setLoading(true);
          const { ticketId, error } = await submitSupportTicket(
            category,
            subject,
            message,
            params.lifecycleRequestId,
          );
          setLoading(false);

          if (error) {
            Alert.alert('Hata', error);
            return;
          }

          Alert.alert('Talep iletildi', 'Destek ekibi en kısa sürede inceleyecek.');
          if (ticketId) router.replace(`/support/${ticketId}` as never);
          else router.back();
        },
      },
    ]);
  };

  return (
    <GradientBackground>
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl * 2 },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={32}
        extraKeyboardSpace={24}
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader title="Destek Talebi" subtitle="Sorununuzu kısaca açıklayın" showBack />

        <GlassCard style={styles.card}>
          <Text variant="label">Hızlı konular</Text>
          {SUPPORT_TICKET_SHORTCUTS.map((shortcut) => (
            <Pressable
              key={shortcut.id}
              onPress={() => openShortcut(shortcut.href)}
              style={[styles.shortcutRow, { borderColor: colors.border, backgroundColor: `${colors.primary}06` }]}
            >
              <View style={[styles.shortcutIcon, { backgroundColor: `${colors.primary}14` }]}>
                <Ionicons name={shortcut.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.shortcutCopy}>
                <Text variant="label">{shortcut.label}</Text>
                <Text variant="caption" secondary>
                  {shortcut.hint}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </GlassCard>

        <GlassCard style={styles.card}>
          <Input
            label="Kategori"
            value={category}
            onChangeText={setCategory}
            placeholder="Örn. Hesap, ödeme, teknik sorun…"
          />
          <Input label="Konu" value={subject} onChangeText={setSubject} placeholder="Kısa bir başlık" />
          <Input
            label="Mesajınız"
            value={message}
            onChangeText={setMessage}
            placeholder="Sorununuzu detaylı açıklayın…"
            multiline
            numberOfLines={6}
            style={{ minHeight: 120, textAlignVertical: 'top' }}
          />
          <View style={[styles.hint, { backgroundColor: `${colors.primary}10`, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text variant="caption" secondary style={{ flex: 1 }}>
              Her durum değişikliğinde bildirim alırsınız: alındı, işlemde, çözüldü.
            </Text>
          </View>
          <Button title="Talebi Gönder" loading={loading} disabled={!canSubmit} onPress={handleSubmit} />
        </GlassCard>
      </KeyboardAwareScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    gap: spacing.md,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  shortcutIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
});
