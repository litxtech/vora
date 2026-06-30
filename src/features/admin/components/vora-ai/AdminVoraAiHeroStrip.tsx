import { StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { VORA_AI_ACCENT } from '@/features/vora-ai/constants';
import type { VoraPresenceStats } from '@/features/vora-ai/services/voraPresenceAdmin';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  masterEnabled: boolean;
  presenceEnabled: boolean;
  savingMaster: boolean;
  presenceStats: VoraPresenceStats | null;
  stats: {
    personas?: number;
    presence_runs?: number;
    summaries?: number;
  } | null;
  onMasterToggle: (next: boolean) => void;
};

export function AdminVoraAiHeroStrip({
  masterEnabled,
  presenceEnabled,
  savingMaster,
  presenceStats,
  stats,
  onMasterToggle,
}: Props) {
  const { colors } = useTheme();
  const accent = VORA_AI_ACCENT;
  const gradient = masterEnabled
    ? [accent, '#0891A3', '#006064']
    : [`${colors.textMuted}99`, `${colors.textMuted}55`];

  const tiles = [
    {
      label: 'Bugün profil',
      value: presenceStats?.personas_today ?? 0,
      hint: `${presenceStats?.personas_total ?? stats?.personas ?? 0} toplam`,
      icon: 'person-add' as const,
    },
    {
      label: 'Gönderi',
      value: presenceStats?.posts_total ?? 0,
      hint: 'Persona paylaşımı',
      icon: 'create-outline' as const,
    },
    {
      label: 'Otomasyon',
      value: stats?.presence_runs ?? 0,
      hint: presenceStats?.last_run?.status ?? '—',
      icon: 'timer-outline' as const,
    },
    {
      label: 'AI Özet',
      value: stats?.summaries ?? 0,
      hint: 'Vora kayıtları',
      icon: 'sparkles' as const,
    },
  ];

  return (
    <GlassCard style={styles.heroCard} padded={false}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGradient}>
        <View style={styles.heroTop}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="sparkles" size={22} color="#fff" />
          </View>
          <View style={styles.heroText}>
            <Text variant="label" style={styles.heroTitle}>
              Vora AI
            </Text>
            <Text variant="caption" style={styles.heroSubtitle}>
              {masterEnabled
                ? presenceEnabled
                  ? 'Otomatik paylaşım aktif'
                  : 'Sistem açık · otomasyon kapalı'
                : 'Tüm Vora özellikleri kapalı'}
            </Text>
          </View>
          <Switch
            value={masterEnabled}
            disabled={savingMaster}
            onValueChange={onMasterToggle}
            trackColor={{ false: 'rgba(255,255,255,0.25)', true: 'rgba(255,255,255,0.55)' }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusPill, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
            <View style={[styles.statusDot, { backgroundColor: masterEnabled ? '#A7FFEB' : '#FFAB91' }]} />
            <Text variant="caption" style={styles.statusText}>
              {masterEnabled ? 'Ana anahtar açık' : 'Ana anahtar kapalı'}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: presenceEnabled && masterEnabled ? '#A7FFEB' : '#FFAB91' },
              ]}
            />
            <Text variant="caption" style={styles.statusText}>
              {presenceEnabled && masterEnabled ? 'Persona paylaşıyor' : 'Paylaşım durdu'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.statsGrid}>
        {tiles.map((tile) => (
          <View key={tile.label} style={[styles.statTile, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
            <View style={[styles.statIcon, { backgroundColor: `${accent}18` }]}>
              <Ionicons name={tile.icon} size={16} color={accent} />
            </View>
            <Text variant="label" style={styles.statValue}>
              {typeof tile.value === 'number' ? tile.value.toLocaleString('tr-TR') : tile.value}
            </Text>
            <Text secondary variant="caption" numberOfLines={1}>
              {tile.label}
            </Text>
            <Text secondary variant="caption" numberOfLines={1} style={styles.statHint}>
              {tile.hint}
            </Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  heroCard: { marginBottom: spacing.md, overflow: 'hidden', borderRadius: radius.lg },
  heroGradient: { padding: spacing.md, gap: spacing.sm },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroText: { flex: 1, gap: 2, minWidth: 0 },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  heroSubtitle: { color: 'rgba(255,255,255,0.88)' },
  statusRow: { flexDirection: 'column', gap: spacing.xs },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { color: '#fff', fontWeight: '600' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  statTile: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 2,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  statHint: { fontSize: 11, opacity: 0.85 },
});
