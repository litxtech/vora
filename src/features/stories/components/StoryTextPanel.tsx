import { useEffect, useRef } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StickyKeyboardFooter } from '@/components/keyboard';
import { Text } from '@/components/ui/Text';
import type { StudioTextOverlay } from '@/features/vora-studio/types';
import { clampStoryTextFontSize } from '@/features/stories/utils/storyTextOverlays';
import { glassSurface, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const COLORS = ['#FFFFFF', '#000000', '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#AF52DE'];

type StoryTextPanelProps = {
  visible: boolean;
  overlays: StudioTextOverlay[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<StudioTextOverlay>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onClose: () => void;
};

export function StoryTextPanel({
  visible,
  overlays,
  selectedId,
  onSelect,
  onUpdate,
  onAdd,
  onRemove,
  onClose,
}: StoryTextPanelProps) {
  const { colors, mode } = useTheme();
  const surface = glassSurface[mode];
  const inputRef = useRef<TextInput>(null);
  const panelMaxHeight = Dimensions.get('window').height * 0.5;

  const selected =
    overlays.find((item) => item.id === selectedId) ?? overlays[overlays.length - 1] ?? null;

  useEffect(() => {
    if (!visible) return;
    if (!selectedId && overlays.length > 0) {
      onSelect(overlays[overlays.length - 1].id);
    }
  }, [visible, overlays, selectedId, onSelect]);

  useEffect(() => {
    if (!visible || !selected) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 280);
    return () => clearTimeout(timer);
  }, [visible, selectedId, selected]);

  const handleDone = () => {
    overlays.filter((item) => !item.text.trim()).forEach((item) => onRemove(item.id));
    onClose();
  };

  const patchSelected = (patch: Partial<StudioTextOverlay>) => {
    if (!selected) return;
    onUpdate(selected.id, patch);
  };

  if (!visible) return null;

  return (
    <View style={styles.host} pointerEvents="box-none">
      <StickyKeyboardFooter backgroundColor={colors.surfaceElevated}>
        <View style={[styles.panel, { backgroundColor: colors.surfaceElevated, maxHeight: panelMaxHeight }]}>
          <Pressable onPress={handleDone} style={styles.handleHit} hitSlop={12}>
            <View style={[styles.handle, { backgroundColor: surface.handle }]} />
          </Pressable>

          <View style={styles.header}>
            <Text variant="label" style={styles.title}>
              Metin
            </Text>
            <View style={styles.headerActions}>
              <Pressable
                onPress={onAdd}
                hitSlop={10}
                style={[styles.iconBtn, { backgroundColor: `${colors.textMuted}18` }]}
              >
                <Ionicons name="add" size={20} color={colors.text} />
              </Pressable>
              {selected ? (
                <Pressable
                  onPress={() => onRemove(selected.id)}
                  hitSlop={10}
                  style={styles.deleteHeaderBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 15 }}>Sil</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={handleDone} hitSlop={10}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>Bitti</Text>
              </Pressable>
            </View>
          </View>

          {overlays.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
              {overlays.map((item) => {
                const active = item.id === selected?.id;
                return (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.tab,
                      {
                        backgroundColor: active ? colors.primary : `${colors.textMuted}12`,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => onSelect(item.id)}
                  >
                    <Text variant="caption" style={{ color: active ? '#fff' : colors.textSecondary, fontWeight: '600' }}>
                      {(item.text || 'Metin').slice(0, 16)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {selected ? (
            <>
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: colors.text }]}
                placeholder="Metin yaz…"
                placeholderTextColor={colors.textMuted}
                value={selected.text}
                onChangeText={(text) => patchSelected({ text })}
                multiline
                maxLength={120}
                textAlign="center"
                scrollEnabled
              />

              <View style={styles.sizeRow}>
                <Pressable
                  style={styles.sizeBtn}
                  onPress={() => patchSelected({ fontSize: clampStoryTextFontSize(selected.fontSize - 2) })}
                >
                  <Ionicons name="remove" size={18} color={colors.text} />
                </Pressable>
                <Text variant="caption" secondary style={styles.sizeLabel}>
                  {selected.fontSize}
                </Text>
                <Pressable
                  style={styles.sizeBtn}
                  onPress={() => patchSelected({ fontSize: clampStoryTextFontSize(selected.fontSize + 2) })}
                >
                  <Ionicons name="add" size={18} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
                {COLORS.map((color) => {
                  const active = selected.color === color;
                  return (
                    <Pressable
                      key={color}
                      style={[
                        styles.colorDot,
                        { backgroundColor: color },
                        active && { borderColor: colors.primary, borderWidth: 2.5 },
                      ]}
                      onPress={() => patchSelected({ color })}
                    />
                  );
                })}
              </ScrollView>

              <View style={styles.toolRow}>
                <Pressable
                  style={[
                    styles.toolBtn,
                    selected.fontFamily === 'regular' && { backgroundColor: `${colors.primary}16` },
                  ]}
                  onPress={() => patchSelected({ fontFamily: 'regular' })}
                >
                  <Text style={{ color: colors.text, fontSize: 16 }}>Aa</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.toolBtn,
                    selected.fontFamily === 'bold' && { backgroundColor: `${colors.primary}16` },
                  ]}
                  onPress={() => patchSelected({ fontFamily: 'bold' })}
                >
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>Aa</Text>
                </Pressable>
              </View>

              <Text variant="caption" secondary style={styles.hint}>
                Bitti dedikten sonra iki parmakla büyütüp küçültebilirsin
              </Text>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Pressable
                onPress={onAdd}
                style={[styles.addBtn, { backgroundColor: `${colors.primary}16` }]}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Metin ekle</Text>
              </Pressable>
            </View>
          )}
        </View>
      </StickyKeyboardFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
  },
  panel: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 16,
  },
  handleHit: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    minHeight: 32,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
  },
  tabs: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    minHeight: 48,
    maxHeight: 80,
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  sizeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  sizeLabel: {
    minWidth: 28,
    textAlign: 'center',
    fontWeight: '700',
  },
  colorRow: {
    gap: spacing.md,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  toolRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.xs,
  },
  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    textAlign: 'center',
    paddingTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
});
