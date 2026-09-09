import type { TextStyle, ViewStyle } from 'react-native';
import type { StudioTextOverlay } from '@/features/vora-studio/types';
import {
  getStoryTextStyleDef,
  type StoryTextBackground,
} from '@/features/stories/constants/storyTextStyles';

export type StoryTextResolvedAppearance = {
  label: string;
  isPlaceholder: boolean;
  textColor: string;
  textStyle: TextStyle;
  backgroundStyle: ViewStyle | null;
  usesPill: boolean;
};

function resolveBackground(
  overlay: StudioTextOverlay,
  background: StoryTextBackground,
  textColor: string,
): ViewStyle | null {
  if (background === 'none') return null;

  if (background === 'semi') {
    return {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: 'rgba(0,0,0,0.55)',
    };
  }

  const isLight = overlay.color === '#FFFFFF' || overlay.color === '#FFCC00';
  return {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: isLight ? 'rgba(255,255,255,0.92)' : overlay.color,
  };
}

/** Eski kayıtlar: fontFamily regular/bold → modern/strong */
export function resolveStoryTextStyleId(overlay: StudioTextOverlay) {
  if (overlay.textStyle) return overlay.textStyle;
  return overlay.fontFamily === 'regular' ? 'classic' : 'modern';
}

export function resolveStoryTextBackground(overlay: StudioTextOverlay): StoryTextBackground {
  if (overlay.background) return overlay.background;
  return getStoryTextStyleDef(resolveStoryTextStyleId(overlay)).defaultBackground;
}

export function resolveStoryTextAlign(overlay: StudioTextOverlay) {
  return overlay.textAlign ?? 'center';
}

export function resolveStoryTextAppearance(
  overlay: StudioTextOverlay,
  options?: { showPlaceholder?: boolean },
): StoryTextResolvedAppearance {
  const styleDef = getStoryTextStyleDef(resolveStoryTextStyleId(overlay));
  const background = resolveStoryTextBackground(overlay);
  const textAlign = resolveStoryTextAlign(overlay);
  const trimmed = overlay.text.trim();
  const isPlaceholder = !trimmed;
  const label = trimmed || (options?.showPlaceholder ? 'Metin yaz…' : '');
  const usesPill = background !== 'none';

  let textColor = overlay.color || '#FFFFFF';
  if (background === 'solid' && (overlay.color === '#FFFFFF' || overlay.color === '#FFCC00')) {
    textColor = '#000000';
  } else if (overlay.color === '#000000' && usesPill) {
    textColor = '#FFFFFF';
  }

  const textStyle: TextStyle = {
    fontSize: overlay.fontSize,
    lineHeight: Math.round(overlay.fontSize * 1.28),
    color: textColor,
    fontWeight: styleDef.fontWeight,
    fontStyle: styleDef.fontStyle ?? 'normal',
    fontFamily: styleDef.fontFamily,
    letterSpacing: styleDef.letterSpacing,
    textTransform: styleDef.textTransform,
    textAlign,
    opacity: isPlaceholder ? 0.7 : 1,
    ...(styleDef.textShadow
      ? {
          textShadowColor: styleDef.textShadow.color,
          textShadowOffset: styleDef.textShadow.offset,
          textShadowRadius: styleDef.textShadow.radius,
        }
      : null),
  };

  return {
    label,
    isPlaceholder,
    textColor,
    textStyle,
    backgroundStyle: resolveBackground(overlay, background, textColor),
    usesPill,
  };
}
