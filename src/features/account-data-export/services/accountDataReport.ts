import { Platform, Share } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { regionNameById } from '@/constants/regions';
import { toUserFacingError } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';

/** account.tsx (veya admin paneli) profil alanlarını geçer. */
export type AccountReportProfile = {
  username?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  bio?: string | null;
  occupation?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  address?: string | null;
  interests?: string[] | null;
  account_type?: string | null;
  account_status?: string | null;
  region_id?: string | null;
  district?: string | null;
  trust_score?: number | null;
  contribution_score?: number | null;
  reporter_level?: number | null;
  verified_content_count?: number | null;
  is_verified?: boolean | null;
  is_premium?: boolean | null;
  created_at?: string | null;
  last_seen_at?: string | null;
};

export type AccountReportInput = {
  userId: string;
  email: string | null;
  profile: AccountReportProfile | null;
};

type PostRow = {
  id: string;
  content: string | null;
  post_type: string | null;
  status: string | null;
  created_at: string;
};

type CommentRow = {
  id: string;
  content: string | null;
  post_id: string | null;
  created_at: string;
};

type AdRow = {
  id: string;
  title: string | null;
  status: string | null;
  impressions: number | null;
  clicks: number | null;
  budget_cents: number | null;
  spent_cents: number | null;
  created_at: string;
};

type LedgerRow = {
  id: string;
  amount_cents: number;
  entry_type: string;
  note: string | null;
  created_at: string;
  business_ads: { title: string } | { title: string }[] | null;
};

type ReelRow = {
  id: string;
  caption: string | null;
  like_count: number | null;
  comment_count: number | null;
  completed_view_count: number | null;
  created_at: string;
};

type LikeRow = {
  post_id: string;
  created_at: string;
};

type SaveRow = {
  post_id: string;
  created_at: string;
};

type TrustRow = {
  applied_delta: number | null;
  delta: number | null;
  source_type: string | null;
  score_after: number | null;
  note: string | null;
  created_at: string;
};

type FollowUser = {
  id: string;
  username: string | null;
  fullName: string | null;
  createdAt: string;
};

type ProfileViewUser = {
  username: string | null;
  fullName: string | null;
  viewedAt: string;
};

type ReportRow = {
  reason: string | null;
  target_type: string | null;
  status: string | null;
  details: string | null;
  created_at: string;
};

type BlockUser = {
  username: string | null;
  fullName: string | null;
  isRestricted: boolean;
  createdAt: string;
};

type TimelineEntry = {
  date: string;
  action: string;
  detail: string;
};

type AccountActivity = {
  posts: PostRow[];
  comments: CommentRow[];
  reels: ReelRow[];
  ads: AdRow[];
  ledger: LedgerRow[];
  likes: LikeRow[];
  saves: SaveRow[];
  following: FollowUser[];
  trust: TrustRow[];
  profileViewsReceived: ProfileViewUser[];
  profileViewsMade: ProfileViewUser[];
  reports: ReportRow[];
  blocks: BlockUser[];
  counts: {
    posts: number;
    comments: number;
    reels: number;
    likesGiven: number;
    saves: number;
    following: number;
    followers: number;
    ads: number;
    profileViewsReceived: number;
    profileViewsMade: number;
    reports: number;
    blocks: number;
  };
};

const POST_TYPE_LABELS: Record<string, string> = {
  quote: 'Alıntı',
  text: 'Metin',
  media: 'Görsel/Video',
  poll: 'Anket',
};

const STATUS_LABELS: Record<string, string> = {
  published: 'Yayında',
  draft: 'Taslak',
  removed: 'Kaldırıldı',
  active: 'Aktif',
  pending: 'Onay Bekliyor',
  paused: 'Duraklatıldı',
  ended: 'Sona Erdi',
};

const LEDGER_LABELS: Record<string, string> = {
  topup: 'Bakiye yükleme',
  ad_click: 'Reklam tıklama harcaması',
  admin_adjustment: 'Yönetici düzeltmesi',
  refund: 'İade',
};

const REPORT_REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Taciz',
  hate_speech: 'Nefret söylemi',
  violence: 'Şiddet',
  nudity: 'Müstehcenlik',
  misinformation: 'Yanlış bilgi',
  self_harm: 'Kendine zarar',
  illegal: 'Yasa dışı içerik',
  scam: 'Dolandırıcılık',
  other: 'Diğer',
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  post: 'Gönderi',
  comment: 'Yorum',
  reel: 'Reels',
  user: 'Kullanıcı',
  message: 'Mesaj',
  listing: 'İlan',
};

