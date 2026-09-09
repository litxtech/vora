import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import {
  CAP_OVERLAY_COLORS,
  CAP_OVERLAY_FONTS,
} from '@/features/caps/constants';
import type { CapOverlayStyle } from '@/features/caps/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const EMOJIS = ['😀', '🔥', '❤️', '😂', '✨', '🌊', '⚡', '🙌'];

type CapsStudioTextPanelProps = {
  overlay: CapOverlayStyle;
  onChange: (next: CapOverlayStyle) => void;
};

export function CapsStudioTextPanel({ overlay, onChange }: CapsStudioTextPanelProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <TextInput
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated },
        ]}
        placeholder="Üst yazı"
        placeholderTextColor={colors.textMuted}
        value={overlay.topText ?? ''}
        onChangeText={(topText) => onChange({ ...overlay, topText })}
        maxLength={60}
      />
      <TextInput
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated },
        ]}
        placeholder="Alt yazı"
        placeholderTextColor={colors.textMuted}
        value={overlay.bottomText ?? ''}
        onChangeText={(bottomText) => onChange({ ...overlay, bottomText })}
        maxLength={60}
      />

      <View style={styles.tools}>
        <Text variant="caption" secondary>
          Emoji
        </Text>
        <View style={styles.row}>
          {EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() =>
                onChange({
                  ...overlay,
                  emoji: overlay.emoji === emoji ? undefined : emoji,
                })
              }
              style={[
                styles.emojiBtn,
                overlay.emoji === emoji ? { backgroundColor: `${colors.primary}33` } : null,
              ]}
            >
              <Text style={{ fontSize: 20 }}>{emoji}</Text>
            </Pressable>
          ))}
        </View>

        <Text variant="caption" secondary>
          Font
        </Text>
        <View style={styles.row}>
          {CAP_OVERLAY_FONTS.map((font) => (
            <Pressable
              key={font.id}
              onPress={() => onChange({ ...overlay, fontFamily: font.id })}
              style={[
                styles.chip,
                {
                  borderColor: colors.border,
                  backgroundColor:
                    overlay.fontFamily === font.id ? colors.primary : colors.surfaceElevated,
                },
              ]}
            >
              <Text
                variant="caption"
                style={{
                  color: overlay.fontFamily === font.id ? '#fff' : colors.text,
                  fontWeight: '700',
                }}
              >
                {font.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text variant="caption" secondary>
          Renk
        </Text>
        <View style={styles.row}>
          {CAP_OVERLAY_COLORS.map((color) => (
            <Pressable
              key={color}
              onPress={() => onChange({ ...overlay, color })}
              style={[
                styles.swatch,
                {
                  backgroundColor: color,
                  borderColor: overlay.color === color ? colors.primary : colors.border,
                  borderWidth: overlay.color === color ? 2 : StyleSheet.hairlineWidth,
                },
              ]}
            />
          ))}
        </View>

        <Text variant="caption" secondary>
          Efekt
        </Text>
        <View style={styles.row}>
          {(['none', 'outline', 'shadow', 'neon'] as const).map((effect) => (
            <Pressable
              key={effect}
              onPress={() => onChange({ ...overlay, effect })}
              style={[
                styles.chip,
                {
                  borderColor: colors.border,
                  backgroundColor:
                    (overlay.effect ?? 'none') === effect
                      ? colors.primary
                      : colors.surfaceElevated,
                },
              ]}
            >
              <Text
                variant="caption"
                style={{
                  color: (overlay.effect ?? 'none') === effect ? '#fff' : colors.text,
                  fontWeight: '700',
                }}
              >
                {effect === 'none'
                  ? 'Yok'
                  : effect === 'outline'
                    ? 'Kontur'
                    : effect === 'shadow'
                      ? 'Gölge'
                      : 'Neon'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text variant="caption" secondary>
          Konum
        </Text>
        <View style={styles.row}>
          {(['top', 'center', 'bottom'] as const).map((position) => (
            <Pressable
              key={position}
              onPress={() => onChange({ ...overlay, position })}
              style={[
                styles.chip,
                {
                  borderColor: colors.border,
                  backgroundColor:
                    (overlay.position ?? 'center') === position
                      ? colors.primary
                      : colors.surfaceElevated,
                },
              ]}
            >
              <Text
                variant="caption"
                style={{
                  color: (overlay.position ?? 'center') === position ? '#fff' : colors.text,
                  fontWeight: '700',
                }}
              >
                {position === 'top' ? 'Üst' : position === 'bottom' ? 'Alt' : 'Orta'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  tools: { gap: spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  emojiBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});
