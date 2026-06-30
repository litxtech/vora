import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from '@/components/ui/Text';
import { openUrl } from '@/lib/linking/openUrl';
import type { LinkPreview } from '../services/linkPreview';

type ChatLinkPreviewProps = {
  preview: LinkPreview;
  isMine: boolean;
  accentColor: string;
  metaColor: string;
  textColor: string;
};

export const ChatLinkPreview = memo(function ChatLinkPreview({
  preview,
  isMine,
  accentColor,
  metaColor,
  textColor,
}: ChatLinkPreviewProps) {
  const surfaceBg = isMine ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)';
  const accentBar = isMine ? 'rgba(255,255,255,0.55)' : accentColor;

  return (
    <Pressable
      style={[styles.container, { backgroundColor: surfaceBg, borderLeftColor: accentBar }]}
      onPress={() => void openUrl(preview.url)}
    >
      {preview.imageUrl ? (
        <Image
          source={{ uri: preview.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={150}
        />
      ) : null}
      <View style={styles.body}>
        {preview.siteName ? (
          <Text variant="caption" numberOfLines={1} style={{ color: accentBar, fontWeight: '700' }}>
            {preview.siteName}
          </Text>
        ) : null}
        {preview.title ? (
          <Text numberOfLines={2} style={[styles.title, { color: textColor }]}>
            {preview.title}
          </Text>
        ) : null}
        {preview.description ? (
          <Text variant="caption" numberOfLines={2} style={{ color: metaColor }}>
            {preview.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    borderRadius: 10,
    borderLeftWidth: 3,
    overflow: 'hidden',
    minWidth: 200,
  },
  image: {
    width: '100%',
    height: 140,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  body: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
});
