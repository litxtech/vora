import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import {
  USERNAME_FORMAT_HINT,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from '@/constants/auth';
import { radius, spacing } from '@/constants/theme';
import {
  completeGuestProfile,
  suggestAvailableUsername,
} from '@/features/auth/services/guestProfileCompletion';
import {
  normalizeUsernameInput,
  validateTurkishName,
  validateUsername,
} from '@/features/auth/services/validation';
import { useTheme } from '@/providers/ThemeProvider';

type GuestProfileGateSheetProps = {
  visible: boolean;
  actionLabel: string;
  userId: string;
  initialUsername?: string;
  onClose: () => void;
  onCompleted: () => void;
};

export function GuestProfileGateSheet({
  visible,
  actionLabel,
  userId,
  initialUsername,
  onClose,
  onCompleted,
}: GuestProfileGateSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [suggestingUsername, setSuggestingUsername] = useState(false);
  const usernameTouchedRef = useRef(false);
  const suggestRequestRef = useRef(0);

  useEffect(() => {
    if (!visible) {
      setDisplayName('');
      setUsername('');
      setDisplayNameError(null);
      setUsernameError(null);
      setSubmitError(null);
      setSaving(false);
      setSuggestingUsername(false);
      usernameTouchedRef.current = false;
      return;
    }

    setUsername(initialUsername ?? '');
  }, [visible, initialUsername]);

  useEffect(() => {
    if (!visible) return;

    const trimmedName = displayName.trim();
    if (trimmedName.length < 2 || usernameTouchedRef.current) return;

    const requestId = suggestRequestRef.current + 1;
    suggestRequestRef.current = requestId;
    setSuggestingUsername(true);

    void suggestAvailableUsername(trimmedName, userId)
      .then((suggested) => {
        if (suggestRequestRef.current !== requestId || usernameTouchedRef.current) return;
        setUsername(suggested);
      })
      .finally(() => {
        if (suggestRequestRef.current === requestId) {
          setSuggestingUsername(false);
        }
      });
  }, [displayName, userId, visible]);

  const handleUsernameChange = (value: string) => {
    usernameTouchedRef.current = true;
    setUsername(normalizeUsernameInput(value));
    setUsernameError(null);
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    const nameError = validateTurkishName(displayName, 'Ad soyad');
    const userError = validateUsername(username);
    setDisplayNameError(nameError);
    setUsernameError(userError);
    setSubmitError(null);
    if (nameError || userError || saving) return;

    setSaving(true);
    const { error } = await completeGuestProfile({
      userId,
      displayName,
      username,
    });
    setSaving(false);

    if (error) {
      if (error.includes('kullanıcı adı')) {
        setUsernameError(error);
      } else {
        setSubmitError(error);
      }
      return;
    }

    onCompleted();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={resolveModalAnimationType('slide')}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.backdrop}>
          <Pressable style={styles.dismissArea} onPress={onClose} />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                paddingBottom: Math.max(insets.bottom, spacing.md),
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <View style={styles.header}>
              <Text variant="h3">Kimliğini tamamla</Text>
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text variant="body" secondary style={styles.subtitle}>
              {actionLabel} için ad soyad ve kullanıcı adı seçmen gerekiyor. Bu bilgiler diğer
              kullanıcılara görünür.
            </Text>

            <Input
              label="Ad Soyad"
              value={displayName}
              onChangeText={(value) => {
                setDisplayName(value);
                setDisplayNameError(null);
                setSubmitError(null);
              }}
              placeholder="Örn. Ahmet Yılmaz"
              autoCapitalize="words"
              error={displayNameError ?? undefined}
            />

            <Input
              label="Kullanıcı adı"
              value={username}
              onChangeText={handleUsernameChange}
              placeholder="kullanici_adi"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={USERNAME_MAX_LENGTH}
              error={usernameError ?? undefined}
            />

            <Text variant="caption" secondary style={styles.hint}>
              {suggestingUsername
                ? 'Kullanıcı adı öneriliyor...'
                : `${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} karakter; ${USERNAME_FORMAT_HINT}.`}
            </Text>

            {submitError ? (
              <Text variant="caption" style={[styles.submitError, { color: colors.danger }]}>
                {submitError}
              </Text>
            ) : null}

            <Button title="Devam et" onPress={() => void handleSubmit()} loading={saving} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    padding: spacing.xs,
  },
  subtitle: {
    marginTop: -spacing.xs,
  },
  hint: {
    marginTop: -spacing.sm,
  },
  submitError: {
    marginTop: -spacing.xs,
  },
});
