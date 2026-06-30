import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { BusinessShopSectionHeader } from '@/features/business-center/components/BusinessShopSectionHeader';
import {
  BUSINESS_GRADIENT,
  BUSINESS_ROUTES,
  commerceModeShowsHotels,
  commerceModeShowsProducts,
  shopAccentColor,
} from '@/features/business-center/constants';
import type { BusinessCommerceMode } from '@/features/business-center/types';
import { fetchBusinessAccountByOwner, fetchBusinessShopSnapshot } from '@/features/business-center/services/businessShopData';
import {
  buildBusinessShopCurateRows,
  curateRowsToShowcaseItems,
  ensureBusinessShopShowcaseSynced,
  removeBusinessShopItem,
  saveBusinessShopShowcase,
  type BusinessShopCurateRow,
} from '@/features/business-center/services/businessShopShowcase';
import { hotelEditPath } from '@/features/hotel-center/constants';
import { listingEditPath } from '@/features/marketplace/constants';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

function StatPill({
  icon,
  label,
  value,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  accent: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.statPill, { backgroundColor: colors.surface, borderColor: `${accent}28` }]}>
      <View style={[styles.statIcon, { backgroundColor: `${accent}16` }]}>
        <Ionicons name={icon} size={14} color={accent} />
      </View>
      <View style={styles.statCopy}>
        <Text variant="caption" muted style={{ fontSize: 10 }}>
          {label}
        </Text>
        <Text variant="label">{value}</Text>
      </View>
    </View>
  );
}

