import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { HEYET_ACCENT, HEYET_STATUS_LABELS, HEYET_SUBJECT_LABELS } from '@/features/heyet/constants';
import type { HeyetCase } from '@/features/heyet/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  heyetCase: HeyetCase;
};

export function HeyetChatBanner({ heyetCase }: Props) {
  const { colors } = useTheme();
  const isClosed = heyetCase.status === 'closed';
  const subjectLabel =
    heyetCase.subjectType === 'general'
      ? heyetCase.customTitle ?? HEYET_SUBJECT_LABELS.general
      : HEYET_SUBJECT_LABELS[heyetCase.subjectType];

  return (
    <View style={[styles.banner, { backgroundColor: `${HEYET_ACCENT}14`, borderColor: `${HEYET_ACCENT}33` }]}>
      <View style={styles.row}>
        <Ionicons name="shield-checkmark-outline" size={16} color={HEYET_ACCENT} />
        <Text variant="caption" style={[styles.title, { color: HEYET_ACCENT }]}>
          Heyet · {subjectLabel}
        </Text>
        <View style={[styles.badge, { backgroundColor: isClosed ? `${colors.danger}22` : `${colors.success}22` }]}>
          <Text
            variant="caption"
            style={{ color: isClosed ? colors.danger : colors.success, fontWeight: '700', fontSize: 10 }}
          >
            {HEYET_STATUS_LABELS[heyetCase.status]}
          </Text>
        </View>
      </View>
      <Text secondary variant="caption" style={styles.hint}>
        {isClosed
          ? heyetCase.decisionText
            ? 'Karar açıklandı. Sohbet kapalı — yalnızca admin mesaj gönderebilir.'
            : 'Sohbet kapalı. Admin yeniden açabilir.'
          : 'Her iki taraf sorun ve kanıtlarını burada paylaşabilir. Admin inceleme sonrası kararı burada açıklar.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    flex: 1,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  hint: {
    lineHeight: 16,
  },
});
