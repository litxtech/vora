import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import type { PersonnelTab } from '@/features/personnel-center/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type PersonnelTabBannerProps = {
  tab: PersonnelTab;
  resultCount?: number;
  onCreateJob?: () => void;
  onCreateStaff?: () => void;
};

const BANNER_CONFIG: Record<
  PersonnelTab,
  { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; accent?: 'danger' | 'primary' | 'accent' }
> = {
  live: {
    icon: 'pulse',
    title: 'Canlı Ağ',
    subtitle: 'Kaç kişinin iş sahibi olduğunu ve kaç işletmenin personel bulduğunu anlık izleyin.',
    accent: 'primary',
  },
  seeking: {
    icon: 'search',
    title: 'İş Arıyorum',
    subtitle: 'Yayında olan iş ilanlarını inceleyin, başvurun veya doğrudan mesaj gönderin.',
    accent: 'primary',
  },
  hiring: {
    icon: 'people',
    title: 'Personel Arıyorum',
    subtitle: 'İş arayan profilleri keşfedin veya personel talebi oluşturun.',
    accent: 'accent',
  },
  urgent: {
    icon: 'flash',
    title: 'Acil Personel',
    subtitle: 'Acil etiketli ilanlar öncelikli listelenir. Hızlı iletişim kurun.',
    accent: 'danger',
  },
  recent: {
    icon: 'time',
    title: 'Son İlanlar',
    subtitle: 'En yeni iş ve personel ilanları burada.',
  },
  nearby: {
    icon: 'navigate',
    title: 'Yakınımdaki',
    subtitle: 'Konumunuza yakın ilanlar mesafeye göre sıralanır.',
  },
  applications: {
    icon: 'document-text',
    title: 'Başvurularım',
    subtitle: 'Gönderdiğiniz başvuruların durumunu takip edin.',
  },
  incoming: {
    icon: 'mail',
    title: 'Gelen Başvurular',
    subtitle: 'İlanlarınıza gelen başvuruları yönetin.',
  },
  favorites: {
    icon: 'heart',
    title: 'Favoriler',
    subtitle: 'Kaydettiğiniz ilanlara hızlıca dönün.',
  },
  saved_searches: {
    icon: 'bookmark',
    title: 'Kayıtlı Aramalar',
    subtitle: 'Kaydettiğiniz aramalara yeni ilan geldiğinde bildirim alırsınız.',
    accent: 'primary',
  },
};

export function PersonnelTabBanner({
  tab,
  resultCount,
  onCreateJob,
  onCreateStaff,
}: PersonnelTabBannerProps) {
  const { colors } = useTheme();
  const config = BANNER_CONFIG[tab] ?? BANNER_CONFIG.seeking;
  const accentColor =
    config.accent === 'danger'
      ? colors.danger
      : config.accent === 'accent'
        ? colors.accent
        : colors.primary;

  return (
    <GlassCard style={[styles.banner, { borderColor: `${accentColor}33` }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${accentColor}18` }]}>
        <Ionicons name={config.icon} size={20} color={accentColor} />
      </View>
      <View style={styles.textWrap}>
        <View style={styles.titleRow}>
          <Text variant="label">{config.title}</Text>
          {resultCount != null ? (
            <Text variant="caption" secondary>
              {resultCount} sonuç
            </Text>
          ) : null}
        </View>
        <Text secondary variant="caption">
          {config.subtitle}
        </Text>

        {tab === 'seeking' ? (
          <Pressable
            onPress={() => router.push('/settings/job-seeker' as never)}
            style={[styles.linkRow, { borderColor: colors.border }]}
          >
            <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
            <Text variant="caption" style={{ color: colors.primary, flex: 1 }}>
              İş arayan profilimi düzenle
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        ) : null}

        {tab === 'hiring' && (onCreateJob || onCreateStaff) ? (
          <View style={styles.ctaRow}>
            {onCreateJob ? (
              <Pressable
                onPress={onCreateJob}
                style={[styles.ctaBtn, { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]}
              >
                <Ionicons name="add-circle-outline" size={14} color={colors.primary} />
                <Text variant="caption" style={{ color: colors.primary }}>
                  İş İlanı
                </Text>
              </Pressable>
            ) : null}
            {onCreateStaff ? (
              <Pressable
                onPress={onCreateStaff}
                style={[styles.ctaBtn, { backgroundColor: `${colors.accent}18`, borderColor: colors.accent }]}
              >
                <Ionicons name="people-outline" size={14} color={colors.accent} />
                <Text variant="caption" style={{ color: colors.accent }}>
                  Personel Talebi
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1, gap: spacing.xs },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
});
