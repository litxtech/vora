export function formatWalletRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'Az önce';
  if (diffMin < 60) return `${diffMin} dk önce`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} sa önce`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} gün önce`;

  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export function formatPointsAmountParts(amount: number, maxScore?: number): { value: string; suffix: string } {
  return {
    value: Math.abs(amount).toLocaleString('tr-TR'),
    suffix: maxScore != null ? `/ ${maxScore} puan` : 'puan',
  };
}
