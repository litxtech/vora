import { useEffect, useState, type ReactNode, type Ref } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { CanlarProfileSheet } from '@/features/vora-canlar/components/CanlarProfileSheet';
import { CanlarTabBar } from '@/features/vora-canlar/components/canlarUi';
import { CANLAR_ACCENT } from '@/features/vora-canlar/constants';
import { listMyCases, type OwnCase } from '@/features/vora-canlar/services/plainLanguage';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function CanlarScaffold({
  title,
  children,
  scroll = true,
  refreshing,
  onRefresh,
  headerActions,
  headerAccessory,
  hero,
  overlay = false,
  onScroll,
  scrollRef,
}: {
  title: string;
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  headerActions?: ReactNode;
  headerAccessory?: ReactNode;
  hero?: ReactNode;
  overlay?: boolean;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollRef?: Ref<ScrollView>;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const path = usePathname();
  const inCanlar = path === '/vora-canlar' || path.startsWith('/vora-canlar/');
  const [profileOpen, setProfileOpen] = useState(false);
  const body = (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {scroll ? (
        <Animated.ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingBottom: inCanlar ? insets.bottom + 92 : 56 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          onScroll={onScroll}
          refreshControl={
            onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={CANLAR_ACCENT} /> : undefined
          }
        >
          {hero}
          <View style={styles.content}>{children}</View>
        </Animated.ScrollView>
      ) : (
        <View style={styles.fill}>{children}</View>
      )}
    </KeyboardAvoidingView>
  );

  const header = (
    <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
      <ScreenBackButton />
      <View style={[styles.mark, { backgroundColor: `${CANLAR_ACCENT}22` }]}>
        <Ionicons name="paw" size={18} color={CANLAR_ACCENT} />
      </View>
      <View style={styles.titles}>
        <Text style={styles.kicker}>Vora Canlar</Text>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text, flexShrink: 1 }]} numberOfLines={1}>
            {title}
          </Text>
          {headerAccessory}
        </View>
      </View>
      {headerActions}
    </View>
  );

  return (
    <View style={[styles.fill, { backgroundColor: colors.background, paddingTop: overlay ? 0 : insets.top }]}>
      {overlay ? null : header}
      {body}
      {overlay ? (
        <View pointerEvents="box-none" style={[styles.overlayBar, { paddingTop: insets.top }]}>
          <View style={[styles.overlayBack, { backgroundColor: colors.surface }]}>
            <ScreenBackButton />
          </View>
        </View>
      ) : null}
      {inCanlar ? (
        <CanlarTabBar profileOpen={profileOpen} onProfilePress={() => setProfileOpen(true)} />
      ) : null}
      {inCanlar ? <CanlarProfileSheet visible={profileOpen} onClose={() => setProfileOpen(false)} /> : null}
    </View>
  );
}

export function CanlarHeroImage({
  uri,
  source,
  label = 'İlan görseli',
}: {
  uri?: string | null;
  source?: ImageSource | null;
  label?: string;
}) {
  const { colors } = useTheme();
  const resolved = source ?? (uri ? { uri } : null);
  if (!resolved) {
    return (
      <View style={[styles.heroEmpty, { backgroundColor: colors.surfaceElevated }]}>
        <Ionicons name="image-outline" size={28} color={colors.textMuted} />
        <Text secondary>Fotoğraf yok</Text>
      </View>
    );
  }
  return <Image source={resolved} style={styles.hero} contentFit="cover" accessibilityLabel={label} />;
}

