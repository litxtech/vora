import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { HEYET_ACCENT } from '@/features/heyet/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { formatMessageTime } from '@/features/messaging/utils';

type Props = {
  decisionText: string;
  createdAt?: string;
  closedAfter?: boolean;
  senderName?: string | null;
};

export function ChatHeyetDecisionCard({ decisionText, createdAt, closedAfter, senderName }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[`${HEYET_ACCENT}22`, `${HEYET_ACCENT}08`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: `${HEYET_ACCENT}44` }]}
      >
        <View style={styles.header}>
          <View style={[styles.seal, { backgroundColor: `${HEYET_ACCENT}20` }]}>
            <Ionicons name="shield-checkmark" size={22} color={HEYET_ACCENT} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={[styles.badge, { color: HEYET_ACCENT }]}>RESMİ HEYET KARARI</Text>
            <Text variant="caption" secondary>
              Vora Heyet · {closedAfter === false ? 'Oturum açık' : 'Oturum sonlandırıldı'}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: `${HEYET_ACCENT}22` }]} />

        <Text style={[styles.decision, { color: colors.text }]}>{decisionText}</Text>

        <View style={styles.footer}>
          {senderName ? (
            <Text variant="caption" secondary>
              Kararı veren: {senderName}
            </Text>
          ) : null}
          {createdAt ? (
            <Text variant="caption" muted>
              {formatMessageTime(createdAt)}
            </Text>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  seal: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  decision: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
});
