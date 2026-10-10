import type { ImageSource } from 'expo-image';
import type { CanlarCampaignCard, CanlarCaseCard, CanlarHomeFeed, CanlarPostCard } from '@/features/vora-canlar/services/api';
import { describeCanlarPost, formatCanlarWhen } from '@/features/vora-canlar/services/contentKind';
import { caseTitle, listingOutcomeMeta, rescueBadge, speciesLabel, type StatusBadge } from '@/features/vora-canlar/services/presentation';
import { CANLAR_EXAMPLES } from '@/features/vora-canlar/samples';

export type CanlarFeedRow = {
  key: string;
  at: string;
  title: string;
  body: string;
  image: string | ImageSource | null;
  mediaUrls?: string[];
  meta: string;
  badge: StatusBadge;
  commentCount: number | null;
  raisedMinor: number | null;
  targetMinor: number | null;
  currency: string | null;
  moneyNote?: string | null;
  example?: boolean;
  href?: string;
  post?: CanlarPostCard;
  caseRow?: CanlarCaseCard;
  caseId: string | null;
  campaignId: string | null;
  donationOpen?: boolean;
  shareText: string;
};

function moneyFromCampaigns(campaigns: Map<string, CanlarCampaignCard>, campaignId?: string | null) {
  if (!campaignId) return { raisedMinor: null, targetMinor: null, currency: null };
  const row = campaigns.get(campaignId);
  if (!row) return { raisedMinor: null, targetMinor: null, currency: null };
  return {
    raisedMinor: row.raised_minor ?? 0,
    targetMinor: row.target_minor ?? null,
    currency: row.currency ?? 'try',
  };
}

export function buildCanlarHomeRows(feed: CanlarHomeFeed): CanlarFeedRow[] {
  const campaigns = new Map<string, CanlarCampaignCard>();
  for (const row of [...feed.campaigns, ...feed.aid_needs, ...feed.completed_campaigns]) {
    campaigns.set(row.id, row);
  }

  const postedCases = new Set(feed.posts.map((post) => post.case_id).filter((id): id is string => Boolean(id)));
  const rows: CanlarFeedRow[] = [];

  for (const post of feed.posts) {
    const kind = describeCanlarPost(post);
    const money = moneyFromCampaigns(campaigns, post.campaign_id);
    const outcome = post.outcome ? listingOutcomeMeta(post.outcome) : null;
    const showMoney = post.donation_open || post.outcome || post.campaign_id;
    rows.push({
      key: `post:${post.id}`,
      at: post.created_at ?? '',
      title: post.author_label ? `@${post.author_label}` : 'Topluluk',
      body: post.body,
      image: post.media?.find((item) => item.url)?.url ?? null,
      mediaUrls: (post.media ?? []).map((item) => item.url).filter((url): url is string => Boolean(url)),
      meta: [post.city_label, formatCanlarWhen(post.created_at)].filter(Boolean).join(' · '),
      badge: outcome
        ? {
            label: outcome.label,
            tone: outcome.tone,
            icon: outcome.icon,
            memorial: post.outcome === 'lost',
          }
        : {
            label: kind.label,
            tone: kind.kind === 'urgent' ? '#E07A2F' : kind.kind === 'campaign' ? '#2F6B4F' : '#3D6B58',
            icon: kind.kind === 'community' ? 'chatbubble' : 'paw',
            memorial: false,
          },
      commentCount: post.comment_count ?? 0,
      raisedMinor: showMoney ? (post.raised_minor ?? money.raisedMinor ?? 0) : null,
      targetMinor: null,
      currency: showMoney ? (money.currency ?? 'try') : null,
      moneyNote: post.donation_note && post.donation_note !== 'Açık bağış. Sabit hedef yok.' ? post.donation_note : null,
      post,
      caseId: post.case_id ?? null,
      campaignId: post.campaign_id ?? null,
      donationOpen: Boolean(post.donation_open),
      shareText: `${post.body}\n\nVora Canlar`,
    });
  }

  const seen = new Set<string>();
  for (const row of [...feed.urgent, ...feed.new_reports, ...feed.in_treatment, ...feed.featured]) {
    if (!row.id || seen.has(row.id) || postedCases.has(row.id)) continue;
    seen.add(row.id);
    const badge = rescueBadge({ status: row.status, treatment: row.treatment_status, urgency: row.urgency });
    rows.push({
      key: `case:${row.id}`,
      at: row.updated_at ?? row.created_at ?? '',
      title: caseTitle(row),
      body: row.summary ?? '',
      image: row.cover_url ?? null,
      meta: [speciesLabel(row.species), row.city_label, formatCanlarWhen(row.updated_at ?? row.created_at)].filter(Boolean).join(' · '),
      badge,
      commentCount: null,
      raisedMinor: row.campaign_raised_minor ?? (row.campaign_id ? 0 : null),
      targetMinor: row.campaign_target_minor ?? null,
      currency: row.campaign_currency ?? null,
      caseRow: row,
      caseId: row.id,
      campaignId: row.campaign_id ?? null,
      shareText: `${caseTitle(row)} · ${row.city_label ?? ''} · Vora Canlar`,
    });
  }

  rows.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return rows;
}

export function buildCanlarExampleRows(): CanlarFeedRow[] {
  return CANLAR_EXAMPLES.map((item) => {
    const campaign = item.kind === 'campaign';
    return {
      key: `example:${item.id}`,
      at: '',
      title: item.title,
      body: item.summary,
      image: item.image,
      meta: `${item.city} · Örnektir`,
      badge: {
        label: item.badge,
        tone: item.tone,
        icon: campaign ? 'heart' : 'paw',
        memorial: false,
      },
      commentCount: 0,
      raisedMinor: null,
      targetMinor: null,
      currency: null,
      moneyNote: campaign ? 'Toplanan henüz yok · hedef 12.000,00 TRY' : null,
      example: true,
      href: campaign ? `/vora-canlar/campaign/${item.id}` : `/vora-canlar/case/${item.id}`,
      caseId: campaign ? null : item.id,
      campaignId: campaign ? item.id : null,
      shareText: `${item.title} · ${item.city}\n${item.summary}\n\nÖrnektir. Vora Canlar`,
    };
  });
}
