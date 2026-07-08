import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StickyKeyboardFooter } from '@/components/keyboard';
import { Text } from '@/components/ui/Text';
import type { StudioTextOverlay } from '@/features/vora-studio/types';
import { clampStoryTextFontSize } from '@/features/stories/utils/storyTextOverlays';
import { radius, spacing } from '@/constants/theme';

const COLORS = [
  '#FFFFFF',
  '#000000',
  '#FF3B30',
  '#FF9500',
  '#FFCC00',
  '#34C759',
  '#007AFF',
  '#AF52DE',
];

type StoryTextPanelProps = {
  visible: boolean;
  overlay: StudioTextOverlay | null;
  onUpdate: (id: string, patch: Partial<StudioTextOverlay>) => void;
  onDone: () => void;
  onAdd?: () => void;
};

/**
 * Instagram tarzı — yazı klavyenin üstünde, hikâye kartında canlı önizleme.
 */
export function StoryTextPanel({
  visible,
  overlay,
  onUpdate,
  onDone,
  onAdd,
}: StoryTextPanelProps) {
  const inputRef = useRef<TextInput>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!visible || !overlay) return;
    setDraft(overlay.text ?? '');
  }, [overlay?.id, overlay, visible]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(timer);
  }, [visible, overlay?.id]);

  const handleDone = () => {
    if (!overlay) return;
    inputRef.current?.blur();
    const text = draft;
    onUpdate(overlay.id, { text });
    onDone();
  };

  if (!visible || !overlay) return null;

  return (
    <View style={styles.host} pointerEvents="box-none">
      <StickyKeyboardFooter backgroundColor="#111">
        <View style={styles.panel}>
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                {
                  color: overlay.color === '#000000' ? '#fff' : overlay.color,
                },
              ]}
              placeholder="Metin yaz…"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={draft}
              onChangeText={(text) => {
                setDraft(text);
                onUpdate(overlay.id, { text });
              }}
              multiline
              maxLength={120}
              returnKeyType="done"
              blurOnSubmit={false}
              onSubmitEditing={handleDone}
            />
            <Pressable style={styles.doneBtn} onPress={handleDone} hitSlop={8}>
              <Text style={styles.doneLabel}>Bitti</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tools}
            keyboardShouldPersistTaps="always"
          >
            <Pressable
              style={[styles.chip, overlay.fontFamily === 'regular' && styles.chipActive]}
              onPress={() => onUpdate(overlay.id, { fontFamily: 'regular' })}
            >
              <Text style={styles.chipText}>Aa</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, overlay.fontFamily === 'bold' && styles.chipActive]}
              onPress={() => onUpdate(overlay.id, { fontFamily: 'bold' })}
            >
              <Text style={[styles.chipText, styles.chipTextBold]}>Aa</Text>
            </Pressable>

            <View style={styles.sep} />

            <Pressable
              style={styles.chip}
              onPress={() =>
                onUpdate(overlay.id, { fontSize: clampStoryTextFontSize(overlay.fontSize - 2) })
              }
            >
              <Ionicons name="remove" size={18} color="#fff" />
            </Pressable>
            <Text style={styles.size}>{overlay.fontSize}</Text>
            <Pressable
              style={styles.chip}
              onPress={() =>
                onUpdate(overlay.id, { fontSize: clampStoryTextFontSize(overlay.fontSize + 2) })
              }
            >
              <Ionicons name="add" size={18} color="#fff" />
            </Pressable>

            <View style={styles.sep} />

            {COLORS.map((color) => {
              const active = overlay.color === color;
              const light = color === '#FFFFFF' || color === '#FFCC00';
              return (
                <Pressable
                  key={color}
                  style={[
                    styles.swatch,
                    { backgroundColor: color },
                    (color === '#000000' || color === '#FFFFFF') && styles.swatchBorder,
                    active && styles.swatchActive,
                  ]}
                  onPress={() => onUpdate(overlay.id, { color })}
                >
                  {active ? (
                    <Ionicons name="checkmark" size={11} color={light ? '#000' : '#fff'} />
                  ) : null}
                </Pressable>
              );
            })}

            {onAdd ? (
              <>
                <View style={styles.sep} />
                <Pressable style={styles.chip} onPress={onAdd}>
                  <Ionicons name="add" size={20} color="#fff" />
                </Pressable>
              </>
            ) : null}
          </ScrollView>
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
    zIndex: 500,
    elevation: 500,
  },
  panel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 96,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  doneBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    borderRadius: radius.full,
    backgroundColor: '#0095f6',
  },
  doneLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  chip: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {
    backgroundColor: 'rgba(0,149,246,0.35)',
  },
  chipText: {
    color: '#fff',
    fontSize: 16,
  },
  chipTextBold: {
    fontWeight: '800',
  },
  size: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    minWidth: 24,
    textAlign: 'center',
  },
  sep: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchBorder: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  swatchActive: {
    borderWidth: 2,
    borderColor: '#fff',
  },
});
