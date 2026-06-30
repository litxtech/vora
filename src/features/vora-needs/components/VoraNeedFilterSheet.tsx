import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  VORA_NEED_CATEGORY_OPTIONS,
  VORA_NEED_VISIBILITY_OPTIONS,
} from '@/features/vora-needs/constants';
import type { VoraNeedCategory, VoraNeedFeedFilters, VoraNeedVisibility } from '@/features/vora-needs/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type VoraNeedFilterSheetProps = {
  visible: boolean;
  filters: VoraNeedFeedFilters;
  onChange: (filters: VoraNeedFeedFilters) => void;
  onClose: () => void;
};

export function VoraNeedFilterSheet({ visible, filters, onChange, onClose }: VoraNeedFilterSheetProps) {
  const { colors } = useTheme();

  const setCategory = (category?: VoraNeedCategory) => {
    onChange({ ...filters, category });
  };

  const setVisibility = (visibility?: VoraNeedVisibility) => {
    onChange({ ...filters, visibility });
  };

  const toggleUrgent = () => {
    onChange({ ...filters, urgentOnly: !filters.urgentOnly });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={styles.header}>
            <Text variant="label">Filtrele</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text variant="caption" style={styles.sectionLabel}>
            Kategori
          </Text>
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => setCategory(undefined)}
              style={[styles.chip, chipStyle(!filters.category, colors)]}
            >
              <Text variant="caption">Tümü</Text>
            </Pressable>
            {VORA_NEED_CATEGORY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setCategory(opt.value)}
                style={[styles.chip, chipStyle(filters.category === opt.value, colors, opt.color)]}
              >
                <Text variant="caption" style={{ color: filters.category === opt.value ? opt.color : colors.text }}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text variant="caption" style={styles.sectionLabel}>
            Görünürlük
          </Text>
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => setVisibility(undefined)}
              style={[styles.chip, chipStyle(!filters.visibility, colors)]}
            >
              <Text variant="caption">Tümü</Text>
            </Pressable>
            {VORA_NEED_VISIBILITY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setVisibility(opt.value)}
                style={[styles.chip, chipStyle(filters.visibility === opt.value, colors)]}
              >
                <Text variant="caption">{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={toggleUrgent} style={[styles.urgentRow, { borderColor: colors.border }]}>
            <Ionicons
              name={filters.urgentOnly ? 'checkbox' : 'square-outline'}
              size={20}
              color={filters.urgentOnly ? colors.danger : colors.textMuted}
            />
            <Text variant="label">Yalnızca acil ilanlar</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              onChange({});
              onClose();
            }}
            style={[styles.clearBtn, { borderColor: colors.border }]}
          >
            <Text variant="label" style={{ color: colors.primary }}>
              Filtreleri temizle
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function chipStyle(active: boolean, colors: { primary: string; border: string; surface: string }, accent?: string) {
  return {
    backgroundColor: active ? `${accent ?? colors.primary}18` : colors.surface,
    borderColor: active ? (accent ?? colors.primary) : colors.border,
  };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    opacity: 0.7,
    marginTop: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  urgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    marginTop: spacing.sm,
  },
  clearBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.sm,
  },
});
