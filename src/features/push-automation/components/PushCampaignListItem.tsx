import { Image } from 'expo-image';
import { StyleSheet, Switch, View } from 'react-native';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { Text } from '@/components/ui/Text';
import {
  formatIstanbulSchedule,
  isoToIstanbulParts,
} from '@/features/admin/utils/istanbulSchedule';
import { PUSH_TRIGGER_LABELS } from '@/features/push-automation/constants';
import type { PushAutomationTemplate } from '@/features/push-automation/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  template: PushAutomationTemplate;
  onEdit: () => void;
  onSendNow: () => void;
  onDelete: () => void;
  onToggleEnabled: (enabled: boolean) => void;
};

export function PushCampaignListItem({
  template,
  onEdit,
  onSendNow,
  onDelete,
  onToggleEnabled,
}: Props) {
  const { colors } = useTheme();

  const statusText =
    template.triggerType === 'scheduled' && template.nextRunAt
      ? template.enabled
        ? `Planlı · ${formatIstanbulSchedule(isoToIstanbulParts(template.nextRunAt))}`
        : `Gönderildi · ${formatIstanbulSchedule(isoToIstanbulParts(template.nextRunAt))}`
      : template.lastRunAt
        ? `Son: ${new Date(template.lastRunAt).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${template.lastRunRecipients} kişi`
        : (PUSH_TRIGGER_LABELS[template.triggerType] ?? template.triggerType);

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: `${colors.surface}88` }]}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="label" numberOfLines={1}>
            {template.title}
          </Text>
          <Text secondary variant="caption" numberOfLines={1}>
            {statusText}
          </Text>
        </View>
        <Switch value={template.enabled} onValueChange={onToggleEnabled} />
      </View>

      <Text secondary variant="body" numberOfLines={2}>
        {template.body}
      </Text>

      {template.imageUrl ? (
        <Image source={{ uri: template.imageUrl }} style={styles.thumb} contentFit="cover" />
      ) : null}

      <View style={styles.actions}>
        {template.triggerType !== 'feed_activity' ? (
          <AdminActionChip label="Gönder" icon="send-outline" onPress={onSendNow} compact />
        ) : null}
        <AdminActionChip label="Düzenle" icon="create-outline" onPress={onEdit} compact />
        <AdminActionChip label="Sil" icon="trash-outline" tone="danger" onPress={onDelete} compact />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: { flex: 1 },
  thumb: {
    width: '100%',
    height: 72,
    borderRadius: radius.md,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
