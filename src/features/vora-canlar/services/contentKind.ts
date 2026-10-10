export type CanlarPostKind = 'community' | 'campaign' | 'urgent' | 'case';

export function describeCanlarPost(post: {
  case_id?: string | null;
  campaign_id?: string | null;
  urgency?: string | null;
}): { kind: CanlarPostKind; label: string } {
  if (post.campaign_id) return { kind: 'campaign', label: 'Bağış kampanyası' };
  if (post.urgency === 'urgent' || post.urgency === 'critical') return { kind: 'urgent', label: 'Acil yardım' };
  if (post.case_id) return { kind: 'case', label: 'Vakaya bağlı paylaşım' };
  return { kind: 'community', label: 'Topluluk gönderisi' };
}

export function formatCanlarWhen(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatCanlarCommentTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return 'Az önce';
  if (diffMin < 60) return `${diffMin} dk`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} sa`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} g`;
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}
