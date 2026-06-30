/** Tek bir günün toplam aktif (ön plan) süresi — saniye cinsinden. */
export type ScreenTimeDay = {
  /** Yerel takvime göre 'YYYY-MM-DD'. */
  date: string;
  /** O gün uygulama ön plandayken geçen toplam saniye. */
  seconds: number;
};

/** Bu hafta / geçen hafta karşılaştırması. */
export type ScreenTimeWeekCompare = {
  thisWeekSeconds: number;
  lastWeekSeconds: number;
  /** Yüzde değişim (this vs last). Geçen hafta 0 ise null. */
  deltaPct: number | null;
};

/** UI'a sunulan, canlı oturum dahil edilmiş anlık özet. */
export type ScreenTimeSnapshot = {
  /** Bugün ön planda geçen toplam saniye (devam eden oturum dahil). */
  todaySeconds: number;
  /** Son 7 gün toplamı (bugün dahil). */
  weekSeconds: number;
  /** Tüm zamanların toplamı. */
  totalSeconds: number;
  /** İzlemeye başlanan ilk günden bu yana kayıtlı gün sayısı. */
  trackedDays: number;
  /** Günlük dağılım (en yeniden en eskiye), grafik/list için. */
  days: ScreenTimeDay[];

  // Oturum & açılış istatistikleri
  todayOpens: number;
  totalOpens: number;
  averageSessionSeconds: number;
  longestSessionSeconds: number;

  // Rekorlar & seriler
  busiestDay: ScreenTimeDay | null;
  currentStreak: number;
  longestStreak: number;

  // Karşılaştırma
  weekCompare: ScreenTimeWeekCompare;

  // Hedef / limit
  goalMinutes: number | null;
  goalReachedToday: boolean;
};

/** Diske yazılan kalıcı yapı. */
export type ScreenTimePersisted = {
  version: number;
  /** date -> saniye eşlemesi. */
  days: Record<string, number>;
  /** date -> o gün uygulamanın kaç kez açıldığı. */
  opens: Record<string, number>;
  /** Tüm zamanların en uzun tek oturumu (saniye). */
  longestSession: number;
  /** Günlük hedef/limit (dakika). null = kapalı. */
  goalMinutes: number | null;
  /** Hedef bildiriminin gönderildiği son gün ('YYYY-MM-DD'). */
  lastGoalNotifyDate: string | null;
};
