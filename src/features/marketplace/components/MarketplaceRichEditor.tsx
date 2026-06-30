import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  MARKETPLACE_ACCENT,
  MARKETPLACE_MAX_DESCRIPTION_LENGTH,
  MARKETPLACE_MIN_DESCRIPTION_LENGTH,
} from '@/features/marketplace/constants';
import { descriptionPlainText } from '@/features/marketplace/services/descriptionBlocks';
import type { MarketplaceDescriptionBlock } from '@/features/marketplace/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  text: string;
  blocks: MarketplaceDescriptionBlock[];
  onTextChange: (value: string) => void;
  onBlocksChange: (blocks: MarketplaceDescriptionBlock[]) => void;
  onUploadMedia: (localUris: string[]) => Promise<string[]>;
  maxAttachments?: number;
};

type PendingMedia = {
  uri: string;
  kind: 'image' | 'video';
};

export function MarketplaceRichEditor({
  text,
  blocks,
  onTextChange,
  onBlocksChange,
  onUploadMedia,
  maxAttachments = 6,
}: Props) {
  const { colors } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');

  const plainLength = useMemo(() => descriptionPlainText(text, blocks).length, [text, blocks]);
  const attachmentBlocks = blocks.filter((b) => b.type === 'image' || b.type === 'video');
  const linkBlocks = blocks.filter((b) => b.type === 'link');

  const saveLink = () => {
    const trimmed = linkUrl.trim();
    if (!trimmed.startsWith('http')) return;
    onBlocksChange([
      ...blocks,
      { type: 'link', label: linkLabel.trim() || trimmed, url: trimmed },
    ]);
    setLinkUrl('');
    setLinkLabel('');
    setLinkOpen(false);
  };

  const pickMedia = async (kind: 'image' | 'video') => {
    if (attachmentBlocks.length + pendingMedia.length >= maxAttachments) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'video' ? ['videos'] : ['images'],
      quality: 0.85,
      videoMaxDuration: 60,
    });
    if (result.canceled || !result.assets[0]?.uri) return;

    const localUri = result.assets[0].uri;
    setPendingMedia((prev) => [...prev, { uri: localUri, kind }]);
    setUploading(true);

    const urls = await onUploadMedia([localUri]);
    setPendingMedia((prev) => prev.filter((item) => item.uri !== localUri));
    setUploading(false);

    if (!urls[0]) return;
    onBlocksChange([
      ...blocks,
      { type: kind, url: urls[0] } as MarketplaceDescriptionBlock,
    ]);
  };

  const removeBlock = (index: number) => {
    onBlocksChange(blocks.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.editor, { backgroundColor: `${colors.surface}CC`, borderColor: colors.border }]}>
        <TextInput
          value={text}
          onChangeText={onTextChange}
          placeholder="Ürününüzü anlatın — durum, kullanım, teslim detayları..."
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          style={[styles.input, { color: colors.text }]}
        />

        {attachmentBlocks.length > 0 || pendingMedia.length > 0 ? (
          <View style={[styles.previewStrip, { borderTopColor: colors.border }]}>
            <Text secondary variant="caption" style={styles.previewLabel}>
              Eklenen medya
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
              {pendingMedia.map((item) => (
                <View key={`pending-${item.uri}`} style={styles.mediaThumbWrap}>
                  {item.kind === 'image' ? (
                    <Image source={{ uri: item.uri }} style={styles.mediaThumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.mediaThumb, styles.videoThumb, { backgroundColor: `${MARKETPLACE_ACCENT}22` }]}>
                      <Ionicons name="videocam" size={22} color={MARKETPLACE_ACCENT} />
                    </View>
                  )}
                  <View style={styles.mediaLoading}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                </View>
              ))}
              {attachmentBlocks.map((block, index) => (
                <View key={`${block.type}-${block.url}-${index}`} style={styles.mediaThumbWrap}>
                  {block.type === 'image' ? (
                    <Image source={{ uri: block.url }} style={styles.mediaThumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.mediaThumb, styles.videoThumb, { backgroundColor: `${MARKETPLACE_ACCENT}22` }]}>
                      <Ionicons name="play-circle" size={28} color={MARKETPLACE_ACCENT} />
                    </View>
                  )}
                  <Pressable
                    style={styles.mediaRemove}
                    onPress={() => removeBlock(blocks.indexOf(block))}
                    hitSlop={6}
                  >
                    <Ionicons name="close-circle" size={18} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={[styles.toolbar, { borderTopColor: colors.border }]}>
          <ToolbarBtn icon="link-outline" label="Link" onPress={() => setLinkOpen(true)} />
          <ToolbarBtn icon="image-outline" label="Foto" onPress={() => pickMedia('image')} disabled={uploading} />
          <ToolbarBtn icon="videocam-outline" label="Video" onPress={() => pickMedia('video')} disabled={uploading} />
          <Text secondary variant="caption" style={styles.counter}>
            {plainLength}/{MARKETPLACE_MAX_DESCRIPTION_LENGTH}
          </Text>
        </View>
      </View>

      {plainLength > 0 && plainLength < MARKETPLACE_MIN_DESCRIPTION_LENGTH ? (
        <Text variant="caption" style={{ color: colors.warning }}>
          En az {MARKETPLACE_MIN_DESCRIPTION_LENGTH} karakter önerilir.
        </Text>
      ) : null}

      {linkBlocks.length ? (
        <View style={styles.attachSection}>
          <Text variant="caption" secondary>
            Bağlantılar
          </Text>
          {linkBlocks.map((block, index) =>
            block.type === 'link' ? (
              <View key={`link-${index}`} style={[styles.linkRow, { borderColor: colors.border }]}>
                <Ionicons name="link-outline" size={14} color={MARKETPLACE_ACCENT} />
                <Text variant="caption" style={{ flex: 1, color: MARKETPLACE_ACCENT }} numberOfLines={1}>
                  {block.label}
                </Text>
                <Pressable onPress={() => removeBlock(blocks.indexOf(block))} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : null,
          )}
        </View>
      ) : null}

      <Modal visible={linkOpen} transparent animationType={resolveModalAnimationType('fade')} onRequestClose={() => setLinkOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setLinkOpen(false)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text variant="label">Link ekle</Text>
            <TextInput
              value={linkUrl}
              onChangeText={setLinkUrl}
              placeholder="https://..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
            />
            <TextInput
              value={linkLabel}
              onChangeText={setLinkLabel}
              placeholder="Görünecek metin (isteğe bağlı)"
              placeholderTextColor={colors.textMuted}
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setLinkOpen(false)}>
                <Text variant="label" secondary>
                  İptal
                </Text>
              </Pressable>
              <Pressable onPress={saveLink}>
                <Text variant="label" style={{ color: MARKETPLACE_ACCENT }}>
                  Ekle
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ToolbarBtn({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.toolBtn, { opacity: pressed || disabled ? 0.6 : 1 }]}>
      <Ionicons name={icon} size={16} color={MARKETPLACE_ACCENT} />
      <Text variant="caption" style={{ color: MARKETPLACE_ACCENT, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  editor: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  input: {
    minHeight: 120,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
  },
  previewStrip: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  previewLabel: { fontWeight: '600' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.xs },
  counter: { marginLeft: 'auto' },
  attachSection: { gap: spacing.xs },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mediaRow: { gap: spacing.sm, paddingBottom: spacing.xs },
  mediaThumbWrap: { position: 'relative' },
  mediaThumb: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  videoThumb: { alignItems: 'center', justifyContent: 'center' },
  mediaLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: radius.md,
  },
  mediaRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
});
