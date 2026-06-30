import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { REGIONS } from '@/constants/regions';
import type { RegionId } from '@/constants/regions';
import type { AdAudienceScope } from '@/features/ads/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AdRegionPickerProps = {
  scope: AdAudienceScope;
  selected: RegionId[];
  onScopeChange: (scope: AdAudienceScope) => void;
  onChange: (next: RegionId[]) => void;
};

export function AdRegionPicker({ scope, selected, onScopeChange, onChange }: AdRegionPickerProps) {
  const { colors } = useTheme();
  const isGeneral = scope === 'general';

  const toggle = (id: RegionId) => {
    if (selected.includes(id)) {
      onChange(selected.filter((item) => item !== id));
      return;
    }
    onChange([...selected, id]);
  };

  const selectGeneral = () => {
    onScopeChange('general');
    onChange([]);
  };

  const selectRegional = () => {
    onScopeChange('regional');
  };

  return (
    <View style={styles.wrap}>
      <Text variant="label">Yayın kapsamı</Text>
      <Text secondary variant="caption">
        Genel yayın tüm kullanıcılara gösterilir. İsterseniz belirli şehirleri hedefleyebilirsiniz.
      </Text>

      <View style={styles.scopeRow}>
        <Pressable
          onPress={selectGeneral}
          style={[
            styles.scopeCard,
            {
              borderColor: isGeneral ? colors.primary : colors.border,
              backgroundColor: isGeneral ? `${colors.primary}14` : colors.surfaceElevated,
            },
          ]}
        >
          <Ionicons
            name={isGeneral ? 'globe' : 'globe-outline'}
            size={22}
            color={isGeneral ? colors.primary : colors.textMuted}
          />
          <View style={styles.scopeCopy}>
            <Text variant="caption" style={{ fontWeight: isGeneral ? '700' : '600' }}>
              Genel yayın
            </Text>
            <Text secondary variant="caption">
              Tüm bölgeler
            </Text>
          </View>
          {isGeneral ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} /> : null}
        </Pressable>

        <Pressable
          onPress={selectRegional}
          style={[
            styles.scopeCard,
            {
              borderColor: !isGeneral ? colors.primary : colors.border,
              backgroundColor: !isGeneral ? `${colors.primary}14` : colors.surfaceElevated,
            },
          ]}
        >
          <Ionicons
            name={!isGeneral ? 'location' : 'location-outline'}
            size={22}
            color={!isGeneral ? colors.primary : colors.textMuted}
          />
          <View style={styles.scopeCopy}>
            <Text variant="caption" style={{ fontWeight: !isGeneral ? '700' : '600' }}>
              Bölgesel hedefleme
            </Text>
            <Text secondary variant="caption">
              Şehir seçin
            </Text>
          </View>
          {!isGeneral ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} /> : null}
        </Pressable>
      </View>

      {!isGeneral ? (
        <>
          <View style={styles.header}>
            <Text variant="label">Hedef şehirler</Text>
            {selected.length > 0 ? (
              <Pressable onPress={() => onChange([])} hitSlop={8}>
                <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                  Seçimi temizle
                </Text>
              </Pressable>
            ) : null}
          </View>
          <Text secondary variant="caption">
            Birden fazla il seçebilirsiniz. Seçili olana tekrar dokunarak kaldırın.
          </Text>
          <View style={styles.grid}>
            {REGIONS.map((region) => {
              const active = selected.includes(region.id);
              return (
                <Pressable
                  key={region.id}
                  onPress={() => toggle(region.id)}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? `${colors.primary}16` : colors.surfaceElevated,
                    },
                  ]}
                >
                  {active ? (
                    <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                  ) : (
                    <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                  )}
                  <Text variant="caption" style={{ fontWeight: active ? '700' : '500' }}>
                    {region.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {selected.length > 0 ? (
            <Text secondary variant="caption">
              {selected.length} şehir seçildi
            </Text>
          ) : (
            <Text secondary variant="caption" style={{ color: colors.warning }}>
              Bölgesel hedefleme için en az bir şehir seçin.
            </Text>
          )}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  scopeRow: { gap: spacing.sm },
  scopeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1.5,
  },
  scopeCopy: { flex: 1, gap: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
