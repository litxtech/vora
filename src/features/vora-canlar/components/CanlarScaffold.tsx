import type { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { CANLAR_ACCENT } from '@/features/vora-canlar/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function CanlarScaffold({
  title,
  children,
  scroll = true,
  refreshing,
  onRefresh,
}: {
  title: string;
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={CANLAR_ACCENT} /> : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.fill}>{children}</View>
  );

  return (
    <View style={[styles.fill, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ScreenBackButton />
        <View style={[styles.mark, { backgroundColor: `${CANLAR_ACCENT}22` }]}>
          <Ionicons name="paw" size={18} color={CANLAR_ACCENT} />
        </View>
        <View style={styles.titles}>
          <Text style={styles.kicker}>Vora Canlar</Text>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>
      {body}
    </View>
  );
}

export function CanlarCard({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardAccent} />
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

export function CanlarEmpty({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Ionicons name="paw-outline" size={18} color={colors.textMuted} />
      <Text style={{ color: colors.textMuted, flex: 1 }}>{label}</Text>
    </View>
  );
}

export function CanlarSectionTitle({ title, hint }: { title: string; hint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.section, { color: colors.text }]}>{title}</Text>
      {hint ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>{hint}</Text> : null}
    </View>
  );
}

export function CanlarButton({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.86 : 1 }]}
    >
      {icon ? <Ionicons name={icon} size={16} color="#fff" /> : null}
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function CanlarField(props: TextInputProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      {...props}
      style={[
        styles.field,
        { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
        props.multiline ? styles.fieldMulti : null,
        props.style,
      ]}
    />
  );
}

export function CanlarStatusPill({ label, tone = CANLAR_ACCENT }: { label: string; tone?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: `${tone}18`, borderColor: `${tone}44` }]}>
      <Text style={{ color: tone, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1 },
  kicker: { color: CANLAR_ACCENT, fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { fontSize: 20, fontWeight: '800' },
  content: { padding: spacing.md, paddingBottom: 48, gap: spacing.md },
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  cardAccent: { width: 3, backgroundColor: CANLAR_ACCENT },
  cardBody: { flex: 1, padding: spacing.md, gap: spacing.xs },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  section: { fontSize: 17, fontWeight: '800' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: CANLAR_ACCENT,
    borderRadius: radius.lg,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
  },
  buttonText: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  field: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
  },
  fieldMulti: { minHeight: 96, textAlignVertical: 'top' },
  pill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: '100%',
  },
});
