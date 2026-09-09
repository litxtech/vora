import { memo } from 'react';
import { LinkPreviewCard } from '@/features/richtext';
import type { LinkPreview } from '@/features/richtext';

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
  const surfaceColor = isMine ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)';
  const accentBar = isMine ? 'rgba(255,255,255,0.55)' : accentColor;

  return (
    <LinkPreviewCard
      preview={preview}
      surfaceColor={surfaceColor}
      accentColor={accentBar}
      titleColor={textColor}
      metaColor={metaColor}
      layout="compact"
    />
  );
});
