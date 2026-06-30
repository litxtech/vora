import { FlatList, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { RIDES_ACCENT, VEHICLE_VERIFICATION_LABELS } from '@/features/rides/constants';
import type { RideVehicle } from '@/features/rides/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type RideVehiclePickerProps = {
  visible: boolean;
  vehicles: RideVehicle[];
  selectedId: string | null;
  onClose: () => void;
  onSelect: (vehicleId: string) => void;
};

export function RideVehiclePicker({
  visible,
  vehicles,
  selectedId,
  onClose,
  onSelect,
}: RideVehiclePickerProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal visible animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8} style={[styles.iconBtn, { backgroundColor: `${colors.textMuted}18` }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text variant="h3" style={styles.headerTitle}>
            Araç seç
          </Text>
          <Pressable onPress={onClose} hitSlop={8} style={[styles.iconBtn, { backgroundColor: `${colors.textMuted}18` }]}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.lg }]}
          renderItem={({ item }) => (
            <RideVehicleOption
              vehicle={item}
              selected={item.id === selectedId}
              onPress={() => {
                onSelect(item.id);
                onClose();
              }}
            />
          )}
        />
      </View>
    </Modal>
  );
}

type RideVehicleSelectFieldProps = {
  label?: string;
  vehicle: RideVehicle | null;
  placeholder?: string;
  onPress: () => void;
};

export function RideVehicleSelectField({
  label = 'Araç',
  vehicle,
  placeholder = 'Araç seçin',
  onPress,
}: RideVehicleSelectFieldProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.fieldWrap}>
      <Text variant="label" secondary>
        {label}
      </Text>
      <Pressable
        onPress={onPress}
        style={[styles.fieldBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
      >
        {vehicle?.coverUrl ? (
          <Image source={{ uri: vehicle.coverUrl }} style={styles.fieldThumb} />
        ) : (
          <View style={[styles.fieldThumb, styles.fieldThumbEmpty]}>
            <Ionicons name="car-outline" size={18} color={RIDES_ACCENT} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          {vehicle ? (
            <>
              <Text variant="caption" style={{ fontWeight: '700' }} numberOfLines={1}>
                {vehicle.brand} {vehicle.model}
              </Text>
              <Text variant="caption" secondary numberOfLines={1}>
                {vehicle.plate} · {vehicle.seatsTotal} koltuk
              </Text>
            </>
          ) : (
            <Text variant="caption" secondary>
              {placeholder}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

type RideVehicleOptionProps = {
  vehicle: RideVehicle;
  selected: boolean;
  onPress?: () => void;
  readonly?: boolean;
  compact?: boolean;
};

export function RideVehicleOption({ vehicle, selected, onPress, readonly, compact }: RideVehicleOptionProps) {
  const { colors } = useTheme();
  const statusLabel = VEHICLE_VERIFICATION_LABELS[vehicle.verificationStatus];

  const content = (
    <>
      {vehicle.coverUrl ? (
        <Image source={{ uri: vehicle.coverUrl }} style={styles.optionThumb} />
      ) : (
        <View style={[styles.optionThumb, styles.fieldThumbEmpty]}>
          <Ionicons name="car-outline" size={22} color={RIDES_ACCENT} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text variant="caption" style={{ fontWeight: '700' }}>
          {vehicle.brand} {vehicle.model}
        </Text>
        <Text variant="caption" secondary>
          {vehicle.plate} · {vehicle.seatsTotal} koltuk
        </Text>
        <Text variant="caption" secondary style={{ marginTop: 2 }}>
          {statusLabel}
        </Text>
      </View>
      {!readonly ? (
        <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={RIDES_ACCENT} />
      ) : null}
    </>
  );

  const rowStyle = [
    styles.optionRow,
    compact && styles.optionRowCompact,
    {
      borderColor: selected ? RIDES_ACCENT : colors.border,
      backgroundColor: selected ? `${RIDES_ACCENT}10` : colors.surface,
    },
  ];

  if (readonly) {
    return <View style={rowStyle}>{content}</View>;
  }

  return (
    <Pressable onPress={onPress} style={rowStyle}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  headerTitle: { flex: 1, textAlign: 'center' },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: spacing.sm },
  fieldWrap: { gap: spacing.xs },
  fieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fieldThumb: { width: 44, height: 34, borderRadius: radius.md, backgroundColor: '#ddd' },
  fieldThumbEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: `${RIDES_ACCENT}14` },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xs,
  },
  optionRowCompact: { marginBottom: 0 },
  optionThumb: { width: 56, height: 42, borderRadius: radius.md, backgroundColor: '#ddd' },
});
