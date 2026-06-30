import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  rating: number;
  size?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
};

export function HotelStarRating({ rating, size = 16, interactive = false, onRate }: Props) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.row}>
      {stars.map((n) => {
        const filled = n <= Math.round(rating);
        const icon = filled ? 'star' : n - 0.5 <= rating ? 'star-half' : 'star-outline';
        if (interactive && onRate) {
          return (
            <Pressable key={n} onPress={() => onRate(n)} hitSlop={4}>
              <Ionicons name={icon} size={size} color="#FFB300" />
            </Pressable>
          );
        }
        return <Ionicons key={n} name={icon} size={size} color="#FFB300" />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
