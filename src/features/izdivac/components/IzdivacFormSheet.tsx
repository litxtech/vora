import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { IZDIVAC_ACCENT } from '@/features/izdivac/constants';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
};

export function IzdivacFormSheet({ visible, title, subtitle, onClose, footer, children }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={resolveModalAnimationType('slide')}
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Kapat" />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 6 : 0}
          style={styles.keyboardWrap}
        >
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                borderColor: colors.border,
                paddingBottom: insets.bottom + spacing.md,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text variant="label">{title}</Text>
                {subtitle ? (
                  <Text secondary variant="caption" style={styles.subtitle}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Kapat">
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentContainerStyle={styles.body}
              bounces={false}
            >
              {children}
            </ScrollView>

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function IzdivacSheetPrimaryButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryBtn,
        { backgroundColor: IZDIVAC_ACCENT, opacity: disabled || loading ? 0.55 : pressed ? 0.9 : 1 },
      ]}
    >
      <Text variant="caption" style={styles.primaryBtnText}>
        {loading ? 'Gönderiliyor…' : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardWrap: {
    maxHeight: '90%',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  subtitle: {
    lineHeight: 17,
  },
  body: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  footer: {
    paddingTop: spacing.xs,
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: radius.md,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
});
