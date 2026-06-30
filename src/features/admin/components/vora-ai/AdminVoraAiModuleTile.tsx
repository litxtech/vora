import { StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { VORA_AI_ACCENT } from '@/features/vora-ai/constants';
import type { VoraAiModuleId } from '@/features/vora-ai/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const MODULE_ICONS: Record<VoraAiModuleId, keyof typeof Ionicons.glyphMap> = {
  master: 'power',
  presence: 'people-circle',
  posts: 'newspaper-outline',
  reels: 'film-outline',
  map: 'map-outline',
  events: 'calendar-outline',
  comments: 'chatbubbles-outline',
  moderation: 'shield-checkmark-outline',
  recommendations: 'heart-outline',
  news: 'radio-outline',
  trends: 'trending-up-outline',
  map_animation: 'pulse-outline',
  vision: 'eye-outline',
};

type Props = {
  id: VoraAiModuleId;
  label: string;
  enabled: boolean;
  masterEnabled: boolean;
  saving: boolean;
  onToggle: (next: boolean) => void;
};

export function AdminVoraAiModuleTile({
  id,
  label,
  enabled,
  masterEnabled,
  saving,
  onToggle,
}: Props) {
  const { colors } = useTheme();
  const active = enabled && masterEnabled;
  const accent = active ? VORA_AI_ACCENT : colors.textMuted;

  return (
    <GlassCard
      style={[
        styles.tile,
        active && { borderColor: `${VORA_AI_ACCENT}44` },
        !masterEnabled && styles.tileDisabled,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={MODULE_ICONS[id]} size={18} color={accent} />
      </View>
      <Text variant="label" numberOfLines={2} style={styles.label}>
        {label}
      </Text>
      <Text secondary variant="caption" numberOfLines={1}>
        {!masterEnabled ? 'Kapalı' : active ? 'Aktif' : 'Devre dışı'}
      </Text>
      <Switch
        value={active}
        disabled={!masterEnabled || saving}
        onValueChange={onToggle}
        style={styles.switch}
      />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 132,
  },
  tileDisabled: { opacity: 0.72 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontWeight: '700', lineHeight: 18 },
  switch: { alignSelf: 'flex-start', marginTop: 'auto' },
});
