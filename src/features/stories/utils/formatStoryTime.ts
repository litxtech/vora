/** Hikâye paylaşım zamanı — feed ile uyumlu kısa Türkçe format. */
export function formatStoryTime(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';

  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;

  return new Date(iso).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
