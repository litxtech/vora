import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { router, usePathname, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { canOpenCanlarUser, useCanlarUserSheetOptional } from '@/features/vora-canlar/components/CanlarUserSheet';
import { CANLAR_ACCENT, HELP_KIND_OPTIONS, formatMinor } from '@/features/vora-canlar/constants';
import type { CanlarCampaignCard, CanlarCaseCard, CanlarPostCard } from '@/features/vora-canlar/services/api';
import { describeCanlarPost, formatCanlarWhen } from '@/features/vora-canlar/services/contentKind';
import { seedCanlarCase, seedCanlarPost } from '@/features/vora-canlar/services/sessionCache';
import { campaignProgress, caseTitle, listingOutcomeMeta, rescueBadge, speciesLabel, type ListingOutcome } from '@/features/vora-canlar/services/presentation';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export const CANLAR_ORANGE = '#E07A2F';
export const CANLAR_GREEN = '#2F6B4F';

const TABS: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap; href: string }[] = [
  { id: 'home', label: 'Ana Sayfa', icon: 'home', href: '/vora-canlar' },
  { id: 'explore', label: 'Keşfet', icon: 'compass', href: '/vora-canlar/explore' },
  { id: 'help', label: 'Yardım Et', icon: 'heart', href: '/vora-canlar/help' },
  { id: 'posts', label: 'Paylaşımlar', icon: 'chatbubbles', href: '/vora-canlar/posts' },
  { id: 'me', label: 'Profilim', icon: 'person', href: '/vora-canlar/me' },
];

const TAB_OUTLINE: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: 'home-outline',
  explore: 'compass-outline',
  help: 'heart-outline',
  posts: 'chatbubbles-outline',
  me: 'person-outline',
};

export function canlarTabFromPath(path: string) {
  if (path.includes('/explore') || path.endsWith('/search')) return 'explore';
  if (path.endsWith('/help')) return 'help';
  if (path.endsWith('/posts')) return 'posts';
  if (path.endsWith('/me')) return 'me';
  if (path.endsWith('/vora-canlar') || path.endsWith('/vora-canlar/')) return 'home';
  return null;
}

export function leaveCanlarToApp() {
  router.dismissTo('/(tabs)' as Href);
}

export function CanlarTabBar({
  onProfilePress,
  profileOpen = false,
}: {
  onProfilePress?: () => void;
  profileOpen?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const active = canlarTabFromPath(path);
  const { colors } = useTheme();
  return (
    <View style={[styles.tabBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((tab) => {
        const selected = tab.id === 'me' ? profileOpen || active === 'me' : active === tab.id && !profileOpen;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            onPress={() => {
              if (tab.id === 'me') {
                onProfilePress?.();
                return;
              }
              if (!selected) router.dismissTo(tab.href as Href);
            }}
            style={styles.tab}
          >
            <Ionicons name={selected ? tab.icon : TAB_OUTLINE[tab.id]} size={22} color={selected ? CANLAR_ACCENT : colors.textMuted} />
            <Text style={{ fontSize: 11, fontWeight: selected ? '800' : '600', color: selected ? CANLAR_ACCENT : colors.textMuted }} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CanlarIconButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.surfaceElevated, opacity: pressed ? 0.8 : 1 }]}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

export function CanlarGlassCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { isDark } = useTheme();
  const wash = isDark ? 'rgba(16, 22, 30, 0.42)' : 'rgba(255, 255, 255, 0.46)';
  const border = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.82)';
  return (
    <View style={[styles.glassShadow, style]}>
      <View style={[styles.glassClip, { borderColor: border }]}>
        <BlurView intensity={isDark ? 42 : 58} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: wash }]} />
        {children}
      </View>
    </View>
  );
}

export function CanlarSearchField({
  value,
  onChangeText,
  placeholder,
  onSubmit,
  quiet = false,
}: {
  value?: string;
  onChangeText?: (value: string) => void;
  placeholder: string;
  onSubmit?: () => void;
  quiet?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const shellStyle = [
    styles.search,
    quiet ? styles.searchQuiet : null,
    {
      backgroundColor: quiet ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.35)') : colors.surface,
      borderColor: quiet ? (isDark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.08)') : colors.border,
    },
  ];
  if (onChangeText) {
    return (
      <View style={shellStyle}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={value ?? ''}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
          style={{ flex: 1, color: colors.text, fontSize: 16, paddingVertical: 0 }}
        />
      </View>
    );
  }
  return (
    <Pressable accessibilityRole="search" onPress={onSubmit} style={shellStyle}>
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <Text style={{ color: colors.textMuted, flex: 1 }}>{placeholder}</Text>
    </Pressable>
  );
}

