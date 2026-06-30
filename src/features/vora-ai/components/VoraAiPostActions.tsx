import { useState } from 'react';
import { VoraAIButton } from '@/features/vora-ai/components/VoraAIButton';
import { VoraAISheet } from '@/features/vora-ai/components/VoraAISheet';
import { VORA_AI_POST_ACTIONS } from '@/features/vora-ai/constants';
import { useVoraAiModule } from '@/providers/VoraAiProvider';
import type { FeedItem } from '@/features/feed/types';

type VoraAiPostActionsProps = {
  item: FeedItem;
};

export function VoraAiPostActions({ item }: VoraAiPostActionsProps) {
  const enabled = useVoraAiModule('posts');
  const [open, setOpen] = useState(false);

  if (!enabled || item.isDemo) return null;

  return (
    <>
      <VoraAIButton onPress={() => setOpen(true)} compact />
      <VoraAISheet
        visible={open}
        onClose={() => setOpen(false)}
        module="posts"
        title="Gönderi Asistanı"
        actions={VORA_AI_POST_ACTIONS}
        buildPayload={() => ({
          postId: item.sourceId,
          title: item.title,
          content: item.content,
          category: item.category,
          locationLabel: item.locationLabel,
          latitude: item.latitude,
          longitude: item.longitude,
          regionId: item.regionId,
          mediaUrls: item.mediaUrls,
        })}
      />
    </>
  );
}
