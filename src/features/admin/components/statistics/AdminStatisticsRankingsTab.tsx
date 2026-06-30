import { Fragment, useState } from 'react';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminRankRow } from '@/features/admin/components/shared/AdminRankRow';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import {
  categoryLabel,
  postPreview,
  RANKING_FILTERS,
  type RankingFilter,
} from '@/features/admin/services/statisticsPresentation';
import type { AdminStatistics } from '@/features/admin/types';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  stats: AdminStatistics;
};

export function AdminStatisticsRankingsTab({ stats }: Props) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<RankingFilter>('cities');

  const maxCityUsers = stats.top_cities[0]?.user_count ?? 1;
  const maxCategoryPosts = stats.top_categories[0]?.post_count ?? 1;
  const maxHashtagUsage = stats.top_hashtags?.[0]?.usage_count ?? 1;

  return (
    <Fragment>
      <AdminFilterChip options={RANKING_FILTERS} value={filter} onChange={setFilter} />

      {filter === 'cities' ? (
        <>
          <AdminSectionHeader title="En aktif şehirler" hint="Bölgeye göre kullanıcı dağılımı" />
          {stats.top_cities.length === 0 ? (
            <AdminEmptyState title="Veri yok" message="Şehir sıralaması bulunamadı." icon="location-outline" />
          ) : (
            stats.top_cities.map((city, i) => (
              <AdminRankRow
                key={city.name}
                rank={i + 1}
                title={city.name}
                subtitle={city.percentage != null ? `Kullanıcıların %${city.percentage}'i` : undefined}
                value={city.user_count.toLocaleString('tr-TR')}
                valueHint="kullanıcı"
                progress={(city.user_count / maxCityUsers) * 100}
                accent={colors.primary}
              />
            ))
          )}
        </>
      ) : null}

      {filter === 'users' ? (
        <>
          <AdminSectionHeader title="En aktif kullanıcılar" hint="Katkı puanına göre" />
          {stats.top_users.length === 0 ? (
            <AdminEmptyState title="Veri yok" message="Kullanıcı sıralaması bulunamadı." icon="people-outline" />
          ) : (
            stats.top_users.map((user, i) => (
              <AdminRankRow
                key={user.id}
                rank={i + 1}
                title={`@${user.username}`}
                subtitle={[
                  user.full_name,
                  user.post_count != null ? `${user.post_count} gönderi` : null,
                  user.follower_count != null ? `${user.follower_count} takipçi` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                value={user.contribution_score.toLocaleString('tr-TR')}
                valueHint="katkı puanı"
                accent={colors.warning}
              />
            ))
          )}
        </>
      ) : null}

      {filter === 'content' ? (
        <>
          <AdminSectionHeader title="En çok görüntülenen gönderiler" hint="Yayında içerikler" />
          {stats.top_posts.length === 0 ? (
            <AdminEmptyState title="Veri yok" message="Gönderi sıralaması bulunamadı." icon="eye-outline" />
          ) : (
            stats.top_posts.map((post, i) => (
              <AdminRankRow
                key={post.id}
                rank={i + 1}
                title={postPreview(post)}
                subtitle={`@${post.author_username}${post.like_count != null ? ` · ${post.like_count} beğeni` : ''}${post.comment_count != null ? ` · ${post.comment_count} yorum` : ''}`}
                value={post.view_count.toLocaleString('tr-TR')}
                valueHint="görüntülenme"
                accent={colors.accent}
              />
            ))
          )}

          {stats.top_reels && stats.top_reels.length > 0 ? (
            <>
              <AdminSectionHeader title="En çok görüntülenen reeller" hint="Video içerik performansı" />
              {stats.top_reels.map((reel, i) => (
                <AdminRankRow
                  key={reel.id}
                  rank={i + 1}
                  title={reel.caption?.trim() || 'Reel'}
                  subtitle={`@${reel.author_username} · ${reel.like_count} beğeni · ${reel.comment_count} yorum`}
                  value={reel.view_count.toLocaleString('tr-TR')}
                  valueHint="görüntülenme"
                  accent={colors.primary}
                />
              ))}
            </>
          ) : null}

          {stats.top_hashtags && stats.top_hashtags.length > 0 ? (
            <>
              <AdminSectionHeader title="Popüler hashtagler" hint="En çok kullanılan etiketler" />
              {stats.top_hashtags.map((tag, i) => (
                <AdminRankRow
                  key={tag.tag}
                  rank={i + 1}
                  title={`#${tag.tag}`}
                  value={tag.usage_count.toLocaleString('tr-TR')}
                  valueHint="kullanım"
                  progress={(tag.usage_count / maxHashtagUsage) * 100}
                  accent={colors.warning}
                />
              ))}
            </>
          ) : null}
        </>
      ) : null}

      {filter === 'categories' ? (
        <>
          <AdminSectionHeader title="Kategori dağılımı" hint="Gönderi türlerine göre" />
          {stats.top_categories.length === 0 ? (
            <AdminEmptyState title="Veri yok" message="Kategori dağılımı bulunamadı." icon="grid-outline" />
          ) : (
            stats.top_categories.map((cat, i) => (
              <AdminRankRow
                key={cat.category}
                rank={i + 1}
                title={categoryLabel(cat.category)}
                subtitle={cat.percentage != null ? `Tüm gönderilerin %${cat.percentage}'i` : cat.category}
                value={cat.post_count.toLocaleString('tr-TR')}
                valueHint="gönderi"
                progress={(cat.post_count / maxCategoryPosts) * 100}
                accent={colors.success}
              />
            ))
          )}
        </>
      ) : null}
    </Fragment>
  );
}
