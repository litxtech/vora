import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { MediaEditorBottomSheet } from '@/features/compose/components/MediaEditorBottomSheet';
import { useMediaEditorSheetTopInset } from '@/features/compose/hooks/useMediaEditorSheetTopInset';
import { LocationPicker, type SelectedLocation } from '@/features/compose/components/LocationPicker';
import type { RegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type StoryLocationSheetProps = {
  visible: boolean;
  regionId: RegionId;
  value: SelectedLocation | null;
  onChange: (location: SelectedLocation | null) => void;
  onClose: () => void;
};

function locationDetail(value: SelectedLocation): string {
  if (value.subtitle?.trim()) return value.subtitle.trim();
  if (value.latitude != null) return 'Haritada görünür';
  return 'Yalnızca etiket';
}

export function StoryLocationSheet({
  visible,
  regionId,
  value,
  onChange,
  onClose,
}: StoryLocationSheetProps) {
  const { colors } = useTheme();
  const sheetTopInset = useMediaEditorSheetTopInset();

  return (
    <MediaEditorBottomSheet
      visible={visible}
      onClose={onClose}
      title="Konum ekle"
      heightFraction={0.72}
      topInset={sheetTopInset}
      headerRight={
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={styles.doneBtn}
          accessibilityRole="button"
          accessibilityLabel="Konum seçimini bitir"
        >
          <Text style={[styles.done, { color: colors.primary }]}>Bitti</Text>
        </Pressable>
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
      >
        {value ? (
          <View style={styles.selectedSection}>
            <LinearGradient
              colors={['rgba(255,45,85,0.35)', 'rgba(255,122,0,0.2)', 'rgba(255,255,255,0.06)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.selectedCard}
            >
              <View style={styles.selectedInner}>
                <View style={styles.selectedIconWrap}>
                  <LinearGradient
                    colors={['#ff2d55', '#ff7a00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.selectedIconGradient}
                  >
                    <Ionicons name="location" size={20} color="#fff" />
                  </LinearGradient>
                </View>

                <View style={styles.selectedMeta}>
                  <Text variant="caption" style={styles.selectedEyebrow}>
                    Seçili konum
                  </Text>
                  <Text variant="label" style={styles.selectedLabel} numberOfLines={2}>
                    {value.label}
                  </Text>
                  <Text variant="caption" style={styles.selectedDetail} numberOfLines={1}>
                    {locationDetail(value)}
                  </Text>
                </View>

                <Pressable
                  onPress={() => onChange(null)}
                  hitSlop={8}
                  style={[styles.removeBtn, { backgroundColor: `${colors.danger}20` }]}
                  accessibilityRole="button"
                  accessibilityLabel="Konumu kaldır"
                >
                  <Ionicons name="close" size={18} color={colors.danger} />
                </Pressable>
              </View>
            </LinearGradient>

            <View style={styles.dragHint}>
              <View style={styles.dragHintIcon}>
                <Ionicons name="hand-left-outline" size={14} color="#fff" />
              </View>
              <Text variant="caption" style={styles.dragHintText}>
                Rozeti önizlemede sürükleyerek konumlandır
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Ionicons name="map-outline" size={22} color={colors.primary} />
            </View>
            <Text variant="label" style={styles.introTitle}>
              Konum ekle
            </Text>
            <Text variant="caption" secondary style={styles.introText}>
              Mekân, işletme veya şehir ara. Yakınındaki öneriler önce listelenir.
            </Text>
          </View>
        )}

        <View style={styles.searchSection}>
          {!value ? null : (
            <View style={styles.searchDivider}>
              <View style={styles.searchDividerLine} />
              <Text variant="caption" style={styles.searchDividerLabel}>
                Değiştir
              </Text>
              <View style={styles.searchDividerLine} />
            </View>
          )}
          <LocationPicker
            regionId={regionId}
            value={value}
            onChange={onChange}
            compact
            scope="world"
            hideSelectedChip
          />
        </View>
      </ScrollView>
    </MediaEditorBottomSheet>
  );
}

const styles = StyleSheet.create({
  doneBtn: {
    minHeight: 44,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  done: {
    fontWeight: '700',
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  introCard: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: spacing.xs,
  },
  introTitle: {
    color: '#fff',
    fontWeight: '700',
  },
  introText: {
    textAlign: 'center',
    lineHeight: 18,
  },
  selectedSection: {
    gap: spacing.sm,
  },
  selectedCard: {
    borderRadius: radius.xl,
    padding: 1.5,
  },
  selectedInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl - 1,
    backgroundColor: 'rgba(12,12,18,0.92)',
  },
  selectedIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  selectedIconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMeta: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  selectedEyebrow: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  selectedLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 19,
  },
  selectedDetail: {
    color: 'rgba(255,255,255,0.62)',
    fontWeight: '600',
    fontSize: 12,
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dragHintIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dragHintText: {
    flex: 1,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    lineHeight: 17,
  },
  searchSection: {
    gap: spacing.md,
  },
  searchDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  searchDividerLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.4,
  },
});
