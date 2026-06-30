import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type ChatBubbleEntranceProps = {
  messageId: string;
  isMine: boolean;
  enteredMessageIds: ReadonlySet<string>;
  onMarkEntered: (messageId: string) => void;
  children: ReactNode;
};

/** Yeni mesaj balonu — WhatsApp benzeri hafif scale + slide + fade. */
export function ChatBubbleEntrance({
  messageId,
  isMine,
  enteredMessageIds,
  onMarkEntered,
  children,
}: ChatBubbleEntranceProps) {
  const shouldAnimateRef = useRef(!enteredMessageIds.has(messageId));
  const opacity = useSharedValue(shouldAnimateRef.current ? 0 : 1);
  const scale = useSharedValue(shouldAnimateRef.current ? 0.9 : 1);
  const translateX = useSharedValue(shouldAnimateRef.current ? (isMine ? 8 : -8) : 0);
  const translateY = useSharedValue(shouldAnimateRef.current ? 6 : 0);

  useEffect(() => {
    onMarkEntered(messageId);
    if (!shouldAnimateRef.current) return;

    opacity.value = withTiming(1, { duration: 90 });
    scale.value = withSpring(1, { damping: 20, stiffness: 420, mass: 0.55 });
    translateX.value = withSpring(0, { damping: 22, stiffness: 400, mass: 0.6 });
    translateY.value = withSpring(0, { damping: 22, stiffness: 400, mass: 0.6 });
  }, [messageId, isMine, onMarkEntered, opacity, scale, translateX, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[styles.root, isMine ? styles.mine : styles.theirs, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  mine: {
    alignItems: 'flex-end',
  },
  theirs: {
    alignItems: 'flex-start',
  },
});
