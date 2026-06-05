import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AuthHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
};

export function AuthHeader({ title, subtitle, showBack = true }: AuthHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.header}>
      {showBack ? (
        <Pressable style={styles.back} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
      ) : (
        <View style={styles.backPlaceholder} />
      )}
      <View style={styles.titles}>
        <Text variant="h2">{title}</Text>
        {subtitle ? (
          <Text secondary style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.xl,
  },
  back: {
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  backPlaceholder: {
    height: 22,
    marginBottom: spacing.md,
  },
  titles: {
    gap: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
});
