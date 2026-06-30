import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import {
  LOBBY_FEEDBACK_MAX_MESSAGE_LENGTH,
  LOBBY_FEEDBACK_MAX_NAME_LENGTH,
  LOBBY_FEEDBACK_MIN_MESSAGE_LENGTH,
  LOBBY_FEEDBACK_MIN_NAME_LENGTH,
} from '@/features/auth/constants/lobbyFeedback';
import { submitLobbyDeveloperFeedback } from '@/features/auth/services/lobbyDeveloperFeedback';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type LobbyDeveloperFeedbackSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function LobbyDeveloperFeedbackSheet({ visible, onClose }: LobbyDeveloperFeedbackSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    fullName.trim().length >= LOBBY_FEEDBACK_MIN_NAME_LENGTH &&
    message.trim().length >= LOBBY_FEEDBACK_MIN_MESSAGE_LENGTH &&
    !submitting;

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setEmail('');
    setMessage('');
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    const result = await submitLobbyDeveloperFeedback({
      fullName,
      message,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
    });
    setSubmitting(false);

    if (result.error) {
      Alert.alert('Gönderilemedi', result.error);
      return;
    }

    resetForm();
    onClose();
    Alert.alert(
      'Teşekkürler',
      'Öneriniz veya geri bildiriminiz alındı. Geliştirme ekibi inceleyecektir.',
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={resolveModalAnimationType('slide')}
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
    >
      <View style={[styles.root, { backgroundColor: colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} accessibilityLabel="Kapat" />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                paddingBottom: insets.bottom + spacing.md,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}>
              <Text variant="label">Geliştiriciye öneri / destek</Text>
              <Pressable onPress={handleClose} hitSlop={8} accessibilityLabel="Kapat">
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <Text secondary variant="caption" style={styles.subtitle}>
              Öneri, hata bildirimi veya şikayetinizi iletebilirsiniz. İletişim alanları isteğe bağlıdır.
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.form}
            >
              <Input
                label="Ad Soyad"
                value={fullName}
                onChangeText={(text) => setFullName(text.slice(0, LOBBY_FEEDBACK_MAX_NAME_LENGTH))}
                placeholder="Adınız ve soyadınız"
                autoCapitalize="words"
              />
              <Input
                label="Telefon (isteğe bağlı)"
                value={phone}
                onChangeText={setPhone}
                placeholder="05xx xxx xx xx"
                keyboardType="phone-pad"
                autoComplete="tel"
              />
              <Input
                label="E-posta (isteğe bağlı)"
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@mail.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <View style={styles.messageField}>
                <Text variant="caption" secondary style={styles.messageLabel}>
                  Mesajınız
                </Text>
                <TextInput
                  value={message}
                  onChangeText={(text) => setMessage(text.slice(0, LOBBY_FEEDBACK_MAX_MESSAGE_LENGTH))}
                  placeholder="Önerinizi veya şikayetinizi yazın..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  style={[
                    styles.messageInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                />
                <Text secondary variant="caption" style={styles.counter}>
                  {message.trim().length}/{LOBBY_FEEDBACK_MAX_MESSAGE_LENGTH} · en az{' '}
                  {LOBBY_FEEDBACK_MIN_MESSAGE_LENGTH} karakter
                </Text>
              </View>
            </ScrollView>

            <Button title="Gönder" onPress={handleSubmit} loading={submitting} disabled={!canSubmit} />
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardWrap: {
    maxHeight: '88%',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    maxHeight: '100%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtitle: {
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  form: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  messageField: {
    gap: spacing.xs,
  },
  messageLabel: {
    marginLeft: spacing.xs,
  },
  messageInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: 15,
    lineHeight: 22,
  },
  counter: {
    textAlign: 'right',
  },
});
