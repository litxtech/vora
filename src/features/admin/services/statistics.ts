import { supabase } from '@/lib/supabase/client';
import type { AdminStatistics, RevenueSummary } from '@/features/admin/types';
import { supabaseErrorMessage } from '@/lib/errors';

export async function fetchAdminStatistics(): Promise<{
  data: AdminStatistics | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('get_admin_statistics');
  if (error) return { data: null, error: supabaseErrorMessage(error)! };
  return { data: data as unknown as AdminStatistics, error: null };
}

function formatNumber(value: number): string {
  return value.toLocaleString('tr-TR');
}

export function adminStatisticsToCsv(stats: AdminStatistics): string {
  const lines: string[] = ['KARADENİZ SOSYAL — Platform İstatistik Raporu'];
  if (stats.generated_at) {
    lines.push(`Oluşturulma: ${new Date(stats.generated_at).toLocaleString('tr-TR')}`);
  }
  lines.push('');

  const pushSection = (title: string, rows: string[]) => {
    lines.push(`=== ${title} ===`);
    lines.push(...rows);
    lines.push('');
  };

  if (stats.overview) {
    const o = stats.overview;
    pushSection('Platform Özeti', [
      `Toplam kullanıcı,${o.total_users}`,
      `Aktif (7 gün),${o.active_users_7d}`,
      `Aktif (30 gün),${o.active_users_30d}`,
      `Misafir,${o.guest_users}`,
      `Premium,${o.premium_users}`,
      `Muhabir/Yönetici,${o.reporter_users}`,
      `Doğrulanmış işletme,${o.verified_businesses}`,
      `Toplam işletme,${o.total_businesses}`,
      `Toplam gönderi,${o.total_posts}`,
      `Yayında gönderi,${o.published_posts}`,
      `Toplam reel,${o.total_reels}`,
      `Yayında reel,${o.published_reels}`,
      `Toplam yorum,${o.total_comments}`,
      `Toplam mesaj,${o.total_messages}`,
      `Toplam sohbet,${o.total_conversations}`,
      `Toplam topluluk,${o.total_communities}`,
      `Toplam kanal,${o.total_channels}`,
      `Toplam etkinlik,${o.total_events}`,
      `Toplam ilan,${o.total_jobs}`,
      `Toplam takip,${o.total_follows}`,
      `Toplam hashtag,${o.total_hashtags}`,
    ]);
  }

  if (stats.daily) {
    const d = stats.daily;
    pushSection('Son 24 Saat', [
      `Kayıt,${d.registrations}`,
      `Gönderi,${d.posts}`,
      `Reel,${d.reels}`,
      `Yorum,${d.comments}`,
      `Mesaj,${d.messages}`,
      `Şikayet,${d.reports}`,
      `Yeni takip,${d.new_follows}`,
    ]);
  }

  if (stats.weekly) {
    const w = stats.weekly;
    pushSection('Son 7 Gün', [
      `Kayıt,${w.registrations}`,
      `Gönderi,${w.posts}`,
      `Reel,${w.reels}`,
      `Aktif kullanıcı,${w.active_users}`,
    ]);
  }

  if (stats.moderation) {
    const m = stats.moderation;
    pushSection('Moderasyon Kuyruğu', [
      `Bekleyen şikayet,${m.pending_reports}`,
      `Kurumsal doğrulama,${m.pending_verifications}`,
      `Kimlik doğrulama,${m.pending_identity_verifications}`,
      `Muhabir başvurusu,${m.pending_reporter_apps}`,
      `Bekleyen reklam,${m.pending_ads}`,
      `İtiraz,${m.pending_appeals}`,
      `Bekleyen ihbar,${m.pending_tips}`,
      `VCTS itirazı,${m.disputed_vcts}`,
      `Doğrulama merkezi,${m.pending_post_verifications}`,
      `AI inceleme,${m.ai_review_queue}`,
      `Destek talebi,${m.pending_support_tickets}`,
    ]);
  }

  pushSection(
    'En aktif şehirler',
    stats.top_cities.map((c) => `${c.name},${c.user_count},${c.percentage ?? ''}%`),
  );
  pushSection(
    'En aktif kullanıcılar',
    stats.top_users.map(
      (u) =>
        `@${u.username},${u.full_name ?? ''},${u.contribution_score},${u.post_count ?? ''},${u.follower_count ?? ''}`,
    ),
  );
  pushSection(
    'En çok görüntülenen gönderiler',
    stats.top_posts.map(
      (p) =>
        `${p.view_count},@${p.author_username},${p.like_count ?? 0},${p.comment_count ?? 0},"${(p.title ?? p.content).slice(0, 80)}"`,
    ),
  );
  if (stats.top_reels?.length) {
    pushSection(
      'En çok görüntülenen reeller',
      stats.top_reels.map(
        (r) =>
          `${r.view_count},@${r.author_username},${r.like_count},${r.comment_count},"${(r.caption ?? '').slice(0, 80)}"`,
      ),
    );
  }
  pushSection(
    'En çok kullanılan kategoriler',
    stats.top_categories.map((c) => `${c.category},${c.post_count},${c.percentage ?? ''}%`),
  );
  if (stats.top_hashtags?.length) {
    pushSection(
      'Popüler hashtagler',
      stats.top_hashtags.map((h) => `#${h.tag},${h.usage_count}`),
    );
  }

  return lines.join('\n');
}

export { formatNumber as formatAdminStatNumber };

export async function fetchRevenueSummary(): Promise<{
  data: RevenueSummary | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('get_admin_revenue_summary');
  if (error) return { data: null, error: supabaseErrorMessage(error)! };
  return { data: data as unknown as RevenueSummary, error: null };
}

export async function fetchAdminJobs(limit = 50) {
  const { data, error } = await supabase
    .from('job_listings')
    .select('id, title, description, status, author_id, region_id, job_type, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data: data ?? [], error: supabaseErrorMessage(error) };
}

export async function updateJobStatus(
  jobId: string,
  status: 'draft' | 'published' | 'hidden' | 'removed',
) {
  const { error } = await supabase.from('job_listings').update({ status }).eq('id', jobId);
  return { error: supabaseErrorMessage(error) };
}