export function CanlarChipRail({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
      {items.map((item) => {
        const selected = value === item.id;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(item.id)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? CANLAR_ACCENT : colors.surface,
                borderColor: selected ? CANLAR_ACCENT : colors.border,
              },
            ]}
          >
            <Text style={{ color: selected ? '#fff' : colors.text, fontWeight: '700', fontSize: 13 }}>{item.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function CanlarEmptyState({ title, body, action, onAction }: { title: string; body: string; action?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.emptyMark, { backgroundColor: `${CANLAR_ACCENT}18` }]}>
        <Ionicons name="paw" size={28} color={CANLAR_ACCENT} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text secondary style={{ textAlign: 'center' }}>{body}</Text>
      {action && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.emptyAction}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function CanlarMoneyMeter({
  raised,
  target,
  currency,
}: {
  raised: number | null | undefined;
  target: number | null | undefined;
  currency?: string | null;
}) {
  const progress = campaignProgress(raised, target);
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, { toValue: progress?.ratio ?? 0, duration: 700, useNativeDriver: false }).start();
  }, [progress?.ratio, width]);
  if (!progress || raised == null || target == null) return null;
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.meterTrack}>
        <Animated.View
          style={[
            styles.meterFill,
            {
              width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: progress.percent >= 100 ? CANLAR_GREEN : CANLAR_ACCENT,
            },
          ]}
        />
      </View>
      <Text style={{ fontWeight: '800' }}>
        {formatMinor(raised, currency ?? 'try')} / {formatMinor(target, currency ?? 'try')}
      </Text>
      <Text secondary>
        Hedefin %{progress.percent}’i tamamlandı. Kalan {formatMinor(progress.remaining, currency ?? 'try')}.
      </Text>
    </View>
  );
}

export function CanlarUpdateTrail({ count, note }: { count?: number | null; note?: string | null }) {
  const { colors } = useTheme();
  const total = count ?? 0;
  if (total <= 0) {
    return <Text secondary>Henüz herkese açık bir gelişme kaydı yok. İyileşme yüzdesi gösterilmez.</Text>;
  }
  const dots = Math.min(total, 8);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: dots }, (_, index) => (
          <View key={index} style={[styles.dot, { backgroundColor: index === dots - 1 ? CANLAR_GREEN : `${CANLAR_GREEN}88` }]} />
        ))}
      </View>
      <Text style={{ fontWeight: '800' }}>Kayıtlı gelişme: {total}</Text>
      {note ? <Text secondary numberOfLines={2}>Son not: {note}</Text> : <Text secondary style={{ color: colors.textMuted }}>Son not paylaşılmadı.</Text>}
    </View>
  );
}

function TileFrame({ uri, memorial }: { uri?: string | null; memorial?: boolean }) {
  const [width, setWidth] = useState(0);
  const height = width > 0 ? Math.round(width * 0.92) : 132;
  return (
    <View style={styles.tilePhoto} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <Photo uri={uri} height={height} memorial={memorial} />
    </View>
  );
}

function Photo({ uri, height, memorial }: { uri?: string | null; height: number; memorial?: boolean }) {
  const { colors } = useTheme();
  if (uri) {
    return <Image source={{ uri }} style={{ width: '100%', height }} contentFit="cover" accessibilityLabel="Hayvan fotoğrafı" />;
  }
  return (
    <View style={[styles.photoFallback, { height, backgroundColor: memorial ? '#3A332C' : colors.surfaceElevated }]}>
      <Ionicons name={memorial ? 'flower-outline' : 'paw'} size={42} color={memorial ? '#E7D7C8' : CANLAR_ACCENT} />
    </View>
  );
}

