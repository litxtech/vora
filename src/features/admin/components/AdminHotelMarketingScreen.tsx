import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { spacing } from '@/constants/theme';
import { HOTEL_ACCENT } from '@/features/hotel-center/constants';
import { AdminHotelCampaignCard } from '@/features/hotel-marketing/components/admin/AdminHotelCampaignCard';
import { AdminHotelCampaignForm } from '@/features/hotel-marketing/components/admin/AdminHotelCampaignForm';
import { AdminHotelSearchField } from '@/features/hotel-marketing/components/admin/AdminHotelSearchField';
import {
  hotelMarketingNotifyDefault,
  HOTEL_MARKETING_SUGGESTIONS,
} from '@/features/hotel-marketing/constants';
import {
  adminCreateHotelMarketingCampaign,
  adminEndHotelMarketingCampaign,
  adminListHotelMarketingCampaigns,
  adminPreviewHotelMarketingRecipients,
} from '@/features/hotel-marketing/services/adminHotelMarketing';
import type {
  AdminHotelMarketingCampaign,
  AdminHotelSearchResult,
  HotelMarketingCampaignType,
} from '@/features/hotel-marketing/types';

type CampaignFilter = 'all' | 'active' | 'ended';

const FILTER_OPTIONS: { id: CampaignFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'active', label: 'Yayında' },
  { id: 'ended', label: 'Biten' },
];

