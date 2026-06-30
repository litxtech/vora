import { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FullScreenMediaViewer } from '@/components/media/FullScreenMediaViewer';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { HizmetSectionHeader } from '@/features/vora-hizmetler/components/HizmetUi';
import { VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import { useHizmetDocumentViewer } from '@/features/vora-hizmetler/hooks/useHizmetDocumentViewer';
import { publicWorkMediaUrls } from '@/features/vora-hizmetler/services/providerWorkData';
import type { ProviderPublicWork } from '@/features/vora-hizmetler/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ProviderPortfolioSectionProps = {
  items: ProviderPublicWork[];
  showHeader?: boolean;
  isOwnProfile?: boolean;
  onShareItem?: (item: ProviderPublicWork) => void;
  onAddWork?: () => void;
  onManageWorks?: () => void;
};

export function ProviderPortfolioSection({
  items,
  showHeader = true,
  isOwnProfile = false,
  onShareItem,
  onAddWork,
  onManageWorks,
}: ProviderPortfolioSectionProps) {
  const { colors } = useTheme();
  const { imageViewer, openImages, closeViewer } = useHizmetDocumentViewer();

  const galleryUrls = useMemo(() => items.flatMap((item) => publicWorkMediaUrls(item)), [items]);

  if (!items.length && !isOwnProfile) return null;

  const openWorkImage = (item: ProviderPublicWork, uri: string) => {
    const itemUrls = publicWorkMediaUrls(item);
    const startIndex = galleryUrls.indexOf(uri);
    openImages(startIndex >= 0 ? galleryUrls : itemUrls, startIndex >= 0 ? startIndex : itemUrls.indexOf(uri), item.title);
  };

  return (
    <View style={styles.wrap}>
      {showHeader ? (
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <HizmetSectionHeader
              title="Tamamlanan İşler"
              subtitle="Portfolyo ve platform işleri"
              icon="images-outline"
            />
          </View>
          {isOwnProfile ? (
            <View style={styles.headerActions}>
              {onAddWork ? (
                <Pressable onPress={onAddWork} hitSlop={8} style={styles.headerBtn}>
                  <Ionicons name="add-circle-outline" size={20} color={VORA_HIZMETLER_ACCENT} />
                </Pressable>
              ) : null}
              {onManageWorks ? (
                <Pressable onPress={onManageWorks} hitSlop={8} style={styles.headerBtn}>
                  <Ionicons name="create-outline" size={18} color={VORA_HIZMETLER_ACCENT} />
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {!items.length && isOwnProfile ? (
        <GlassCard style={styles.emptyCard}>
          <Ionicons name="images-outline" size={28} color={`${VORA_HIZMETLER_ACCENT}88`} />
          <Text secondary variant="body" style={{ textAlign: 'center' }}>
            Tamamladığınız işlerin fotoğraflarını ekleyin; ziyaretçiler usta profilinizde görsün.
          </Text>
          {onAddWork ? (
            <Pressable onPress={onAddWork} style={[styles.emptyBtn, { backgroundColor: VORA_HIZMETLER_ACCENT }]}>
              <Text variant="caption" style={{ color: '#fff', fontWeight: '800' }}>
                İlk işi ekle
              </Text>
            </Pressable>
          ) : null}
        </GlassCard>
      ) : null}

      {items.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {items.map((item) => (
            <GlassCard key={`${item.source}-${item.id}`} style={styles.card} padded={false}>
              <View style={styles.cardTop}>
                <View style={styles.cardTitleWrap}>
                  <Text variant="label" numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.source === 'completed_job' ? (
                    <View style={[styles.sourcePill, { backgroundColor: `${VORA_HIZMETLER_ACCENT}16` }]}>
                      <Text variant="caption" style={{ color: VORA_HIZMETLER_ACCENT, fontWeight: '700', fontSize: 10 }}>
                        Platform
                      </Text>
                    </View>
                  ) : null}
                </View>
                {isOwnProfile && onShareItem ? (
                  <Pressable onPress={() => onShareItem(item)} hitSlop={8}>
                    <Ionicons name="share-social-outline" size={18} color={VORA_HIZMETLER_ACCENT} />
                  </Pressable>
                ) : null}
              </View>
              {item.description ? (
                <Text secondary variant="caption" numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
              <View style={styles.mediaRow}>
                {item.beforeImageUrl ? (
                  <MediaTile
                    label="Önce"
                    uri={item.beforeImageUrl}
                    onPress={() => openWorkImage(item, item.beforeImageUrl!)}
                  />
                ) : null}
                {item.afterImageUrl ? (
                  <MediaTile
                    label="Sonra"
                    uri={item.afterImageUrl}
                    accent
                    onPress={() => openWorkImage(item, item.afterImageUrl!)}
                  />
                ) : null}
                {!item.beforeImageUrl && !item.afterImageUrl && item.mediaUrls.length ? (
                  item.mediaUrls.slice(0, 2).map((uri, index) => (
                    <MediaTile
                      key={uri}
                      label={index === 0 ? 'Görsel' : 'Ek'}
                      uri={uri}
                      accent={index === 1}
                      onPress={() => openWorkImage(item, uri)}
                    />
                  ))
                ) : null}
              </View>
              {!item.beforeImageUrl && !item.afterImageUrl && !item.mediaUrls.length ? (
                <View style={[styles.emptyMedia, { backgroundColor: `${VORA_HIZMETLER_ACCENT}10` }]}>
                  <Ionicons name="image-outline" size={28} color={colors.textSecondary} />
                  <Text secondary variant="caption">
                    Görsel yakında
                  </Text>
                </View>
              ) : null}
            </GlassCard>
          ))}
        </ScrollView>
      ) : null}

      <FullScreenMediaViewer
        urls={imageViewer?.urls ?? []}
        visible={Boolean(imageViewer)}
        startIndex={imageViewer?.startIndex ?? 0}
        onClose={closeViewer}
      />
    </View>
  );
}

function MediaTile({
  label,
  uri,
  accent = false,
  onPress,
}: {
  label: string;
  uri: string;
  accent?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.mediaTile}>
      <Image source={{ uri }} style={styles.mediaImg} />
      <View style={[styles.mediaLabel, accent && styles.mediaLabelAccent]}>
        <Text variant="caption" style={styles.mediaLabelText}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: 2,
  },
  headerBtn: {
    padding: 4,
  },
  scroll: {
    gap: spacing.md,
    paddingRight: spacing.sm,
  },
  card: {
    width: 280,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitleWrap: {
    flex: 1,
    gap: 4,
  },
  sourcePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  mediaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  mediaTile: {
    flex: 1,
    height: 112,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  mediaImg: {
    width: '100%',
    height: '100%',
  },
  mediaLabel: {
    position: 'absolute',
    left: spacing.xs,
    bottom: spacing.xs,
    backgroundColor: 'rgba(15,23,42,0.72)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  mediaLabelAccent: {
    backgroundColor: 'rgba(14,165,233,0.88)',
  },
  mediaLabelText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 10,
  },
  emptyMedia: {
    height: 112,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  emptyBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
});
