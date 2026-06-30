import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { getPlatformCharmTheme } from '@/features/platform-charm/theme';
import type { GenderId } from '@/constants/registration';

type PlatformCharmBadgeSvgProps = {
  size?: number;
  gender?: GenderId | null;
};

/** Erkek: kristal kalkan · Kadın: göksel çiçek · Diğer: prizma elmas */
const BODY_PATH = {
  male: 'M8 1.1 L13.6 3.6 V9.4 C13.6 11.2 10.2 13.8 8 14.9 C5.8 13.8 2.4 11.2 2.4 9.4 V3.6 Z',
  female:
    'M8 1.4 L9.9 5.4 L14.2 5.8 L10.9 8.7 L11.9 13 L8 10.8 L4.1 13 L5.1 8.7 L1.8 5.8 L6.1 5.4 Z',
  neutral: 'M8 1.6 L12.8 8 L8 14.4 L3.2 8 Z',
} as const;

const INNER_FACET = {
  male: 'M8 3.4 L11.2 5.1 V8.8 C11.2 10 9.4 11.5 8 12.2 C6.6 11.5 4.8 10 4.8 8.8 V5.1 Z',
  female: 'M8 3.6 L9.4 6.2 L12.1 6.5 L9.9 8.4 L10.5 11.1 L8 9.7 L5.5 11.1 L6.1 8.4 L3.9 6.5 L6.6 6.2 Z',
  neutral: 'M8 4.2 L10.8 8 L8 11.8 L5.2 8 Z',
} as const;

const CHECK_PATH = 'M5.1 8.15 L7.15 10.35 L11.35 5.75';

const SPARKLE_POINTS: { cx: number; cy: number; r: number; o: number }[] = [
  { cx: 12.6, cy: 3.1, r: 0.55, o: 0.95 },
  { cx: 3.3, cy: 4.4, r: 0.4, o: 0.7 },
  { cx: 11.8, cy: 11.6, r: 0.35, o: 0.55 },
];

function SparkleStar({ cx, cy, scale, opacity, color }: { cx: number; cy: number; scale: number; opacity: number; color: string }) {
  const d = `M${cx} ${cy - scale} L${cx + scale * 0.22} ${cy - scale * 0.22} L${cx + scale} ${cy} L${cx + scale * 0.22} ${cy + scale * 0.22} L${cx} ${cy + scale} L${cx - scale * 0.22} ${cy + scale * 0.22} L${cx - scale} ${cy} L${cx - scale * 0.22} ${cy - scale * 0.22} Z`;
  return <Path d={d} fill={color} opacity={opacity} />;
}

export function PlatformCharmBadgeSvg({ size = 14, gender }: PlatformCharmBadgeSvgProps) {
  const theme = getPlatformCharmTheme(gender);
  const id = theme.variant;
  const body = BODY_PATH[theme.variant];
  const facet = INNER_FACET[theme.variant];

  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Defs>
        <RadialGradient id={`${id}-aura`} cx="50%" cy="45%" rx="55%" ry="55%">
          <Stop offset="0" stopColor={theme.glow} stopOpacity={0.55} />
          <Stop offset="1" stopColor={theme.glow} stopOpacity={0} />
        </RadialGradient>
        <SvgGradient id={`${id}-body`} x1="2" y1="1" x2="14" y2="15" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={theme.gradient[0]} />
          <Stop offset="0.48" stopColor={theme.gradient[1]} />
          <Stop offset="1" stopColor={theme.gradient[2]} />
        </SvgGradient>
        <SvgGradient id={`${id}-shine`} x1="4" y1="2" x2="10" y2="12" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.72} />
          <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0.12} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </SvgGradient>
        <SvgGradient id={`${id}-rim`} x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={theme.rim} />
          <Stop offset="1" stopColor={theme.accent} stopOpacity={0.35} />
        </SvgGradient>
      </Defs>

      <Circle cx={8} cy={8.2} r={7.4} fill={`url(#${id}-aura)`} />

      <Path
        d={body}
        fill={`url(#${id}-body)`}
        stroke={`url(#${id}-rim)`}
        strokeWidth={0.65}
      />

      <Path d={facet} fill={`url(#${id}-shine)`} opacity={0.9} />

      <Path
        d="M4.2 4.8 L9.1 3.6"
        stroke="#FFFFFF"
        strokeWidth={0.45}
        strokeLinecap="round"
        opacity={0.35}
      />

      <Path
        d={CHECK_PATH}
        stroke={theme.glow}
        strokeWidth={2.35}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.45}
      />
      <Path
        d={CHECK_PATH}
        stroke="#FFFFFF"
        strokeWidth={1.65}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <G>
        {SPARKLE_POINTS.map((s) => (
          <SparkleStar
            key={`${s.cx}-${s.cy}`}
            cx={s.cx}
            cy={s.cy}
            scale={s.r * 2.2}
            opacity={s.o}
            color={theme.sparkle}
          />
        ))}
      </G>
    </Svg>
  );
}
