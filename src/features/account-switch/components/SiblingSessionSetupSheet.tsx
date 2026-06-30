import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { KeyboardStickyView, useKeyboardState } from 'react-native-keyboard-controller';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { useAccountSwitch } from '@/features/account-switch/providers/AccountSwitchProvider';
import { storeSiblingSessionFromCredentials } from '@/features/account-switch/services/accountSwitch';
import { validateEmail, validatePassword } from '@/features/auth/services/validation';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  visible: boolean;
  onClose: () => void;
  onComplete?: () => void;
};

type Phase = 'form' | 'connecting' | 'success';

const CONNECT_MS = 1400;
const FORM_SCROLL_MAX = 220;

function AccountLinkingAnimation({
  leftUsername,
  leftAvatar,
  rightUsername,
  rightAvatar,
  phase,
}: {
  leftUsername: string;
  leftAvatar: string | null;
  rightUsername: string;
  rightAvatar: string | null;
  phase: 'connecting' | 'success';
}) {
  const { colors } = useTheme();
  const pulse = useSharedValue(1);
  const linkX = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.12, { duration: 520 }), withTiming(1, { duration: 520 })),
      -1,
      true,
    );
    linkX.value = withRepeat(
      withSequence(withTiming(4, { duration: 600 }), withTiming(-4, { duration: 600 })),
      -1,
      true,
    );
  }, [pulse, linkX]);

  const linkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }, { translateX: linkX.value }],
  }));

  const accent = phase === 'success' ? colors.success : colors.primary;

  return (
    <Animated.View entering={FadeIn.duration(280)} style={styles.linkAnim}>
      <View style={styles.avatarPair}>
        <View style={[styles.avatarRing, { borderColor: `${accent}44` }]}>
          <ProfileAvatar username={leftUsername} avatarUrl={leftAvatar} size={52} />
        </View>

        <Animated.View style={[styles.linkBadge, { backgroundColor: `${accent}18` }, linkStyle]}>
          <Ionicons
            name={phase === 'success' ? 'checkmark-circle' : 'link'}
            size={22}
            color={accent}
          />
        </Animated.View>

        <View style={[styles.avatarRing, { borderColor: `${accent}44` }]}>
          <ProfileAvatar username={rightUsername} avatarUrl={rightAvatar} size={52} />
        </View>
      </View>

      <Text variant="label" style={{ textAlign: 'center' }}>
        {phase === 'success' ? 'Hesaplar bağlandı' : 'Hesabınız bağlanıyor…'}
      </Text>
      {phase === 'connecting' ? (
        <ActivityIndicator color={accent} style={{ marginTop: spacing.xs }} />
      ) : (
        <Text secondary variant="caption" style={{ textAlign: 'center' }}>
          Geçiş hazır
        </Text>
      )}
    </Animated.View>
  );
}

