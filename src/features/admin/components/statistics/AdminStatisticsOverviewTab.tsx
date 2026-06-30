import { StyleSheet, View } from 'react-native';
import { AdminMetricGrid } from '@/features/admin/components/shared/AdminRankRow';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminStatCard } from '@/features/admin/components/shared/AdminStatCard';
import { AdminStatisticsActivityPanel } from '@/features/admin/components/statistics/AdminStatisticsActivityPanel';
import { formatStatPercent } from '@/features/admin/services/statisticsPresentation';
import type { AdminStatistics } from '@/features/admin/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  stats: AdminStatistics;
};

export function AdminStatisticsOverviewTab({ stats }: Props) {
  const { colors } = useTheme();
  const o = stats.overview;
  const d = stats.daily;
  const w = stats.weekly;

  if (!o || !d || !w) {
    return (
      <View style={styles.fallback}>
        <AdminSectionHeader title="Temel metrikler" hint="Detaylı özet için migration gerekli" />
        <AdminMetricGrid
          items={[
            { label: 'Şehir kaydı', value: stats.top_cities.length, icon: 'location' },
            { label: 'Aktif kullanıcı sırası', value: stats.top_users.length, icon: 'trophy' },
            { label: 'Popüler gönderi', value: stats.top_posts.length, icon: 'eye' },
            { label: 'Kategori', value: stats.top_categories.length, icon: 'grid' },
          ]}
        />
      </View>
    );
  }

  const activeRate7d = formatStatPercent(o.active_users_7d, o.total_users);
  const premiumRate = formatStatPercent(o.premium_users, o.total_users);
  const publishRate = formatStatPercent(o.published_posts, o.total_posts);

  return (
    <>
      <AdminSectionHeader title="Kullanıcılar" hint="Kayıtlı hesap ve aktivite" />
      <AdminMetricGrid
        items={[
          { label: 'Toplam kullanıcı', value: o.total_users, icon: 'people' },
          { label: 'Aktif (7 gün)', value: o.active_users_7d, icon: 'pulse', accent: colors.success },
          { label: 'Aktif (30 gün)', value: o.active_users_30d, icon: 'trending-up', accent: colors.accent },
          { label: 'Aktif oranı', value: `%${activeRate7d}`, icon: 'speedometer', accent: colors.primary },
          { label: 'Misafir hesap', value: o.guest_users, icon: 'person-outline' },
          { label: 'Premium üye', value: o.premium_users, icon: 'star', accent: colors.warning },
          { label: 'Premium oranı', value: `%${premiumRate}`, icon: 'diamond-outline', accent: colors.warning },
          { label: 'Muhabir / yönetici', value: o.reporter_users, icon: 'newspaper', accent: colors.primary },
        ]}
      />

      <AdminSectionHeader title="İçerik" hint={`Yayın oranı %${publishRate}`} />
      <AdminMetricGrid
        items={[
          { label: 'Toplam gönderi', value: o.total_posts, icon: 'document-text' },
          { label: 'Yayında gönderi', value: o.published_posts, icon: 'checkmark-circle', accent: colors.success },
          { label: 'Toplam reel', value: o.total_reels, icon: 'film' },
          { label: 'Yayında reel', value: o.published_reels, icon: 'videocam', accent: colors.accent },
          { label: 'Toplam yorum', value: o.total_comments, icon: 'chatbubbles' },
          { label: 'Toplam mesaj', value: o.total_messages, icon: 'mail', accent: colors.primary },
          { label: 'Toplam takip', value: o.total_follows, icon: 'heart' },
          { label: 'Hashtag', value: o.total_hashtags, icon: 'pricetag' },
        ]}
      />

      <AdminSectionHeader title="Platform modülleri" hint="Topluluk, kanal ve merkezler" />
      <AdminMetricGrid
        items={[
          { label: 'Sohbet', value: o.total_conversations, icon: 'chatbox-ellipses' },
          { label: 'Topluluk', value: o.total_communities, icon: 'people-circle' },
          { label: 'Kanal', value: o.total_channels, icon: 'megaphone', accent: colors.accent },
          { label: 'Etkinlik', value: o.total_events, icon: 'calendar' },
          { label: 'İş ilanı', value: o.total_jobs, icon: 'briefcase' },
          { label: 'İşletme', value: o.total_businesses, icon: 'storefront' },
          {
            label: 'Doğrulanmış işletme',
            value: o.verified_businesses,
            icon: 'shield-checkmark',
            accent: colors.success,
          },
        ]}
      />

      <AdminStatisticsActivityPanel daily={d} weekly={w} />

      <AdminSectionHeader title="Son 24 saat" hint="Anlık aktivite özeti" />
      <View style={styles.statList}>
        <AdminStatCard label="Yeni kayıt" value={d.registrations} icon="person-add" accent={colors.success} />
        <AdminStatCard label="Yeni gönderi" value={d.posts} icon="create" accent={colors.accent} />
        <AdminStatCard label="Yeni reel" value={d.reels} icon="film-outline" />
        <AdminStatCard label="Yeni yorum" value={d.comments} icon="chatbubble" />
        <AdminStatCard label="Yeni mesaj" value={d.messages} icon="mail-unread" accent={colors.primary} />
        <AdminStatCard label="Yeni takip" value={d.new_follows} icon="heart-outline" />
        <AdminStatCard label="Yeni şikayet" value={d.reports} icon="flag" accent={colors.warning} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fallback: { gap: spacing.sm },
  statList: { gap: spacing.xs },
});
