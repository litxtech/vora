import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import type { AiPersonaContentStats } from '@/features/vora-ai/services/voraPresenceAdmin';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  stats: AiPersonaContentStats | null;
  busy: boolean;
  onDeleteAllPosts: () => void;
  onDeleteAllPersonas: () => void;
};

export function AdminVoraAiCleanupPanel({
  stats,
  busy,
  onDeleteAllPosts,
  onDeleteAllPersonas,
}: Props) {
  const { colors } = useTheme();

  const confirmDeleteAllPosts = () => {
    Alert.alert(
      'Tüm AI gönderileri silinsin mi?',
      `${stats?.posts_total ?? 0} gönderi ve ilgili yorum/beğeniler kalıcı olarak kaldırılır. Profiller durur.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Gönderileri sil', style: 'destructive', onPress: onDeleteAllPosts },
      ],
    );
  };

  const confirmDeleteAllPersonas = () => {
    Alert.alert(
      'Tüm AI profilleri silinsin mi?',
      `${stats?.personas_total ?? 0} persona profili, gönderileri ve hesapları kalıcı olarak silinir. Geri alınamaz.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Hepsini sil', style: 'destructive', onPress: onDeleteAllPersonas },
      ],
    );
  };

  return (
    <GlassCard style={styles.card}>
      <AdminSectionHeader
        title="AI içerik temizliği"
        hint="Persona gönderilerini veya profilleri toplu kaldırın"
      />

      <View style={styles.statsRow}>
        <StatPill label="Persona" value={stats?.personas_total ?? 0} colors={colors} />
        <StatPill label="Gönderi" value={stats?.posts_total ?? 0} colors={colors} />
        <StatPill label="Yorum" value={stats?.comments_total ?? 0} colors={colors} />
      </View>

      <View style={[styles.warning, { backgroundColor: `${colors.warning}14`, borderColor: `${colors.warning}33` }]}>
        <Ionicons name="warning-outline" size={16} color={colors.warning} />
        <Text secondary variant="caption" style={styles.warningText}>
          Silinen gönderi ve profiller geri getirilemez.
        </Text>
      </View>

      <View style={styles.actions}>
        <AdminActionChip
          label="Tüm gönderileri sil"
          icon="trash-outline"
          tone="danger"
          fullWidth
          disabled={busy || (stats?.posts_total ?? 0) === 0}
          onPress={confirmDeleteAllPosts}
        />
        <AdminActionChip
          label="Tüm profilleri sil"
          icon="person-remove-outline"
          tone="danger"
          fullWidth
          disabled={busy || (stats?.personas_total ?? 0) === 0}
          onPress={confirmDeleteAllPersonas}
        />
      </View>
    </GlassCard>
  );
}

function StatPill({
  label,
  value,
  colors,
}: {
  label: string;
  value: number;
  colors: { surfaceElevated: string; border: string; text: string; textMuted: string };
}) {
  return (
    <View style={[styles.statPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      <Text variant="caption" secondary>
        {label}
      </Text>
      <Text variant="label">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.xs },
  statPill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    gap: 2,
    minWidth: 0,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  warningText: { flex: 1 },
  actions: { gap: spacing.sm },
});
