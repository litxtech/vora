import { StyleSheet, View } from 'react-native';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { Text } from '@/components/ui/Text';
import type { SharedCardMetadata } from '@/features/messaging/types';
import { radius, spacing } from '@/constants/theme';

type ChatSharedAuthorRowProps = {
  metadata?: SharedCardMetadata | null;
  textColor: string;
  metaColor: string;
  avatarSize?: number;
};

export function resolveSharedCardAuthorLabel(metadata?: SharedCardMetadata | null): string {
  if (metadata?.username?.trim()) return `@${metadata.username.trim()}`;
  if (metadata?.fullName?.trim()) return metadata.fullName.trim();
  if (metadata?.title?.trim()) return metadata.title.trim();
  return '';
}

export function ChatSharedAuthorRow({
  metadata,
  textColor,
  metaColor,
  avatarSize = 28,
}: ChatSharedAuthorRowProps) {
  const label = resolveSharedCardAuthorLabel(metadata);
  if (!label && !metadata?.avatarUrl) return null;

  const initial = (metadata?.fullName || metadata?.username || label || '?')
    .replace('@', '')
    .slice(0, 1)
    .toUpperCase();

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.avatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
          },
        ]}
      >
        {metadata?.avatarUrl ? (
          <OptimizedImage
            uri={metadata.avatarUrl}
            style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
            tier="avatar"
            layoutWidth={avatarSize}
            contentFit="cover"
            recyclingKey={metadata.avatarUrl}
          />
        ) : (
          <Text variant="caption" style={[styles.initial, { color: metaColor, fontSize: avatarSize * 0.38 }]}>
            {initial}
          </Text>
        )}
      </View>
      {label ? (
        <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  initial: {
    fontWeight: '700',
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
});
