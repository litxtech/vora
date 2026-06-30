import { useEffect, useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StickyKeyboardFooter } from '@/components/keyboard/StickyKeyboardFooter';
import { Text } from '@/components/ui/Text';
import { StudioVideoPreview } from '@/features/vora-studio/components/StudioVideoPreview';
import { TEXT_COLORS, TEXT_FONTS } from '@/features/vora-studio/constants';
import { useStudioEditorStore } from '@/features/vora-studio/store/editorStore';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type StudioTextEditorProps = {
  username: string;
  visible: boolean;
};

export function StudioTextEditor({ username, visible }: StudioTextEditorProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const trimStartSec = useStudioEditorStore((s) => s.trimStartSec);
  const trimEndSec = useStudioEditorStore((s) => s.trimEndSec);
  const textOverlays = useStudioEditorStore((s) => s.textOverlays);
  const selectedTextOverlayId = useStudioEditorStore((s) => s.selectedTextOverlayId);
  const addTextOverlay = useStudioEditorStore((s) => s.addTextOverlay);
  const updateTextOverlay = useStudioEditorStore((s) => s.updateTextOverlay);
  const removeTextOverlay = useStudioEditorStore((s) => s.removeTextOverlay);
  const setSelectedTextOverlay = useStudioEditorStore((s) => s.setSelectedTextOverlay);
  const closeToolSheet = useStudioEditorStore((s) => s.closeToolSheet);
  const setPlaying = useStudioEditorStore((s) => s.setPlaying);

  const selected = textOverlays.find((t) => t.id === selectedTextOverlayId) ?? null;

  useEffect(() => {
    if (!visible) return;

    const state = useStudioEditorStore.getState();
    if (state.selectedTextOverlayId) return;

    if (state.textOverlays.length > 0) {
      setSelectedTextOverlay(state.textOverlays[state.textOverlays.length - 1].id);
      return;
    }

    addTextOverlay({
      text: '',
      x: 0.12,
      y: 0.38,
      fontSize: 28,
      fontFamily: 'bold',
      color: '#FFFFFF',
      startSec: trimStartSec,
      endSec: trimEndSec,
      animation: 'pop',
    });
  }, [visible, addTextOverlay, setSelectedTextOverlay, trimStartSec, trimEndSec]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, [visible, selectedTextOverlayId]);

  const handleDone = () => {
    if (selected && !selected.text.trim()) {
      removeTextOverlay(selected.id);
    }
    closeToolSheet();
  };

  const handleCancel = () => {
    if (selected && !selected.text.trim() && textOverlays.length === 1) {
      removeTextOverlay(selected.id);
    }
    closeToolSheet();
  };

  const nudgeSize = (delta: number) => {
    if (!selected) return;
    updateTextOverlay(selected.id, {
      fontSize: Math.min(44, Math.max(16, selected.fontSize + delta)),
    });
  };

  if (!visible) return null;

  return (
    <Modal visible animationType={resolveModalAnimationType('fade')} transparent statusBarTranslucent onRequestClose={handleCancel}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
          <Pressable onPress={handleCancel} hitSlop={12} style={styles.topAction}>
            <Text variant="label" style={{ color: colors.textSecondary }}>
              Vazgeç
            </Text>
          </Pressable>
          <Text variant="label">Metin</Text>
          <Pressable onPress={handleDone} hitSlop={12} style={styles.topAction}>
            <Text variant="label" style={{ color: colors.primary, fontWeight: '700' }}>
              Bitti
            </Text>
          </Pressable>
        </View>

        <View style={styles.previewWrap}>
          <StudioVideoPreview username={username} />
        </View>

        <View style={styles.helperRow}>
          <Ionicons name="move-outline" size={14} color={colors.textMuted} />
          <Text secondary variant="caption" style={{ flex: 1 }}>
            Metni videoda sürükleyin · Renk ve font altta · A+/A− ile boyut
          </Text>
          <Pressable
            style={[styles.previewPlayChip, { backgroundColor: `${colors.primary}18` }]}
            onPress={() => setPlaying(true)}
          >
            <Ionicons name="play-circle-outline" size={14} color={colors.primary} />
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
              İzle
            </Text>
          </Pressable>
        </View>

        {textOverlays.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.overlayTabs}>
            {textOverlays.map((item) => {
              const active = item.id === selected?.id;
              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.overlayTab,
                    { backgroundColor: active ? colors.primary : `${colors.textMuted}14` },
                  ]}
                  onPress={() => setSelectedTextOverlay(item.id)}
                >
                  <Text variant="caption" style={{ color: active ? '#fff' : colors.textSecondary }}>
                    {(item.text || 'Metin').slice(0, 14)}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              style={[styles.overlayTab, { backgroundColor: `${colors.primary}18` }]}
              onPress={() =>
                addTextOverlay({
                  text: '',
                  x: 0.12,
                  y: 0.5,
                  fontSize: 28,
                  fontFamily: selected?.fontFamily ?? 'bold',
                  color: selected?.color ?? '#FFFFFF',
                  startSec: trimStartSec,
                  endSec: trimEndSec,
                  animation: 'pop',
                })
              }
            >
              <Ionicons name="add" size={16} color={colors.primary} />
            </Pressable>
          </ScrollView>
        ) : null}

        <StickyKeyboardFooter backgroundColor={colors.surfaceElevated} style={styles.keyboardFooter}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.styleRow}>
            <Pressable style={styles.sizeBtn} onPress={() => nudgeSize(-2)}>
              <Text variant="label">A−</Text>
            </Pressable>
            <Pressable style={styles.sizeBtn} onPress={() => nudgeSize(2)}>
              <Text variant="label">A+</Text>
            </Pressable>
            {TEXT_FONTS.map((font) => {
              const active = selected?.fontFamily === font.id;
              return (
                <Pressable
                  key={font.id}
                  style={[styles.fontChip, active && { backgroundColor: colors.primary }]}
                  onPress={() => selected && updateTextOverlay(selected.id, { fontFamily: font.id })}
                >
                  <Text variant="caption" style={{ color: active ? '#fff' : colors.textSecondary }}>
                    {font.label}
                  </Text>
                </Pressable>
              );
            })}
            {TEXT_COLORS.map((color) => {
              const active = selected?.color === color;
              return (
                <Pressable
                  key={color}
                  style={[
                    styles.colorDot,
                    { backgroundColor: color, borderColor: active ? colors.primary : 'rgba(255,255,255,0.35)' },
                    active && styles.colorDotActive,
                  ]}
                  onPress={() => selected && updateTextOverlay(selected.id, { color })}
                />
              );
            })}
            {selected ? (
              <Pressable style={styles.deleteBtn} onPress={() => removeTextOverlay(selected.id)}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            ) : null}
          </ScrollView>

          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.text, backgroundColor: `${colors.textMuted}10` }]}
            value={selected?.text ?? ''}
            onChangeText={(text) => {
              if (selected) updateTextOverlay(selected.id, { text });
            }}
            placeholder="Metin yazın…"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={120}
            returnKeyType="done"
            blurOnSubmit={false}
          />
        </StickyKeyboardFooter>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  topAction: { minWidth: 64 },
  previewWrap: {
    flex: 1,
    minHeight: 280,
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  previewPlayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  overlayTabs: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  overlayTab: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  keyboardFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  styleRow: {
    gap: spacing.xs,
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  sizeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128,128,128,0.12)',
  },
  fontChip: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    backgroundColor: 'rgba(128,128,128,0.12)',
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
  },
  colorDotActive: {
    borderWidth: 3,
    transform: [{ scale: 1.08 }],
  },
  deleteBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 18,
    minHeight: 48,
    maxHeight: 96,
    textAlign: 'center',
    fontWeight: '600',
  },
});
