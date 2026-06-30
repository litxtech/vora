import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { HELP_CENTER_ACCENT, type HelpCenterMode } from '@/features/help/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ModeTab = { id: HelpCenterMode; label: string; icon: string };

type HelpCenterModeSwitcherProps = {
  modes: readonly ModeTab[];
  active: HelpCenterMode;
  onChange: (mode: HelpCenterMode) => void;
};

export const HelpCenterModeSwitcher = memo(function HelpCenterModeSwitcher({
  modes,
  active,
  onChange,
}: HelpCenterModeSwitcherProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.track, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {modes.map((item) => {
        const selected = active === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => onChange(item.id)}
            style={[
              styles.segment,
              selected && {
                backgroundColor: `${HELP_CENTER_ACCENT}18`,
                borderColor: `${HELP_CENTER_ACCENT}44`,
              },
            ]}
          >
            <Ionicons
              name={item.icon as keyof typeof Ionicons.glyphMap}
              size={15}
              color={selected ? HELP_CENTER_ACCENT : colors.textMuted}
            />
            <Text
              variant="caption"
              style={{
                color: selected ? HELP_CENTER_ACCENT : colors.textSecondary,
                fontWeight: selected ? '700' : '500',
                fontSize: 12,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 4,
    padding: 3,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
