import { useState } from 'react';
import { VoraAIButton } from '@/features/vora-ai/components/VoraAIButton';
import { VoraAISheet } from '@/features/vora-ai/components/VoraAISheet';
import { VORA_AI_REEL_ACTIONS } from '@/features/vora-ai/constants';
import { useVoraAiModule } from '@/providers/VoraAiProvider';
import { getMuxThumbnailUrl } from '@/lib/mux/client';
import type { ReelItem } from '@/features/reels/types';

type VoraAiReelButtonProps = {
  item: ReelItem;
};

export function VoraAiReelButton({ item }: VoraAiReelButtonProps) {
  const enabled = useVoraAiModule('reels');
  const [open, setOpen] = useState(false);

  if (!enabled || item.isDemo) return null;

  const mediaUrls = [
    ...(item.thumbnailUrl ? [item.thumbnailUrl] : []),
    ...(item.playbackId ? [getMuxThumbnailUrl(item.playbackId)] : []),
  ];

  return (
    <>
      <VoraAIButton onPress={() => setOpen(true)} compact />
      <VoraAISheet
        visible={open}
        onClose={() => setOpen(false)}
        module="reels"
        title="Reel Asistanı"
        actions={VORA_AI_REEL_ACTIONS}
        buildPayload={() => ({
          reelId: item.id,
          caption: item.caption,
          locationLabel: item.locationLabel,
          musicTitle: item.music?.displayTitle,
          musicArtist: item.music?.artist,
          regionId: item.regionId,
          playbackId: item.playbackId,
          thumbnailUrl: item.thumbnailUrl,
          mediaUrls,
        })}
      />
    </>
  );
}
