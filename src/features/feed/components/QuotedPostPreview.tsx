import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import type { QuotedPostPreview as QuotedPost } from '@/features/feed/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type QuotedPostPreviewProps = {
  quoted: QuotedPost;
};

export function QuotedPostPreview({ quoted }: QuotedPostPreviewProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
      <Text variant="caption" secondary>
        @{quoted.authorUsername}
      </Text>
      <Text numberOfLines={3}>{quoted.content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