export function SiblingSessionSetupSheet({ visible, onClose, onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { profile } = useAuth();
  const { linkedSibling, refreshSwitchState } = useAccountSwitch();
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('form');

  useEffect(() => {
    if (!visible) {
      setPhase('form');
      setError(null);
      setEmail('');
      setPassword('');
    }
  }, [visible]);

  if (!linkedSibling) return null;

  const handleSave = async () => {
    setError(null);
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    setPhase('connecting');

    const result = await storeSiblingSessionFromCredentials({
      siblingUsername: linkedSibling.username,
      email,
      password,
    });

    if (result.error) {
      setLoading(false);
      setPhase('form');
      setError(result.error);
      return;
    }

    await refreshSwitchState();
    setPhase('success');
    setLoading(false);

    await new Promise((r) => setTimeout(r, CONNECT_MS));
    setEmail('');
    setPassword('');
    onComplete?.();
    onClose();
  };

  const label = linkedSibling.fullName?.trim() || linkedSibling.username;
  const selfUsername = profile?.username ?? 'sen';
  const selfAvatar = profile?.avatar_url ?? null;
  const cardBottomGap = isKeyboardVisible ? 0 : Math.max(insets.bottom, spacing.md);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={resolveModalAnimationType('fade')}
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={phase === 'connecting' ? undefined : onClose}
    >
      <View style={[styles.root, { backgroundColor: colors.overlay }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={phase === 'form' ? onClose : undefined}
          accessibilityLabel="Kapat"
        />

        <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
          <Animated.View
            entering={FadeInUp.springify().damping(20).stiffness(240)}
            style={[styles.cardShell, { marginBottom: cardBottomGap }]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <GlassCard
                style={[
                  styles.card,
                  {
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
                  },
                ]}
              >
                {phase === 'form' ? (
                  <>
                    <View style={styles.headerRow}>
                      <LinearGradient
                        colors={[`${colors.primary}30`, `${colors.primary}06`]}
                        style={styles.headerIcon}
                      >
                        <Ionicons name="link" size={18} color={colors.primary} />
                      </LinearGradient>
                      <View style={styles.headerCopy}>
                        <Text variant="label">Hesap geçişi</Text>
                        <Text secondary variant="caption">
                          Tek seferlik doğrulama
                        </Text>
                      </View>
                      <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Kapat">
                        <Ionicons name="close" size={20} color={colors.textMuted} />
                      </Pressable>
                    </View>

                    <View style={[styles.profileRow, { backgroundColor: `${colors.primary}08` }]}>
                      <ProfileAvatar
                        username={linkedSibling.username}
                        avatarUrl={linkedSibling.avatarUrl}
                        size={40}
                      />
                      <View style={styles.profileMeta}>
                        <Text variant="label" numberOfLines={1}>
                          {label}
                        </Text>
                        <Text secondary variant="caption">
                          @{linkedSibling.username}
                        </Text>
                      </View>
                      <View style={[styles.securePill, { backgroundColor: `${colors.success}14` }]}>
                        <Ionicons name="shield-checkmark-outline" size={11} color={colors.success} />
                        <Text
                          variant="caption"
                          style={{ color: colors.success, fontSize: 10, fontWeight: '700' }}
                        >
                          Güvenli
                        </Text>
                      </View>
                    </View>

                    <Text secondary variant="caption" style={styles.hint}>
                      Şifre yalnızca bu cihazda saklanır; hesaplar arası geçiş için kullanılır.
                    </Text>

                    <ScrollView
                      style={styles.formScroll}
                      contentContainerStyle={styles.formContent}
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode="interactive"
                      showsVerticalScrollIndicator={false}
                      bounces={false}
                    >
                      <Input
                        label="E-posta"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoComplete="email"
                        returnKeyType="next"
                      />
                      <Input
                        label="Şifre"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        returnKeyType="done"
                        onSubmitEditing={() => void handleSave()}
                      />
                      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
                    </ScrollView>

                    <View style={styles.actions}>
                      <Button title="Bağla ve devam et" loading={loading} onPress={handleSave} />
                      <Button title="Vazgeç" variant="secondary" onPress={onClose} />
                    </View>
                  </>
                ) : (
                  <View style={styles.animWrap}>
                    <AccountLinkingAnimation
                      leftUsername={selfUsername}
                      leftAvatar={selfAvatar}
                      rightUsername={linkedSibling.username}
                      rightAvatar={linkedSibling.avatarUrl}
                      phase={phase === 'success' ? 'success' : 'connecting'}
                    />
                  </View>
                )}
              </GlassCard>
            </Pressable>
          </Animated.View>
        </KeyboardStickyView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardShell: {
    marginHorizontal: spacing.md,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, gap: 2 },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  profileMeta: { flex: 1, gap: 2, minWidth: 0 },
  securePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  hint: { lineHeight: 18 },
  formScroll: {
    maxHeight: FORM_SCROLL_MAX,
  },
  formContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  animWrap: {
    minHeight: 200,
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  linkAnim: {
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarPair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  avatarRing: {
    padding: 3,
    borderRadius: radius.full,
    borderWidth: 2,
  },
  linkBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
