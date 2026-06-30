import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius } from '@/constants/theme';

type AdminPdfPreviewThumbProps = {
  uri: string;
};

/** PDF küçük resmi — WebView gerektirmez (dev client uyumluluğu). */
export function AdminPdfPreviewThumb({ uri: _uri }: AdminPdfPreviewThumbProps) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="document-text-outline" size={28} color="#fff" />
      <View style={styles.badge}>
        <Text variant="caption" style={styles.badgeText}>
          PDF
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    height: 72,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
  },
});
