import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import {
  SCREEN_TIME_ACCENT,
  SCREEN_TIME_FEATURE_NAME,
  SCREEN_TIME_GOAL_PRESETS,
} from '@/features/screen-time/constants';
import { useScreenTime } from '@/features/screen-time/hooks/useScreenTime';
import { exportScreenTimePdf } from '@/features/screen-time/services/screenTimePdfExport';
import {
  resetScreenTime,
  setScreenTimeGoal,
} from '@/features/screen-time/services/screenTimeTracker';
import { ensureGoalNotificationPermission } from '@/features/screen-time/services/goalNotifier';
import {
  buildHeatmap,
  formatDayLabel,
  formatDeltaPct,
  formatDuration,
  formatDurationCompact,
} from '@/features/screen-time/utils';

const HERO_GRADIENT = ['#15803D', '#22C55E', '#4ADE80'] as const;
const WEEKDAY_LABELS = ['Pzt', '', 'Çar', '', 'Cum', '', 'Paz'];

export function ScreenTimeScreen() {
  const { colors } = useTheme();
  const snapshot = useScreenTime();
  const [exporting, setExporting] = useState(false);

  const recentDays = useMemo(() => snapshot.days.slice(0, 14), [snapshot.days]);
  const maxSeconds = useMemo(() => Math.max(1, ...recentDays.map((d) => d.seconds)), [recentDays]);
  const dayMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of snapshot.days) map[d.date] = d.seconds;
    return map;
  }, [snapshot.days]);
  const heatmap = useMemo(() => buildHeatmap(dayMap, 12), [dayMap]);

  const dailyAverage = snapshot.trackedDays > 0 ? snapshot.totalSeconds / snapshot.trackedDays : 0;
  const goalSeconds = snapshot.goalMinutes != null ? snapshot.goalMinutes * 60 : null;
  const goalRatio = goalSeconds ? Math.min(1, snapshot.todaySeconds / goalSeconds) : 0;
  const wow = snapshot.weekCompare;
  const wowDown = wow.deltaPct != null && wow.deltaPct < 0;

  const confirmReset = () => {
    Alert.alert('Veriyi sıfırla', 'Tüm ekran süresi geçmişiniz silinecek. Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sıfırla', style: 'destructive', onPress: () => void resetScreenTime() },
    ]);
  };

  const handleGoal = async (minutes: number | null) => {
    if (minutes != null) await ensureGoalNotificationPermission();
    await setScreenTimeGoal(minutes);
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { error } = await exportScreenTimePdf(snapshot);
      if (error) Alert.alert('Dışa aktarılamadı', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <AuthHeader title={SCREEN_TIME_FEATURE_NAME} showBack />

        {/* Hero: bugün + hedef ilerlemesi */}
        <LinearGradient
          colors={[...HERO_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroGlow} />
          <View style={styles.heroIconWrap}>
            <Ionicons name="hourglass" size={26} color="#FFFFFF" />
          </View>
          <Text variant="caption" style={styles.heroLabel}>
            Bugün uygulamada
          </Text>
          <Text variant="h1" style={styles.heroValue}>
            {formatDuration(snapshot.todaySeconds)}
          </Text>

          {goalSeconds ? (
            <View style={styles.goalProgressWrap}>
              <View style={styles.goalTrack}>
                <View style={[styles.goalFill, { width: `${Math.max(3, goalRatio * 100)}%` }]} />
              </View>
              <Text variant="caption" style={styles.heroNoteText}>
                {snapshot.goalReachedToday
                  ? `Günlük hedefe (${formatDuration(goalSeconds)}) ulaşıldı`
                  : `Hedef: ${formatDuration(goalSeconds)} · %${Math.round(goalRatio * 100)}`}
              </Text>
            </View>
          ) : (
            <View style={styles.heroNote}>
              <Ionicons name="eye-outline" size={13} color="rgba(255,255,255,0.92)" />
              <Text variant="caption" style={styles.heroNoteText}>
                Yalnızca uygulama açıkken sayılır · arka plan & kapalıyken durur
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Seri bandı */}
        {snapshot.currentStreak > 0 ? (
          <GlassCard style={styles.streakCard}>
            <View style={[styles.statIcon, { backgroundColor: '#F9731620' }]}>
              <Ionicons name="flame" size={18} color="#F97316" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="label">{snapshot.currentStreak} günlük seri</Text>
              <Text secondary variant="caption">
                En uzun serin: {snapshot.longestStreak} gün
              </Text>
            </View>
          </GlassCard>
        ) : null}

        {/* İstatistik kartları */}
        <View style={styles.statRow}>
          <StatCard
            icon="calendar-outline"
            label="Son 7 gün"
            value={formatDuration(snapshot.weekSeconds)}
            accent={SCREEN_TIME_ACCENT}
          />
          <StatCard
            icon="infinite-outline"
            label="Toplam"
            value={formatDuration(snapshot.totalSeconds)}
            accent={colors.primary}
          />
        </View>
        <View style={styles.statRow}>
          <StatCard
            icon="trending-up-outline"
            label="Günlük ortalama"
            value={formatDuration(dailyAverage)}
            accent={colors.warning}
          />
          <StatCard
            icon="today-outline"
            label="Takip edilen gün"
            value={`${snapshot.trackedDays}`}
            accent={colors.accent}
          />
        </View>

        {/* Bu hafta vs geçen hafta */}
        <GlassCard style={styles.compareCard}>
          <View style={styles.compareHeader}>
            <Text variant="label">Bu hafta vs geçen hafta</Text>
            <View
              style={[
                styles.deltaPill,
                {
                  backgroundColor: `${
                    wow.deltaPct == null ? colors.textMuted : wowDown ? colors.success : colors.danger
                  }1F`,
                },
              ]}
            >
              <Ionicons
                name={wow.deltaPct == null ? 'remove' : wowDown ? 'arrow-down' : 'arrow-up'}
                size={13}
                color={wow.deltaPct == null ? colors.textMuted : wowDown ? colors.success : colors.danger}
              />
              <Text
                variant="caption"
                style={{
                  color:
                    wow.deltaPct == null ? colors.textMuted : wowDown ? colors.success : colors.danger,
                }}
              >
                {formatDeltaPct(wow.deltaPct)}
              </Text>
            </View>
          </View>
          <View style={styles.compareRow}>
            <View style={styles.compareCol}>
              <Text variant="h3" style={{ color: colors.text }}>
                {formatDuration(wow.thisWeekSeconds)}
              </Text>
              <Text secondary variant="caption">
                Bu hafta
              </Text>
            </View>
            <View style={styles.compareCol}>
              <Text variant="h3" style={{ color: colors.textMuted }}>
                {formatDuration(wow.lastWeekSeconds)}
              </Text>
              <Text secondary variant="caption">
                Geçen hafta
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Rekorlar & oturumlar */}
        <GlassCard style={styles.breakdownCard}>
          <Text variant="label">Rekorlar & oturumlar</Text>
          <RecordRow
            icon="apps-outline"
            label="Bugünkü açılış"
            value={`${snapshot.todayOpens} kez`}
          />
          <RecordRow
            icon="layers-outline"
            label="Toplam açılış"
            value={`${snapshot.totalOpens} kez`}
          />
          <RecordRow
            icon="time-outline"
            label="Ortalama oturum"
            value={formatDuration(snapshot.averageSessionSeconds)}
          />
          <RecordRow
            icon="stopwatch-outline"
            label="En uzun oturum"
            value={formatDuration(snapshot.longestSessionSeconds)}
          />
          {snapshot.busiestDay ? (
            <RecordRow
              icon="trophy-outline"
              label="En aktif gün"
              value={`${formatDayLabel(snapshot.busiestDay.date)} · ${formatDurationCompact(
                snapshot.busiestDay.seconds,
              )}`}
            />
          ) : null}
        </GlassCard>

        {/* Isı haritası */}
        <GlassCard style={styles.breakdownCard}>
          <Text variant="label">Son 12 hafta</Text>
          <View style={styles.heatmapRow}>
            <View style={styles.heatmapWeekdays}>
              {WEEKDAY_LABELS.map((label, i) => (
                <Text
                  key={i}
                  variant="caption"
                  style={[styles.heatmapWeekdayLabel, { color: colors.textMuted }]}
                >
                  {label}
                </Text>
              ))}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.heatmapGrid}>
                {heatmap.weeks.map((week, wi) => (
                  <View key={wi} style={styles.heatmapWeek}>
                    {week.map((cell) => {
                      if (cell.inFuture) {
                        return <View key={cell.date} style={styles.heatCell} />;
                      }
                      const intensity = cell.seconds / heatmap.maxSeconds;
                      const bg =
                        cell.seconds === 0
                          ? `${colors.textMuted}22`
                          : withAlpha(SCREEN_TIME_ACCENT, 0.25 + 0.75 * intensity);
                      return (
                        <View key={cell.date} style={[styles.heatCell, { backgroundColor: bg }]} />
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
          <View style={styles.legendRow}>
            <Text variant="caption" style={{ color: colors.textMuted }}>
              Az
            </Text>
            {[0.15, 0.4, 0.65, 0.9].map((a) => (
              <View
                key={a}
                style={[styles.legendCell, { backgroundColor: withAlpha(SCREEN_TIME_ACCENT, a) }]}
              />
            ))}
            <Text variant="caption" style={{ color: colors.textMuted }}>
              Çok
            </Text>
          </View>
        </GlassCard>

        {/* Günlük döküm */}
        <GlassCard style={styles.breakdownCard}>
          <Text variant="label">Günlük döküm</Text>
          {recentDays.length === 0 ? (
            <Text secondary variant="caption">
              Henüz veri yok. Uygulamayı kullandıkça burada birikecek.
            </Text>
          ) : (
            <View style={styles.barList}>
              {recentDays.map((day) => {
                const ratio = Math.min(1, day.seconds / maxSeconds);
                return (
                  <View key={day.date} style={styles.barRow}>
                    <Text variant="caption" style={[styles.barDay, { color: colors.textMuted }]}>
                      {formatDayLabel(day.date)}
                    </Text>
                    <View style={[styles.barTrack, { backgroundColor: `${SCREEN_TIME_ACCENT}1A` }]}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${Math.max(4, ratio * 100)}%`, backgroundColor: SCREEN_TIME_ACCENT },
                        ]}
                      />
                    </View>
                    <Text variant="caption" style={[styles.barValue, { color: colors.text }]}>
                      {formatDurationCompact(day.seconds)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </GlassCard>

        {/* Günlük hedef */}
        <GlassCard style={styles.breakdownCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="alarm-outline" size={16} color={SCREEN_TIME_ACCENT} />
            <Text variant="label">Günlük hedef</Text>
          </View>
          <Text secondary variant="caption">
            Belirlediğin süreyi aşınca yerel bir hatırlatma alırsın. Bildirim cihazda üretilir,
            internet kullanmaz.
          </Text>
          <View style={styles.chipRow}>
            {SCREEN_TIME_GOAL_PRESETS.map((m) => {
              const active = snapshot.goalMinutes === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => void handleGoal(m)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? SCREEN_TIME_ACCENT : `${SCREEN_TIME_ACCENT}1A`,
                    },
                  ]}
                >
                  <Text variant="caption" style={{ color: active ? '#FFFFFF' : SCREEN_TIME_ACCENT }}>
                    {formatDurationCompact(m * 60)}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => void handleGoal(null)}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    snapshot.goalMinutes == null ? colors.danger : `${colors.danger}1A`,
                },
              ]}
            >
              <Text
                variant="caption"
                style={{ color: snapshot.goalMinutes == null ? '#FFFFFF' : colors.danger }}
              >
                Kapalı
              </Text>
            </Pressable>
          </View>
        </GlassCard>

        {/* Gizlilik */}
        <GlassCard style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.success} />
            <Text variant="label">Gizli ve cihazda</Text>
          </View>
          <Text secondary variant="caption">
            Ekran süresi verisi yalnızca bu cihazda saklanır, hiçbir sunucuya gönderilmez. Ölçüm olay
            tabanlıdır; arka planda çalışan bir zamanlayıcı yoktur, bu yüzden pil veya performansı
            etkilemez.
          </Text>
        </GlassCard>

        {/* Aksiyonlar */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => void handleExport()}
            disabled={exporting}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: `${colors.primary}14`, opacity: exporting ? 0.6 : pressed ? 0.85 : 1 },
            ]}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="document-text-outline" size={16} color={colors.primary} />
            )}
            <Text variant="caption" style={{ color: colors.primary }}>
              {exporting ? 'PDF hazırlanıyor…' : 'PDF olarak dışa aktar'}
            </Text>
          </Pressable>
          {snapshot.totalSeconds > 0 ? (
            <Pressable
              onPress={confirmReset}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: `${colors.danger}14`, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text variant="caption" style={{ color: colors.danger }}>
                Sıfırla
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent: string;
}) {
  const { colors } = useTheme();
  return (
    <GlassCard style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${accent}1F` }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <Text variant="caption" style={{ color: colors.textMuted }}>
        {label}
      </Text>
      <Text variant="h3" style={{ color: colors.text }}>
        {value}
      </Text>
    </GlassCard>
  );
}

function RecordRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.recordRow}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text variant="body" style={{ flex: 1, color: colors.text }}>
        {label}
      </Text>
      <Text variant="body" style={{ color: colors.text, fontWeight: '600' }}>
        {value}
      </Text>
    </View>
  );
}

/** #RRGGBB rengine alfa uygular (0-1). */
function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  hero: { borderRadius: radius.xl, padding: spacing.lg, gap: spacing.xs, overflow: 'hidden' },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroIconWrap: {
    width: 50,
    height: 50,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: spacing.xs,
  },
  heroLabel: { color: 'rgba(255,255,255,0.9)' },
  heroValue: { color: '#FFFFFF' },
  heroNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  heroNoteText: { color: 'rgba(255,255,255,0.92)', flex: 1 },
  goalProgressWrap: { marginTop: spacing.sm, gap: spacing.xs },
  goalTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  goalFill: { height: '100%', borderRadius: radius.full, backgroundColor: '#FFFFFF' },
  streakCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statRow: { flexDirection: 'row', gap: spacing.md },
  statCard: { flex: 1, gap: spacing.xs },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  compareCard: { gap: spacing.md },
  compareHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  compareRow: { flexDirection: 'row', gap: spacing.md },
  compareCol: { flex: 1, gap: 2 },
  breakdownCard: { gap: spacing.md },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barList: { gap: spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barDay: { width: 76 },
  barTrack: { flex: 1, height: 10, borderRadius: radius.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.full },
  barValue: { width: 64, textAlign: 'right' },
  heatmapRow: { flexDirection: 'row', gap: spacing.sm },
  heatmapWeekdays: { justifyContent: 'space-between', paddingVertical: 1 },
  heatmapWeekdayLabel: { height: 14, lineHeight: 14, fontSize: 9 },
  heatmapGrid: { flexDirection: 'row', gap: 3 },
  heatmapWeek: { gap: 3 },
  heatCell: { width: 14, height: 14, borderRadius: 3 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  legendCell: { width: 12, height: 12, borderRadius: 3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    minWidth: 56,
    alignItems: 'center',
  },
  infoCard: { gap: spacing.sm },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionRow: { flexDirection: 'row', gap: spacing.md },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
