import { CapturedVideoPreview } from '@/components/media/CapturedVideoPreview';

type ChatVideoPlayerProps = {
  uri: string;
  autoPlay?: boolean;
  /** capture = çekim sonrası onay; viewer = gelen video oynatma */
  variant?: 'capture' | 'viewer';
};

export function ChatVideoPlayer({ uri, autoPlay = true, variant = 'viewer' }: ChatVideoPlayerProps) {
  if (variant === 'capture') {
    return <CapturedVideoPreview uri={uri} autoPlay={autoPlay} />;
  }

  return (
    <CapturedVideoPreview
      uri={uri}
      autoPlay={autoPlay}
      loop={false}
      contentFit="contain"
      nativeControls
      allowsPictureInPicture
    />
  );
}
