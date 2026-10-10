import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { CANLAR_ACCENT, formatMinor } from '@/features/vora-canlar/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function CanlarRaisedBar({ amountMinor }: { amountMinor: number }) {
  const { colors } = useTheme();
  const hasMoney = amountMinor > 0;
  return (
    <View style={[styles.raised, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.raisedRow}>
        <View style={styles.raisedIcon}>
          <Ionicons name="heart" size={16} color="#fff" />
        </View>
        <View style={styles.raisedCopy}>
          <Text secondary variant="caption">Toplanan bağış</Text>
          <Text style={styles.amount} numberOfLines={1}>
            {formatMinor(amountMinor, 'try')}
          </Text>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: `${CANLAR_ACCENT}22` }]}>
        <View style={[styles.fill, { flex: hasMoney ? 3 : 0 }]} />
        <View style={{ flex: hasMoney ? 1 : 1 }} />
      </View>
      <Text secondary variant="caption">
        {hasMoney ? 'Gelen bağış bu ilanda görünür.' : 'Henüz bağış yok.'}
      </Text>
    </View>
  );
}

export function CanlarSupportBar({
  campaignId,
  wide = false,
}: {
  campaignId?: string | null;
  caseId?: string | null;
  includeDonate?: boolean;
  wide?: boolean;
}) {
  if (!campaignId) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Bağış yap"
      onPress={() => router.push(`/vora-canlar/donate/${campaignId}` as never)}
      style={wide ? styles.wide : styles.chip}
    >
      <Ionicons name="heart" size={16} color="#fff" />
      <Text style={styles.label}>{wide ? 'Bağış yap' : 'Bağış'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  raised: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    gap: 10,
  },
  raisedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  raisedIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CANLAR_ACCENT,
  },
  raisedCopy: { flex: 1, minWidth: 0, gap: 2 },
  amount: { fontSize: 20, lineHeight: 26, fontWeight: '800' },
  track: { height: 10, borderRadius: radius.full, overflow: 'hidden', flexDirection: 'row' },
  fill: { height: '100%', borderRadius: radius.full, backgroundColor: CANLAR_ACCENT },
  chip: {
    alignSelf: 'flex-start',
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CANLAR_ACCENT,
  },
  wide: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: CANLAR_ACCENT,
  },
  label: { color: '#fff', fontWeight: '800' },
});
