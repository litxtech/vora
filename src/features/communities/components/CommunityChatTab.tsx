import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { ensureCommunityConversation } from '@/features/communities/services/communityData';
import type { CommunityDetail } from '@/features/communities/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type CommunityChatTabProps = {
  detail: CommunityDetail;
  onConversationReady?: (conversationId: string) => void;
};

export function CommunityChatTab({ detail, onConversationReady }: CommunityChatTabProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const openChat = async () => {
    setLoading(true);
    const conversationId = detail.conversationId ?? (await ensureCommunityConversation(detail.id));
    setLoading(false);
    if (!conversationId) return;
    onConversationReady?.(conversationId);
    router.push(`/chat/${conversationId}` as never);
  };

  if (!detail.isMember) {
    return (
      <GlassCard style={styles.card}>
        <Ionicons name="lock-closed-outline" size={36} color={colors.textMuted} />
        <Text variant="label">Sohbet yalnızca üyelere açık</Text>
        <Text secondary variant="caption">
          Topluluğa katılarak grup sohbetine erişebilirsiniz.
        </Text>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}22` }]}>
        <Ionicons name="chatbubbles" size={40} color={colors.primary} />
      </View>
      <Text variant="label">{detail.name} Sohbeti</Text>
      <Text secondary variant="caption" style={styles.hint}>
        Üyelerle anlık mesajlaşın. Fotoğraf, video ve konum paylaşabilirsiniz.
      </Text>
      <View style={styles.features}>
        <FeaturePill icon="flash-outline" text="Anlık mesaj" colors={colors} />
        <FeaturePill icon="people-outline" text={`${detail.memberCount} üye`} colors={colors} />
        <FeaturePill icon="notifications-outline" text="Bildirimler" colors={colors} />
      </View>
      <Button title="Sohbete Git" onPress={openChat} loading={loading} />
    </GlassCard>
  );
}

function FeaturePill({
  icon,
  text,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[styles.pill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Ionicons name={icon} size={14} color={colors.primary} />
      <Text variant="caption">{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  hint: {
    textAlign: 'center',
    lineHeight: 20,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginVertical: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
