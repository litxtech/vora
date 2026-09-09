import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaEditorBottomSheet } from '@/features/compose/components/MediaEditorBottomSheet';
import { useMediaEditorSheetTopInset } from '@/features/compose/hooks/useMediaEditorSheetTopInset';
import { Text } from '@/components/ui/Text';
import {
  DEFAULT_STORY_LINK_COLOR,
  STORY_MAX_LINKS,
} from '@/features/stories/constants/storyLinkColors';
import {
  createStoryLink,
  type StoryLinkManifest,
} from '@/features/stories/utils/storyLinks';
import { normalizeLinkInput } from '@/lib/linking/openUrl';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type StoryLinkSheetProps = {
  visible: boolean;
  links: StoryLinkManifest[];
  onChange: (links: StoryLinkManifest[]) => void;
  onClose: () => void;
};

function labelFromUrl(url: string): string {
  try {
    const parsed = new URL(normalizeLinkInput(url));
    const host = parsed.hostname.replace(/^www\./i, '');
    return host.split('.')[0]?.slice(0, 24) || 'Bağlantı';
  } catch {
    return 'Bağlantı';
  }
}

export function StoryLinkSheet({ visible, links, onChange, onClose }: StoryLinkSheetProps) {
  const { colors } = useTheme();
  const sheetTopInset = useMediaEditorSheetTopInset();
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setUrl('');
      setLabel('');
      setEditingId(null);
    }
  }, [visible]);

  const startEdit = useCallback((link: StoryLinkManifest) => {
    setEditingId(link.id);
    setUrl(link.url);
    setLabel(link.label);
  }, []);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setUrl('');
    setLabel('');
  }, []);

  const handleSave = useCallback(() => {
    const normalized = normalizeLinkInput(url);
    if (!normalized) {
      Alert.alert('Geçersiz link', 'Lütfen geçerli bir web adresi girin.');
      return;
    }

    const nextLabel = label.trim() || labelFromUrl(normalized);

    if (editingId) {
      onChange(
        links.map((link) =>
          link.id === editingId
            ? {
                ...link,
                url: normalized,
                label: nextLabel,
                backgroundColor: DEFAULT_STORY_LINK_COLOR.backgroundColor,
                textColor: DEFAULT_STORY_LINK_COLOR.textColor,
              }
            : link,
        ),
      );
      resetForm();
      return;
    }

    if (links.length >= STORY_MAX_LINKS) {
      Alert.alert('Limit', `En fazla ${STORY_MAX_LINKS} link ekleyebilirsiniz.`);
      return;
    }

    onChange([
      ...links,
      createStoryLink({
        url: normalized,
        label: nextLabel,
        index: links.length,
        backgroundColor: DEFAULT_STORY_LINK_COLOR.backgroundColor,
        textColor: DEFAULT_STORY_LINK_COLOR.textColor,
      }),
    ]);
    resetForm();
  }, [editingId, label, links, onChange, resetForm, url]);

  const handleRemove = useCallback(
    (id: string) => {
      onChange(links.filter((link) => link.id !== id));
      if (editingId === id) resetForm();
    },
    [editingId, links, onChange, resetForm],
  );

  return (
    <MediaEditorBottomSheet
      visible={visible}
      onClose={onClose}
      title="Web bağlantısı"
      topInset={sheetTopInset}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
      >
      {links.length > 0 ? (
        <View style={styles.list}>
          {links.map((link) => {
            const active = editingId === link.id;
            return (
              <Pressable
                key={link.id}
                style={[
                  styles.linkRow,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
                onPress={() => startEdit(link)}
              >
                <View style={[styles.colorDot, { backgroundColor: link.backgroundColor }]} />
                <View style={styles.linkMeta}>
                  <Text variant="caption" style={[styles.linkLabel, { color: colors.text }]} numberOfLines={1}>
                    {link.label}
                  </Text>
                  <Text
                    variant="caption"
                    style={[styles.linkUrl, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {link.url}
                  </Text>
                </View>
                <Pressable onPress={() => handleRemove(link.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {links.length === 1 ? (
        <View style={[styles.hintBox, { backgroundColor: `${colors.primary}12` }]}>
          <Ionicons name="chevron-up" size={16} color={colors.primary} />
          <Text variant="caption" style={[styles.hintText, { color: colors.textSecondary }]}>
            Tek link yukarı kaydırma ile açılır
          </Text>
        </View>
      ) : links.length > 1 ? (
        <View style={[styles.hintBox, { backgroundColor: `${colors.primary}12` }]}>
          <Ionicons name="move-outline" size={16} color={colors.primary} />
          <Text variant="caption" style={[styles.hintText, { color: colors.textSecondary }]}>
            Butonları önizlemede istediğiniz yere sürükleyin
          </Text>
        </View>
      ) : null}

      <Text variant="caption" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        {editingId ? 'Linki düzenle' : 'Yeni link'}
      </Text>
      <TextInput
        value={url}
        onChangeText={(text) => {
          setUrl(text);
          if (!label.trim()) setLabel(labelFromUrl(text));
        }}
        placeholder="https://ornek.com"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      />
      <TextInput
        value={label}
        onChangeText={setLabel}
        placeholder="Buton metni"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      />

      <View style={styles.actions}>
        {editingId ? (
          <Pressable
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            onPress={resetForm}
          >
            <Text variant="caption" style={{ color: colors.textSecondary, fontWeight: '600' }}>
              İptal
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
        >
          <Text variant="label" style={styles.primaryText}>
            {editingId ? 'Güncelle' : 'Link ekle'}
          </Text>
        </Pressable>
      </View>
      </ScrollView>
    </MediaEditorBottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  linkMeta: {
    flex: 1,
    gap: 2,
  },
  linkLabel: {
    fontWeight: '700',
  },
  linkUrl: {
    fontSize: 11,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  hintText: {
    flex: 1,
  },
  fieldLabel: {
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.sm,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  primaryBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: radius.full,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
