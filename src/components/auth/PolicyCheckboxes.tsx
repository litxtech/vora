import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Checkbox } from '@/components/ui/Checkbox';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type PolicyState = {
  terms: boolean;
  privacy: boolean;
  childProtection: boolean;
  ageConfirm: boolean;
};

type PolicyCheckboxesProps = {
  values: PolicyState;
  onChange: (key: keyof PolicyState, value: boolean) => void;
  showErrors?: boolean;
};

export function PolicyCheckboxes({ values, onChange, showErrors }: PolicyCheckboxesProps) {
  const { colors } = useTheme();

  const legalLink = (slug: string, label: string) => (
    <Pressable onPress={() => router.push({ pathname: '/(auth)/legal', params: { slug } })}>
      <Text variant="caption" style={{ color: colors.primary }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <Checkbox
        checked={values.terms}
        onToggle={() => onChange('terms', !values.terms)}
        error={showErrors && !values.terms}
        label={
          <Text variant="caption">
            {legalLink('terms', 'Kullanım Şartlarını')} kabul ediyorum
          </Text>
        }
      />
      <Checkbox
        checked={values.privacy}
        onToggle={() => onChange('privacy', !values.privacy)}
        error={showErrors && !values.privacy}
        label={
          <Text variant="caption">
            {legalLink('privacy', 'Gizlilik Politikasını')} kabul ediyorum
          </Text>
        }
      />
      <Checkbox
        checked={values.childProtection}
        onToggle={() => onChange('childProtection', !values.childProtection)}
        error={showErrors && !values.childProtection}
        label={
          <Text variant="caption">
            {legalLink('child_protection', 'Çocuk Koruma Politikasını')} kabul ediyorum
          </Text>
        }
      />
      <Checkbox
        checked={values.ageConfirm}
        onToggle={() => onChange('ageConfirm', !values.ageConfirm)}
        error={showErrors && !values.ageConfirm}
        label="18 yaşından büyük olduğumu onaylıyorum"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
});
