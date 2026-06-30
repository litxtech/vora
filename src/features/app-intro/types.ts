import type { Ionicons } from '@expo/vector-icons';

export type IntroSlide = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  title: string;
  subtitle: string;
  description: string;
};
