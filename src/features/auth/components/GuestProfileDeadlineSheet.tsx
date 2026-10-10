import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EmailVerificationSheet } from '@/components/auth/EmailVerificationSheet';
import { FormKeyboardScrollView } from '@/components/keyboard/FormKeyboardScrollView';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import {
  USERNAME_FORMAT_HINT,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from '@/constants/auth';
import { radius, spacing } from '@/constants/theme';
import { convertGuestEmail, completeGuestEmailConversion, isGuestEmail } from '@/features/auth/services/guestAccount';
import {
  completeGuestIdentity,
  isAutoGuestUsername,
  suggestAvailableUsername,
} from '@/features/auth/services/guestProfileCompletion';
import {
  normalizeEmailInput,
  normalizeUsernameInput,
  validateEmail,
  validateTurkishName,
  validateUsername,
} from '@/features/auth/services/validation';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useTheme } from '@/providers/ThemeProvider';

type GuestProfileDeadlineSheetProps = {
  visible: boolean;
  userId: string;
  initialFirstName?: string;
  initialLastName?: string;
  initialUsername?: string;
  onCompleted: () => void;
};

export function GuestProfileDeadlineSheet({
  visible,
  userId,
  initialFirstName,
  initialLastName,
  initialUsername,
  onCompleted,
}: GuestProfileDeadlineSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const usernameTouchedRef = useRef(false);
  const suggestRequestRef = useRef(0);

  useEffect(() => {
    if (!visible) return;
    setFirstName(initialFirstName?.trim() ?? '');
    setLastName(initialLastName?.trim() ?? '');
    const seededUsername = initialUsername && !isAutoGuestUsername(initialUsername) ? initialUsername : '';
    setUsername(seededUsername);
    usernameTouchedRef.current = seededUsername.length > 0;
  }, [initialFirstName, initialLastName, initialUsername, visible]);

  useEffect(() => {
    if (!visible || usernameTouchedRef.current) return;
    const displayName = `${firstName} ${lastName}`.trim();
    if (displayName.length < 2) return;

    const requestId = suggestRequestRef.current + 1;
    suggestRequestRef.current = requestId;
    void suggestAvailableUsername(displayName, userId).then((suggested) => {
      if (suggestRequestRef.current !== requestId || usernameTouchedRef.current) return;
      setUsername(suggested);
    });
  }, [firstName, lastName, userId, visible]);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setFieldError(null);
    const normalized = normalizeEmailInput(value);
    if (verifiedEmail && normalized !== verifiedEmail) {
      setEmailVerified(false);
      setVerifiedEmail(null);
    }
  };

  const handleSendCode = async () => {
    const normalized = normalizeEmailInput(email);
    const emailError = validateEmail(normalized);
    if (emailError) {
      setFieldError(emailError);
      return;
    }
    if (isGuestEmail(normalized)) {
      setFieldError('Misafir e-posta adresi yerine gerçek bir adres girin.');
      return;
    }

    setSendingCode(true);
    setFieldError(null);
    const { error } = await convertGuestEmail(normalized);
    setSendingCode(false);
    if (error) {
      setFieldError(error);
      return;
    }
    setEmail(normalized);
    setSheetVisible(true);
  };

  const handleSave = async () => {
    const firstError = validateTurkishName(firstName, 'Ad');
    const lastError = validateTurkishName(lastName, 'Soyad');
    const userError = validateUsername(username);
    const emailError = emailVerified ? null : 'Önce e-posta adresinizi doğrulayın.';
    const message = firstError ?? lastError ?? userError ?? emailError;
    setFieldError(message);
    if (message || saving || !verifiedEmail) return;

    setSaving(true);
    const { error: identityError } = await completeGuestIdentity({
      userId,
      firstName,
      lastName,
      username,
    });
    if (identityError) {
      setSaving(false);
      setFieldError(identityError);
      return;
    }

    const { error: convertError } = await completeGuestEmailConversion(undefined, {
      confirmedEmail: verifiedEmail,
      keepDeviceLogin: true,
    });
    setSaving(false);
    if (convertError) {
      setFieldError(convertError);
      return;
    }

    onCompleted();
  };

  return (
    <>
    <Modal
      visible={visible}
      transparent
      animationType={resolveModalAnimationType('fade')}
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={() => undefined}
    >
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <View style={styles.backdrop}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                marginTop: insets.top + spacing.lg,
                marginBottom: Math.max(insets.bottom, spacing.md),
              },
            ]}
          >
            <View style={styles.header}>
              <View style={[styles.icon, { backgroundColor: `${colors.primary}18` }]}>
                <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.headerCopy}>
                <Text variant="h3">Profilini doğrula</Text>
                <Text secondary variant="caption">
                  Misafir hesabın 24 saati doldu. Devam etmek için e-postanı doğrula, adını, soyadını ve kullanıcı adını yaz.
                </Text>
              </View>
            </View>

            <FormKeyboardScrollView
              style={styles.flex}
              contentContainerStyle={styles.form}
              bottomOffset={Platform.OS === 'android' ? 120 : 96}
              extraKeyboardSpace={spacing.xl}
              keyboardDismissMode="interactive"
            >
              <Input
                label="E-posta"
                value={email}
                onChangeText={handleEmailChange}
                placeholder="olivia.t@example.org"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              <Button
                title={emailVerified ? 'E-posta doğrulandı' : 'Doğrulama kodu gönder'}
                variant={emailVerified ? 'outline' : 'primary'}
                onPress={() => void handleSendCode()}
                loading={sendingCode}
                disabled={emailVerified}
              />

              <Input
                label="Ad"
                value={firstName}
                onChangeText={(value) => {
                  setFirstName(value);
                  setFieldError(null);
                }}
                placeholder="Ahmet"
                autoCapitalize="words"
              />
              <Input
                label="Soyad"
                value={lastName}
                onChangeText={(value) => {
                  setLastName(value);
                  setFieldError(null);
                }}
                placeholder="Yılmaz"
                autoCapitalize="words"
              />
              <Input
                label="Kullanıcı adı"
                value={username}
                onChangeText={(value) => {
                  usernameTouchedRef.current = true;
                  setUsername(normalizeUsernameInput(value));
                  setFieldError(null);
                }}
                placeholder="kullanici_adi"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={USERNAME_MAX_LENGTH}
              />
              <Text secondary variant="caption">
                {`${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} karakter; ${USERNAME_FORMAT_HINT}.`}
              </Text>
              {fieldError ? (
                <Text variant="caption" style={{ color: colors.danger }}>
                  {fieldError}
                </Text>
              ) : null}
            </FormKeyboardScrollView>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <Button title="Kaydet" onPress={() => void handleSave()} loading={saving} disabled={!emailVerified} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

    </Modal>
      <EmailVerificationSheet
        visible={sheetVisible}
        email={email.trim()}
        otpType="email_change"
        onClose={() => setSheetVisible(false)}
        onVerified={() => {
          const confirmed = normalizeEmailInput(email);
          setVerifiedEmail(confirmed);
          setEmailVerified(true);
          setSheetVisible(false);
          setFieldError(null);
        }}
        onResend={async () => convertGuestEmail(email)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  card: {
    flex: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  form: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
