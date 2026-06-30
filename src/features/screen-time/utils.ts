/** Saniyeyi "2 sa 14 dk" / "8 dk 03 sn" gibi okunur Türkçe metne çevirir. */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${hours} sa ${minutes} dk`;
  }
  if (minutes > 0) {
    return `${minutes} dk ${`${seconds}`.padStart(2, '0')} sn`;
  }
  return `${seconds} sn`;
}

/** Kompakt biçim: "2sa 14dk", grafik etiketleri için. */
export function formatDurationCompact(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours > 0) return `${hours}sa ${minutes}dk`;
  if (minutes > 0) return `${minutes}dk`;
  return `${safe}sn`;
}

/** 'YYYY-MM-DD' anahtarını "29 Haz Pzt" gibi kısa Türkçe etikete çevirir. */
const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const TR_DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

/** Yüzde değişimi "+%18" / "−%9" gibi biçimler. */
export function formatDeltaPct(deltaPct: number | null): string {
  if (deltaPct == null) return '—';
  const rounded = Math.round(deltaPct);
  if (rounded === 0) return 'değişim yok';
  const sign = rounded > 0 ? '+' : '−';
  return `${sign}%${Math.abs(rounded)}`;
}

export type HeatmapCell = {
  date: string;
  seconds: number;
  inFuture: boolean;
};

export type Heatmap = {
  /** Hafta sütunları; her sütun 7 gün (Pazartesi → Pazar). */
  weeks: HeatmapCell[][];
  maxSeconds: number;
};

/** Son `numWeeks` haftayı Pazartesi başlangıçlı ısı haritası gridine dönüştürür. */
export function buildHeatmap(dayMap: Record<string, number>, numWeeks = 12): Heatmap {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayWeekday = (now.getDay() + 6) % 7; // Pazartesi = 0
  const startOffset = (numWeeks - 1) * 7 + todayWeekday;
  const start = new Date(now);
  start.setDate(start.getDate() - startOffset);

  const totalCells = numWeeks * 7;
  const weeks: HeatmapCell[][] = [];
  let maxSeconds = 0;

  for (let i = 0; i < totalCells; i += 1) {
    const cellDate = new Date(start);
    cellDate.setDate(start.getDate() + i);
    const key = toDateKey(cellDate);
    const seconds = Math.round(dayMap[key] ?? 0);
    const inFuture = cellDate.getTime() > now.getTime();
    if (!inFuture && seconds > maxSeconds) maxSeconds = seconds;

    const weekIndex = Math.floor(i / 7);
    if (!weeks[weekIndex]) weeks[weekIndex] = [];
    weeks[weekIndex].push({ date: key, seconds, inFuture });
  }

  return { weeks, maxSeconds: Math.max(1, maxSeconds) };
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map((n) => Number.parseInt(n, 10));
  if (!y || !m || !d) return dateKey;
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return 'Dün';
  return `${d} ${TR_MONTHS[m - 1]} ${TR_DAYS[date.getDay()]}`;
}
