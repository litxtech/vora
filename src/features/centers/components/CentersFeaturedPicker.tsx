import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { CENTERS } from '@/constants/centers';
import type { CenterId } from '@/features/centers/types';
import { getCenterGradient } from '@/features/centers/services/centerGradients';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  featuredIds: CenterId[];
  onChange: (ids: CenterId[]) => void;
};

export function CentersFeaturedPicker({ featuredIds, onChange }: Props) {
  const { colors } = useTheme();
  const available = CENTERS.filter((center) => !featuredIds.includes(center.id));

  const remove = (id: CenterId) => {
    onChange(featuredIds.filter((item) => item !== id));
  };

  const add = (id: CenterId) => {
    if (featuredIds.includes(id)) return;
    onChange([...featuredIds, id]);
  };

  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= featuredIds.length) return;
    const next = [...featuredIds];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    onChange(next);
  };

  return (
    <View style={styles.wrap}>
      <Text secondary variant="caption" style={styles.hint}>
        Öne çıkan merkezler hub üstünde gradient kart olarak gösterilir. Sıra yukarıdan aşağıya
        uygulanır.
      </Text>

      {featuredIds.length === 0 ? (
        <View style={[styles.emptyBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Ionicons name="star-outline" size={22} color={colors.textMuted} />
          <Text secondary variant="caption">
            Henüz öne çıkan merkez yok. Aşağıdan ekleyin.
          </Text>
        </View>
      ) : (
        <View style={styles.featuredList}>
          {featuredIds.map((id, index) => {
            const center = CENTERS.find((item) => item.id === id);
            if (!center) return null;
            const gradient = getCenterGradient(center);

            return (
              <View key={id} style={[styles.featuredRow, { borderColor: colors.border }]}>
                <LinearGradient
                  colors={[gradient[0], gradient[1]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.preview}
                >
                  <Ionicons
                    name={center.icon as keyof typeof Ionicons.glyphMap}
                    size={16}
                    color="#fff"
                  />
                </LinearGradient>
                <View style={styles.featuredCopy}>
                  <Text variant="label" numberOfLines={1}>
                    {center.title}
                  </Text>
                  <Text secondary variant="caption" numberOfLines={1}>
                    {center.subtitle}
                  </Text>
                </View>
                <View style={styles.featuredActions}>
                  <Pressable
                    onPress={() => move(index, -1)}
                    disabled={index === 0}
                    hitSlop={6}
                    style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed, index === 0 && styles.iconBtnDisabled]}
                  >
                    <Ionicons name="chevron-up" size={16} color={index === 0 ? colors.textMuted : colors.text} />
                  </Pressable>
                  <Pressable
                    onPress={() => move(index, 1)}
                    disabled={index === featuredIds.length - 1}
                    hitSlop={6}
                    style={({ pressed }) => [
                      styles.iconBtn,
                      pressed && styles.iconBtnPressed,
                      index === featuredIds.length - 1 && styles.iconBtnDisabled,
                    ]}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={index === featuredIds.length - 1 ? colors.textMuted : colors.text}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => remove(id)}
                    hitSlop={6}
                    style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                  >
                    <Ionicons name="close" size={16} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {available.length > 0 ? (
        <View style={styles.addBlock}>
          <Text variant="caption" style={{ color: colors.textSecondary, fontWeight: '600' }}>
            Merkez ekle
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.addRow}>
            {available.map((center) => (
              <Pressable
                key={center.id}
                onPress={() => add(center.id)}
                style={({ pressed }) => [
                  styles.addChip,
                  {
                    borderColor: `${center.accent}44`,
                    backgroundColor: `${center.accent}12`,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={center.icon as keyof typeof Ionicons.glyphMap}
                  size={14}
                  color={center.accent}
                />
                <Text variant="caption" style={{ color: center.accent, fontWeight: '600' }}>
                  {center.title}
                </Text>
                <Ionicons name="add" size={14} color={center.accent} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  hint: { lineHeight: 18 },
  emptyBox: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  featuredList: { gap: spacing.sm },
  featuredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  preview: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featuredCopy: { flex: 1, gap: 2, minWidth: 0 },
  featuredActions: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: { opacity: 0.7 },
  iconBtnDisabled: { opacity: 0.35 },
  addBlock: { gap: spacing.xs, marginTop: spacing.xs },
  addRow: { gap: spacing.sm, paddingRight: spacing.md },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
