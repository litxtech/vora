import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminStatCard } from '@/features/admin/components/shared/AdminStatCard';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import {
  createAdminPoll,
  deactivatePoll,
  deactivateTrafficReport,
  fetchAnonymousTips,
  fetchCenterStats,
  fetchDutyListings,
  fetchHelpRequests,
  fetchPolls,
  fetchTourismPlaces,
  fetchTrafficReports,
  fetchVolunteerTeams,
  moderateTip,
  removeDutyListing,
  removeTourismPlace,
  resolveHelpRequest,
  setTourismFeatured,
  suspendVolunteerTeam,
  type CenterStats,
  type DutyListingRow,
  type HelpRequestRow,
  type PollRow,
  type TipRow,
  type TourismPlaceRow,
  type TrafficReportRow,
  type VolunteerTeamRow,
} from '@/features/admin/services/centersManagement';
import { TIP_CATEGORIES, TIP_LINE_ENABLED, type TipCategory } from '@/features/tip-line/constants';
import { DEFAULT_REGION_ID } from '@/constants/regions';
import { spacing } from '@/constants/theme';

type CenterTab =
  | 'tips'
  | 'polls'
  | 'traffic'
  | 'help'
  | 'volunteer'
  | 'duty'
  | 'tourism';

const CENTER_TABS: { id: CenterTab; label: string }[] = [
  ...(TIP_LINE_ENABLED ? [{ id: 'tips' as const, label: 'Platform İhbar' }] : []),
  { id: 'polls', label: 'Anket' },
  { id: 'traffic', label: 'Trafik' },
  { id: 'help', label: 'Yardım' },
  { id: 'volunteer', label: 'Gönüllü' },
  { id: 'duty', label: 'Nöbetçi' },
  { id: 'tourism', label: 'Turizm' },
];

function tipCategoryLabel(category: string): string {
  return TIP_CATEGORIES[category as TipCategory]?.label ?? category;
}

