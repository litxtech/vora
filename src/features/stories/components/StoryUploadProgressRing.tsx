import { StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const DEFAULT_RING_STROKE = 3;

type StoryUploadProgressRingProps = {
  progress: number;
  accent: string;
  size?: number;
  stroke?: number;
};

export function StoryUploadProgressRing({
  progress,
  accent,
  size = 52,
  stroke = DEFAULT_RING_STROKE,
}: StoryUploadProgressRingProps) {
  const pct = Math.min(Math.max(progress, 0), 1);
  const r = size / 2;
  const normalized = r - stroke / 2;
  const circumference = normalized * 2 * Math.PI;
  const offset = circumference - pct * circumference;

  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Circle
        cx={r}
        cy={r}
        r={normalized}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={stroke}
        fill="transparent"
      />
      <Circle
        cx={r}
        cy={r}
        r={normalized}
        stroke={accent}
        strokeWidth={stroke}
        fill="transparent"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        rotation={-90}
        origin={`${r}, ${r}`}
      />
    </Svg>
  );
}
