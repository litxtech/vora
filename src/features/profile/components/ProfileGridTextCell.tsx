import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { CATEGORY_STYLES } from '@/features/feed/constants';
import type { FeedItem } from '@/features/feed/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

function normalizePreview(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function getTextPostPreview(item: FeedItem): { headline: string | null; body: string } {
  const title = normalizePreview(item.title ?? '');
  const content = normalizePreview(item.content);
  const quoted = normalizePreview(item.quotedPost?.content ?? '');

  if (title && content) {
    return { headline: title, body: content };
  }
  if (title) {
    return { headline: null, body: title };
  }
  if (content) {
    return { headline: null, body: content };
  }
  if (quoted) {
    return { headline: null, body: quoted };
  }
  return { headline: null, body: '' };
}

type ProfileGridTextCellProps = {
  item: FeedItem;
};

export function ProfileGridTextCell({ item }: ProfileGridTextCellProps) {
  const { colors, isDark } = useTheme();
  const category = CATEGORY_STYLES[item.category] ?? CATEGORY_STYLES.general;
  const { headline, body } = getTextPostPreview(item);
  const primary = headline ?? body;
  const secondary = headline ? body : null;
  const isShort = primary.length > 0 && primary.length <= 56 && !secondary;

  const surfaceBg = isDark ? colors.surfaceElevated : colors.surface;
  const tint = `${category.color}${isDark ? '22' : '14'}`;

  return (
    <View style={[styles.root, { backgroundColor: surfaceBg }]}>
      <View style={[styles.accentBar, { backgroundColor: category.color }]} />

      <View style={[styles.body, { backgroundColor: tint }]}>
        <View style={styles.topRow}>
          {item.quotedPost ? (
            <View style={[styles.quoteRow, { backgroundColor: `${category.color}${isDark ? '28' : '18'}` }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={9} color={category.color} />
              <Text variant="caption" numberOfLines={1} style={[styles.quoteLabel, { color: category.color }]}>
                Alıntı
              </Text>
            </View>
          ) : (
            <View />
          )}

          <View style={[styles.categoryBadge, { backgroundColor: `${category.color}${isDark ? '30' : '20'}` }]}>
            <Ionicons name={category.icon} size={10} color={category.color} />
          </View>
        </View>

        <View style={[styles.textBlock, isShort && styles.textBlockShort]}>
          <Text
            variant="caption"
            numberOfLines={secondary ? 2 : isShort ? 5 : 4}
            style={[isShort ? styles.primaryShort : styles.primary, { color: colors.text }]}
          >
            {primary || 'Metin gönderisi'}
          </Text>

          {secondary ? (
            <Text
              variant="caption"
              numberOfLines={3}
              style={[styles.secondary, { color: colors.textSecondary }]}
            >
              {secondary}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs + 2,
    paddingBottom: spacing.sm,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 18,
  },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  quoteLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  categoryBadge: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 3,
  },
  textBlockShort: {
    justifyContent: 'center',
  },
  primary: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  primaryShort: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondary: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '500',
  },
});

export function postHasGridMedia(item: FeedItem): boolean {
  return item.mediaUrls.some((url) => typeof url === 'string' && url.trim().length > 0);
}
