import { StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { regionNameById } from '@/constants/regions';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { HOTEL_ACCENT } from '@/features/hotel-center/constants';
import {
  formatHotelMarketingPushBody,
  HOTEL_MARKETING_CAMPAIGN_LABELS,
  HOTEL_MARKETING_CAMPAIGN_TYPES,
  HOTEL_MARKETING_SUGGESTIONS,
} from '@/features/hotel-marketing/constants';
import type { AdminHotelSearchResult, HotelMarketingCampaignType } from '@/features/hotel-marketing/types';
import { PushPhonePreview } from '@/features/push-automation/components/PushPhonePreview';

type Props = {
  selectedHotel: AdminHotelSearchResult | null;
  campaignType: HotelMarketingCampaignType;
  onCampaignTypeChange: (type: HotelMarketingCampaignType) => void;
  headline: string;
  onHeadlineChange: (value: string) => void;
  message: string;
  onMessageChange: (value: string) => void;
  regionScope: 'platform' | 'region';
  onRegionScopeChange: (scope: 'platform' | 'region') => void;
  notifyUsers: boolean;
  onNotifyUsersChange: (value: boolean) => void;
  recipientCount: number | null;
  days: string;
  onDaysChange: (value: string) => void;
  priority: string;
  onPriorityChange: (value: string) => void;
  creating: boolean;
  onSubmit: () => void;
};

const TYPE_OPTIONS = HOTEL_MARKETING_CAMPAIGN_TYPES.map((id) => ({
  id,
  label: HOTEL_MARKETING_CAMPAIGN_LABELS[id],
}));

const SCOPE_OPTIONS = [
  { id: 'platform' as const, label: 'Tüm platform' },
  { id: 'region' as const, label: 'Bölgesel' },
];

export function AdminHotelCampaignForm({
  selectedHotel,
  campaignType,
  onCampaignTypeChange,
  headline,
  onHeadlineChange,
  message,
  onMessageChange,
  regionScope,
  onRegionScopeChange,
  notifyUsers,
  onNotifyUsersChange,
  recipientCount,
  days,
  onDaysChange,
  priority,
  onPriorityChange,
  creating,
  onSubmit,
}: Props) {
  const { colors } = useTheme();

  const applySuggestion = (type: HotelMarketingCampaignType) => {
    onCampaignTypeChange(type);
    onHeadlineChange(HOTEL_MARKETING_SUGGESTIONS[type].headline);
    onMessageChange(HOTEL_MARKETING_SUGGESTIONS[type].message);
  };

  const pushBody = selectedHotel
    ? formatHotelMarketingPushBody(selectedHotel.name, message)
    : message.trim() || 'Mesajınız burada görünür…';

  return (
    <GlassCard style={styles.card}>
      <View style={styles.sectionLabel}>
        <Ionicons name="sparkles-outline" size={16} color={HOTEL_ACCENT} />
        <Text variant="label" style={{ color: HOTEL_ACCENT }}>Kampanya şablonu</Text>
      </View>

      <AdminFilterChip
        options={TYPE_OPTIONS}
        value={campaignType}
        onChange={(type) => applySuggestion(type)}
      />

      <AdminFormField
        label="Başlık"
        placeholder="Kampanya başlığı"
        value={headline}
        onChangeText={onHeadlineChange}
        accent={HOTEL_ACCENT}
      />
      <AdminFormField
        label="Pazarlama mesajı"
        placeholder="Örn. Bu otelde hafta sonu gençler akın ediyor"
        value={message}
        onChangeText={onMessageChange}
        multiline
        accent={HOTEL_ACCENT}
      />

      <Text secondary variant="caption">
        {headline.length}/48 · {message.length}/160
      </Text>

      <AdminFilterChip options={SCOPE_OPTIONS} value={regionScope} onChange={onRegionScopeChange} />
      <Text secondary variant="caption">
        {regionScope === 'platform'
          ? 'Kampanya tüm bölgelerde Otel Merkezi ve öne çıkanlarda görünür.'
          : selectedHotel
            ? `Yalnızca ${regionNameById(selectedHotel.regionId)} bölgesinde görünür.`
            : 'Otel seçildiğinde bölge otomatik belirlenir.'}
      </Text>

      <View style={styles.inlineFields}>
        <View style={styles.inlineField}>
          <AdminFormField
            label="Öncelik"
            value={priority}
            onChangeText={onPriorityChange}
            accent={HOTEL_ACCENT}
          />
        </View>
        <View style={styles.inlineField}>
          <AdminFormField
            label="Süre (gün)"
            value={days}
            onChangeText={onDaysChange}
            accent={HOTEL_ACCENT}
          />
        </View>
      </View>

      <View style={[styles.notifyRow, { borderColor: colors.border }]}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="label">Push bildirimi</Text>
          <Text secondary variant="caption">
            {notifyUsers && recipientCount != null
              ? `~${recipientCount.toLocaleString('tr-TR')} kişiye gönderilecek (7 gün içinde aynı otele bildirim almayanlar)`
              : 'Kapalı — yalnızca platformda öne çıkarma'}
          </Text>
        </View>
        <Switch
          value={notifyUsers}
          onValueChange={onNotifyUsersChange}
          trackColor={{ true: `${HOTEL_ACCENT}88`, false: colors.border }}
          thumbColor={notifyUsers ? HOTEL_ACCENT : colors.surface}
        />
      </View>

      {notifyUsers ? (
        <PushPhonePreview
          title={headline.trim() || 'Kampanya başlığı'}
          body={pushBody}
          imageUrl={selectedHotel?.coverUrl}
        />
      ) : null}

      <AdminActionChip
        label={creating ? 'Yayınlanıyor…' : 'Kampanyayı yayınla'}
        icon="megaphone"
        tone="primary"
        disabled={creating || !selectedHotel}
        fullWidth
        onPress={onSubmit}
      />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.lg },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  inlineFields: { flexDirection: 'row', gap: spacing.sm },
  inlineField: { flex: 1 },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
