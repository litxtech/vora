import { Platform, StyleSheet } from 'react-native';
import {
  STORY_CARD_BORDER_COLOR,
  STORY_CARD_RADIUS,
} from '@/features/stories/constants';

/** Hikâye kartı — kamera, paylaşım ve izleyicide ortak yuvarlak çerçeve */
export const storyCardFrameStyle = StyleSheet.create({
  frame: {
    borderRadius: STORY_CARD_RADIUS,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STORY_CARD_BORDER_COLOR,
    backgroundColor: '#0a0a0a',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.38,
        shadowRadius: 18,
      },
      android: {
        elevation: 10,
      },
    }),
  },
});
