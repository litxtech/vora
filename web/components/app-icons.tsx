type IconProps = { size?: number };

function Svg({ size = 26, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function IconFeed(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 4h11a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2V4z" />
      <path d="M8 8h7M8 12h7M8 16h4" />
    </Svg>
  );
}

export function IconCompass(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2z" />
    </Svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m10 9 5 3-5 3V9z" />
    </Svg>
  );
}

export function IconChat(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 17.5 4 20V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7.5" />
    </Svg>
  );
}

export function IconPerson(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19.2a6.5 6.5 0 0 1 13 0" />
    </Svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Svg size={props.size ?? 28}>
      <path d="M12 6v12M6 12h12" />
    </Svg>
  );
}

export function IconHeart(props: IconProps) {
  return (
    <Svg size={props.size ?? 18}>
      <path d="M12 19s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" />
    </Svg>
  );
}

export function IconBubble(props: IconProps) {
  return (
    <Svg size={props.size ?? 18}>
      <path d="M6 16.5 4 19V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6.4" />
    </Svg>
  );
}

export function IconRepeat(props: IconProps) {
  return (
    <Svg size={props.size ?? 18}>
      <path d="M17 2v4h-4" />
      <path d="M7 22v-4h4" />
      <path d="M19.5 8A7 7 0 0 0 7 6.2L5 8" />
      <path d="M4.5 16A7 7 0 0 0 17 17.8L19 16" />
    </Svg>
  );
}

export function IconBookmark(props: IconProps) {
  return (
    <Svg size={props.size ?? 18}>
      <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.2L6 20V5a1 1 0 0 1 1-1z" />
    </Svg>
  );
}

export function IconShare(props: IconProps) {
  return (
    <Svg size={props.size ?? 18}>
      <circle cx="6" cy="12" r="2" />
      <circle cx="17" cy="7" r="2" />
      <circle cx="17" cy="17" r="2" />
      <path d="m8 11 7-3M8 13l7 3" />
    </Svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <Svg size={props.size ?? 22}>
      <path d="M6 16V10a6 6 0 1 1 12 0v6l1.5 2h-15L6 16z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </Svg>
  );
}

export function IconPin(props: IconProps) {
  return (
    <Svg size={props.size ?? 14}>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
      <circle cx="12" cy="11" r="1.6" />
    </Svg>
  );
}