export function AdminHotelMarketingScreen() {
  const [campaigns, setCampaigns] = useState<AdminHotelMarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [campaignFilter, setCampaignFilter] = useState<CampaignFilter>('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHotel, setSelectedHotel] = useState<AdminHotelSearchResult | null>(null);
  const [campaignType, setCampaignType] = useState<HotelMarketingCampaignType>('weekend_youth');
  const [headline, setHeadline] = useState(HOTEL_MARKETING_SUGGESTIONS.weekend_youth.headline);
  const [message, setMessage] = useState(HOTEL_MARKETING_SUGGESTIONS.weekend_youth.message);
  const [regionScope, setRegionScope] = useState<'platform' | 'region'>('platform');
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [notifyTouched, setNotifyTouched] = useState(false);
  const [days, setDays] = useState('14');
  const [priority, setPriority] = useState('10');
  const [creating, setCreating] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setCampaigns(await adminListHotelMarketingCampaigns());
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const activeCampaigns = useMemo(() => campaigns.filter((c) => c.isActive), [campaigns]);

  const filteredCampaigns = useMemo(() => {
    if (campaignFilter === 'active') return campaigns.filter((c) => c.isActive);
    if (campaignFilter === 'ended') return campaigns.filter((c) => !c.isActive);
    return campaigns;
  }, [campaigns, campaignFilter]);

  const applyAutoNotify = useCallback(
    (type: HotelMarketingCampaignType, scope: 'platform' | 'region') => {
      if (!notifyTouched) {
        setNotifyUsers(hotelMarketingNotifyDefault(type, scope));
      }
    },
    [notifyTouched],
  );

  const handleCampaignTypeChange = (type: HotelMarketingCampaignType) => {
    setCampaignType(type);
    applyAutoNotify(type, regionScope);
  };

  const handleRegionScopeChange = (scope: 'platform' | 'region') => {
    setRegionScope(scope);
    applyAutoNotify(campaignType, scope);
  };

  useEffect(() => {
    void adminPreviewHotelMarketingRecipients(
      regionScope,
      regionScope === 'region' ? selectedHotel?.regionId ?? null : null,
    ).then(setRecipientCount);
  }, [regionScope, selectedHotel?.regionId]);

  const handleCreate = async () => {
    if (!selectedHotel) {
      Alert.alert('Otel seçin', 'Kampanya için yayında bir otel seçmelisiniz.');
      return;
    }
    if (!headline.trim() || !message.trim()) {
      Alert.alert('Eksik bilgi', 'Başlık ve pazarlama mesajı zorunludur.');
      return;
    }

    const confirmBody = notifyUsers
      ? `~${recipientCount?.toLocaleString('tr-TR') ?? '—'} kişiye push gönderilecek. Onaylıyor musunuz?`
      : 'Otel platformda öne çıkarılacak (bildirim yok).';

    Alert.alert('Kampanyayı yayınla', confirmBody, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Yayınla',
        onPress: async () => {
          setCreating(true);
          const result = await adminCreateHotelMarketingCampaign({
            hotelId: selectedHotel.id,
            campaignType,
            headline: headline.trim(),
            message: message.trim(),
            regionScope,
            regionId: regionScope === 'region' ? selectedHotel.regionId : null,
            priority: Number(priority) || 0,
            platformWide: regionScope === 'platform',
            notifyUsers,
            days: Number(days) > 0 ? Number(days) : null,
          });
          setCreating(false);

          if (result.error) {
            Alert.alert('Kampanya', result.error);
            return;
          }

          Alert.alert(
            'Kampanya yayında',
            notifyUsers
              ? 'Otel öne çıkarıldı ve bildirim kuyruğuna eklendi.'
              : 'Otel platformda öne çıkarıldı.',
          );
          setSelectedHotel(null);
          setSearchQuery('');
          setNotifyTouched(false);
          setNotifyUsers(hotelMarketingNotifyDefault(campaignType, regionScope));
          void load(true);
        },
      },
    ]);
  };

  const handleEnd = (campaign: AdminHotelMarketingCampaign) => {
    Alert.alert('Kampanyayı bitir', `"${campaign.headline}" kampanyası sonlandırılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Bitir',
        style: 'destructive',
        onPress: async () => {
          setActionId(campaign.id);
          const result = await adminEndHotelMarketingCampaign(campaign.id);
          setActionId(null);
          if (result.error) Alert.alert('Hata', result.error);
          else void load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="Otel Pazarlama"
      subtitle="Otelleri öne çıkarın, kampanya mesajı ve hedefli push bildirimi gönderin"
      refreshing={refreshing}
      onRefresh={() => void load(true)}
    >
      <GlassCard style={styles.statsCard}>
        <View style={styles.statItem}>
          <Ionicons name="megaphone" size={18} color={HOTEL_ACCENT} />
          <Text variant="label">{activeCampaigns.length}</Text>
          <Text secondary variant="caption">Aktif kampanya</Text>
        </View>
        <View style={[styles.statDivider]} />
        <View style={styles.statItem}>
          <Ionicons name="bed-outline" size={18} color={HOTEL_ACCENT} />
          <Text variant="label">{campaigns.length}</Text>
          <Text secondary variant="caption">Toplam</Text>
        </View>
        <View style={[styles.statDivider]} />
        <View style={styles.statItem}>
          <Ionicons name="notifications-outline" size={18} color={HOTEL_ACCENT} />
          <Text variant="label">{campaigns.filter((c) => c.notifyUsers && c.isActive).length}</Text>
          <Text secondary variant="caption">Bildirimli</Text>
        </View>
      </GlassCard>

      <AdminSectionHeader title="Yeni kampanya" subtitle="Otel seçin, şablonu düzenleyin, yayınlayın" />

      <GlassCard style={styles.searchCard}>
        <AdminHotelSearchField
          query={searchQuery}
          onChangeQuery={setSearchQuery}
          selectedHotel={selectedHotel}
          onSelectHotel={setSelectedHotel}
        />
      </GlassCard>

      <AdminHotelCampaignForm
        selectedHotel={selectedHotel}
        campaignType={campaignType}
        onCampaignTypeChange={handleCampaignTypeChange}
        headline={headline}
        onHeadlineChange={setHeadline}
        message={message}
        onMessageChange={setMessage}
        regionScope={regionScope}
        onRegionScopeChange={handleRegionScopeChange}
        notifyUsers={notifyUsers}
        onNotifyUsersChange={(value) => {
          setNotifyTouched(true);
          setNotifyUsers(value);
        }}
        recipientCount={recipientCount}
        days={days}
        onDaysChange={setDays}
        priority={priority}
        onPriorityChange={setPriority}
        creating={creating}
        onSubmit={() => void handleCreate()}
      />

      <AdminSectionHeader
        title="Kampanyalar"
        subtitle={`${filteredCampaigns.length} kayıt`}
      />

      <AdminFilterChip options={FILTER_OPTIONS} value={campaignFilter} onChange={setCampaignFilter} />

      {loading ? (
        <AdminEmptyState loading />
      ) : filteredCampaigns.length === 0 ? (
        <AdminEmptyState
          title="Kampanya yok"
          message={
            campaignFilter === 'all'
              ? 'Henüz otel pazarlama kampanyası oluşturulmadı.'
              : 'Bu filtrede kampanya bulunamadı.'
          }
          icon="bed-outline"
        />
      ) : (
        filteredCampaigns.map((campaign) => (
          <AdminHotelCampaignCard
            key={campaign.id}
            campaign={campaign}
            ending={actionId === campaign.id}
            disabled={Boolean(actionId)}
            onEnd={() => handleEnd(campaign)}
          />
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 36, opacity: 0.25, backgroundColor: '#888' },
  searchCard: { marginBottom: spacing.sm },
});
