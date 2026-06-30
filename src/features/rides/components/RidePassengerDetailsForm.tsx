import { StyleSheet, TextInput, View } from 'react-native';
import { OptionPicker } from '@/components/auth/OptionPicker';
import { Text } from '@/components/ui/Text';
import { GENDER_OPTIONS, type GenderId } from '@/constants/registration';
import type { RidePassengerDetails } from '@/features/rides/utils/passengerDetails';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  value: RidePassengerDetails;
  onChange: (next: RidePassengerDetails) => void;
  womenOnly?: boolean;
};

export function RidePassengerDetailsForm({ value, onChange, womenOnly = false }: Props) {
  const { colors } = useTheme();

  const fieldStyle = [
    styles.fieldInput,
    { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated },
  ];

  return (
    <View style={styles.root}>
      <Text variant="label">Yolcu bilgileri</Text>
      <Text secondary variant="caption">
        Rezervasyon kaydı için ad, soyad, yaş ve cinsiyet bilgisi gereklidir.
        {womenOnly ? ' Bu yolculuk yalnızca kadın yolcular içindir.' : ''}
      </Text>
      <View style={styles.nameRow}>
        <TextInput
          value={value.firstName}
          onChangeText={(firstName) => onChange({ ...value, firstName })}
          placeholder="Ad"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          style={[...fieldStyle, styles.nameInput]}
        />
        <TextInput
          value={value.lastName}
          onChangeText={(lastName) => onChange({ ...value, lastName })}
          placeholder="Soyad"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          style={[...fieldStyle, styles.nameInput]}
        />
      </View>
      <TextInput
        value={value.age > 0 ? String(value.age) : ''}
        onChangeText={(text) => {
          const parsed = parseInt(text.replace(/\D/g, ''), 10);
          onChange({ ...value, age: Number.isFinite(parsed) ? parsed : 0 });
        }}
        placeholder="Yaş (18+)"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        maxLength={2}
        style={fieldStyle}
      />
      <OptionPicker
        label="Cinsiyet"
        options={GENDER_OPTIONS}
        value={value.gender}
        onChange={(gender) => onChange({ ...value, gender: gender as GenderId })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  nameRow: { flexDirection: 'row', gap: spacing.sm },
  nameInput: { flex: 1 },
  fieldInput: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
});