export function CanlarCaseVisual({
  row,
  compact = false,
  tile = false,
  onPress,
}: {
  row: CanlarCaseCard;
  compact?: boolean;
  tile?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const badge = rescueBadge({ status: row.status, treatment: row.treatment_status, urgency: row.urgency });
  const when = formatCanlarWhen(row.updated_at ?? row.created_at);
  const meta = [speciesLabel(row.species), row.city_label || 'Şehir paylaşılmadı', when].filter(Boolean).join(' · ');
  const showCare = row.treatment_status === 'ongoing' || row.treatment_status === 'recovery' || row.treatment_status === 'assessment'
    || row.status === 'treatment' || row.status === 'recovery';
  const open = () => {
    seedCanlarCase(row);
    onPress();
  };
  if (tile) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${caseTitle(row)}. ${badge.label}. ${meta}`}
        onPress={open}
        style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.92 : 1 }]}
      >
        <CanlarGlassCard style={styles.tileCard}>
          <TileFrame uri={row.cover_url} memorial={badge.memorial} />
          <View style={styles.tileBody}>
            <Badge badge={badge} />
            <Text numberOfLines={2} style={styles.tileTitle}>{caseTitle(row)}</Text>
            <Text secondary numberOfLines={1} style={styles.tileMeta}>{meta}</Text>
          </View>
        </CanlarGlassCard>
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${caseTitle(row)}. ${badge.label}. ${meta}`}
      onPress={open}
      style={({ pressed }) => [styles.visual, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.94 : 1 }]}
    >
      {compact ? (
        <View style={styles.compactRow}>
          <View style={styles.compactPhoto}>
            <Photo uri={row.cover_url} height={108} memorial={badge.memorial} />
          </View>
          <View style={styles.visualBody}>
            <Badge badge={badge} />
            <Text numberOfLines={1} style={styles.visualTitle}>{caseTitle(row)}</Text>
            <Text secondary numberOfLines={1}>{meta}</Text>
          </View>
        </View>
      ) : (
        <>
          <Photo uri={row.cover_url} height={188} memorial={badge.memorial} />
          <View style={styles.visualBody}>
            <Badge badge={badge} />
            <Text style={styles.visualTitle}>{caseTitle(row)}</Text>
            <Text secondary>{meta}</Text>
            {row.summary ? <Text numberOfLines={2}>{row.summary}</Text> : null}
            {badge.memorial ? <Text secondary>Bu kayıt saygıyla anılır. İyileşme oranı gösterilmez.</Text> : null}
            {showCare && row.public_update_count != null ? (
              <CanlarUpdateTrail count={row.public_update_count} note={row.latest_note} />
            ) : null}
            <CanlarMoneyMeter raised={row.campaign_raised_minor} target={row.campaign_target_minor} currency={row.campaign_currency} />
            <View style={styles.actionLine}>
              <Text style={{ color: CANLAR_ACCENT, fontWeight: '800' }}>Vaka detayı</Text>
              <Ionicons name="arrow-forward" size={16} color={CANLAR_ACCENT} />
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
}

export function CanlarCampaignVisual({
  row,
  tile = false,
  onPress,
}: {
  row: CanlarCampaignCard;
  tile?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const help = HELP_KIND_OPTIONS.find((item) => item.id === row.help_kind)?.label ?? 'Destek';
  const progress = campaignProgress(row.raised_minor, row.target_minor);
  if (tile) {
    const meta = [help, row.animal_name, row.city_label].filter(Boolean).join(' · ');
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${row.title}. ${help}`}
        onPress={onPress}
        style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.92 : 1 }]}
      >
        <CanlarGlassCard style={styles.tileCard}>
          <TileFrame uri={row.cover_url} />
          <View style={styles.tileBody}>
            <Badge badge={{ label: row.payments_enabled ? 'Bağış açık' : 'Ödeme kapalı', tone: row.payments_enabled ? CANLAR_GREEN : CANLAR_ORANGE, icon: 'heart', memorial: false }} />
            <Text numberOfLines={2} style={styles.tileTitle}>{row.title}</Text>
            <Text secondary numberOfLines={1} style={styles.tileMeta}>{meta}</Text>
          </View>
        </CanlarGlassCard>
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.title}. ${help}`}
      onPress={onPress}
      style={({ pressed }) => [styles.visual, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.94 : 1 }]}
    >
      <Photo uri={row.cover_url} height={160} />
      <View style={styles.visualBody}>
        <Badge badge={{ label: row.payments_enabled ? 'Bağış açık' : 'Ödeme kapalı', tone: row.payments_enabled ? CANLAR_GREEN : CANLAR_ORANGE, icon: 'heart', memorial: false }} />
        <Text style={styles.visualTitle}>{row.title}</Text>
        <Text secondary>{[help, row.animal_name, row.city_label].filter(Boolean).join(' · ')}</Text>
        {row.purpose ? <Text numberOfLines={2}>{row.purpose}</Text> : null}
        {progress ? (
          <CanlarMoneyMeter raised={row.raised_minor} target={row.target_minor} currency={row.currency} />
        ) : (
          <Text style={{ fontWeight: '800' }}>Toplanan {formatMinor(row.raised_minor ?? 0, row.currency)}</Text>
        )}
        <View style={styles.actionLine}>
          <Text style={{ color: CANLAR_ACCENT, fontWeight: '800' }}>Kampanyayı aç</Text>
          <Ionicons name="arrow-forward" size={16} color={CANLAR_ACCENT} />
        </View>
      </View>
    </Pressable>
  );
}

