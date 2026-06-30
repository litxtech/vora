import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { PERSONNEL_ACCENT } from '@/features/personnel-center/constants';
import { radius, spacing } from '@/constants/theme';

type EmployerNameChipProps = {
  name: string;
  variant?: 'hero' | 'inline';
};

export function EmployerNameChip({ name, variant = 'inline' }: EmployerNameChipProps) {
  const isHero = variant === 'hero';

  return (
    <View
      style={[
        styles.chip,
        isHero ? styles.chipHero : styles.chipInline,
        { borderColor: isHero ? 'rgba(255,255,255,0.28)' : `${PERSONNEL_ACCENT}44` },
      ]}
    >
      <Ionicons
        name="storefront-outline"
        size={isHero ? 12 : 11}
        color={isHero ? '#fff' : PERSONNEL_ACCENT}
      />
      <Text
        variant="caption"
        numberOfLines={1}
        style={[styles.label, isHero ? styles.labelHero : { color: PERSONNEL_ACCENT }]}
      >
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipHero: {
    backgroundColor: 'rgba(0,0,0,0.38)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 2,
  },
  chipInline: {
    backgroundColor: `${PERSONNEL_ACCENT}12`,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  label: {
    fontWeight: '700',
    fontSize: 11,
    flexShrink: 1,
  },
  labelHero: {
    color: '#fff',
    fontSize: 12,
  },
});
