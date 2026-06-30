import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { MIN_HEYET_DECISION_LENGTH, HEYET_ACCENT } from '@/features/heyet/constants';
import { HeyetMembersSheet } from '@/features/heyet/components/HeyetMembersSheet';
import {
  adminCloseHeyet,
  adminPostHeyetDecision,
  adminReopenHeyet,
} from '@/features/heyet/services/heyetData';
import type { HeyetCase } from '@/features/heyet/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  heyetCase: HeyetCase;
  onChanged: () => void;
};

export function HeyetAdminBar({ heyetCase, onChanged }: Props) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [decisionVisible, setDecisionVisible] = useState(false);
  const [membersVisible, setMembersVisible] = useState(false);
  const [decisionText, setDecisionText] = useState(heyetCase.decisionText ?? '');
  const [closeAfterDecision, setCloseAfterDecision] = useState(true);

  const run = async (action: () => Promise<{ error: string | null }>) => {
    setLoading(true);
    const result = await action();
    setLoading(false);
    if (result.error) {
      Alert.alert('Hata', result.error);
      return;
    }
    onChanged();
  };

  const handleClose = () => {
    Alert.alert('Heyeti kapat', 'Taraflar mesaj gönderemez. Yeniden açabilirsiniz.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Kapat', style: 'destructive', onPress: () => void run(() => adminCloseHeyet(heyetCase.id)) },
    ]);
  };

  const handleReopen = () => {
    void run(() => adminReopenHeyet(heyetCase.id));
  };

  const handlePostDecision = async () => {
    const trimmed = decisionText.trim();
    if (trimmed.length < MIN_HEYET_DECISION_LENGTH) {
      Alert.alert('Karar metni', `En az ${MIN_HEYET_DECISION_LENGTH} karakter yazın.`);
      return;
    }
    setLoading(true);
    const { error } = await adminPostHeyetDecision(heyetCase.id, trimmed, closeAfterDecision);
    setLoading(false);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }
    setDecisionVisible(false);
    onChanged();
  };

  return (
    <>
      <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="construct-outline" size={14} color={HEYET_ACCENT} />
        <Text variant="caption" style={{ color: HEYET_ACCENT, fontWeight: '700' }}>
          Admin
        </Text>
        <View style={styles.actions}>
          <Pressable
            style={[styles.chip, { borderColor: `${HEYET_ACCENT}44` }]}
            onPress={() => setMembersVisible(true)}
            disabled={loading}
          >
            <Text variant="caption" style={{ color: HEYET_ACCENT, fontWeight: '600' }}>
              Üyeler
            </Text>
          </Pressable>
          <Pressable
            style={[styles.chip, { borderColor: `${HEYET_ACCENT}44` }]}
            onPress={() => setDecisionVisible(true)}
            disabled={loading}
          >
            <Text variant="caption" style={{ color: HEYET_ACCENT, fontWeight: '600' }}>
              Karar açıkla
            </Text>
          </Pressable>
          {heyetCase.status === 'open' ? (
            <Pressable
              style={[styles.chip, { borderColor: colors.border }]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text variant="caption" secondary>
                Kapat
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.chip, { borderColor: colors.border }]}
              onPress={handleReopen}
              disabled={loading}
            >
              <Text variant="caption" secondary>
                Yeniden aç
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <Modal visible={decisionVisible} transparent animationType="fade" onRequestClose={() => setDecisionVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setDecisionVisible(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <Text variant="label">Heyet kararı</Text>
            <Text secondary variant="caption" style={styles.sheetHint}>
              Karar her iki tarafa bu sohbette iletilecek.
            </Text>
            <Input
              label="Karar açıklaması"
              value={decisionText}
              onChangeText={setDecisionText}
              multiline
              placeholder="İnceleme sonucu, haklı bulunan taraf ve uygulanacak işlem…"
              style={{ minHeight: 120, textAlignVertical: 'top' }}
            />
            <Pressable
              style={styles.toggleRow}
              onPress={() => setCloseAfterDecision((value) => !value)}
            >
              <Ionicons
                name={closeAfterDecision ? 'checkbox' : 'square-outline'}
                size={20}
                color={HEYET_ACCENT}
              />
              <Text variant="caption">Karar sonrası sohbeti kapat</Text>
            </Pressable>
            <View style={styles.sheetActions}>
              <Button title="Vazgeç" variant="outline" onPress={() => setDecisionVisible(false)} fullWidth={false} />
              <Button title="Kararı yayınla" onPress={() => void handlePostDecision()} loading={loading} fullWidth={false} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <HeyetMembersSheet
        visible={membersVisible}
        heyetCase={heyetCase}
        onClose={() => setMembersVisible(false)}
        onChanged={onChanged}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sheetHint: {
    lineHeight: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
