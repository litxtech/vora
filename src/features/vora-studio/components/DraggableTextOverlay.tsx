import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text as RNText, View, type TextStyle, type ViewStyle } from 'react-native';
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
  /** fontSize = compose/studio; scale = hikâye (IG tarzı) */
  pinchMode?: 'fontSize' | 'scale';
  /** pinchMode scale iken scale sınırlama */
  clampScale?: (scale: number) => number;
  /** Hikâye: iki parmakla döndürme */
  rotationEnabled?: boolean;
  /** Hikâye: çift dokun → düzenle */
  onEdit?: (id: string) => void;
  /** Görünmez dokunma/pinch genişletmesi (story) */
  hitPadding?: number;
  /** Seçiliyken pinch yakalama alanı — hitPadding'den büyük olabilir */
  pinchHitPadding?: number;
  /** Metin sürüklenirken / pinch yapılırken üst katmana bildir (medya jestlerini kilitle) */
  onTransformActiveChange?: (active: boolean) => void;
  /** Story: seçili metne tek dokunuş → düzenle */
  tapToEditWhenSelected?: boolean;
  /** Story: tek dokunuş doğrudan düzenlemeyi açar */
  singleTapOpensEdit?: boolean;
  /** Düzenleme paneli açıkken seçili metinde yer tutucu göster */
  showSelectionHint?: boolean;
  /** Story: koyu pill arka plan */
  pill?: boolean;
  /** Story: x,y merkez noktası */
  anchor?: 'topLeft' | 'center';
  /** Konum clamp — story çerçevesi */
  clampPosition?: (x: number, y: number) => { x: number; y: number };
  /** Story: dışarıdan çözümlenmiş görünüm (özellik izolasyonu) */
  contentLabel?: string;
  contentTextStyle?: TextStyle;
  contentBackgroundStyle?: ViewStyle | null;
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
  pinchMode = 'fontSize',
  clampScale,
  rotationEnabled = false,
  onEdit,
  hitPadding = 0,
  pinchHitPadding,
  onTransformActiveChange,
  showSelectionHint = false,
  tapToEditWhenSelected = false,
  singleTapOpensEdit = false,
  pill = false,
  anchor = 'topLeft',
  clampPosition,
  contentLabel,
  contentTextStyle,
  contentBackgroundStyle,
}: DraggableTextOverlayProps) {
  const showChrome = chrome === 'studio';
  const studioUpdate = useStudioEditorStore((s) => s.updateTextOverlay);
  const studioSelect = useStudioEditorStore((s) => s.setSelectedTextOverlay);
  const updateTextOverlay = onUpdate ?? ((id, patch) => studioUpdate(id, patch));
  const setSelectedTextOverlay = onSelect ?? studioSelect;

  const draggingRef = useRef(false);
  const pinchingRef = useRef(false);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const pinchBaseFont = useSharedValue(overlay.fontSize);
  const pinchScale = useSharedValue(1);
  const pinchBaseScale = useSharedValue(overlay.scale ?? 1);
  const rotationBaseRad = useSharedValue(((overlay.rotationDeg ?? 0) * Math.PI) / 180);
  const liveRotation = useSharedValue(0);
  const rotatingRef = useRef(false);
  const [anchorSize, setAnchorSize] = useState({ width: 0, height: 0 });

  const onAnchorLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = event.nativeEvent.layout;
      if (width > 0 && height > 0) {
        setAnchorSize((prev) =>
          prev.width === width && prev.height === height ? prev : { width, height },
        );
      }
    },
    [],
  );

  useEffect(() => {
    setAnchorSize({ width: 0, height: 0 });
  }, [overlay.id, overlay.text]);

  useEffect(() => {
    if (draggingRef.current) return;
    translateX.value = 0;
    translateY.value = 0;
  }, [overlay.x, overlay.y, translateX, translateY]);

  useEffect(() => {
    if (pinchingRef.current) return;
    pinchScale.value = 1;
    pinchBaseFont.value = overlay.fontSize;
    pinchBaseScale.value = overlay.scale ?? 1;
  }, [overlay.fontSize, overlay.scale, pinchBaseFont, pinchBaseScale, pinchScale]);

  useEffect(() => {
    if (rotatingRef.current) return;
    liveRotation.value = 0;
    rotationBaseRad.value = ((overlay.rotationDeg ?? 0) * Math.PI) / 180;
  }, [liveRotation, overlay.rotationDeg, rotationBaseRad]);

  const setDragging = useCallback((value: boolean) => {
    draggingRef.current = value;
  }, []);

  const setPinching = useCallback((value: boolean) => {
    pinchingRef.current = value;
  }, []);

  const setRotating = useCallback((value: boolean) => {
    rotatingRef.current = value;
  }, []);

  const canTransform = editable && (!gesturesWhenSelectedOnly || selected);
  const canPinch = canTransform && pinchEnabled;
  const canRotate = canTransform && rotationEnabled && selected;

  const commitPosition = (dx: number, dy: number) => {
    if (containerWidth <= 0 || containerHeight <= 0) return;
    let nextX = overlay.x + dx / containerWidth;
    let nextY = overlay.y + dy / containerHeight;
    if (clampPosition) {
      ({ x: nextX, y: nextY } = clampPosition(nextX, nextY));
    } else {
      nextX = clampTime(nextX, 0, 0.92);
      nextY = clampTime(nextY, 0, 0.92);
    }
    updateTextOverlay(overlay.id, { x: nextX, y: nextY });
  };

  const commitFontSize = (delta: number) => {
    const next = Math.round(clampTime(overlay.fontSize + delta * 0.15, MIN_FONT, MAX_FONT));
    updateTextOverlay(overlay.id, { fontSize: next });
  };

  const commitPinchFontSize = (scale: number, baseFont: number) => {
    const next = Math.round(clampTime(baseFont * scale, MIN_FONT, MAX_FONT));
    updateTextOverlay(overlay.id, { fontSize: next });
    pinchingRef.current = false;
  };

  const commitPinchScale = (factor: number, base: number) => {
    const raw = base * factor;
    const next = clampScale ? clampScale(raw) : raw;
    updateTextOverlay(overlay.id, { scale: next });
    pinchingRef.current = false;
  };

  const commitRotation = (baseRad: number, deltaRad: number) => {
    let deg = ((baseRad + deltaRad) * 180) / Math.PI;
    deg = deg % 360;
    if (deg > 180) deg -= 360;
    if (deg < -180) deg += 360;
    updateTextOverlay(overlay.id, { rotationDeg: deg });
    rotatingRef.current = false;
  };

  const finishPan = (translationX: number, translationY: number, absoluteX: number, absoluteY: number) => {
    if (dragDelete?.shouldDeleteOnDrop(absoluteX, absoluteY)) {
      dragDelete.onDelete();
    } else {
      commitPosition(translationX, translationY);
    }
    dragDelete?.onDragEnd();
    draggingRef.current = false;
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
      .minDistance(4)
      // Parmak metne değer değmez medya jestlerini kilitle (IG tarzı) — aktivasyon yarışını önler.
      .onBegin(() => {
        if (onTransformActiveChange) runOnJS(notifyTransformStart)();
      })
      .onStart(() => {
        runOnJS(setDragging)(true);
        if (!selected) {
          runOnJS(setSelectedTextOverlay)(overlay.id);
        }
        if (dragDelete) runOnJS(dragDelete.onDragStart)();
      })
      .onUpdate((e) => {
        translateX.value = e.translationX;
        translateY.value = e.translationY;
        if (dragDelete) runOnJS(dragDelete.onDragMove)(e.absoluteX, e.absoluteY);
      })
      .onEnd((e) => {
        runOnJS(finishPan)(e.translationX, e.translationY, e.absoluteX, e.absoluteY);
      })
      .onFinalize(() => {
        runOnJS(setDragging)(false);
        if (onTransformActiveChange) runOnJS(notifyTransformEnd)();
      });

    const pinchGesture = Gesture.Pinch()
      .enabled(canPinch)
      .onBegin(() => {
        runOnJS(setPinching)(true);
        if (onTransformActiveChange) runOnJS(notifyTransformStart)();
        if (pinchMode === 'scale') {
          pinchBaseScale.value = overlay.scale ?? 1;
        } else {
          pinchBaseFont.value = overlay.fontSize;
        }
        pinchScale.value = 1;
      })
      .onUpdate((e) => {
        pinchScale.value = e.scale;
      })
      .onEnd((e) => {
        if (pinchMode === 'scale') {
          runOnJS(commitPinchScale)(e.scale, pinchBaseScale.value);
        } else {
          runOnJS(commitPinchFontSize)(e.scale, pinchBaseFont.value);
        }
      })
      .onFinalize(() => {
        runOnJS(setPinching)(false);
        if (onTransformActiveChange) runOnJS(notifyTransformEnd)();
      });

    const rotateGesture = Gesture.Rotation()
      .enabled(canRotate)
      .onBegin(() => {
        runOnJS(setRotating)(true);
        runOnJS(setSelectedTextOverlay)(overlay.id);
        if (onTransformActiveChange) runOnJS(notifyTransformStart)();
        rotationBaseRad.value = ((overlay.rotationDeg ?? 0) * Math.PI) / 180;
        liveRotation.value = 0;
      })
      .onUpdate((e) => {
        liveRotation.value = e.rotation;
      })
      .onEnd((e) => {
        runOnJS(commitRotation)(rotationBaseRad.value, e.rotation);
      })
      .onFinalize(() => {
        runOnJS(setRotating)(false);
        if (onTransformActiveChange) runOnJS(notifyTransformEnd)();
      });

    const tapGesture = Gesture.Tap()
      .enabled(editable)
      .maxDuration(220)
      .onEnd(() => {
        if (singleTapOpensEdit && onEdit) {
          runOnJS(onEdit)(overlay.id);
          return;
        }
        if (tapToEditWhenSelected && selected && onEdit) {
          runOnJS(onEdit)(overlay.id);
          return;
        }
        runOnJS(setSelectedTextOverlay)(overlay.id);
      });

    const doubleTapGesture = Gesture.Tap()
      .enabled(editable && Boolean(onEdit))
      .numberOfTaps(2)
      .maxDuration(260)
      .onEnd(() => {
        if (onEdit) runOnJS(onEdit)(overlay.id);
      });

    const transformGestures = Gesture.Simultaneous(
      panGesture,
      pinchGesture,
      rotateGesture,
    );
    return Gesture.Exclusive(
      doubleTapGesture,
      Gesture.Exclusive(transformGestures, tapGesture),
    );
  }, [
    canPinch,
    canRotate,
    canTransform,
    clampScale,
    dragDelete,
    editable,
    onEdit,
    onTransformActiveChange,
    overlay.fontSize,
    overlay.id,
    overlay.rotationDeg,
    overlay.scale,
    selected,
    singleTapOpensEdit,
    tapToEditWhenSelected,
    pinchBaseFont,
    pinchBaseScale,
    pinchMode,
    pinchScale,
    rotationBaseRad,
    liveRotation,
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

  const animatedStyle = useAnimatedStyle(() => {
    const scaleFactor =
      pinchMode === 'scale'
        ? pinchBaseScale.value * pinchScale.value
        : canPinch
          ? pinchScale.value
          : 1;
    const rotateRad = rotationBaseRad.value + liveRotation.value;
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotateRad}rad` },
        { scale: scaleFactor },
      ],
    };
  });

  const baseLeft = overlay.x * containerWidth;
  const baseTop = overlay.y * containerHeight;

  if (!visible) return null;

  const usesCustomContent = contentTextStyle != null;

  const gesturePadding =
    selected && canPinch && (pinchHitPadding ?? 0) > 0
      ? Math.max(hitPadding, pinchHitPadding ?? 0)
      : hitPadding;
  const hitPadY = gesturePadding > 0 ? gesturePadding * 0.65 : 0;
  const padX = gesturePadding > 0 ? gesturePadding : 0;
  const padY = gesturePadding > 0 ? hitPadY : 0;

  const fallbackW = containerWidth * 0.4;
  const fallbackH = 36;
  const anchorW = anchorSize.width > 0 ? anchorSize.width : fallbackW;
  const anchorH = anchorSize.height > 0 ? anchorSize.height : fallbackH;
  const centerAnchorLeft =
    anchor === 'center'
      ? Math.min(Math.max(baseLeft - anchorW / 2, 4), containerWidth - anchorW - 4)
      : baseLeft - padX;
  const centerAnchorTop =
    anchor === 'center'
      ? Math.min(Math.max(baseTop - anchorH / 2, 4), containerHeight - anchorH - 4)
      : baseTop - padY;

  const textStyle = usesCustomContent
    ? [styles.textMinimal, contentTextStyle]
    : [
        showChrome ? styles.text : styles.textMinimal,
        {
          fontSize: overlay.fontSize,
          lineHeight: Math.round(overlay.fontSize * 1.28),
          color: overlay.color,
          fontWeight: overlay.fontFamily === 'bold' ? ('800' as const) : ('600' as const),
          opacity: overlay.text ? 1 : 0.65,
        },
      ];
  const label = usesCustomContent
    ? (contentLabel ?? '')
    : overlay.text || (selected && (editable || showSelectionHint) ? 'Metin yaz…' : '');
  const textColor = usesCustomContent
    ? (contentTextStyle?.color ?? overlay.color)
    : overlay.color === '#000000' && pill
      ? '#FFFFFF'
      : overlay.color;

  const textNode = showChrome ? (
    <Text style={[textStyle, !usesCustomContent ? { color: textColor } : null]} includeFontPadding={false}>
      {label}
    </Text>
  ) : (
    <RNText style={[textStyle, !usesCustomContent ? { color: textColor } : null]} includeFontPadding={false}>
      {label}
    </RNText>
  );

  const contentNode =
    contentBackgroundStyle != null ? (
      <View style={contentBackgroundStyle}>{textNode}</View>
    ) : pill ? (
      <View style={styles.pill}>{textNode}</View>
    ) : (
      textNode
    );

  return (
    <GestureDetector gesture={composed}>
      <View
        collapsable={false}
        style={[
          styles.anchorHost,
          anchor === 'center'
            ? {
                left: centerAnchorLeft,
                top: centerAnchorTop,
              }
            : {
                left: baseLeft - padX,
                top: baseTop - padY,
              },
        ]}
      >
        <Animated.View
          collapsable={false}
          style={[
            showChrome ? styles.wrap : styles.wrapMinimal,
            pill && !usesCustomContent && styles.wrapPillHost,
            {
              paddingHorizontal: padX,
              paddingVertical: padY,
              maxWidth: containerWidth > 0 ? containerWidth * 0.88 : '88%',
            },
            animatedStyle,
            showChrome && selected && editable ? styles.selected : null,
          ]}
        >
          <View onLayout={anchor === 'center' ? onAnchorLayout : undefined} collapsable={false}>
            {contentNode}
          </View>

          {showChrome && selected && editable ? (
            <GestureDetector gesture={resizeGesture}>
              <View style={styles.resizeHandle}>
                <Ionicons name="resize-outline" size={12} color="#fff" />
              </View>
            </GestureDetector>
          ) : null}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  anchorHost: {
    position: 'absolute',
  },
  wrap: {
    maxWidth: '88%',
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  wrapMinimal: {},
  wrapPillHost: {
    maxWidth: '88%',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
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
    textAlign: 'center',
  },
  textMinimal: {
    textAlign: 'center',
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
