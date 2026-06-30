import { Alert, Image, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import type { AiPersonaRow } from '@/features/vora-ai/services/voraPresenceAdmin';
import { REGIONS } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  persona: AiPersonaRow;
  saving: boolean;
  deleting?: boolean;
  onToggle: (enabled: boolean) => void;
  onDeletePosts?: () => void;
  onDeletePersona?: () => void;
};

export function AdminVoraAiPersonaCard({
  persona,
  saving,
  deleting,
  onToggle,
  onDeletePosts,
  onDeletePersona,
}: Props) {
  const { colors } = useTheme();
  const regionName = REGIONS.find((r) => r.id === persona.region_id)?.name ?? persona.region_id;
  const genderLabel = persona.gender === 'female' ? 'Kadın' : 'Erkek';

  return (
    <GlassCard style={styles.card}>
      <View style={styles.top}>
        <View style={styles.avatarWrap}>
          {persona.avatar_url ? (
            <Image source={{ uri: persona.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="person" size={20} color={colors.primary} />
            </View>
          )}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: persona.enabled ? colors.success : colors.textMuted },
            ]}
          />
        </View>

        <View style={styles.meta}>
          <View style={styles.nameRow}>
            <Text variant="label" numberOfLines={1} style={styles.name}>
              {persona.display_name}
            </Text>
            <View style={[styles.chip, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}33` }]}>
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '700', fontSize: 10 }}>
                {genderLabel}
              </Text>
            </View>
          </View>
          <Text secondary variant="caption" numberOfLines={1}>
            @{persona.username} · {regionName}
            {persona.district ? ` · ${persona.district}` : ''}
          </Text>
          <Text secondary variant="caption" numberOfLines={2} style={styles.bio}>
            {persona.bio}
          </Text>
        </View>

        <Switch value={persona.enabled} disabled={saving} onValueChange={onToggle} />
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.metric}>
          <Ionicons name="document-text-outline" size={14} color={colors.textMuted} />
          <Text secondary variant="caption">
            {persona.post_count} gönderi
          </Text>
        </View>
        <View style={styles.metric}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text secondary variant="caption" numberOfLines={1}>
            {persona.last_post_at
              ? new Date(persona.last_post_at).toLocaleString('tr-TR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Henüz paylaşım yok'}
          </Text>
        </View>
      </View>

      {onDeletePosts || onDeletePersona ? (
        <View style={styles.actions}>
          {onDeletePosts ? (
            <Pressable
              style={[styles.actionBtn, { borderColor: colors.border }]}
              disabled={deleting || persona.post_count === 0}
              onPress={() => {
                Alert.alert(
                  'Gönderileri sil',
                  `${persona.display_name} profilinin tüm AI gönderileri kaldırılsın mı?`,
                  [
                    { text: 'Vazgeç', style: 'cancel' },
                    { text: 'Sil', style: 'destructive', onPress: onDeletePosts },
                  ],
                );
              }}
            >
              <Ionicons name="trash-outline" size={14} color={colors.error} />
              <Text variant="caption" style={{ color: colors.error, fontWeight: '600' }}>
                Gönderileri sil
              </Text>
            </Pressable>
          ) : null}
          {onDeletePersona ? (
            <Pressable
              style={[styles.actionBtn, { borderColor: `${colors.error}44` }]}
              disabled={deleting}
              onPress={() => {
                Alert.alert(
                  'Profili sil',
                  `${persona.display_name} (@${persona.username}) kalıcı olarak silinsin mi?`,
                  [
                    { text: 'Vazgeç', style: 'cancel' },
                    { text: 'Profili sil', style: 'destructive', onPress: onDeletePersona },
                  ],
                );
              }}
            >
              <Ionicons name="person-remove-outline" size={14} color={colors.error} />
              <Text variant="caption" style={{ color: colors.error, fontWeight: '600' }}>
                Profili sil
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm, gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  avatarWrap: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  statusBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  meta: { flex: 1, gap: 3, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minWidth: 0 },
  name: { flexShrink: 1 },
  chip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  bio: { lineHeight: 16, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
  },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 },
  actions: { gap: spacing.xs },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
  },
});
