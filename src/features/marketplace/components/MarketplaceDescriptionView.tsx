import { Image, Pressable, StyleSheet, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { MARKETPLACE_ACCENT } from '@/features/marketplace/constants';
import { isVideoUrl, normalizeDescriptionBlocks } from '@/features/marketplace/services/descriptionBlocks';
import type { MarketplaceDescriptionBlock, MarketplaceListing } from '@/features/marketplace/types';
import { radius, spacing } from '@/constants/theme';
import { openUrl } from '@/lib/linking/openUrl';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  listing: Pick<MarketplaceListing, 'description' | 'descriptionBlocks'>;
};

function DescriptionVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });

  return (
    <VideoView
      player={player}
      style={styles.video}
      nativeControls
      contentFit="contain"
    />
  );
}

export function MarketplaceDescriptionView({ listing }: Props) {
  const { colors } = useTheme();
  const blocks = normalizeDescriptionBlocks(listing.description, listing.descriptionBlocks);

  if (!blocks.length) {
    return (
      <Text secondary variant="caption">
        Açıklama eklenmemiş.
      </Text>
    );
  }

  return (
    <View style={styles.wrap}>
      {blocks.map((block, index) => (
        <BlockView key={`${block.type}-${index}`} block={block} colors={colors} />
      ))}
    </View>
  );
}

function BlockView({
  block,
  colors,
}: {
  block: MarketplaceDescriptionBlock;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  if (block.type === 'text') {
    return (
      <Text secondary style={styles.paragraph}>
        {block.content}
      </Text>
    );
  }

  if (block.type === 'link') {
    return (
      <Pressable
        onPress={() => void openUrl(block.url)}
        style={[styles.linkCard, { borderColor: `${MARKETPLACE_ACCENT}44`, backgroundColor: `${MARKETPLACE_ACCENT}10` }]}
      >
        <Ionicons name="link-outline" size={16} color={MARKETPLACE_ACCENT} />
        <View style={{ flex: 1 }}>
          <Text variant="label" style={{ color: MARKETPLACE_ACCENT }}>
            {block.label}
          </Text>
          <Text secondary variant="caption" numberOfLines={1}>
            {block.url}
          </Text>
        </View>
        <Ionicons name="open-outline" size={14} color={colors.textMuted} />
      </Pressable>
    );
  }

  if (block.type === 'image') {
    return <Image source={{ uri: block.url }} style={styles.image} resizeMode="cover" />;
  }

  if (block.type === 'video' || isVideoUrl(block.url)) {
    return (
      <View style={styles.videoWrap}>
        <DescriptionVideo url={block.url} />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  paragraph: { lineHeight: 22, fontSize: 15 },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: radius.lg,
  },
  videoWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: { width: '100%', height: 220 },
});
