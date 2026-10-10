import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Text } from '@/components/ui/Text';
import { CanlarOutcomeConfirmCard, type ListingOutcome } from '@/features/vora-canlar/components/CanlarOutcomeConfirm';
import { CANLAR_ACCENT } from '@/features/vora-canlar/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Outcome = ListingOutcome;

export function CanlarListingMenu({
  canManage,
  outcome,
  onEdit,
  onOutcome,
  onDelete,
}: {
  canManage: boolean;
  outcome?: Outcome | null;
  onEdit: () => void;
  onOutcome: (outcome: Outcome) => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Outcome | null>(null);
  if (!canManage) return null;

  const close = () => {
    setPending(null);
    setOpen(false);
  };
  const run = (action: () => void) => {
    close();
    action();
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="İlan menüsü"
        hitSlop={8}
        onPress={() => setOpen(true)}
        style={styles.trigger}
      >
        <Ionicons name="ellipsis-vertical" size={18} color={colors.text} />
      </Pressable>
      <Modal visible={open} transparent animationType={resolveModalAnimationType('fade')} onRequestClose={close}>
        <Pressable style={styles.overlay} onPress={close}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(event) => event.stopPropagation()}>
            {pending ? (
              <CanlarOutcomeConfirmCard
                outcome={pending}
                onCancel={() => setPending(null)}
                onConfirm={() => {
                  const next = pending;
                  close();
                  onOutcome(next);
                }}
              />
            ) : (
            <>
            <Text style={styles.title}>İlan</Text>
            <Row icon="create-outline" label="Gönderi düzenle" onPress={() => run(onEdit)} />
            {!outcome ? (
              <>
                <Row icon="medkit-outline" label="Tedavi oldu" onPress={() => setPending('treating')} />
                <Row icon="happy-outline" label="İyileşti" onPress={() => setPending('recovered')} />
                <Row icon="heart-dislike-outline" label="Maalesef öldü" onPress={() => setPending('lost')} />
                <Text secondary variant="caption">Durum bir kez seçilir ve değiştirilemez.</Text>
              </>
            ) : null}
            <Row
              icon="trash-outline"
              label="Paylaşımı sil"
              danger
              onPress={() => {
                close();
                Alert.alert('İlanı sil', 'Paylaşım listeden kalkar. Yapılmış bağış kaydı silinmez.', [
                  { text: 'Vazgeç', style: 'cancel' },
                  { text: 'Sil', style: 'destructive', onPress: onDelete },
                ]);
              }}
            />
            <Row icon="close" label="Vazgeç" onPress={close} />
            </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function Row({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  const color = danger ? colors.danger : colors.text;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <Ionicons name={icon} size={18} color={danger ? colors.danger : CANLAR_ACCENT} />
      <Text style={{ color, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    gap: 4,
  },
  title: { fontSize: 16, fontWeight: '800', marginBottom: spacing.sm },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
  },
});
