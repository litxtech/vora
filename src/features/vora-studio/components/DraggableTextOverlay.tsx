import { useMemo } from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import type { StudioTextOverlay } from '@/features/vora-studio/types';
import { useStudioEditorStore } from '@/features/vora-studio/store/editorStore';
import { clampTime } from '@/features/vora-studio/utils/time';

type DraggableTextOverlayProps = {
  overlay: StudioTextOverlay;
  containerWidth: number;
  containerHeight: number;
  editable: boolean;
  visible: boolean;
  selected: boolean;
  /** studio: seçim çerçevesi; minimal: yalnızca metin (Instagram tarzı) */
  chrome?: 'studio' | 'minimal';
  dragDelete?: {
    onDragStart: () => void;
    onDragMove: (absoluteX: number, absoluteY: number) => void;
    onDragEnd: () => void;
    shouldDeleteOnDrop: (absoluteX: number, absoluteY: number) => boolean;
    onDelete: () => void;
  };
  onUpdate?: (id: string, patch: Partial<StudioTextOverlay>) => void;
  onSelect?: (id: string) => void;
  /** minimal/story: sürükleme ve pinch yalnızca seçiliyken */
  gesturesWhenSelectedOnly?: boolean;
  /** false = pinch kapalı */
  pinchEnabled?: boolean;
  /** Görünmez dokunma/pinch genişletmesi (story) */
  hitPadding?: number;
  /** Seçiliyken pinch yakalama alanı — hitPadding'den büyük olabilir */
  pinchHitPadding?: number;
  /** Metin sürüklenirken / pinch yapılırken üst katmana bildir (medya jestlerini kilitle) */
  onTransformActiveChange?: (active: boolean) => void;
  /** Düzenleme paneli açıkken seçili metinde yer tutucu göster */
  showSelectionHint?: boolean;
};

const MIN_FONT = 14;
const MAX_FONT = 72;

