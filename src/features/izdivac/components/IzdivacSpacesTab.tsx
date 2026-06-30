import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { IzdivacFormSheet, IzdivacSheetPrimaryButton } from '@/features/izdivac/components/IzdivacFormSheet';
import { IZDIVAC_ACCENT, IZDIVAC_GRADIENT, IZDIVAC_SPACE_TYPE_LABELS } from '@/features/izdivac/constants';
import { createIzdivacSpace, joinIzdivacSpace } from '@/features/izdivac/services/izdivacEcosystem';
import { useIzdivacSpaces } from '@/features/izdivac/hooks/useIzdivacSpaces';
import type { IzdivacSpace, IzdivacSpaceType } from '@/features/izdivac/types';
import { openIzdivacChat } from '@/features/izdivac/services/izdivacMessagingNavigation';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const SPACE_TYPE_ICON: Record<IzdivacSpaceType, keyof typeof Ionicons.glyphMap> = {
  open: 'chatbubbles',
  invite_only: 'lock-closed',
  plan: 'calendar',
};

/** Son 10 dakika içinde hareket varsa alan "canlı" sayılır. */
const LIVE_WINDOW_MS = 10 * 60_000;

function formatSpaceActivity(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'şimdi aktif';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

function LiveDot() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const haloStyle = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
  };

  return (
    <View style={styles.liveDotWrap}>
      <Animated.View style={[styles.liveHalo, haloStyle]} />
      <View style={styles.liveCore} />
    </View>
  );
}

