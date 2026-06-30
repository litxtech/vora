import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { BUSINESS_ROUTES, shopAccentColor } from '@/features/business-center/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  businessId: string;
  shopPublished: boolean;
  accent?: string | null;
  showProducts?: boolean;
};

export function BusinessShopOwnerBar({
  businessId,
  shopPublished,
  accent,
  showProducts = true,
}: Props) {
  const { colors } = useTheme();
  const tone = shopAccentColor(accent);

  return (
    <View style={[styles.wrap, { borderColor: `${tone}44`, backgroundColor: `${tone}10` }]}>
      <View style={styles.copy}>
        <Ionicons name="eye-outline" size={16} color={tone} />
        <View style={{ flex: 1 }}>
          <Text variant="caption" style={{ fontWeight: '800' }}>
            {shopPublished ? 'Müşteri görünümü' : 'Taslak — henüz yayında değil'}
          </Text>
          <Text secondary variant="caption" style={{ fontSize: 10 }}>
            Müşterilerin gördüğü canlı vitrin
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        {showProducts ? (
          <Pressable
            onPress={() => router.push(BUSINESS_ROUTES.createProduct as never)}
            style={({ pressed }) => [
              styles.addBtn,
              { borderColor: `${tone}55`, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <Ionicons name="add" size={16} color={tone} />
            <Text variant="caption" style={{ color: tone, fontWeight: '800' }}>
              Ürün
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => router.push('/profile/edit' as never)}
          style={({ pressed }) => [
            styles.brandBtn,
            { borderColor: `${tone}55`, opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <Ionicons name="images-outline" size={14} color={tone} />
          <Text variant="caption" style={{ color: tone, fontWeight: '800' }}>
            Logo & kapak
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(BUSINESS_ROUTES.shopCurate as never)}
          style={({ pressed }) => [
            styles.editBtn,
            { backgroundColor: tone, opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <Ionicons name="create-outline" size={14} color="#fff" />
          <Text variant="caption" style={styles.editText}>
            Düzenle
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  copy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  brandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  editText: { color: '#fff', fontWeight: '800' },
});
