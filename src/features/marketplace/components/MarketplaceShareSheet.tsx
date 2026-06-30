import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { MARKETPLACE_ACCENT } from '@/features/marketplace/constants';
import {
  shareMarketplaceListingLink,
  shareMarketplaceListingPdf,
  shareMarketplaceListingWhatsApp,
} from '@/features/marketplace/services/marketplaceShare';
import type { MarketplaceListing } from '@/features/marketplace/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  visible: boolean;
  listing: MarketplaceListing | null;
  onClose: () => void;
};

type ShareAction = {
  id: string;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  run: () => Promise<void>;
};

export function MarketplaceShareSheet({ visible, listing, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  if (!listing) return null;

  const actions: ShareAction[] = [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      subtitle: 'Bu ürünü satın al linki ile gönder',
      icon: 'logo-whatsapp',
      color: '#25D366',
      run: async () => {
        const result = await shareMarketplaceListingWhatsApp(listing);
        if (result.error) Alert.alert('Paylaşım', result.error);
        onClose();
      },
    },
    {
      id: 'link',
      label: 'Link paylaş',
      subtitle: 'Satın alma bağlantısı dahil',
      icon: 'link-outline',
      color: MARKETPLACE_ACCENT,
      run: async () => {
        await shareMarketplaceListingLink(listing);
        onClose();
      },
    },
    {
      id: 'pdf',
      label: 'PDF / ürün kartı',
      subtitle: 'Vora markalı kart — WhatsApp veya dosya',
      icon: 'document-text-outline',
      color: '#5C6BC0',
      run: async () => {
        const result = await shareMarketplaceListingPdf(listing);
        if (result.error) Alert.alert('PDF', result.error);
        else if (result.usedTextFallback) {
          Alert.alert('Paylaşıldı', 'PDF modülü yok; satın alma linki metin olarak paylaşıldı.');
        }
        onClose();
      },
    },
  ];

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceElevated,
              paddingBottom: insets.bottom + spacing.md,
              borderColor: colors.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text variant="label" style={styles.title}>
            Paylaş
          </Text>
          <Text secondary variant="caption" style={styles.subtitle}>
            {listing.title}
          </Text>
          {listing.status === 'active' && listing.listingType !== 'free' ? (
            <View style={[styles.buyHint, { backgroundColor: `${MARKETPLACE_ACCENT}14` }]}>
              <Ionicons name="cart-outline" size={14} color={MARKETPLACE_ACCENT} />
              <Text variant="caption" style={{ color: MARKETPLACE_ACCENT, flex: 1 }}>
                Alıcılar linke tıklayınca uygulamada “Bu ürünü satın al” akışına gider.
              </Text>
            </View>
          ) : null}

          {actions.map((action) => (
            <Pressable
              key={action.id}
              onPress={() => action.run()}
              style={[styles.row, { borderColor: colors.border }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${action.color}18` }]}>
                <Ionicons name={action.icon} size={22} color={action.color} />
              </View>
              <View style={styles.rowBody}>
                <Text variant="label">{action.label}</Text>
                <Text secondary variant="caption">
                  {action.subtitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}

          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text variant="label" secondary>
              Kapat
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginBottom: spacing.xs },
  buyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.md },
});
