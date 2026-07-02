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
import { Text } from '@/components/ui/Text';
import {
  DEFAULT_STORY_LINK_COLOR,
  STORY_LINK_COLOR_PRESETS,
  STORY_MAX_LINKS,
} from '@/features/stories/constants/storyLinkColors';
import {
  createStoryLink,
  type StoryLinkManifest,
} from '@/features/stories/utils/storyLinks';
import { normalizeLinkInput } from '@/lib/linking/openUrl';
import { spacing } from '@/constants/theme';
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
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState(DEFAULT_STORY_LINK_COLOR);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setUrl('');
      setLabel('');
      setEditingId(null);
      setSelectedColor(DEFAULT_STORY_LINK_COLOR);
    }
  }, [visible]);

  const startEdit = useCallback((link: StoryLinkManifest) => {
    setEditingId(link.id);
    setUrl(link.url);
    setLabel(link.label);
    const preset =
      STORY_LINK_COLOR_PRESETS.find((p) => p.backgroundColor === link.backgroundColor) ??
      DEFAULT_STORY_LINK_COLOR;
    setSelectedColor(preset);
  }, []);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setUrl('');
    setLabel('');
    setSelectedColor(DEFAULT_STORY_LINK_COLOR);
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
                backgroundColor: selectedColor.backgroundColor,
                textColor: selectedColor.textColor,
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
        backgroundColor: selectedColor.backgroundColor,
        textColor: selectedColor.textColor,
      }),
    ]);
    resetForm();
  }, [editingId, label, links, onChange, resetForm, selectedColor, url]);

  const handleRemove = useCallback(
    (id: string) => {
      onChange(links.filter((link) => link.id !== id));
      if (editingId === id) resetForm();
    },
    [editingId, links, onChange, resetForm],
  );

  return (
    <MediaEditorBottomSheet visible={visible} onClose={onClose} title="Web bağlantısı">
      {links.length > 0 ? (
        <View style={styles.list}>
          {links.map((link) => {
            const active = editingId === link.id;
            return (
              <Pressable
                key={link.id}
                style={[styles.linkRow, active && { borderColor: colors.primary }]}
                onPress={() => startEdit(link)}
              >
                <View style={[styles.colorDot, { backgroundColor: link.backgroundColor }]} />
                <View style={styles.linkMeta}>
                  <Text variant="caption" style={styles.linkLabel} numberOfLines={1}>
                    {link.label}
                  </Text>
                  <Text variant="caption" style={styles.linkUrl} numberOfLines={1}>
                    {link.url}
                  </Text>
                </View>
                <Pressable onPress={() => handleRemove(link.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.65)" />
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {links.length === 1 ? (
        <View style={styles.hintBox}>
          <Ionicons name="chevron-up" size={16} color={colors.primary} />
          <Text variant="caption" style={styles.hintText}>
            Tek link yukarı kaydırma ile açılır
          </Text>
        </View>
      ) : links.length > 1 ? (
        <View style={styles.hintBox}>
          <Ionicons name="move-outline" size={16} color={colors.primary} />
          <Text variant="caption" style={styles.hintText}>
            Butonları önizlemede istediğiniz yere sürükleyin
          </Text>
        </View>
      ) : null}

      <Text variant="caption" style={styles.fieldLabel}>
        {editingId ? 'Linki düzenle' : 'Yeni link'}
      </Text>
      <TextInput
        value={url}
        onChangeText={(text) => {
          setUrl(text);
          if (!label.trim()) setLabel(labelFromUrl(text));
        }}
        placeholder="https://ornek.com"
        placeholderTextColor="rgba(255,255,255,0.35)"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={styles.input}
      />
      <TextInput
        value={label}
        onChangeText={setLabel}
        placeholder="Buton metni"
        placeholderTextColor="rgba(255,255,255,0.35)"
        style={styles.input}
      />

      <Text variant="caption" style={styles.fieldLabel}>
        Renk
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
        {STORY_LINK_COLOR_PRESETS.map((preset) => {
          const active = selectedColor.id === preset.id;
          return (
            <Pressable
              key={preset.id}
              onPress={() => setSelectedColor(preset)}
              style={[
                styles.colorSwatch,
                { backgroundColor: preset.backgroundColor },
                active && { borderColor: colors.primary, borderWidth: 2 },
              ]}
            />
          );
        })}
      </ScrollView>

      <View style={styles.actions}>
        {editingId ? (
          <Pressable style={styles.secondaryBtn} onPress={resetForm}>
            <Text variant="caption" style={styles.secondaryText}>
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
    </MediaEditorBottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  linkMeta: {
    flex: 1,
    gap: 2,
  },
  linkLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  linkUrl: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  hintText: {
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.65)',
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: '#fff',
    marginBottom: spacing.sm,
  },
  colorRow: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
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
    borderRadius: 999,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  secondaryText: {
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },
});
