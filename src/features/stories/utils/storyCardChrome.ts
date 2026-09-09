import { Platform, StyleSheet } from 'react-native';
import {
  STORY_CARD_BORDER_COLOR,
  STORY_CARD_RADIUS,
} from '@/features/stories/constants';
import { STORY_CARD_MEDIA_ASPECT } from '@/features/stories/utils/storyFraming';

/** Önizleme alanına sığan 9:16 hikâye kartı boyutu */
export function fitStoryCardInStage(stageWidth: number, stageHeight: number): {
  width: number;
  height: number;
} {
  if (stageWidth <= 0 || stageHeight <= 0) {
    return { width: 0, height: 0 };
  }

  let width = stageWidth;
  let height = width / STORY_CARD_MEDIA_ASPECT;
  if (height > stageHeight) {
    height = stageHeight;
    width = height * STORY_CARD_MEDIA_ASPECT;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

/** Hikâye kartı — kamera, paylaşım ve izleyicide ortak yuvarlak çerçeve */
export const storyCardFrameStyle = StyleSheet.create({
  frame: {
    borderRadius: STORY_CARD_RADIUS,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STORY_CARD_BORDER_COLOR,
    backgroundColor: '#000',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.42,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
});
