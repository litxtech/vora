import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardPersistButton } from '@/components/keyboard';
import { Text } from '@/components/ui/Text';
import { isVideoUrl } from '@/features/marketplace/services/descriptionBlocks';
import { MARKETPLACE_ACCENT } from '@/features/marketplace/constants';
import type { MarketplaceCommentKind } from '@/features/marketplace/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  value: string;
  onChange: (value: string) => void;
  mediaUris: string[];
  onMediaChange: (uris: string[]) => void;
  commentKind: MarketplaceCommentKind;
  onCommentKindChange: (kind: MarketplaceCommentKind) => void;
  canShareBuyerProof: boolean;
  onSubmit: () => void;
  submitting?: boolean;
};

export function MarketplaceCommentComposer({
  value,
  onChange,
  mediaUris,
  onMediaChange,
  commentKind,
  onCommentKindChange,
  canShareBuyerProof,
  onSubmit,
  submitting,
}: Props) {
  const { colors } = useTheme();
  const canSend = value.trim().length > 0 || mediaUris.length > 0;

  const pickMedia = async (kind: 'image' | 'video') => {
    if (mediaUris.length >= 4) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'video' ? ['videos'] : ['images'],
      quality: 0.85,
      videoMaxDuration: 45,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      onMediaChange([...mediaUris, result.assets[0].uri]);
    }
  };

  return (
    <View style={styles.wrap}>
      {canShareBuyerProof ? (
        <View style={styles.kindRow}>
          <KindChip
            active={commentKind === 'general'}
            label="Soru / yorum"
            onPress={() => onCommentKindChange('general')}
          />
          <KindChip
            active={commentKind === 'buyer_proof'}
            label="Aldığım ürün"
            icon="bag-check-outline"
            onPress={() => onCommentKindChange('buyer_proof')}
          />
        </View>
      ) : null}

      {commentKind === 'buyer_proof' ? (
        <Text secondary variant="caption">
          Satın aldığınız ürünün fotoğraf veya videosunu paylaşın — diğer alıcılar için faydalı olur.
        </Text>
      ) : null}

      {mediaUris.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
          {mediaUris.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.thumbWrap}>
              {isVideoUrl(uri) ? (
                <View style={[styles.thumb, styles.videoThumb, { backgroundColor: `${MARKETPLACE_ACCENT}22` }]}>
                  <Ionicons name="play" size={18} color={MARKETPLACE_ACCENT} />
                </View>
              ) : (
                <Image source={{ uri }} style={styles.thumb} />
              )}
              <Pressable
                style={styles.remove}
                onPress={() => onMediaChange(mediaUris.filter((_, i) => i !== index))}
              >
                <Ionicons name="close-circle" size={16} color="#fff" />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: `${colors.surface}CC` }]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={commentKind === 'buyer_proof' ? 'Ürün deneyiminizi yazın...' : 'Satıcıya soru sor...'}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }]}
          multiline
          submitBehavior="submit"
          returnKeyType="send"
          enterKeyHint="send"
          blurOnSubmit={false}
          onSubmitEditing={onSubmit}
        />
        <View style={styles.actions}>
          <Pressable onPress={() => pickMedia('image')} hitSlop={6}>
            <Ionicons name="image-outline" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => pickMedia('video')} hitSlop={6}>
            <Ionicons name="videocam-outline" size={18} color={colors.textMuted} />
          </Pressable>
          <KeyboardPersistButton
            onPress={onSubmit}
            disabled={!canSend || submitting}
            accessibilityLabel="Gönder"
            style={[
              styles.send,
              { backgroundColor: canSend ? MARKETPLACE_ACCENT : `${colors.border}88` },
            ]}
          >
            <Ionicons name="send" size={14} color={canSend ? '#fff' : colors.textMuted} />
          </KeyboardPersistButton>
        </View>
      </View>
    </View>
  );
}

function KindChip({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.kindChip,
        {
          backgroundColor: active ? `${MARKETPLACE_ACCENT}20` : `${colors.surface}AA`,
          borderColor: active ? MARKETPLACE_ACCENT : colors.border,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={12} color={active ? MARKETPLACE_ACCENT : colors.textMuted} /> : null}
      <Text variant="caption" style={{ color: active ? MARKETPLACE_ACCENT : colors.text, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  kindRow: { flexDirection: 'row', gap: spacing.sm },
  kindChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mediaRow: { gap: spacing.sm },
  thumbWrap: { position: 'relative' },
  thumb: { width: 56, height: 56, borderRadius: radius.md },
  videoThumb: { alignItems: 'center', justifyContent: 'center' },
  remove: { position: 'absolute', top: -4, right: -4 },
  inputRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  input: { flex: 1, minHeight: 40, maxHeight: 100, fontSize: 14, paddingVertical: spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: 4 },
  send: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