function SpaceCard({ space, onOpen }: { space: IzdivacSpace; onOpen: () => void }) {
  const { colors, isDark } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const isLive = Date.now() - new Date(space.lastActivityAt).getTime() < LIVE_WINDOW_MS;
  const initial = space.creatorFirstName?.trim().slice(0, 1).toUpperCase() || '?';
  const typeLabel = IZDIVAC_SPACE_TYPE_LABELS[space.spaceType] ?? space.spaceType;

  const press = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onOpen}
        onPressIn={() => press(0.97)}
        onPressOut={() => press(1)}
        style={[
          styles.card,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
            borderColor: isLive ? `${IZDIVAC_ACCENT}40` : colors.border,
          },
        ]}
      >
        <LinearGradient
          colors={IZDIVAC_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.accentBar}
        />

        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <LinearGradient colors={IZDIVAC_GRADIENT} style={styles.iconWrap}>
              <Ionicons name={SPACE_TYPE_ICON[space.spaceType] ?? 'chatbubbles'} size={16} color="#fff" />
            </LinearGradient>

            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.titleRow}>
                <Text variant="caption" style={{ fontWeight: '800', flexShrink: 1 }} numberOfLines={1}>
                  {space.title}
                </Text>
                {isLive ? (
                  <View style={[styles.livePill, { backgroundColor: `${IZDIVAC_ACCENT}1A` }]}>
                    <LiveDot />
                    <Text variant="caption" style={{ color: IZDIVAC_ACCENT, fontSize: 9, fontWeight: '800' }}>
                      CANLI
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.metaRow}>
                <View style={[styles.typeChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
                  <Ionicons name={SPACE_TYPE_ICON[space.spaceType] ?? 'chatbubbles'} size={9} color={colors.textSecondary} />
                  <Text secondary variant="caption" style={{ fontSize: 9, fontWeight: '600' }}>
                    {typeLabel}
                  </Text>
                </View>
                <Ionicons name="ellipse" size={3} color={colors.textMuted} />
                <Ionicons name="time-outline" size={10} color={colors.textMuted} />
                <Text secondary variant="caption" style={{ fontSize: 9 }}>
                  {formatSpaceActivity(space.lastActivityAt)}
                </Text>
              </View>
            </View>

            {space.isMember ? (
              <View style={[styles.memberPill, { backgroundColor: `${IZDIVAC_ACCENT}18` }]}>
                <Ionicons name="checkmark" size={9} color={IZDIVAC_ACCENT} />
                <Text variant="caption" style={{ color: IZDIVAC_ACCENT, fontSize: 9, fontWeight: '800' }}>
                  Üye
                </Text>
              </View>
            ) : (
              <View style={[styles.joinBtn, { backgroundColor: `${IZDIVAC_ACCENT}12` }]}>
                <Ionicons name="add" size={14} color={IZDIVAC_ACCENT} />
              </View>
            )}
          </View>

          {space.description ? (
            <Text secondary variant="caption" numberOfLines={2} style={{ fontSize: 11, lineHeight: 15 }}>
              {space.description}
            </Text>
          ) : null}

          <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
            <View style={styles.creatorRow}>
              {space.creatorAvatarUrl ? (
                <Image source={{ uri: space.creatorAvatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: `${IZDIVAC_ACCENT}22` }]}>
                  <Text variant="caption" style={{ color: IZDIVAC_ACCENT, fontSize: 9, fontWeight: '800' }}>
                    {initial}
                  </Text>
                </View>
              )}
              <Text secondary variant="caption" style={{ fontSize: 10 }} numberOfLines={1}>
                {space.creatorFirstName || 'Üye'}
              </Text>
            </View>

            <View style={styles.memberCount}>
              <Ionicons name="people" size={11} color={IZDIVAC_ACCENT} />
              <Text variant="caption" style={{ fontSize: 10, fontWeight: '700', color: IZDIVAC_ACCENT }}>
                {space.memberCount}
              </Text>
              <Text secondary variant="caption" style={{ fontSize: 10 }}>
                üye
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function IzdivacSpacesTab() {
  const { colors, isDark } = useTheme();
  const { spaces, loading, error, refresh } = useIzdivacSpaces();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const closeCreate = () => {
    if (submitting) return;
    setCreateOpen(false);
  };

  const openSpace = async (space: IzdivacSpace) => {
    if (space.isMember) {
      openIzdivacChat(space.conversationId);
      return;
    }
    const { conversationId, error: joinError } = await joinIzdivacSpace(space.spaceId);
    if (joinError) {
      Alert.alert('Alan', joinError);
      return;
    }
    if (conversationId) openIzdivacChat(conversationId);
    void refresh();
  };

  const createSpace = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert('Alan', 'Alan adı gerekli.');
      return;
    }
    setSubmitting(true);
    const { spaceId, error: createError } = await createIzdivacSpace({
      title: trimmed,
      description: description.trim() || null,
      spaceType: 'open',
    });
    setSubmitting(false);
    if (createError) {
      Alert.alert('Alan oluşturulamadı', createError);
      return;
    }
    setCreateOpen(false);
    setTitle('');
    setDescription('');
    await refresh();
    if (spaceId) {
      const joined = await joinIzdivacSpace(spaceId);
      if (joined.conversationId) openIzdivacChat(joined.conversationId);
    }
  };

  const inputStyle = [
    styles.input,
    {
      color: colors.text,
      borderColor: colors.border,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.surface,
    },
  ];

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setCreateOpen(true)}
        style={[styles.createBtn, { backgroundColor: `${IZDIVAC_ACCENT}12`, borderColor: `${IZDIVAC_ACCENT}30` }]}
      >
        <Ionicons name="add" size={14} color={IZDIVAC_ACCENT} />
        <Text variant="caption" style={{ color: IZDIVAC_ACCENT, fontWeight: '700', fontSize: 11 }}>
          Görüşme alanı oluştur
        </Text>
      </Pressable>

      <FlatList
        data={spaces}
        keyExtractor={(item) => item.spaceId}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={IZDIVAC_ACCENT} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={IZDIVAC_ACCENT} style={{ marginTop: spacing.lg }} />
          ) : (
            <Text secondary variant="caption" style={{ textAlign: 'center', marginTop: spacing.lg, fontSize: 11 }}>
              Henüz görüşme alanı yok.
            </Text>
          )
        }
        renderItem={({ item }) => <SpaceCard space={item} onOpen={() => void openSpace(item)} />}
        ListFooterComponent={
          error ? (
            <Text variant="caption" style={{ color: colors.danger, textAlign: 'center', fontSize: 11 }}>
              {error}
            </Text>
          ) : null
        }
      />

      <IzdivacFormSheet
        visible={createOpen}
        title="Yeni görüşme alanı"
        subtitle="Açık alan oluşturun; üyeler katılıp sohbet edebilir."
        onClose={closeCreate}
        footer={
          <IzdivacSheetPrimaryButton
            label="Oluştur"
            onPress={() => void createSpace()}
            loading={submitting}
            disabled={!title.trim()}
          />
        }
      >
        <Text variant="caption" secondary style={styles.fieldLabel}>
          Alan adı
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Örn. Akşam sohbeti"
          placeholderTextColor={colors.textMuted}
          style={inputStyle}
          returnKeyType="next"
        />
        <Text variant="caption" secondary style={styles.fieldLabel}>
          Açıklama (opsiyonel)
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Kısa bir tanım yazın"
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          style={[inputStyle, styles.textArea]}
        />
      </IzdivacFormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: spacing.xs },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  accentBar: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    padding: spacing.sm,
    paddingLeft: spacing.sm + 2,
    gap: spacing.xs,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  liveDotWrap: {
    width: 6,
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveHalo: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: IZDIVAC_ACCENT,
  },
  liveCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: IZDIVAC_ACCENT,
  },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  joinBtn: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    marginTop: 2,
  },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCount: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  fieldLabel: {
    marginLeft: 2,
    fontSize: 11,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
