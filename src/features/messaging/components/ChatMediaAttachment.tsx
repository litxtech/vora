import { StyleSheet } from 'react-native';
import { FeedMediaPreview } from '@/components/media/FeedMediaPreview';
import { radius } from '@/constants/theme';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { CHAT_MEDIA_ASPECT, CHAT_MEDIA_MAX_HEIGHT, CHAT_MEDIA_WIDTH } from '../constants';
import { useChatMediaViewer } from '../context/ChatMediaViewerContext';
import { useDoubleTap } from '../hooks/useDoubleTap';

type ChatMediaAttachmentProps = {
  uri: string;
  onDoublePress?: () => void;
};

/** Sohbet görsel/video — feed gibi kenarsız önizleme, tıklayınca temiz tam ekran. */
export function ChatMediaAttachment({ uri, onDoublePress }: ChatMediaAttachmentProps) {
  const { openMedia } = useChatMediaViewer();
  const isVideo = isVideoUrl(uri);

  const handlePress = useDoubleTap({
    onSingleTap: () => openMedia(uri, { isVideo }),
    onDoubleTap: onDoublePress,
  });

  return (
    <FeedMediaPreview
      url={uri}
      style={styles.media}
      resizeMode="cover"
      showPlayIcon={isVideo}
      onPress={handlePress}
    />
  );
}

const styles = StyleSheet.create({
  media: {
    width: CHAT_MEDIA_WIDTH,
    maxWidth: '100%',
    aspectRatio: CHAT_MEDIA_ASPECT,
    maxHeight: CHAT_MEDIA_MAX_HEIGHT,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 2,
  },
});
