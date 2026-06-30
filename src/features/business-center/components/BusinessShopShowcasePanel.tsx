import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { businessSectorIcon, businessSectorLabel } from '@/features/business-center/constants';
import type { BusinessAccountRecord } from '@/features/business-center/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  business: BusinessAccountRecord;
  galleryUrls: string[];
  accent: string;
  onOpenMaps: () => void;
  onMessage: () => void;
  onOpenWeb: () => void;
  onOpenGallery: (index: number) => void;
  mapsDisabled?: boolean;
  webDisabled?: boolean;
};

function sectorCtaLabel(category: string): { message: string; web: string } {
  switch (category) {
    case 'restaurant':
      return { message: 'Rezervasyon', web: 'Menü / Web' };
    case 'health':
      return { message: 'Randevu al', web: 'Web sitesi' };
    case 'hotel':
    case 'tourism':
      return { message: 'İletişim', web: 'Web sitesi' };
    default:
      return { message: 'Mesaj gönder', web: 'Web sitesi' };
  }
}

export function BusinessShopShowcasePanel({
  business,
  galleryUrls,
  accent,
  onOpenMaps,
  onMessage,
  onOpenWeb,
  onOpenGallery,
  mapsDisabled = false,
  webDisabled = false,
}: Props) {
  const { colors } = useTheme();
  const sectorIcon = businessSectorIcon(business.category);
  const labels = sectorCtaLabel(business.category);

  return (
    <View style={[styles.wrap, { borderColor: `${accent}33`, backgroundColor: `${accent}08` }]}>
      <View style={styles.head}>
        <View style={[styles.sectorIcon, { backgroundColor: `${accent}18` }]}>
          <Ionicons name={sectorIcon} size={20} color={accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="label" style={{ fontWeight: '800' }}>
            {businessSectorLabel(business.category)} vitrini
          </Text>
          <Text secondary variant="caption">
            Hizmet, iletişim ve konum bilgileri
          </Text>
        </View>
      </View>

      {galleryUrls.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
          {galleryUrls.map((uri, index) => (
            <Pressable key={`${uri}-${index}`} onPress={() => onOpenGallery(index)}>
              <Image source={{ uri }} style={styles.galleryImage} resizeMode="cover" />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.ctaRow}>
        <Pressable
          onPress={onOpenMaps}
          disabled={mapsDisabled}
          style={({ pressed }) => [
            styles.cta,
            {
              borderColor: `${accent}44`,
              backgroundColor: colors.surfaceElevated,
              opacity: mapsDisabled ? 0.45 : pressed ? 0.88 : 1,
            },
          ]}
        >
          <Ionicons name="navigate-outline" size={18} color={accent} />
          <Text variant="caption" style={{ fontWeight: '800', color: colors.text }}>
            Yol tarifi
          </Text>
        </Pressable>

        <Pressable
          onPress={onMessage}
          style={({ pressed }) => [
            styles.cta,
            styles.ctaPrimary,
            { backgroundColor: accent, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#fff" />
          <Text variant="caption" style={styles.ctaPrimaryText}>
            {labels.message}
          </Text>
        </Pressable>

        <Pressable
          onPress={onOpenWeb}
          disabled={webDisabled}
          style={({ pressed }) => [
            styles.cta,
            {
              borderColor: `${accent}44`,
              backgroundColor: colors.surfaceElevated,
              opacity: webDisabled ? 0.45 : pressed ? 0.88 : 1,
            },
          ]}
        >
          <Ionicons name="globe-outline" size={18} color={accent} />
          <Text variant="caption" style={{ fontWeight: '800', color: colors.text }}>
            {labels.web}
          </Text>
        </Pressable>
      </View>

      {business.address?.trim() ? (
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={14} color={accent} />
          <Text secondary variant="caption" style={{ flex: 1 }}>
            {business.address}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectorIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gallery: { gap: spacing.sm },
  galleryImage: {
    width: 120,
    height: 88,
    borderRadius: radius.md,
  },
  ctaRow: { flexDirection: 'row', gap: spacing.sm },
  cta: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  ctaPrimary: { borderWidth: 0 },
  ctaPrimaryText: { color: '#fff', fontWeight: '800' },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
});
