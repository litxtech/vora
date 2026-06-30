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
import { useMediaEditorStore } from '@/features/compose/store/mediaEditorStore';
import type { StudioTextOverlay } from '@/features/vora-studio/types';
import { glassSurface, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const COLORS = ['#FFFFFF', '#000000', '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#AF52DE'];

type Props = {
  slideIndex: number;
  durationSec: number;
  visible: boolean;
  onClose: () => void;
};

export function MediaEditorTextPanel({ slideIndex, durationSec, visible, onClose }: Props) {
  const { colors, mode } = useTheme();
  const surface = glassSurface[mode];
  const inputRef = useRef<TextInput>(null);
  const panelMaxHeight = Dimensions.get('window').height * 0.5;

  const slide = useMediaEditorStore((s) => s.slides[slideIndex]);
  const selectedTextOverlayId = useMediaEditorStore((s) => s.selectedTextOverlayId);
  const setSelectedTextOverlayId = useMediaEditorStore((s) => s.setSelectedTextOverlayId);
  const addTextOverlay = useMediaEditorStore((s) => s.addTextOverlay);
  const updateTextOverlay = useMediaEditorStore((s) => s.updateTextOverlay);
  const removeTextOverlay = useMediaEditorStore((s) => s.removeTextOverlay);

  const selected =
    slide?.textOverlays.find((item) => item.id === selectedTextOverlayId) ?? slide?.textOverlays[0] ?? null;

  useEffect(() => {
    if (!visible || !slide) return;

    if (!selectedTextOverlayId && slide.textOverlays.length > 0) {
      setSelectedTextOverlayId(slide.textOverlays[slide.textOverlays.length - 1].id);
    }
  }, [visible, slide, selectedTextOverlayId, setSelectedTextOverlayId]);

  useEffect(() => {
    if (!visible || !selected) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 320);
    return () => clearTimeout(timer);
  }, [visible, selectedTextOverlayId, selected]);

  const handleDone = () => {
    slide.textOverlays
      .filter((item) => !item.text.trim())
      .forEach((item) => removeTextOverlay(slideIndex, item.id));
    onClose();
  };

  const handleAddText = () => {
    addTextOverlay(slideIndex, {
      text: '',
      x: 0.12,
      y: slide.textOverlays.length > 0 ? 0.55 : 0.42,
      fontSize: selected?.fontSize ?? 28,
      fontFamily: selected?.fontFamily ?? 'bold',
      color: selected?.color ?? '#FFFFFF',
      startSec: 0,
      endSec: durationSec || 999,
      animation: 'pop',
    });
  };

  const patchSelected = (patch: Partial<StudioTextOverlay>) => {
    if (!selected) return;
    updateTextOverlay(slideIndex, selected.id, patch);
  };

  if (!visible || !slide) return null;

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
                onPress={handleAddText}
                hitSlop={10}
                style={[styles.iconBtn, { backgroundColor: `${colors.textMuted}18` }]}
              >
                <Ionicons name="add" size={20} color={colors.text} />
              </Pressable>
              <Pressable onPress={handleDone} hitSlop={10}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>Bitti</Text>
              </Pressable>
            </View>
          </View>

          {slide.textOverlays.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
              {slide.textOverlays.map((item) => {
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
                    onPress={() => setSelectedTextOverlayId(item.id)}
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
                <Pressable
                  style={[styles.toolBtn, styles.deleteBtn]}
                  onPress={() => removeTextOverlay(slideIndex, selected.id)}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text secondary variant="caption" style={styles.emptyText}>
                Metin eklemek isteğe bağlıdır
              </Text>
              <Pressable
                onPress={handleAddText}
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
    zIndex: 20,
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
  colorRow: {
    gap: spacing.md,
    justifyContent: 'center',
    paddingVertical: spacing.md,
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
  deleteBtn: {
    marginLeft: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  emptyText: {
    textAlign: 'center',
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