function reportReasonLabel(reason: string | null): string {
  if (!reason) return 'Şikayet';
  return REPORT_REASON_LABELS[reason] ?? reason;
}

function targetTypeLabel(type: string | null): string {
  if (!type) return '—';
  return TARGET_TYPE_LABELS[type] ?? type;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTry(cents: number | null | undefined): string {
  const value = (cents ?? 0) / 100;
  return `${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}

function truncate(value: string | null | undefined, max = 140): string {
  const text = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '—';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

async function countRows(table: string, column: string, userId: string): Promise<number> {
  try {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq(column, userId);
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function fetchPosts(userId: string): Promise<PostRow[]> {
  try {
    const { data } = await supabase
      .from('posts')
      .select('id, content, post_type, status, created_at')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(250);
    return (data as PostRow[]) ?? [];
  } catch {
    return [];
  }
}

async function fetchComments(userId: string): Promise<CommentRow[]> {
  try {
    const { data } = await supabase
      .from('post_comments')
      .select('id, content, post_id, created_at')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(250);
    return (data as CommentRow[]) ?? [];
  } catch {
    return [];
  }
}

async function fetchAds(userId: string): Promise<AdRow[]> {
  try {
    const { data } = await supabase
      .from('business_ads')
      .select('id, title, status, impressions, clicks, budget_cents, spent_cents, created_at')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    return (data as AdRow[]) ?? [];
  } catch {
    return [];
  }
}

async function fetchLedger(): Promise<LedgerRow[]> {
  try {
    const { data } = await supabase
      .from('ad_wallet_ledger')
      .select('id, amount_cents, entry_type, note, created_at, business_ads ( title )')
      .order('created_at', { ascending: false })
      .limit(200);
    return (data as LedgerRow[]) ?? [];
  } catch {
    return [];
  }
}

async function fetchReels(userId: string): Promise<ReelRow[]> {
  try {
    const { data } = await supabase
      .from('reels')
      .select('id, caption, like_count, comment_count, completed_view_count, created_at')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    return (data as ReelRow[]) ?? [];
  } catch {
    return [];
  }
}

async function fetchLikes(userId: string): Promise<LikeRow[]> {
  try {
    const { data } = await supabase
      .from('post_likes')
      .select('post_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);
    return (data as LikeRow[]) ?? [];
  } catch {
    return [];
  }
}

async function fetchSaves(userId: string): Promise<SaveRow[]> {
  try {
    const { data } = await supabase
      .from('post_saves')
      .select('post_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);
    return (data as SaveRow[]) ?? [];
  } catch {
    return [];
  }
}

async function fetchTrust(userId: string): Promise<TrustRow[]> {
  try {
    const { data } = await supabase
      .from('trust_score_ledger')
      .select('applied_delta, delta, source_type, score_after, note, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);
    return (data as TrustRow[]) ?? [];
  } catch {
    return [];
  }
}

async function fetchFollowing(userId: string): Promise<FollowUser[]> {
  try {
    const { data: rows } = await supabase
      .from('follows')
      .select('following_id, created_at')
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .limit(500);

    const follows = (rows as { following_id: string; created_at: string }[]) ?? [];
    if (follows.length === 0) return [];

    const ids = [...new Set(follows.map((f) => f.following_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .in('id', ids);

    const map = new Map<string, { username: string | null; full_name: string | null }>();
    for (const p of (profiles as { id: string; username: string | null; full_name: string | null }[]) ?? []) {
      map.set(p.id, { username: p.username, full_name: p.full_name });
    }

    return follows.map((f) => ({
      id: f.following_id,
      username: map.get(f.following_id)?.username ?? null,
      fullName: map.get(f.following_id)?.full_name ?? null,
      createdAt: f.created_at,
    }));
  } catch {
    return [];
  }
}

async function fetchProfileViewUsers(
  userId: string,
  direction: 'received' | 'made',
): Promise<ProfileViewUser[]> {
  try {
    const matchColumn = direction === 'received' ? 'profile_id' : 'viewer_id';
    const joinColumn = direction === 'received' ? 'viewer_id' : 'profile_id';
    const { data } = await supabase
      .from('profile_views')
      .select(`${joinColumn}, created_at`)
      .eq(matchColumn, userId)
      .order('created_at', { ascending: false })
      .limit(200);

    const rows = (data as Record<string, unknown>[]) ?? [];
    const ids = [
      ...new Set(rows.map((r) => r[joinColumn]).filter((v): v is string => typeof v === 'string')),
    ];
    if (ids.length === 0) {
      return rows.map((r) => ({ username: null, fullName: null, viewedAt: String(r.created_at) }));
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .in('id', ids);

    const map = new Map<string, { username: string | null; full_name: string | null }>();
    for (const p of (profiles as { id: string; username: string | null; full_name: string | null }[]) ?? []) {
      map.set(p.id, { username: p.username, full_name: p.full_name });
    }

    return rows.map((r) => {
      const otherId = r[joinColumn] as string | null;
      const info = otherId ? map.get(otherId) : null;
      return {
        username: info?.username ?? null,
        fullName: info?.full_name ?? null,
        viewedAt: String(r.created_at),
      };
    });
  } catch {
    return [];
  }
}

async function fetchReports(userId: string): Promise<ReportRow[]> {
  try {
    const { data } = await supabase
      .from('content_reports')
      .select('reason, target_type, status, details, created_at')
      .eq('reporter_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);
    return (data as ReportRow[]) ?? [];
  } catch {
    return [];
  }
}

async function fetchBlocks(userId: string): Promise<BlockUser[]> {
  try {
    const { data: rows } = await supabase
      .from('user_blocks')
      .select('blocked_id, is_restricted, created_at')
      .eq('blocker_id', userId)
      .order('created_at', { ascending: false })
      .limit(300);

    const blocks = (rows as { blocked_id: string; is_restricted: boolean; created_at: string }[]) ?? [];
    if (blocks.length === 0) return [];

    const ids = [...new Set(blocks.map((b) => b.blocked_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .in('id', ids);

    const map = new Map<string, { username: string | null; full_name: string | null }>();
    for (const p of (profiles as { id: string; username: string | null; full_name: string | null }[]) ?? []) {
      map.set(p.id, { username: p.username, full_name: p.full_name });
    }

    return blocks.map((b) => ({
      username: map.get(b.blocked_id)?.username ?? null,
      fullName: map.get(b.blocked_id)?.full_name ?? null,
      isRestricted: b.is_restricted,
      createdAt: b.created_at,
    }));
  } catch {
    return [];
  }
}

async function collectActivity(userId: string): Promise<AccountActivity> {
  const [
    posts,
    comments,
    reels,
    ads,
    ledger,
    likes,
    saves,
    following,
    trust,
    followers,
    profileViewsReceived,
    profileViewsMade,
    reports,
    blocks,
  ] = await Promise.all([
    fetchPosts(userId),
    fetchComments(userId),
    fetchReels(userId),
    fetchAds(userId),
    fetchLedger(),
    fetchLikes(userId),
    fetchSaves(userId),
    fetchFollowing(userId),
    fetchTrust(userId),
    countRows('follows', 'following_id', userId),
    fetchProfileViewUsers(userId, 'received'),
    fetchProfileViewUsers(userId, 'made'),
    fetchReports(userId),
    fetchBlocks(userId),
  ]);

  return {
    posts,
    comments,
    reels,
    ads,
    ledger,
    likes,
    saves,
    following,
    trust,
    profileViewsReceived,
    profileViewsMade,
    reports,
    blocks,
    counts: {
      posts: posts.length,
      comments: comments.length,
      reels: reels.length,
      likesGiven: likes.length,
      saves: saves.length,
      following: following.length,
      followers,
      ads: ads.length,
      profileViewsReceived: profileViewsReceived.length,
      profileViewsMade: profileViewsMade.length,
      reports: reports.length,
      blocks: blocks.length,
    },
  };
}

function ledgerAdTitle(row: LedgerRow): string | null {
  const join = row.business_ads;
  return Array.isArray(join) ? join[0]?.title ?? null : join?.title ?? null;
}

function buildTimeline(activity: AccountActivity): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const post of activity.posts) {
    entries.push({
      date: post.created_at,
      action: 'Gönderi paylaştın',
      detail: truncate(post.content) || (POST_TYPE_LABELS[post.post_type ?? ''] ?? 'Gönderi'),
    });
  }
  for (const comment of activity.comments) {
    entries.push({
      date: comment.created_at,
      action: 'Yorum yaptın',
      detail: truncate(comment.content),
    });
  }
  for (const reel of activity.reels) {
    entries.push({
      date: reel.created_at,
      action: 'Reels paylaştın',
      detail: truncate(reel.caption) || 'Reels videosu',
    });
  }
  for (const like of activity.likes) {
    entries.push({ date: like.created_at, action: 'Gönderi beğendin', detail: '—' });
  }
  for (const save of activity.saves) {
    entries.push({ date: save.created_at, action: 'Gönderi kaydettin', detail: '—' });
  }
  for (const follow of activity.following) {
    entries.push({
      date: follow.createdAt,
      action: 'Takip etmeye başladın',
      detail: follow.username ? `@${follow.username}` : follow.fullName ?? '—',
    });
  }
  for (const ad of activity.ads) {
    entries.push({
      date: ad.created_at,
      action: 'Reklam oluşturdun',
      detail: ad.title ?? 'Reklam kampanyası',
    });
  }
  for (const row of activity.ledger) {
    const label = LEDGER_LABELS[row.entry_type] ?? 'Cüzdan işlemi';
    const adTitle = ledgerAdTitle(row);
    entries.push({
      date: row.created_at,
      action: `Cüzdan: ${label}`,
      detail: `${formatTry(row.amount_cents)}${adTitle ? ` · ${adTitle}` : ''}`,
    });
  }
  for (const t of activity.trust) {
    const applied = Number(t.applied_delta ?? t.delta ?? 0);
    entries.push({
      date: t.created_at,
      action: 'Güven puanı değişti',
      detail: `${applied > 0 ? '+' : ''}${applied} · ${t.note ?? t.source_type ?? '—'}`,
    });
  }
  for (const view of activity.profileViewsMade) {
    entries.push({
      date: view.viewedAt,
      action: 'Profil ziyaret ettin',
      detail: view.username ? `@${view.username}` : view.fullName ?? '—',
    });
  }
  for (const view of activity.profileViewsReceived) {
    entries.push({
      date: view.viewedAt,
      action: 'Profilin ziyaret edildi',
      detail: view.username ? `@${view.username}` : view.fullName ?? 'Bir kullanıcı',
    });
  }
  for (const report of activity.reports) {
    entries.push({
      date: report.created_at,
      action: 'Şikayet gönderdin',
      detail: `${reportReasonLabel(report.reason)} · ${targetTypeLabel(report.target_type)}`,
    });
  }
  for (const block of activity.blocks) {
    entries.push({
      date: block.createdAt,
      action: block.isRestricted ? 'Kullanıcıyı kısıtladın' : 'Kullanıcıyı engelledin',
      detail: block.username ? `@${block.username}` : block.fullName ?? '—',
    });
  }

  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 2000);
}

function infoRow(label: string, value: string): string {
  return `<tr><td class="label">${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`;
}

function buildHtml(input: AccountReportInput, activity: AccountActivity): string {
  const profile = input.profile ?? {};
  const timeline = buildTimeline(activity);

  const accountTypeLabel = profile.account_type === 'business' ? 'İşletme' : 'Bireysel';
  const regionLabel = profile.region_id ? regionNameById(profile.region_id) ?? profile.region_id : '—';

  const fullName = profile.full_name ?? [profile.first_name, profile.last_name].filter(Boolean).join(' ');
  const summaryRows = `
    ${infoRow('Kullanıcı adı', profile.username ? `@${profile.username}` : '—')}
    ${infoRow('Ad / Görünen ad', fullName || '—')}
    ${infoRow('Ad', profile.first_name ?? '—')}
    ${infoRow('Soyad', profile.last_name ?? '—')}
    ${infoRow('E-posta', input.email ?? '—')}
    ${infoRow('Cinsiyet', profile.gender ?? '—')}
    ${infoRow('Doğum tarihi', formatDate(profile.birth_date))}
    ${infoRow('Meslek', profile.occupation ?? '—')}
    ${infoRow('Biyografi', profile.bio ?? '—')}
    ${infoRow('İlgi alanları', profile.interests?.length ? profile.interests.join(', ') : '—')}
    ${infoRow('Hesap türü', accountTypeLabel)}
    ${infoRow('Hesap durumu', profile.account_status ?? '—')}
    ${infoRow('Bölge', regionLabel)}
    ${infoRow('İlçe', profile.district ?? '—')}
    ${infoRow('Adres', profile.address ?? '—')}
    ${infoRow('Güven puanı', String(profile.trust_score ?? 0))}
    ${infoRow('Katkı puanı', String(profile.contribution_score ?? 0))}
    ${infoRow('Raportör seviyesi', String(profile.reporter_level ?? 0))}
    ${infoRow('Doğrulanmış içerik', String(profile.verified_content_count ?? 0))}
    ${infoRow('Doğrulanmış', profile.is_verified ? 'Evet' : 'Hayır')}
    ${infoRow('Premium', profile.is_premium ? 'Evet' : 'Hayır')}
    ${infoRow('Kayıt tarihi', formatDate(profile.created_at))}
    ${infoRow('Son görülme', formatDate(profile.last_seen_at))}
    ${infoRow('Kullanıcı kimliği', input.userId)}
  `;

  const counts = activity.counts;
  const countsRows = `
    ${infoRow('Paylaşılan gönderi', String(counts.posts))}
    ${infoRow('Paylaşılan reels', String(counts.reels))}
    ${infoRow('Yapılan yorum', String(counts.comments))}
    ${infoRow('Verilen beğeni', String(counts.likesGiven))}
    ${infoRow('Kaydedilen gönderi', String(counts.saves))}
    ${infoRow('Takip edilen', String(counts.following))}
    ${infoRow('Takipçi', String(counts.followers))}
    ${infoRow('Profil ziyareti (alınan)', String(counts.profileViewsReceived))}
    ${infoRow('Profil ziyareti (yapılan)', String(counts.profileViewsMade))}
    ${infoRow('Gönderilen şikayet', String(counts.reports))}
    ${infoRow('Engellenen kullanıcı', String(counts.blocks))}
    ${infoRow('Oluşturulan reklam', String(counts.ads))}
  `;

  const timelineRows = timeline.length
    ? timeline
        .map(
          (entry) =>
            `<tr><td>${escapeHtml(formatDate(entry.date))}</td><td>${escapeHtml(entry.action)}</td><td>${escapeHtml(entry.detail)}</td></tr>`,
        )
        .join('')
    : `<tr><td colspan="3" class="muted">Kayıt bulunamadı.</td></tr>`;

  const postsRows = activity.posts.length
    ? activity.posts
        .map(
          (post) =>
            `<tr><td>${escapeHtml(formatDate(post.created_at))}</td><td>${escapeHtml(POST_TYPE_LABELS[post.post_type ?? ''] ?? post.post_type ?? '—')}</td><td>${escapeHtml(STATUS_LABELS[post.status ?? ''] ?? post.status ?? '—')}</td><td>${escapeHtml(truncate(post.content))}</td></tr>`,
        )
        .join('')
    : `<tr><td colspan="4" class="muted">Gönderi yok.</td></tr>`;

  const commentsRows = activity.comments.length
    ? activity.comments
        .map(
          (comment) =>
            `<tr><td>${escapeHtml(formatDate(comment.created_at))}</td><td>${escapeHtml(truncate(comment.content))}</td></tr>`,
        )
        .join('')
    : `<tr><td colspan="2" class="muted">Yorum yok.</td></tr>`;

  const adsRows = activity.ads.length
    ? activity.ads
        .map(
          (ad) =>
            `<tr><td>${escapeHtml(formatDate(ad.created_at))}</td><td>${escapeHtml(ad.title ?? '—')}</td><td>${escapeHtml(STATUS_LABELS[ad.status ?? ''] ?? ad.status ?? '—')}</td><td>${ad.impressions ?? 0}</td><td>${ad.clicks ?? 0}</td><td>${escapeHtml(formatTry(ad.spent_cents))} / ${escapeHtml(formatTry(ad.budget_cents))}</td></tr>`,
        )
        .join('')
    : `<tr><td colspan="6" class="muted">Reklam yok.</td></tr>`;

  const ledgerRows = activity.ledger.length
    ? activity.ledger
        .map((row) => {
          const label = LEDGER_LABELS[row.entry_type] ?? row.entry_type;
          const adTitle = ledgerAdTitle(row);
          const note = [adTitle, row.note].filter(Boolean).join(' · ') || '—';
          return `<tr><td>${escapeHtml(formatDate(row.created_at))}</td><td>${escapeHtml(label)}</td><td>${escapeHtml(formatTry(row.amount_cents))}</td><td>${escapeHtml(note)}</td></tr>`;
        })
        .join('')
    : `<tr><td colspan="4" class="muted">Cüzdan hareketi yok.</td></tr>`;

  const reelsRows = activity.reels.length
    ? activity.reels
        .map(
          (reel) =>
            `<tr><td>${escapeHtml(formatDate(reel.created_at))}</td><td>${escapeHtml(truncate(reel.caption))}</td><td>${reel.like_count ?? 0}</td><td>${reel.comment_count ?? 0}</td><td>${reel.completed_view_count ?? 0}</td></tr>`,
        )
        .join('')
    : `<tr><td colspan="5" class="muted">Reels yok.</td></tr>`;

  const likesRows = activity.likes.length
    ? activity.likes
        .map(
          (like) =>
            `<tr><td>${escapeHtml(formatDate(like.created_at))}</td><td>${escapeHtml(like.post_id)}</td></tr>`,
        )
        .join('')
    : `<tr><td colspan="2" class="muted">Beğeni yok.</td></tr>`;

  const savesRows = activity.saves.length
    ? activity.saves
        .map(
          (save) =>
            `<tr><td>${escapeHtml(formatDate(save.created_at))}</td><td>${escapeHtml(save.post_id)}</td></tr>`,
        )
        .join('')
    : `<tr><td colspan="2" class="muted">Kayıt yok.</td></tr>`;

  const followingRows = activity.following.length
    ? activity.following
        .map(
          (f) =>
            `<tr><td>${escapeHtml(formatDate(f.createdAt))}</td><td>${escapeHtml(f.username ? `@${f.username}` : '—')}</td><td>${escapeHtml(f.fullName ?? '—')}</td></tr>`,
        )
        .join('')
    : `<tr><td colspan="3" class="muted">Takip edilen yok.</td></tr>`;

  const trustRows = activity.trust.length
    ? activity.trust
        .map((t) => {
          const applied = Number(t.applied_delta ?? t.delta ?? 0);
          return `<tr><td>${escapeHtml(formatDate(t.created_at))}</td><td>${applied > 0 ? '+' : ''}${applied}</td><td>${t.score_after ?? '—'}</td><td>${escapeHtml(t.note ?? t.source_type ?? '—')}</td></tr>`;
        })
        .join('')
    : `<tr><td colspan="4" class="muted">Güven puanı hareketi yok.</td></tr>`;

  const profileViewsReceivedRows = activity.profileViewsReceived.length
    ? activity.profileViewsReceived
        .map(
          (v) =>
            `<tr><td>${escapeHtml(formatDate(v.viewedAt))}</td><td>${escapeHtml(v.username ? `@${v.username}` : 'Gizli/silinmiş kullanıcı')}</td><td>${escapeHtml(v.fullName ?? '—')}</td></tr>`,
        )
        .join('')
    : `<tr><td colspan="3" class="muted">Profilini ziyaret eden kaydı yok.</td></tr>`;

  const profileViewsMadeRows = activity.profileViewsMade.length
    ? activity.profileViewsMade
        .map(
          (v) =>
            `<tr><td>${escapeHtml(formatDate(v.viewedAt))}</td><td>${escapeHtml(v.username ? `@${v.username}` : '—')}</td><td>${escapeHtml(v.fullName ?? '—')}</td></tr>`,
        )
        .join('')
    : `<tr><td colspan="3" class="muted">Ziyaret ettiğin profil kaydı yok.</td></tr>`;

  const reportsRows = activity.reports.length
    ? activity.reports
        .map(
          (r) =>
            `<tr><td>${escapeHtml(formatDate(r.created_at))}</td><td>${escapeHtml(reportReasonLabel(r.reason))}</td><td>${escapeHtml(targetTypeLabel(r.target_type))}</td><td>${escapeHtml(r.status ?? '—')}</td><td>${escapeHtml(r.details ?? '—')}</td></tr>`,
        )
        .join('')
    : `<tr><td colspan="5" class="muted">Gönderilen şikayet yok.</td></tr>`;

  const blocksRows = activity.blocks.length
    ? activity.blocks
        .map(
          (b) =>
            `<tr><td>${escapeHtml(formatDate(b.createdAt))}</td><td>${escapeHtml(b.username ? `@${b.username}` : '—')}</td><td>${escapeHtml(b.fullName ?? '—')}</td><td>${b.isRestricted ? 'Kısıtlandı' : 'Engellendi'}</td></tr>`,
        )
        .join('')
    : `<tr><td colspan="4" class="muted">Engellenen kullanıcı yok.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #14181f; padding: 28px; }
    .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 2px solid #1E88E5; }
    .brand-logo { font-size: 26px; font-weight: 900; color: #1E88E5; letter-spacing: 2px; }
    .brand-meta { line-height: 1.35; }
    .brand-app { font-size: 15px; font-weight: 700; }
    .brand-sub { font-size: 11px; color: #667; }
    h1 { font-size: 19px; margin: 0 0 4px; }
    h2 { font-size: 14px; margin: 24px 0 8px; border-bottom: 1px solid #e3e8ef; padding-bottom: 6px; }
    .meta { color: #667; font-size: 11px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    td, th { border: 1px solid #e3e8ef; padding: 6px 8px; font-size: 10.5px; text-align: left; vertical-align: top; }
    th { background: #f4f7fb; font-weight: 700; }
    td.label { width: 34%; background: #f7f9fc; font-weight: 600; }
    .muted { color: #889; text-align: center; }
    .footer { margin-top: 26px; padding-top: 12px; border-top: 1px solid #eee; font-size: 10px; color: #99a; text-align: center; }
  </style>
</head>
<body>
  <div class="brand">
    <div class="brand-logo">VORA</div>
    <div class="brand-meta">
      <div class="brand-app">Hesap Veri Raporu</div>
      <div class="brand-sub">Kişisel veri dışa aktarımı (KVKK)</div>
    </div>
  </div>

  <h1>Hesap verilerin</h1>
  <p class="meta">Bu rapor, hesabında gerçekleştirdiğin işlemlerin bir kopyasıdır. Oluşturulma: ${escapeHtml(formatDate(new Date().toISOString()))}</p>

  <h2>Hesap özeti</h2>
  <table>${summaryRows}</table>

  <h2>Etkinlik özeti</h2>
  <table>${countsRows}</table>

  <h2>İşlem geçmişi (ne, ne zaman)</h2>
  <table>
    <tr><th>Tarih</th><th>İşlem</th><th>Detay</th></tr>
    ${timelineRows}
  </table>

  <h2>Gönderiler</h2>
  <table>
    <tr><th>Tarih</th><th>Tür</th><th>Durum</th><th>İçerik</th></tr>
    ${postsRows}
  </table>

  <h2>Reels</h2>
  <table>
    <tr><th>Tarih</th><th>Açıklama</th><th>Beğeni</th><th>Yorum</th><th>İzlenme</th></tr>
    ${reelsRows}
  </table>

  <h2>Yorumlar</h2>
  <table>
    <tr><th>Tarih</th><th>Yorum</th></tr>
    ${commentsRows}
  </table>

  <h2>Beğenilen gönderiler</h2>
  <table>
    <tr><th>Tarih</th><th>Gönderi kimliği</th></tr>
    ${likesRows}
  </table>

  <h2>Kaydedilen gönderiler</h2>
  <table>
    <tr><th>Tarih</th><th>Gönderi kimliği</th></tr>
    ${savesRows}
  </table>

  <h2>Takip edilenler</h2>
  <table>
    <tr><th>Tarih</th><th>Kullanıcı</th><th>Ad</th></tr>
    ${followingRows}
  </table>

  <h2>Güven puanı geçmişi</h2>
  <table>
    <tr><th>Tarih</th><th>Değişim</th><th>Sonraki puan</th><th>Açıklama</th></tr>
    ${trustRows}
  </table>

  <h2>Profilini ziyaret edenler</h2>
  <table>
    <tr><th>Tarih</th><th>Kullanıcı</th><th>Ad</th></tr>
    ${profileViewsReceivedRows}
  </table>

  <h2>Ziyaret ettiğin profiller</h2>
  <table>
    <tr><th>Tarih</th><th>Kullanıcı</th><th>Ad</th></tr>
    ${profileViewsMadeRows}
  </table>

  <h2>Gönderdiğin şikayetler</h2>
  <table>
    <tr><th>Tarih</th><th>Sebep</th><th>Hedef</th><th>Durum</th><th>Açıklama</th></tr>
    ${reportsRows}
  </table>

  <h2>Engellediğin kullanıcılar</h2>
  <table>
    <tr><th>Tarih</th><th>Kullanıcı</th><th>Ad</th><th>Tür</th></tr>
    ${blocksRows}
  </table>

  <h2>Reklamlar</h2>
  <table>
    <tr><th>Tarih</th><th>Başlık</th><th>Durum</th><th>Gösterim</th><th>Tıklama</th><th>Harcama / Bütçe</th></tr>
    ${adsRows}
  </table>

  <h2>Reklam cüzdanı hareketleri</h2>
  <table>
    <tr><th>Tarih</th><th>İşlem</th><th>Tutar</th><th>Açıklama</th></tr>
    ${ledgerRows}
  </table>

  <p class="footer">Vora · Hesap veri raporu · Bu belge yalnızca sizin içindir, kişisel verilerinizi içerir.</p>
</body>
</html>`;
}

async function loadPdfModules(): Promise<
  | {
      ok: true;
      printToFileAsync: (options: { html: string }) => Promise<{ uri: string }>;
      printAsync: (options: { html: string }) => Promise<void>;
      shareAsync: (url: string, options?: object) => Promise<void>;
      isSharingAvailableAsync: () => Promise<boolean>;
    }
  | { ok: false; error: string }
> {
  const rebuildHint =
    'PDF için dev client yeniden derlenmeli: npx expo run:ios veya npx expo run:android';

  if (!requireOptionalNativeModule('ExpoPrint')) {
    return { ok: false, error: rebuildHint };
  }

  try {
    const [Print, Sharing] = await Promise.all([import('expo-print'), import('expo-sharing')]);
    if (!Print?.printToFileAsync || !Print?.printAsync || !Sharing?.shareAsync || !Sharing?.isAvailableAsync) {
      return { ok: false, error: rebuildHint };
    }
    return {
      ok: true,
      printToFileAsync: Print.printToFileAsync,
      printAsync: Print.printAsync,
      shareAsync: Sharing.shareAsync,
      isSharingAvailableAsync: Sharing.isAvailableAsync,
    };
  } catch {
    return { ok: false, error: rebuildHint };
  }
}

async function prepareReportHtml(
  input: AccountReportInput,
): Promise<{ html: string | null; error: string | null }> {
  if (!input.userId) return { html: null, error: 'Oturum bulunamadı.' };

  try {
    const activity = await collectActivity(input.userId);
    return { html: buildHtml(input, activity), error: null };
  } catch (error) {
    return {
      html: null,
      error: toUserFacingError(error instanceof Error ? error.message : null, {
        fallback: 'Veriler toplanamadı. Lütfen tekrar deneyin.',
      }),
    };
  }
}

/**
 * Kullanıcının hesap verilerini toplar, PDF üretir ve paylaşım/indirme sayfasını açar.
 */
export async function exportAccountDataPdf(input: AccountReportInput): Promise<{ error: string | null }> {
  const { html, error } = await prepareReportHtml(input);
  if (error || !html) return { error };

  const pdfModules = await loadPdfModules();
  if (!pdfModules.ok) {
    // PDF native modülü yoksa en azından metin paylaşımıyla geri çekil
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? { message: 'Vora hesap veri raporu hazırlandı.', title: 'Hesap Veri Raporu' }
          : { message: 'Vora hesap veri raporu hazırlandı.', title: 'Hesap Veri Raporu' },
      );
    } catch {
      // sessiz
    }
    return { error: pdfModules.error };
  }

  try {
    const { uri } = await pdfModules.printToFileAsync({ html });
    const canShare = await pdfModules.isSharingAvailableAsync();
    if (!canShare) {
      return { error: 'PDF paylaşımı bu cihazda desteklenmiyor.' };
    }
    await pdfModules.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Hesap Veri Raporu',
    });
    return { error: null };
  } catch (error) {
    return {
      error: toUserFacingError(error instanceof Error ? error.message : null, {
        fallback: 'PDF oluşturulamadı.',
      }),
    };
  }
}

/**
 * Hesap veri raporunu doğrudan sistemin yazdırma diyaloguna gönderir (yazıcı / PDF olarak kaydet).
 */
export async function printAccountData(input: AccountReportInput): Promise<{ error: string | null }> {
  const { html, error } = await prepareReportHtml(input);
  if (error || !html) return { error };

  const pdfModules = await loadPdfModules();
  if (!pdfModules.ok) return { error: pdfModules.error };

  try {
    await pdfModules.printAsync({ html });
    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    // Kullanıcı yazdırmayı iptal ederse hata gösterme
    if (/cancel|did not complete|dismiss/i.test(message)) {
      return { error: null };
    }
    return {
      error: toUserFacingError(message || null, {
        fallback: 'Yazdırma başlatılamadı.',
      }),
    };
  }
}