export function AdminCentersScreen() {
  const [tab, setTab] = useState<CenterTab>(TIP_LINE_ENABLED ? 'tips' : 'polls');
  const [stats, setStats] = useState<CenterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [tips, setTips] = useState<TipRow[]>([]);
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [traffic, setTraffic] = useState<TrafficReportRow[]>([]);
  const [help, setHelp] = useState<HelpRequestRow[]>([]);
  const [teams, setTeams] = useState<VolunteerTeamRow[]>([]);
  const [duty, setDuty] = useState<DutyListingRow[]>([]);
  const [tourism, setTourism] = useState<TourismPlaceRow[]>([]);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState('');
  const [pollRegionId, setPollRegionId] = useState(DEFAULT_REGION_ID);
  const [creatingPoll, setCreatingPoll] = useState(false);

  const loadTab = useCallback(async () => {
    switch (tab) {
      case 'tips':
        setTips(await fetchAnonymousTips('pending'));
        break;
      case 'polls':
        setPolls(await fetchPolls());
        break;
      case 'traffic':
        setTraffic(await fetchTrafficReports());
        break;
      case 'help':
        setHelp(await fetchHelpRequests());
        break;
      case 'volunteer':
        setTeams(await fetchVolunteerTeams());
        break;
      case 'duty':
        setDuty(await fetchDutyListings());
        break;
      case 'tourism':
        setTourism(await fetchTourismPlaces());
        break;
    }
  }, [tab]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setStats(await fetchCenterStats());
      await loadTab();
      setLoading(false);
      setRefreshing(false);
    },
    [loadTab],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = useCallback(
    async (id: string, action: () => Promise<{ error: string | null }>) => {
      setActionId(id);
      const { error } = await action();
      setActionId(null);
      if (error) {
        Alert.alert('İşlem başarısız', error);
        return;
      }
      await load(true);
    },
    [load],
  );

  const confirmAction = (
    id: string,
    title: string,
    message: string,
    action: () => Promise<{ error: string | null }>,
  ) => {
    Alert.alert(title, message, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Onayla', onPress: () => void runAction(id, action) },
    ]);
  };

  const renderContent = () => {
    if (loading) return <AdminEmptyState loading />;

    switch (tab) {
      case 'tips':
        return tips.length === 0 ? (
          <AdminEmptyState title="Kayıt yok" message="Bekleyen platform ihbarı bulunamadı." icon="eye-off-outline" />
        ) : (
          tips.map((item) => (
            <GlassCard key={item.id} style={styles.row}>
              <Text variant="label">{tipCategoryLabel(item.category)}</Text>
              <Text secondary variant="caption" numberOfLines={3}>{item.description}</Text>
              <Text secondary variant="caption">{item.region_id} · {new Date(item.created_at).toLocaleString('tr-TR')}</Text>
              <View style={styles.actions}>
                <AdminActionChip label="Onayla" icon="checkmark" tone="success" loading={actionId === `${item.id}-approve`} disabled={Boolean(actionId)} onPress={() => confirmAction(`${item.id}-approve`, 'Onayla', 'Platform ihbarı onaylansın mı?', () => moderateTip(item.id, true))} />
                <AdminActionChip label="Reddet" icon="close" tone="danger" loading={actionId === `${item.id}-reject`} disabled={Boolean(actionId)} onPress={() => confirmAction(`${item.id}-reject`, 'Reddet', 'Platform ihbarı reddedilsin mi?', () => moderateTip(item.id, false))} />
              </View>
            </GlassCard>
          ))
        );
      case 'polls':
        return polls.map((item) => (
          <GlassCard key={item.id} style={styles.row}>
            <Text variant="label">{item.question}</Text>
            <Text secondary variant="caption">@{item.author_username} · {item.total_votes} oy · {item.is_active ? 'Aktif' : 'Pasif'}</Text>
            {item.is_active ? <AdminActionChip label="Kapat" icon="pause" tone="warning" loading={actionId === item.id} disabled={Boolean(actionId)} onPress={() => confirmAction(item.id, 'Kapat', 'Anket kapatılsın mı?', () => deactivatePoll(item.id))} /> : null}
          </GlassCard>
        ));
      case 'traffic':
        return traffic.map((item) => (
          <GlassCard key={item.id} style={styles.row}>
            <Text variant="label">{item.title}</Text>
            <Text secondary variant="caption">@{item.author_username} · {item.report_type} · {item.confirm_count} onay</Text>
            {item.is_active ? <AdminActionChip label="Kapat" icon="close" tone="warning" loading={actionId === item.id} disabled={Boolean(actionId)} onPress={() => void runAction(item.id, () => deactivateTrafficReport(item.id))} /> : null}
          </GlassCard>
        ));
      case 'help':
        return help.map((item) => (
          <GlassCard key={item.id} style={styles.row}>
            <Text variant="label">{item.title}</Text>
            <Text secondary variant="caption">@{item.author_username} · {item.category} · {item.urgency}</Text>
            {!item.is_resolved ? <AdminActionChip label="Çözüldü" icon="checkmark" tone="success" loading={actionId === item.id} disabled={Boolean(actionId)} onPress={() => void runAction(item.id, () => resolveHelpRequest(item.id))} /> : null}
          </GlassCard>
        ));
      case 'volunteer':
        return teams.map((item) => (
          <GlassCard key={item.id} style={styles.row}>
            <Text variant="label">{item.name}</Text>
            <Text secondary variant="caption">{item.category} · {item.member_count} üye{item.is_suspended ? ' · Askıda' : ''}</Text>
            <AdminActionChip label={item.is_suspended ? 'Askıdan çıkar' : 'Askıya al'} icon="pause" tone="danger" loading={actionId === item.id} disabled={Boolean(actionId)} onPress={() => void runAction(item.id, () => suspendVolunteerTeam(item.id, !item.is_suspended))} />
          </GlassCard>
        ));
      case 'duty':
        return duty.length === 0 ? (
          <AdminEmptyState title="Kayıt yok" message="Nöbetçi listesi bulunamadı." icon="medical-outline" />
        ) : (
          duty.map((item) => (
            <GlassCard key={item.id} style={styles.row}>
              <Text variant="label">{item.name}</Text>
              <Text secondary variant="caption">{item.listing_type} · {item.region_id} · {item.duty_date}</Text>
              {item.address ? <Text secondary variant="caption" numberOfLines={1}>{item.address}</Text> : null}
              <AdminActionChip label="Kaldır" icon="trash-outline" tone="danger" loading={actionId === item.id} disabled={Boolean(actionId)} onPress={() => confirmAction(item.id, 'Kaldır', 'Nöbetçi kaydı kaldırılsın mı?', () => removeDutyListing(item.id))} />
            </GlassCard>
          ))
        );
      case 'tourism':
        return tourism.length === 0 ? (
          <AdminEmptyState title="Yer yok" message="Turizm noktası bulunamadı." icon="map-outline" />
        ) : (
          tourism.map((item) => (
            <GlassCard key={item.id} style={styles.row}>
              <Text variant="label">{item.name}</Text>
              <Text secondary variant="caption">{item.category} · {item.region_id}{item.is_featured ? ' · Öne çıkan' : ''}</Text>
              <View style={styles.actions}>
                <AdminActionChip label={item.is_featured ? 'Öne çıkarmayı kaldır' : 'Öne çıkar'} icon="star" tone="primary" loading={actionId === `${item.id}-feature`} disabled={Boolean(actionId)} onPress={() => void runAction(`${item.id}-feature`, () => setTourismFeatured(item.id, !item.is_featured))} />
                <AdminActionChip label="Kaldır" icon="trash-outline" tone="danger" loading={actionId === `${item.id}-remove`} disabled={Boolean(actionId)} onPress={() => confirmAction(`${item.id}-remove`, 'Kaldır', 'Turizm noktası kaldırılsın mı?', () => removeTourismPlace(item.id))} />
              </View>
            </GlassCard>
          ))
        );
      default:
        return null;
    }
  };

  return (
    <AdminShell title="Merkez Yönetimi" subtitle="Tüm şehir merkezleri moderasyonu" refreshing={refreshing} onRefresh={() => load(true)}>
      {stats ? (
        <View style={styles.stats}>
          {TIP_LINE_ENABLED ? <AdminStatCard label="Bekleyen platform ihbarı" value={stats.pending_tips} icon="eye-off" /> : null}
          <AdminStatCard label="Aktif anket" value={stats.active_polls} icon="bar-chart" />
          <AdminStatCard label="Açık yardım" value={stats.open_help} icon="heart" />
          {stats.duty_listings != null ? <AdminStatCard label="Nöbetçi" value={stats.duty_listings} icon="medical" /> : null}
          {stats.tourism_places != null ? <AdminStatCard label="Turizm" value={stats.tourism_places} icon="map" /> : null}
        </View>
      ) : null}
      <AdminFilterChip options={CENTER_TABS} value={tab} onChange={setTab} />
      {tab === 'polls' ? (
        <>
          <AdminSectionHeader title="Yeni anket oluştur" />
          <GlassCard style={styles.pollForm}>
            <AdminFormField label="Bölge ID" value={pollRegionId} onChangeText={setPollRegionId} placeholder="trabzon" />
            <AdminFormField label="Soru" value={pollQuestion} onChangeText={setPollQuestion} placeholder="Anket sorusu..." />
            <AdminFormField
              label="Seçenekler (satır başına bir)"
              value={pollOptions}
              onChangeText={setPollOptions}
              placeholder={'Evet\nHayır\nKararsızım'}
              multiline
            />
            <AdminActionChip
              label={creatingPoll ? 'Oluşturuluyor...' : 'Anket oluştur'}
              icon="add-circle-outline"
              tone="success"
              disabled={creatingPoll}
              onPress={async () => {
                const options = pollOptions.split('\n').map((o) => o.trim()).filter(Boolean);
                if (!pollQuestion.trim() || options.length < 2) {
                  Alert.alert('Hata', 'Soru ve en az 2 seçenek girin.');
                  return;
                }
                setCreatingPoll(true);
                const { error } = await createAdminPoll(pollRegionId.trim(), pollQuestion.trim(), options);
                setCreatingPoll(false);
                if (error) Alert.alert('Hata', error);
                else {
                  setPollQuestion('');
                  setPollOptions('');
                  await loadTab();
                }
              }}
            />
          </GlassCard>
        </>
      ) : null}
      {renderContent()}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  stats: { gap: spacing.xs },
  row: { gap: spacing.sm },
  pollForm: { gap: spacing.sm, marginBottom: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