function CanlarAuthorLink({
  userId,
  username,
  city,
}: {
  userId?: string | null;
  username?: string | null;
  city?: string | null;
}) {
  const sheet = useCanlarUserSheetOptional();
  const label = username?.replace(/^@/, '').trim() || '';
  const openable = Boolean(sheet && canOpenCanlarUser(userId, label));
  if (!openable) {
    return (
      <Text secondary numberOfLines={1} style={styles.tileMeta}>
        {[label ? `@${label}` : 'Topluluk', city].filter(Boolean).join(' · ')}
      </Text>
    );
  }
  return (
    <View style={styles.authorMeta}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} profili`}
        hitSlop={6}
        onPress={(event) => {
          event.stopPropagation();
          sheet?.openUser({ userId, username: label });
        }}
      >
        <Text numberOfLines={1} style={styles.authorLink}>@{label}</Text>
      </Pressable>
      {city ? <Text secondary numberOfLines={1}>{`· ${city}`}</Text> : null}
    </View>
  );
}

export function CanlarPostVisual({
  post,
  tile = false,
  onPress,
}: {
  post: CanlarPostCard;
  tile?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const kind = describeCanlarPost(post);
  const image = post.media?.find((item) => item.url)?.url;
  const tone = kind.kind === 'urgent' ? CANLAR_ORANGE : kind.kind === 'campaign' ? CANLAR_GREEN : CANLAR_ACCENT;
  const open = () => {
    seedCanlarPost(post);
    onPress();
  };
  const author = (
    <CanlarAuthorLink userId={post.author_id} username={post.author_label} city={post.city_label} />
  );
  if (tile) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={post.body}
        onPress={open}
        style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.92 : 1 }]}
      >
        <CanlarGlassCard style={styles.tileCard}>
          <TileFrame uri={image} />
          <View style={styles.tileBody}>
            {post.outcome ? <CanlarOutcomeTag outcome={post.outcome} /> : (
              <Badge badge={{ label: kind.label, tone, icon: kind.kind === 'community' ? 'chatbubble' : 'paw', memorial: false }} />
            )}
            <Text numberOfLines={3} style={styles.tileTitle}>{post.body}</Text>
            {author}
          </View>
        </CanlarGlassCard>
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={open}
      style={({ pressed }) => [styles.visual, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.94 : 1 }]}
    >
      {image ? <Photo uri={image} height={180} /> : null}
      <View style={styles.visualBody}>
        {post.outcome ? <CanlarOutcomeTag outcome={post.outcome} /> : (
          <Badge badge={{ label: kind.label, tone, icon: kind.kind === 'community' ? 'chatbubble' : 'paw', memorial: false }} />
        )}
        <View style={styles.authorMeta}>
          {author}
          {post.created_at ? <Text secondary>{formatCanlarWhen(post.created_at)}</Text> : null}
        </View>
        <Text numberOfLines={4}>{post.body}</Text>
        <Text secondary>{post.like_count ?? 0} beğeni · {post.comment_count ?? 0} yorum</Text>
      </View>
    </Pressable>
  );
}

export function CanlarOutcomeTag({ outcome }: { outcome: ListingOutcome }) {
  const meta = listingOutcomeMeta(outcome);
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={meta.label}
      style={[styles.outcomeTag, { backgroundColor: meta.tone }]}
    >
      <Ionicons name={meta.icon} size={15} color="#fff" />
      <Text style={styles.outcomeTagText}>{meta.label}</Text>
    </View>
  );
}

function Badge({ badge }: { badge: { label: string; tone: string; icon: keyof typeof Ionicons.glyphMap } }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${badge.tone}18`, borderColor: `${badge.tone}55` }]}>
      <Ionicons name={badge.icon} size={13} color={badge.tone} />
      <Text style={{ color: badge.tone, fontSize: 12, fontWeight: '800' }} numberOfLines={1}>{badge.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, minHeight: 48, justifyContent: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  search: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  searchQuiet: { minHeight: 40, borderRadius: 14 },
  glassShadow: {
    borderRadius: 22,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 3,
  },
  glassClip: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  tileCard: { flex: 1 },
  tilePhoto: { margin: 6, borderRadius: 16, overflow: 'hidden' },
  tileBody: { paddingHorizontal: 10, paddingBottom: 12, gap: 4 },
  tileTitle: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  tileMeta: { fontSize: 11 },
  authorMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  authorLink: { color: CANLAR_ACCENT, fontWeight: '800', fontSize: 13 },
  rail: { gap: spacing.sm, paddingRight: spacing.md },
  chip: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 10 },
  empty: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 22, padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  emptyMark: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyAction: { backgroundColor: CANLAR_ACCENT, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginTop: 4 },
  meterTrack: { height: 10, borderRadius: 999, backgroundColor: 'rgba(47,107,79,0.18)', overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 999 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  visual: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 22, overflow: 'hidden' },
  visualBody: { padding: spacing.md, gap: 6 },
  visualTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  compactRow: { flexDirection: 'row' },
  compactPhoto: { width: 108 },
  actionLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  outcomeTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  outcomeTagText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '100%',
  },
});
