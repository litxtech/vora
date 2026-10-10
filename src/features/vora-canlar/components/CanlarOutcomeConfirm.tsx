import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { CANLAR_ACCENT } from '@/features/vora-canlar/constants';
import { listingOutcomeMeta, type ListingOutcome } from '@/features/vora-canlar/services/presentation';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type { ListingOutcome };

const COPY: Record<ListingOutcome, { body: string }> = {
  treating: {
    body: 'İlan “Tedavi oldu” olarak işaretlenecek. Bu seçim bir kez yapılır ve sonradan değiştirilemez. Açık bağış kapanır.',
  },
  recovered: {
    body: 'İlan “İyileşti” olarak işaretlenecek. Bu seçim bir kez yapılır ve sonradan değiştirilemez. Açık bağış kapanır.',
  },
  lost: {
    body: 'İlan “Maalesef öldü” olarak işaretlenecek. Bu seçim bir kez yapılır ve sonradan değiştirilemez. Açık bağış kapanır.',
  },
};

export function CanlarOutcomeConfirmCard({
  outcome,
  onCancel,
  onConfirm,
}: {
  outcome: ListingOutcome;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { colors } = useTheme();
  const copy = COPY[outcome];
  const meta = listingOutcomeMeta(outcome);
  const danger = outcome === 'lost';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={[styles.icon, { backgroundColor: danger ? '#8D6E6318' : `${CANLAR_ACCENT}16` }]}>
        <Ionicons name={meta.icon} size={26} color={danger ? '#8D6E63' : CANLAR_ACCENT} />
      </View>
      <Text style={styles.title}>{meta.label}</Text>
      <Text secondary style={styles.body}>{copy.body}</Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={[styles.action, { borderColor: colors.border }]}>
          <Text style={{ fontWeight: '700' }}>Vazgeç</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onConfirm}
          style={[styles.action, styles.confirm, { backgroundColor: danger ? '#8D6E63' : CANLAR_ACCENT }]}
        >
          <Text style={styles.confirmText}>Onayla</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function CanlarOutcomeConfirm({
  outcome,
  onCancel,
  onConfirm,
}: {
  outcome: ListingOutcome | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={outcome != null} transparent animationType={resolveModalAnimationType('fade')} onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable onPress={(event) => event.stopPropagation()}>
          {outcome ? <CanlarOutcomeConfirmCard outcome={outcome} onCancel={onCancel} onConfirm={onConfirm} /> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '800' },
  body: { lineHeight: 22 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  action: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirm: { borderWidth: 0 },
  confirmText: { color: '#fff', fontWeight: '800' },
});
