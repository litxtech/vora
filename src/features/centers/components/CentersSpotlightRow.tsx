import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { CenterCard } from '@/features/centers/components/CenterCard';
import type { CenterDef } from '@/features/centers/types';
import { spacing } from '@/constants/theme';

const PAGE_H_PAD = spacing.lg * 2;
const CARD_GAP = spacing.sm;
const SCROLL_CARD_RATIO = 0.68;

type Props = {
  centers: CenterDef[];
  onCenterNavigate?: () => void;
};

export function CentersSpotlightRow({ centers, onCenterNavigate }: Props) {
  const { width: screenWidth } = useWindowDimensions();

  if (centers.length === 0) return null;

  const contentWidth = screenWidth - PAGE_H_PAD;
  const fitsInRow = centers.length <= 2;
  const cardWidth = fitsInRow
    ? (contentWidth - CARD_GAP * (centers.length - 1)) / centers.length
    : Math.round(contentWidth * SCROLL_CARD_RATIO);
  const snapInterval = cardWidth + CARD_GAP;

  const cards = centers.map((center) => (
    <CenterCard
      key={center.id}
      center={center}
      variant="featured"
      width={cardWidth}
      onNavigate={onCenterNavigate}
    />
  ));

  return (
    <View style={styles.wrap}>
      <Text variant="label" style={styles.heading}>
        Öne çıkan
      </Text>

      {fitsInRow ? (
        <View style={styles.row}>{cards}</View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          decelerationRate="fast"
          snapToInterval={snapInterval}
        >
          {cards}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  heading: { letterSpacing: 0.1, paddingHorizontal: spacing.xs },
  row: {
    flexDirection: 'row',
    gap: CARD_GAP,
    paddingRight: spacing.lg,
  },
});