function ActionCard({
  icon,
  title,
  subtitle,
  accent,
  variant = 'filled',
  onPress,
  delay = 0,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  accent: string;
  variant?: 'filled' | 'outline' | 'dashed';
  onPress: () => void;
  delay?: number;
}) {
  const { colors } = useTheme();

  const content = (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        variant === 'filled'
          ? { borderColor: 'transparent', overflow: 'hidden' }
          : variant === 'dashed'
            ? { borderColor: `${accent}55`, borderStyle: 'dashed', backgroundColor: `${accent}08` }
            : { borderColor: `${accent}33`, backgroundColor: colors.surfaceElevated },
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
    >
      {variant === 'filled' ? (
        <LinearGradient
          colors={[`${accent}EE`, `${accent}AA`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
      <View style={[styles.actionIcon, variant === 'filled' ? styles.actionIconFilled : { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={22} color={variant === 'filled' ? '#fff' : accent} />
      </View>
      <View style={styles.actionCopy}>
        <Text variant="label" style={variant === 'filled' ? styles.actionTitleFilled : undefined}>
          {title}
        </Text>
        <Text
          variant="caption"
          style={variant === 'filled' ? styles.actionSubtitleFilled : undefined}
          secondary={variant !== 'filled'}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={variant === 'filled' ? 'rgba(255,255,255,0.85)' : colors.textMuted}
      />
    </Pressable>
  );

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(380).springify().damping(18)} style={styles.actionCell}>
      {content}
    </Animated.View>
  );
}

function CurateRowCard({
  row,
  index,
  total,
  accent,
  removing,
  onMoveUp,
  onMoveDown,
  onToggleVisible,
  onEdit,
  onRemove,
}: {
  row: BusinessShopCurateRow;
  index: number;
  total: number;
  accent: string;
  removing?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisible: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { colors } = useTheme();
  const kindLabel = row.itemKind === 'hotel' ? 'Otel' : 'Ürün';
  const kindIcon = row.itemKind === 'hotel' ? 'bed-outline' : 'pricetag-outline';

  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index * 40, 240)).duration(360).springify().damping(20)}>
      <View
        style={[
          styles.curateRow,
          {
            borderColor: row.isVisible ? `${accent}30` : colors.border,
            backgroundColor: colors.surfaceElevated,
            opacity: row.isVisible ? 1 : 0.72,
          },
        ]}
      >
        <View style={[styles.rankBadge, { backgroundColor: `${accent}18` }]}>
          <Text variant="caption" style={{ color: accent, fontWeight: '800' }}>
            {index + 1}
          </Text>
        </View>
        <View style={[styles.accentStripe, { backgroundColor: accent }]} />

        <View style={styles.rowTop}>
          {row.coverUrl ? (
            <Image source={{ uri: row.coverUrl }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: `${accent}14` }]}>
              <Ionicons name={kindIcon} size={22} color={accent} />
            </View>
          )}

          <View style={styles.rowCopy}>
            <View style={[styles.kindPill, { backgroundColor: `${accent}14` }]}>
              <Ionicons name={kindIcon} size={10} color={accent} />
              <Text variant="caption" style={{ color: accent, fontWeight: '700', fontSize: 10 }}>
                {kindLabel}
              </Text>
            </View>
            <Text variant="label" numberOfLines={2}>
              {row.title}
            </Text>
            <Text secondary variant="caption" numberOfLines={1}>
              {row.subtitle}
            </Text>
          </View>

          <View style={styles.reorderCol}>
            <Pressable
              onPress={onMoveUp}
              disabled={index === 0}
              style={({ pressed }) => [
                styles.reorderBtn,
                { borderColor: colors.border, backgroundColor: colors.surface },
                index === 0 && styles.reorderBtnDisabled,
                pressed && index > 0 && { opacity: 0.75 },
              ]}
            >
              <Ionicons name="chevron-up" size={16} color={index === 0 ? colors.textMuted : accent} />
            </Pressable>
            <Pressable
              onPress={onMoveDown}
              disabled={index === total - 1}
              style={({ pressed }) => [
                styles.reorderBtn,
                { borderColor: colors.border, backgroundColor: colors.surface },
                index === total - 1 && styles.reorderBtnDisabled,
                pressed && index < total - 1 && { opacity: 0.75 },
              ]}
            >
              <Ionicons name="chevron-down" size={16} color={index === total - 1 ? colors.textMuted : accent} />
            </Pressable>
          </View>
        </View>

        <View style={styles.rowFooter}>
          <View style={styles.rowFooterActions}>
            <Pressable onPress={onEdit} style={[styles.editChip, { borderColor: `${accent}33` }]}>
              <Ionicons name="create-outline" size={14} color={accent} />
              <Text variant="caption" style={{ color: accent, fontWeight: '700' }}>
                Düzenle
              </Text>
            </Pressable>

            <Pressable
              onPress={onRemove}
              disabled={removing}
              style={({ pressed }) => [
                styles.removeChip,
                { borderColor: `${colors.danger}44`, opacity: removing || pressed ? 0.65 : 1 },
              ]}
            >
              {removing ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={14} color={colors.danger} />
                  <Text variant="caption" style={{ color: colors.danger, fontWeight: '700' }}>
                    Kaldır
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={[styles.visibleChip, { backgroundColor: row.isVisible ? `${accent}10` : `${colors.border}44` }]}>
            <Ionicons
              name={row.isVisible ? 'eye-outline' : 'eye-off-outline'}
              size={14}
              color={row.isVisible ? accent : colors.textMuted}
            />
            <Text variant="caption" secondary={!row.isVisible} style={row.isVisible ? { color: accent, fontWeight: '600' } : undefined}>
              Vitrinde
            </Text>
            <Switch
              value={row.isVisible}
              onValueChange={onToggleVisible}
              trackColor={{ true: accent }}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export function BusinessShopCurateScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [rows, setRows] = useState<BusinessShopCurateRow[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [shopAccent, setShopAccent] = useState<string | null>(null);
  const [commerceMode, setCommerceMode] = useState<BusinessCommerceMode>('none');
  const [shopPublished, setShopPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const business = await fetchBusinessAccountByOwner(user.id);
    if (!business) {
      setLoading(false);
      return;
    }

    setBusinessId(business.id);
    setShopAccent(business.shopAccent);
    setCommerceMode(business.commerceMode);
    setShopPublished(business.shopPublished);

    const snapshot = await fetchBusinessShopSnapshot(business.id, { includeHiddenShowcase: true });
    if (!snapshot) {
      setRows([]);
      setLoading(false);
      return;
    }

    const showcase = await ensureBusinessShopShowcaseSynced(
      business.id,
      snapshot.products,
      snapshot.hotels,
    );
    setRows(buildBusinessShopCurateRows(snapshot.products, snapshot.hotels, showcase));
    setLoading(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
    setDirty(false);
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= rows.length) return;
    const next = [...rows];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    setRows(next);
    setDirty(true);
  };

  const toggleVisible = (index: number) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, isVisible: !row.isVisible } : row)),
    );
    setDirty(true);
  };

  const openEditor = (row: BusinessShopCurateRow) => {
    if (row.itemKind === 'product') {
      router.push(listingEditPath(row.itemId) as never);
      return;
    }
    router.push(hotelEditPath(row.itemId) as never);
  };

  const handleRemove = (row: BusinessShopCurateRow) => {
    if (!businessId || !user?.id) return;
    const label = row.itemKind === 'hotel' ? 'Otel' : 'Ürün';
    Alert.alert(
      `${label} kaldırılsın mı?`,
      `"${row.title}" mağazadan kaldırılacak ve vitrinde görünmeyecek.${row.itemKind === 'product' ? ' İsterseniz daha sonra İlanlarım bölümünden yeniden yayınlayabilirsiniz.' : ''}`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            setRemovingKey(row.key);
            const { error } = await removeBusinessShopItem(businessId, row.itemKind, row.itemId, user.id);
            setRemovingKey(null);
            if (error) {
              Alert.alert('Kaldırılamadı', error);
              return;
            }
            setRows((current) => current.filter((item) => item.key !== row.key));
            setDirty(false);
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    if (!businessId) return;
    setSaving(true);
    const { error } = await saveBusinessShopShowcase(
      businessId,
      curateRowsToShowcaseItems(businessId, rows),
    );
    setSaving(false);
    if (error) {
      Alert.alert('Kaydedilemedi', error);
      return;
    }
    setDirty(false);
    Alert.alert('Vitrin güncellendi', 'Mağaza sıralamanız yayına alındı.');
  };

  const accent = shopAccentColor(shopAccent);
  const showProducts = commerceModeShowsProducts(commerceMode);
  const showHotels = commerceModeShowsHotels(commerceMode);

  const stats = useMemo(() => {
    const visible = rows.filter((r) => r.isVisible).length;
    return { total: rows.length, visible, hidden: rows.length - visible };
  }, [rows]);

  if (!user) return null;

  if (!loading && !businessId) {
    return (
      <GradientBackground>
        <View style={[styles.centered, { paddingTop: insets.top + spacing.md }]}>
          <ScreenBackButton />
          <Text secondary>İşletme hesabı bulunamadı.</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: insets.bottom + (rows.length > 0 ? 100 : spacing.xxl),
          gap: spacing.md,
        }}
      >
        <ScreenBackButton />

        <Animated.View entering={FadeIn.duration(320)} style={styles.header}>
          <LinearGradient
            colors={
              isDark
                ? ([`${accent}55`, `${accent}22`, 'transparent'] as const)
                : ([`${accent}40`, `${accent}14`, 'transparent'] as const)
            }
            style={styles.hero}
          >
            <View style={styles.heroTop}>
              <LinearGradient colors={BUSINESS_GRADIENT} style={styles.heroIcon}>
                <Ionicons name="grid" size={22} color="#fff" />
              </LinearGradient>
              <View style={styles.heroCopy}>
                <Text variant="h3" style={styles.heroTitle}>
                  Mağaza vitrini
                </Text>
                <Text secondary variant="caption">
                  Sıralama · görünürlük · müşteri önizlemesi
                </Text>
              </View>
              {shopPublished ? (
                <View style={[styles.livePill, { backgroundColor: `${accent}18`, borderColor: `${accent}44` }]}>
                  <View style={[styles.liveDot, { backgroundColor: accent }]} />
                  <Text variant="caption" style={{ color: accent, fontWeight: '800', fontSize: 10 }}>
                    Yayında
                  </Text>
                </View>
              ) : (
                <View style={[styles.livePill, { backgroundColor: `${colors.warning}14`, borderColor: `${colors.warning}44` }]}>
                  <Text variant="caption" style={{ color: colors.warning, fontWeight: '700', fontSize: 10 }}>
                    Taslak
                  </Text>
                </View>
              )}
            </View>

            {!loading ? (
              <View style={styles.statsRow}>
                <StatPill icon="layers-outline" label="Toplam" value={stats.total} accent={accent} />
                <StatPill icon="eye-outline" label="Görünür" value={stats.visible} accent={accent} />
                <StatPill icon="eye-off-outline" label="Gizli" value={stats.hidden} accent={accent} />
              </View>
            ) : null}
          </LinearGradient>
        </Animated.View>

        {businessId ? (
          <View style={styles.actionGrid}>
            <ActionCard
              icon="eye-outline"
              title="Müşteri önizlemesi"
              subtitle="Canlı mağaza vitrinini görüntüle"
              accent={accent}
              variant="filled"
              delay={80}
              onPress={() => router.push(BUSINESS_ROUTES.shop(businessId) as never)}
            />
            {showProducts ? (
              <ActionCard
                icon="add-circle-outline"
                title="Ürün ekle"
                subtitle="Yeni ürünü mağazaya yükle"
                accent={accent}
                variant="dashed"
                delay={120}
                onPress={() => router.push(BUSINESS_ROUTES.createProduct as never)}
              />
            ) : null}
            {showHotels ? (
              <ActionCard
                icon="bed-outline"
                title="Otel ekle"
                subtitle="Oda tipleriyle rezervasyonlu vitrin"
                accent="#5C6BC0"
                variant="outline"
                delay={160}
                onPress={() => router.push(BUSINESS_ROUTES.hotelCreate as never)}
              />
            ) : null}
            <ActionCard
              icon="storefront-outline"
              title="İşletme paneli"
              subtitle="Satış, komisyon ve ayarlar"
              accent={accent}
              variant="outline"
              delay={200}
              onPress={() => router.push(BUSINESS_ROUTES.account as never)}
            />
          </View>
        ) : null}

        {loading && !refreshing ? (
          <ActivityIndicator color={accent} style={{ marginTop: spacing.lg }} />
        ) : rows.length === 0 ? (
          <Animated.View entering={FadeInUp.delay(180).duration(400).springify()}>
            <GlassCard style={[styles.emptyCard, { borderColor: `${accent}33` }]}>
              <LinearGradient colors={[`${accent}22`, `${accent}08`]} style={styles.emptyIconWrap}>
                <Ionicons name="bag-handle-outline" size={36} color={accent} />
              </LinearGradient>
              <Text variant="label">Vitrin henüz boş</Text>
              <Text secondary variant="caption" style={styles.emptyText}>
                Ürün veya otel ekledikten sonra burada sıralayın ve hangilerinin müşteriye görüneceğini seçin.
              </Text>
              <View style={styles.emptyActions}>
                {showProducts ? (
                  <Pressable
                    onPress={() => router.push(BUSINESS_ROUTES.createProduct as never)}
                    style={({ pressed }) => [
                      styles.emptyCta,
                      { backgroundColor: accent, opacity: pressed ? 0.9 : 1 },
                    ]}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text variant="caption" style={styles.emptyCtaText}>
                      İlk ürünü ekle
                    </Text>
                  </Pressable>
                ) : null}
                {showHotels ? (
                  <Pressable
                    onPress={() => router.push(BUSINESS_ROUTES.hotelCreate as never)}
                    style={({ pressed }) => [
                      styles.emptyCtaOutline,
                      { borderColor: `${accent}44`, opacity: pressed ? 0.88 : 1 },
                    ]}
                  >
                    <Ionicons name="bed-outline" size={16} color={accent} />
                    <Text variant="caption" style={{ color: accent, fontWeight: '700' }}>
                      Otel ekle
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </GlassCard>
          </Animated.View>
        ) : (
          <View style={styles.listSection}>
            <BusinessShopSectionHeader
              title="Vitrin öğeleri"
              itemCount={rows.length}
              accent={accent}
              showLive={shopPublished}
            />
            <Text secondary variant="caption" style={styles.listHint}>
              Yukarıdakiler müşteriye önce görünür. Gizlediğiniz öğeler vitrinde listelenmez. Kaldırdığınız ürünler mağazadan tamamen çıkar.
            </Text>
            <View style={styles.list}>
              {rows.map((row, index) => (
                <CurateRowCard
                  key={row.key}
                  row={row}
                  index={index}
                  total={rows.length}
                  accent={accent}
                  removing={removingKey === row.key}
                  onMoveUp={() => moveRow(index, -1)}
                  onMoveDown={() => moveRow(index, 1)}
                  onToggleVisible={() => toggleVisible(index)}
                  onEdit={() => openEditor(row)}
                  onRemove={() => handleRemove(row)}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {rows.length > 0 ? (
        <View
          style={[
            styles.stickyBar,
            {
              paddingBottom: insets.bottom + spacing.sm,
              borderTopColor: colors.border,
              backgroundColor: `${colors.surface}F5`,
            },
          ]}
        >
          {dirty ? (
            <Text variant="caption" style={{ color: accent, fontWeight: '600', textAlign: 'center' }}>
              Kaydedilmemiş değişiklikler var
            </Text>
          ) : null}
          <Pressable
            onPress={() => void handleSave()}
            disabled={saving || !dirty}
            style={({ pressed }) => [{ opacity: saving || !dirty ? 0.55 : pressed ? 0.9 : 1 }]}
          >
            <LinearGradient
              colors={dirty ? [BUSINESS_GRADIENT[0], BUSINESS_GRADIENT[1]] : [`${colors.border}`, `${colors.border}`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveBtn}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name={dirty ? 'save-outline' : 'checkmark-circle'} size={20} color="#fff" />
                  <Text variant="label" style={{ color: '#fff' }}>
                    {dirty ? 'Vitrini kaydet' : 'Güncel'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      ) : null}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, padding: spacing.lg, gap: spacing.md },
  header: { marginBottom: spacing.xs },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1, gap: 2 },
  heroTitle: { fontWeight: '800', letterSpacing: -0.4 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCopy: { flex: 1, gap: 1 },
  actionGrid: { gap: spacing.sm },
  actionCell: { width: '100%' },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconFilled: { backgroundColor: 'rgba(255,255,255,0.22)' },
  actionCopy: { flex: 1, gap: 2, minWidth: 0 },
  actionTitleFilled: { color: '#fff', fontWeight: '800' },
  actionSubtitleFilled: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderWidth: 1,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyText: { textAlign: 'center', lineHeight: 20 },
  emptyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm, justifyContent: 'center' },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  emptyCtaText: { color: '#fff', fontWeight: '800' },
  emptyCtaOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  listSection: { gap: spacing.sm },
  listHint: { lineHeight: 18 },
  list: { gap: spacing.sm },
  curateRow: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden',
    position: 'relative',
    paddingLeft: spacing.md + 6,
  },
  rankBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    minWidth: 26,
    height: 26,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    zIndex: 1,
  },
  accentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: radius.xl,
    borderBottomLeftRadius: radius.xl,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingRight: spacing.xl },
  thumb: { width: 64, height: 64, borderRadius: radius.lg },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, gap: 4, minWidth: 0 },
  kindPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  reorderCol: { gap: 4 },
  reorderBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderBtnDisabled: { opacity: 0.35 },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  rowFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  removeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    minWidth: 72,
    justifyContent: 'center',
  },
  visibleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
  },
});
