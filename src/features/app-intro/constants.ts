import type { IntroSlide } from '@/features/app-intro/types';

export const APP_INTRO_SLIDES: IntroSlide[] = [
  {
    id: 'welcome',
    icon: 'water',
    accent: '#E85D5D',
    title: 'Vora\'ya Hoş Geldin',
    subtitle: 'Karadeniz\'in canlı dijital ağı',
    description:
      'Vora; şehrin nabzını tutan, komşularınla bağ kuran ve günlük hayatını kolaylaştıran yerel bir süper uygulamadır.',
  },
  {
    id: 'feed',
    icon: 'newspaper',
    accent: '#1E88E5',
    title: 'Akış & Topluluk',
    subtitle: 'Şehrini canlı takip et',
    description:
      'Güncel haberler, yerel gönderiler, topluluklar ve kanallarla çevrende neler olup bittiğini anında gör.',
  },
  {
    id: 'map',
    icon: 'map',
    accent: '#00897B',
    title: 'Harita & Yakınınız',
    subtitle: 'Konum tabanlı bilgi',
    description:
      'Canlı haritada trafik, acil noktalar ve yakınındaki olayları tek ekranda keşfet.',
  },
  {
    id: 'centers',
    icon: 'grid',
    accent: '#7B1FA2',
    title: 'Merkezler',
    subtitle: 'Her ihtiyaca özel modüller',
    description:
      'Etkinlik, iş ilanı, kayıp eşya, yardım ve daha fazlası — 8 merkez tek uygulamada.',
  },
  {
    id: 'messaging',
    icon: 'chatbubbles',
    accent: '#1565C0',
    title: 'Mesajlaşma & Arama',
    subtitle: 'Bağlantıda kal',
    description:
      'Özel mesajlar, grup sohbetleri, sesli ve görüntülü aramalarla arkadaşların ve komşularınla iletişim kur.',
  },
  {
    id: 'reels',
    icon: 'play-circle',
    accent: '#F57C00',
    title: 'Reels & Keşfet',
    subtitle: 'Video ve keşif deneyimi',
    description:
      'Kısa videolar izle, yaratıcı içerikler paylaş ve Keşfet sekmesinde yeni insanlar ile yerleri bul.',
  },
  {
    id: 'start',
    icon: 'rocket',
    accent: '#E85D5D',
    title: 'Hazırsın!',
    subtitle: 'Karadeniz seni bekliyor',
    description:
      'Hesap oluştur veya misafir olarak devam et — Vora\'yı keşfetmeye hemen başla.',
  },
];

export const APP_INTRO_SLIDE_COUNT = APP_INTRO_SLIDES.length;
