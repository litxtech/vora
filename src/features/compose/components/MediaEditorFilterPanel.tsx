import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import {
  MEDIA_EDITOR_FILTERS,
  type MediaEditorFilterId,
} from '@/features/compose/constants/mediaEditor';
import { radius, spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  selectedId: MediaEditorFilterId;
  onSelect: (id: MediaEditorFilterId) => void;
};

/** Snapchat tarzı — altta yatay şerit, seçince kapanmaz, önizleme canlı kalır */
export function MediaEditorFilterPanel({ visible, selectedId, onSelect }: Props) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <View
      style={[
        styles.strip,
        {
          bottom: insets.bottom + spacing.md,
          paddingLeft: spacing.md,
          paddingRight: 76,
        },
      ]}
      pointerEvents="box-none"
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        {MEDIA_EDITOR_FILTERS.map((filter) => {
          const active = selectedId === filter.id;
          return (
            <Pressable
              key={filter.id}
              style={styles.item}
              onPress={() => onSelect(filter.id)}
            >
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: filter.swatch },
                  active && styles.swatchActive,
                ]}
              >
                {filter.overlay ? (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: filter.overlay, opacity: 0.85 }]} />
                ) : null}
                {filter.overlay2 ? (
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      { backgroundColor: filter.overlay2, opacity: 0.7, top: '40%' },
                    ]}
                  />
                ) : null}
                {filter.id === 'none' ? (
                  <Text style={styles.noneIcon}>○</Text>
                ) : null}
              </View>
              <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 12,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  item: {
    alignItems: 'center',
    gap: 6,
    width: 64,
  },
  swatch: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchActive: {
    borderColor: '#fff',
    borderWidth: 3,
    transform: [{ scale: 1.08 }],
  },
  noneIcon: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '300',
  },
  label: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  labelActive: {
    color: '#fff',
  },
});
