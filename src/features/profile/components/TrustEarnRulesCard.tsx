import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  TRUST_EARN_RULES,
  TRUST_LOSE_RULES,
  TRUST_NO_EARN_RULES,
  TRUST_REWARD_POOL_MIN,
  TRUST_VACATION_TEASER_MIN,
} from '@/features/profile/constants';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function TrustEarnRulesCard() {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Text variant="label" style={styles.title}>
        Puan nasıl kazanılır?
      </Text>
      {TRUST_EARN_RULES.map((rule) => (
        <View key={rule.label} style={styles.row}>
          <Ionicons name="add-circle-outline" size={16} color={colors.success} />
          <View style={styles.copy}>
            <Text variant="caption">{rule.label}</Text>
            <Text secondary variant="caption">
              {rule.points} · {rule.note}
            </Text>
          </View>
        </View>
      ))}

      <Text variant="label" style={[styles.title, { marginTop: spacing.sm }]}>
        Puan düşüren şeyler
      </Text>
      <Text secondary variant="caption" style={styles.disclaimer}>
        Şikayet bildirmek puan düşürmez. Aşağıdaki cezalar yalnızca moderasyon ekibi ihlali onayladığında
        uygulanır.
      </Text>
      {TRUST_LOSE_RULES.map((rule) => (
        <View key={rule.label} style={styles.row}>
          <Ionicons name="remove-circle-outline" size={16} color={colors.danger} />
          <View style={styles.copy}>
            <Text variant="caption">{rule.label}</Text>
            <Text secondary variant="caption">
              {rule.points} puan · {rule.note}
            </Text>
          </View>
        </View>
      ))}

      <Text variant="label" style={[styles.title, { marginTop: spacing.sm }]}>
        Puan verilmez
      </Text>
      {TRUST_NO_EARN_RULES.map((rule) => (
        <View key={rule} style={styles.row}>
          <Ionicons name="close-circle-outline" size={16} color={colors.textMuted} />
          <Text secondary variant="caption" style={styles.copy}>
            {rule}
          </Text>
        </View>
      ))}

      <View style={[styles.noteBox, { backgroundColor: `${colors.primary}12` }]}>
        <Ionicons name="gift-outline" size={16} color={colors.primary} />
        <Text secondary variant="caption" style={{ flex: 1 }}>
          {TRUST_VACATION_TEASER_MIN} puana ulaşınca tatil fırsatı hakkında bilgilendirilirsiniz.{' '}
          {TRUST_REWARD_POOL_MIN} puana ulaşanlar tatil havuzuna alınır; platform otomatik tarayıp uygun
          üyelere hediye eder.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  title: { marginBottom: spacing.xs },
  disclaimer: { marginBottom: spacing.xs, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  copy: { flex: 1, gap: 2 },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
});
