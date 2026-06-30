import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type LostTipSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (message: string, contact: string) => void;
  loading?: boolean;
};

export function LostTipSheet({ visible, onClose, onSubmit, loading }: LostTipSheetProps) {
  const { colors } = useTheme();
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');

  const handleSubmit = () => {
    if (!message.trim()) return;
    onSubmit(message.trim(), contact.trim());
    setMessage('');
    setContact('');
  };

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text variant="h3">İpucu gönder</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <Input
            label="Mesajınız"
            value={message}
            onChangeText={setMessage}
            placeholder="Gördüğünüz yer, zaman veya bilgi..."
            multiline
            numberOfLines={4}
            style={styles.input}
          />
          <Input
            label="İletişim (opsiyonel)"
            value={contact}
            onChangeText={setContact}
            placeholder="Telefon"
          />
          <Button title="Gönder" loading={loading} onPress={handleSubmit} disabled={!message.trim()} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    padding: spacing.lg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