export function CanlarCard({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

export function CanlarFeedCard({
  title,
  meta,
  body,
  badge,
  tone = CANLAR_ACCENT,
  imageUrl,
  icon = 'paw',
  large = false,
  onPress,
}: {
  title: string;
  meta?: string | null;
  body?: string | null;
  badge?: string | null;
  tone?: string;
  imageUrl?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  large?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, meta, badge].filter(Boolean).join('. ')}
      onPress={onPress}
      style={({ pressed }) => [
        large ? styles.feedLarge : styles.feed,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={large ? styles.feedImageLarge : styles.feedImage} contentFit="cover" accessibilityLabel="" />
      ) : (
        <View style={[large ? styles.feedIconLarge : styles.feedIcon, { backgroundColor: `${tone}18` }]}>
          <Ionicons name={icon} size={large ? 28 : 20} color={tone} />
        </View>
      )}
      <View style={[styles.feedBody, large ? styles.feedLargeBody : null]}>
        <Text numberOfLines={large ? 2 : 1} style={large ? styles.feedTitleLarge : styles.feedTitle}>
          {title}
        </Text>
        {meta ? (
          <Text secondary variant="caption" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        {body ? (
          <Text variant="caption" numberOfLines={large ? 3 : 2} style={{ color: colors.textSecondary }}>
            {body}
          </Text>
        ) : null}
        {badge ? <CanlarStatusPill label={badge} tone={tone} /> : null}
      </View>
      {large ? null : <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </Pressable>
  );
}

export function CanlarExampleCard({
  title,
  meta,
  body,
  badge,
  tone = CANLAR_ACCENT,
  image,
  onPress,
}: {
  title: string;
  meta: string;
  body: string;
  badge: string;
  tone?: string;
  image: ImageSource;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Örnektir. ${title}. ${meta}. ${badge}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.example,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View>
        <Image source={image} style={styles.exampleImage} contentFit="cover" accessibilityLabel="" />
        <View style={styles.exampleStamp}>
          <Text style={styles.exampleStampText}>Örnektir</Text>
        </View>
      </View>
      <View style={styles.exampleBody}>
        <Text numberOfLines={1} style={styles.feedTitle}>
          {title}
        </Text>
        <Text secondary variant="caption" numberOfLines={1}>
          {meta}
        </Text>
        <CanlarStatusPill label={badge} tone={tone} />
        <Text variant="caption" numberOfLines={3} style={{ color: colors.textSecondary }}>
          {body}
        </Text>
      </View>
    </Pressable>
  );
}

export function CanlarCasePicker({
  userId,
  value,
  onChange,
}: {
  userId: string | null;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const { colors } = useTheme();
  const [rows, setRows] = useState<OwnCase[]>([]);

  useEffect(() => {
    if (!userId) return;
    void listMyCases(userId).then(setRows);
  }, [userId]);

  if (!userId) return <Text secondary>Giriş yapınca kendi ihbarlarınız görünür.</Text>;
  if (rows.length === 0) {
    return <Text secondary>Henüz ihbarınız yok. Vaka numarası, ihbar kaydolunca otomatik verilir.</Text>;
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {rows.map((row) => {
        const active = value === row.id;
        return (
          <Pressable
            key={row.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(active ? null : row.id)}
            style={{
              borderWidth: 1,
              borderRadius: radius.full,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderColor: active ? CANLAR_ACCENT : colors.border,
              backgroundColor: active ? `${CANLAR_ACCENT}22` : colors.surface,
            }}
          >
            <Text style={{ fontWeight: active ? '800' : '500', color: active ? CANLAR_ACCENT : colors.text }}>
              {row.name || 'İsimsiz'} · {row.city_label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CanlarEmpty({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, { backgroundColor: colors.surfaceElevated }]}>
      <Ionicons name="paw-outline" size={18} color={colors.textMuted} />
      <Text style={{ color: colors.textMuted, flex: 1 }}>{label}</Text>
    </View>
  );
}

export function CanlarSectionTitle({
  title,
  hint,
  caption,
  onSeeAll,
}: {
  title: string;
  hint?: string;
  caption?: string;
  onSeeAll?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionRow}>
        <Text style={[styles.section, { color: colors.text }]}>{title}</Text>
        {onSeeAll ? (
          <Pressable accessibilityRole="button" onPress={onSeeAll} hitSlop={8}>
            <Text style={{ color: CANLAR_ACCENT, fontWeight: '800' }}>Tümünü gör</Text>
          </Pressable>
        ) : hint ? (
          <View style={[styles.count, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{hint}</Text>
          </View>
        ) : null}
      </View>
      {caption ? (
        <Text secondary variant="caption">
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

export function CanlarButton({
  label,
  onPress,
  icon,
  quiet = false,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  quiet?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        quiet ? styles.buttonQuiet : styles.button,
        quiet ? { borderColor: colors.border, backgroundColor: colors.surface } : null,
        { opacity: pressed ? 0.86 : 1 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={16} color={quiet ? colors.text : '#fff'} /> : null}
      <Text style={quiet ? { color: colors.text, fontWeight: '700', textAlign: 'center' } : styles.buttonText}>{label}</Text>
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
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 26 },
  overlayBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.sm,
  },
  overlayBack: { alignSelf: 'flex-start', borderRadius: 22, overflow: 'hidden' },
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
  content: { padding: spacing.md, gap: spacing.lg },
  hero: { width: '100%', height: 340 },
  heroEmpty: { height: 180, alignItems: 'center', justifyContent: 'center', gap: 8 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: spacing.md,
    gap: spacing.sm,
  },
  feed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 12,
  },
  feedLarge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    overflow: 'hidden',
  },
  feedImage: { width: 64, height: 64, borderRadius: 14 },
  feedImageLarge: { width: '100%', height: 168 },
  feedIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedIconLarge: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedBody: { flex: 1, gap: 3, minWidth: 0 },
  feedLargeBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.sm },
  feedTitle: { fontSize: 16, fontWeight: '800' },
  feedTitleLarge: { fontSize: 20, fontWeight: '800' },
  example: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, overflow: 'hidden' },
  exampleImage: { width: '100%', height: 188 },
  exampleStamp: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(10, 14, 20, 0.82)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  exampleStampText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  exampleBody: { padding: spacing.md, gap: 6 },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  sectionBlock: { gap: 2 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  section: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  count: { minWidth: 28, height: 24, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
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
  buttonQuiet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
  },
  buttonText: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  field: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 48,
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
