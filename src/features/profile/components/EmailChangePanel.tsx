import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmailVerificationSheet } from '@/components/auth/EmailVerificationSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { normalizeEmailInput, validateEmail } from '@/features/auth/services/validation';
import { convertGuestEmail, completeGuestEmailConversion, isGuestEmail } from '@/features/auth/services/guestAccount';
import {
  requestEmailChange,
  sendCurrentEmailVerificationCode,
  verifyCurrentEmailCode,
  verifyNewEmailCode,
  type EmailChangeStep,
} from '@/features/profile/services/emailChange';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type EmailChangePanelProps = {
  currentEmail: string;
  isGuest: boolean;
  onEmailChanged: () => void;
};

export function EmailChangePanel({ currentEmail, isGuest, onEmailChanged }: EmailChangePanelProps) {
  const { colors } = useTheme();
  const [step, setStep] = useState<EmailChangeStep>('idle');
  const [currentCodeSent, setCurrentCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newEmailCode, setNewEmailCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [guestSheetVisible, setGuestSheetVisible] = useState(false);

  const isAutoGuestEmail = isGuest && isGuestEmail(currentEmail);

  const reset = () => {
    setStep('idle');
    setCurrentCodeSent(false);
    setCode('');
    setNewEmail('');
    setNewEmailCode('');
    setError(null);
    setGuestSheetVisible(false);
  };

  const handleSendCurrentCode = async () => {
    setLoading(true);
    setError(null);
    const { error: sendError } = await sendCurrentEmailVerificationCode();
    setLoading(false);
    if (sendError) {
      setError(sendError);
      return;
    }
    setCurrentCodeSent(true);
    setStep('verify-current');
  };

  const handleVerifyCurrent = async () => {
    setLoading(true);
    setError(null);
    const { error: verifyError } = await verifyCurrentEmailCode(currentEmail, code);
    setLoading(false);
    if (verifyError) {
      setError('Doğrulama kodu geçersiz veya süresi dolmuş.');
      return;
    }
    setStep('new-email');
  };

  const handleRequestNewEmail = async () => {
    const normalizedEmail = normalizeEmailInput(newEmail);
    const emailError = validateEmail(normalizedEmail);
    if (emailError) {
      setError(emailError);
      return;
    }
    if (normalizedEmail === currentEmail.trim().toLowerCase()) {
      setError('Yeni e-posta mevcut adresinizle aynı olamaz.');
      return;
    }

    setLoading(true);
    setError(null);

    const changeFn = isGuest ? convertGuestEmail : requestEmailChange;
    const { error: changeError } = await changeFn(normalizedEmail);

    setLoading(false);
    if (changeError) {
      setError(changeError);
      return;
    }

    setNewEmail(normalizedEmail);

    if (isGuest) {
      setGuestSheetVisible(true);
      return;
    }

    setStep('verify-new');
  };

  const handleVerifyNew = async () => {
    setLoading(true);
    setError(null);
    const { error: verifyError } = await verifyNewEmailCode(newEmail, newEmailCode);
    setLoading(false);
    if (verifyError) {
      setError('Yeni e-posta doğrulama kodu geçersiz veya süresi dolmuş.');
      return;
    }
    reset();
    onEmailChanged();
  };

  const startChange = () => {
    if (isAutoGuestEmail) {
      setStep('new-email');
      return;
    }
    setStep('verify-current');
    setCurrentCodeSent(false);
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.currentRow, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
        <Ionicons name="mail-outline" size={18} color={colors.primary} />
        <Text style={styles.currentEmail} numberOfLines={1}>
          {currentEmail}
        </Text>
        {step === 'idle' ? (
          <Pressable onPress={startChange} hitSlop={8}>
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
              Değiştir
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={reset} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {isAutoGuestEmail && step === 'idle' ? (
        <Text secondary variant="caption">
          Otomatik atanan e-postayı istediğiniz adresle değiştirebilirsiniz.
        </Text>
      ) : null}

      {step === 'idle' ? null : (
        <View style={[styles.flow, { borderColor: colors.border }]}>
          {!isAutoGuestEmail ? (
            <View style={styles.steps}>
              <StepDot active={step === 'verify-current'} done={step !== 'verify-current'} label="1" colors={colors} />
              <View style={[styles.stepLine, { backgroundColor: colors.border }]} />
              <StepDot active={step === 'new-email'} done={step === 'verify-new'} label="2" colors={colors} />
              <View style={[styles.stepLine, { backgroundColor: colors.border }]} />
              <StepDot active={step === 'verify-new'} done={false} label="3" colors={colors} />
            </View>
          ) : null}

          {step === 'verify-current' ? (
            <>
              <Text secondary variant="caption">
                Güvenliğiniz için {currentEmail} adresine 6 haneli kod gönderilecek.
              </Text>
              {!currentCodeSent ? (
                <Button title="Kod Gönder" loading={loading} onPress={handleSendCurrentCode} />
              ) : (
                <>
                  <Input
                    label="Mevcut E-posta Kodu"
                    value={code}
                    onChangeText={setCode}
                    placeholder="123456"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <Button title="Kodu Doğrula" loading={loading} onPress={handleVerifyCurrent} />
                  <Pressable onPress={handleSendCurrentCode} disabled={loading}>
                    <Text variant="caption" style={{ color: colors.primary, textAlign: 'center' }}>
                      Kodu tekrar gönder
                    </Text>
                  </Pressable>
                </>
              )}
            </>
          ) : null}

          {step === 'new-email' ? (
            <>
              <Text secondary variant="caption">
                {isAutoGuestEmail
                  ? 'Yeni e-posta adresinizi girin. Doğrulama kodu gönderilecektir.'
                  : 'Mevcut e-postanız doğrulandı. Yeni e-posta adresinizi girin.'}
              </Text>
              <Input
                label="Yeni E-posta"
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="yeni@email.com"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Button title="Yeni E-postayı Onayla" loading={loading} onPress={handleRequestNewEmail} />
            </>
          ) : null}

          {step === 'verify-new' ? (
            <>
              <Text secondary variant="caption">
                {newEmail} adresine gönderilen 6 haneli kodu girin.
              </Text>
              <Input
                label="Yeni E-posta Kodu"
                value={newEmailCode}
                onChangeText={setNewEmailCode}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
              />
              <Button title="E-postayı Güncelle" loading={loading} onPress={handleVerifyNew} />
            </>
          ) : null}

          {error ? <Text variant="caption" style={{ color: colors.danger }}>{error}</Text> : null}
        </View>
      )}

      <EmailVerificationSheet
        visible={guestSheetVisible}
        email={newEmail.trim()}
        otpType="email_change"
        onClose={() => setGuestSheetVisible(false)}
        onVerified={async () => {
          const confirmedEmail = normalizeEmailInput(newEmail);
          const { error: convertError } = await completeGuestEmailConversion(undefined, {
            confirmedEmail,
          });
          if (convertError) {
            setError(convertError);
            setGuestSheetVisible(false);
            return;
          }
          reset();
          await onEmailChanged();
        }}
        onResend={async () => convertGuestEmail(newEmail)}
      />
    </View>
  );
}

function StepDot({
  active,
  done,
  label,
  colors,
}: {
  active: boolean;
  done: boolean;
  label: string;
  colors: { primary: string; border: string; textMuted: string };
}) {
  const bg = active ? colors.primary : done ? `${colors.primary}33` : colors.border;
  const fg = active ? '#fff' : done ? colors.primary : colors.textMuted;
  return (
    <View style={[styles.stepDot, { backgroundColor: bg }]}>
      <Text variant="caption" style={{ color: fg, fontWeight: '700', fontSize: 11 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  currentEmail: { flex: 1, fontWeight: '500' },
  flow: {
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: { width: 28, height: 2, borderRadius: 1 },
});
