import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import {
  sendSignupVerification,
  verifyEmailOtp,
  type EmailOtpType,
} from '@/features/auth/services/emailVerification';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type EmailVerificationSheetProps = {
  visible: boolean;
  email: string;
  otpType: EmailOtpType;
  onVerified: () => void;
  onClose: () => void;
  onResend?: () => Promise<{ error: string | null }>;
};

export function EmailVerificationSheet({
  visible,
  email,
  otpType,
  onVerified,
  onClose,
  onResend,
}: EmailVerificationSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCode('');
      setError(null);
    }
  }, [visible]);

  const handleVerify = async () => {
    setLoading(true);
    setError(null);

    const { error: verifyError } = await verifyEmailOtp(email, code, otpType);

    setLoading(false);

    if (verifyError) {
      setError('Doğrulama kodu geçersiz veya süresi dolmuş.');
      return;
    }

    onVerified();
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError(null);

    const result = onResend
      ? await onResend()
      : otpType === 'signup'
        ? await sendSignupVerification(email)
        : { error: null };

    setResendLoading(false);

    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <Modal visible={visible} animationType={resolveModalAnimationType('slide')} transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                paddingBottom: Math.max(insets.bottom, spacing.lg),
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.header}>
              <Text variant="h3">E-posta Doğrulama</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text secondary style={styles.subtitle}>
              {email} adresine gönderilen 6 haneli kodu girin.
            </Text>

            <Input
              label="Doğrulama Kodu"
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus={visible}
            />

            {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

            <Button title="Onayla" loading={loading} onPress={handleVerify} />

            <Pressable onPress={handleResend} disabled={resendLoading} style={styles.resend}>
              <Text variant="caption" style={{ color: colors.primary }}>
                {resendLoading ? 'Kod gönderiliyor...' : 'Kodu tekrar gönder'}
              </Text>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  keyboardWrap: {
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtitle: {
    marginBottom: spacing.xs,
  },
  resend: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});