export function DraggableTextOverlay({
  overlay,
  containerWidth,
  containerHeight,
  editable,
  visible,
  selected,
  chrome = 'studio',
  dragDelete,
  onUpdate,
  onSelect,
  gesturesWhenSelectedOnly = false,
  pinchEnabled = true,
  hitPadding = 0,
  pinchHitPadding,
  onTransformActiveChange,
  showSelectionHint = false,
}: DraggableTextOverlayProps) {
  const showChrome = chrome === 'studio';
  const studioUpdate = useStudioEditorStore((s) => s.updateTextOverlay);
  const studioSelect = useStudioEditorStore((s) => s.setSelectedTextOverlay);
  const updateTextOverlay = onUpdate ?? ((id, patch) => studioUpdate(id, patch));
  const setSelectedTextOverlay = onSelect ?? studioSelect;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const pinchBaseFont = useSharedValue(overlay.fontSize);
  const pinchScale = useSharedValue(1);

  const canTransform = editable && (!gesturesWhenSelectedOnly || selected);
  const canPinch = canTransform && pinchEnabled;

  const commitPosition = (dx: number, dy: number) => {
    if (containerWidth <= 0 || containerHeight <= 0) return;
    const nextX = clampTime(overlay.x + dx / containerWidth, 0, 0.92);
    const nextY = clampTime(overlay.y + dy / containerHeight, 0, 0.92);
    updateTextOverlay(overlay.id, { x: nextX, y: nextY });
  };

  const commitFontSize = (delta: number) => {
    const next = Math.round(clampTime(overlay.fontSize + delta * 0.15, MIN_FONT, MAX_FONT));
    updateTextOverlay(overlay.id, { fontSize: next });
  };

  const commitPinchFontSize = (scale: number, baseFont: number) => {
    const next = Math.round(clampTime(baseFont * scale, MIN_FONT, MAX_FONT));
    updateTextOverlay(overlay.id, { fontSize: next });
  };

  const finishPan = (translationX: number, translationY: number, absoluteX: number, absoluteY: number) => {
    if (dragDelete?.shouldDeleteOnDrop(absoluteX, absoluteY)) {
      dragDelete.onDelete();
    } else {
      commitPosition(translationX, translationY);
    }
    dragDelete?.onDragEnd();
  };

  const notifyTransformStart = () => {
    onTransformActiveChange?.(true);
  };

  const notifyTransformEnd = () => {
    onTransformActiveChange?.(false);
  };

  const composed = useMemo(() => {
    const panGesture = Gesture.Pan()
      .enabled(canTransform)
      .maxPointers(1)
      .minPointers(1)
      .minDistance(6)
      .onStart(() => {
        if (onTransformActiveChange) runOnJS(notifyTransformStart)();
        if (dragDelete) runOnJS(dragDelete.onDragStart)();
      })
      .onUpdate((e) => {
        translateX.value = e.translationX;
        translateY.value = e.translationY;
        if (dragDelete) runOnJS(dragDelete.onDragMove)(e.absoluteX, e.absoluteY);
      })
      .onEnd((e) => {
        runOnJS(finishPan)(e.translationX, e.translationY, e.absoluteX, e.absoluteY);
        translateX.value = 0;
        translateY.value = 0;
      })
      .onFinalize(() => {
        if (onTransformActiveChange) runOnJS(notifyTransformEnd)();
      });

    const pinchGesture = Gesture.Pinch()
      .enabled(canPinch)
      .onBegin(() => {
        if (onTransformActiveChange) runOnJS(notifyTransformStart)();
        pinchBaseFont.value = overlay.fontSize;
        pinchScale.value = 1;
      })
      .onUpdate((e) => {
        pinchScale.value = e.scale;
      })
      .onEnd((e) => {
        runOnJS(commitPinchFontSize)(e.scale, pinchBaseFont.value);
        pinchScale.value = 1;
      })
      .onFinalize(() => {
        if (onTransformActiveChange) runOnJS(notifyTransformEnd)();
      });

    const tapGesture = Gesture.Tap()
      .enabled(editable)
      .maxDuration(220)
      .onEnd(() => {
        runOnJS(setSelectedTextOverlay)(overlay.id);
      });

    const transformGestures = Gesture.Simultaneous(pinchGesture, panGesture);
    return Gesture.Exclusive(transformGestures, tapGesture);
  }, [
    canPinch,
    canTransform,
    dragDelete,
    editable,
    onTransformActiveChange,
    overlay.fontSize,
    overlay.id,
    pinchBaseFont,
    pinchScale,
    setSelectedTextOverlay,
    translateX,
    translateY,
  ]);

  const resizeGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(editable && selected)
        .onEnd((e) => {
          runOnJS(commitFontSize)(e.translationX + e.translationY);
        }),
    [editable, overlay.fontSize, overlay.id, selected],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: canPinch ? pinchScale.value : 1 },
    ],
  }));

  if (!visible) return null;

  const gesturePadding =
    selected && canPinch && (pinchHitPadding ?? 0) > 0
      ? Math.max(hitPadding, pinchHitPadding ?? 0)
      : hitPadding;
  const hitPadY = gesturePadding > 0 ? gesturePadding * 0.65 : 0;
  const padX = gesturePadding > 0 ? gesturePadding : 0;
  const padY = gesturePadding > 0 ? hitPadY : 0;

  const textStyle = [
    styles.text,
    {
      fontSize: overlay.fontSize,
      lineHeight: Math.round(overlay.fontSize * 1.28),
      color: overlay.color,
      fontWeight: overlay.fontFamily === 'bold' ? ('800' as const) : ('600' as const),
      opacity: overlay.text ? 1 : 0.65,
    },
  ];
  const label =
    overlay.text || (selected && (editable || showSelectionHint) ? 'Metin yaz…' : '');

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        collapsable={false}
        style={[
          showChrome ? styles.wrap : styles.wrapMinimal,
          {
            left: overlay.x * containerWidth - padX,
            top: overlay.y * containerHeight - padY,
            paddingHorizontal: padX,
            paddingVertical: padY,
          },
          animatedStyle,
          showChrome && selected && editable ? styles.selected : null,
        ]}
      >
        {showChrome ? (
          <Text style={textStyle} includeFontPadding={false}>
            {label}
          </Text>
        ) : (
          <RNText style={textStyle} includeFontPadding={false}>
            {label}
          </RNText>
        )}

        {showChrome && selected && editable ? (
          <GestureDetector gesture={resizeGesture}>
            <View style={styles.resizeHandle}>
              <Ionicons name="resize-outline" size={12} color="#fff" />
            </View>
          </GestureDetector>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    maxWidth: '88%',
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  wrapMinimal: {
    position: 'absolute',
    maxWidth: '88%',
  },
  selected: {
    borderWidth: 1.5,
    borderColor: 'rgba(30,136,229,0.9)',
    borderStyle: 'dashed',
  },
  text: {
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  resizeHandle: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(30,136,229,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
