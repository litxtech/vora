import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminVoraAiCleanupPanel } from '@/features/admin/components/vora-ai/AdminVoraAiCleanupPanel';
import { AdminVoraAiCreatePersonaSheet } from '@/features/admin/components/vora-ai/AdminVoraAiCreatePersonaSheet';
import { AdminVoraAiHeroStrip } from '@/features/admin/components/vora-ai/AdminVoraAiHeroStrip';
import { AdminVoraAiModuleTile } from '@/features/admin/components/vora-ai/AdminVoraAiModuleTile';
import { AdminVoraAiOptionChips } from '@/features/admin/components/vora-ai/AdminVoraAiOptionChips';
import { AdminVoraAiPersonaCard } from '@/features/admin/components/vora-ai/AdminVoraAiPersonaCard';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  VORA_AI_MODULES,
  VORA_AI_PRESENCE_CATEGORIES,
  VORA_AI_PRESENCE_INTERVALS,
  VORA_AI_PRESENCE_MAX_POSTS,
  VORA_AI_PRESENCE_PHOTO_CHANCE_OPTIONS,
  VORA_AI_PERSONA_GENDER_OPTIONS,
  VORA_AI_DAILY_PERSONA_QUOTAS,
  VORA_AI_PERSONA_AVATAR_MODES,
  VORA_AI_PERSONA_BATCH_PRESETS,
  VORA_AI_PERSONA_USERNAME_STYLES,
} from '@/features/vora-ai/constants';
import { fetchVoraAiSettings, updateVoraAiModule } from '@/features/vora-ai/services/voraAiSettings';
import {
  fetchAiPersonas,
  fetchAiPersonaContentStats,
  fetchVoraPresenceSettings,
  fetchVoraPresenceStats,
  generateAiPersonas,
  deleteAiPersona,
  deleteAiPersonaPosts,
  deleteAllAiPersonas,
  runVoraPresenceNow,
  setAiPersonaEnabled,
  setVoraMasterEnabled,
  updateVoraPresenceSettings,
  type AiPersonaContentStats,
  type AiPersonaRow,
  type VoraPresenceConfig,
  type VoraPresenceStats,
} from '@/features/vora-ai/services/voraPresenceAdmin';
import type { VoraAiModuleId } from '@/features/vora-ai/constants';
import type { VoraAiSettingsMap } from '@/features/vora-ai/types';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { supabase } from '@/lib/supabase/client';

type VoraAiStats = {
  summaries: number;
  memories: number;
  recommendations: number;
  map_data: number;
  comment_threads: number;
  personas?: number;
  presence_runs?: number;
};

type Tab = 'overview' | 'personas' | 'modules';
type PersonaFilter = 'all' | 'active' | 'inactive';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Genel' },
  { id: 'personas', label: 'Personalar' },
  { id: 'modules', label: 'Modüller' },
];

const PERSONA_FILTERS: { id: PersonaFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'active', label: 'Aktif' },
  { id: 'inactive', label: 'Pasif' },
];

function SettingRow({
  title,
  subtitle,
  value,
  disabled,
  onChange,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingText}>
        <Text variant="label">{title}</Text>
        {subtitle ? (
          <Text secondary variant="caption">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch value={value} disabled={disabled} onValueChange={onChange} style={styles.settingSwitch} />
    </View>
  );
}

function SectionDivider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

export function AdminVoraAiScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('overview');
  const [personaFilter, setPersonaFilter] = useState<PersonaFilter>('all');
  const [personaSearch, setPersonaSearch] = useState('');
  const [settings, setSettings] = useState<VoraAiSettingsMap | null>(null);
  const [presence, setPresence] = useState<VoraPresenceConfig | null>(null);
  const [presenceEnabled, setPresenceEnabled] = useState(false);
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [personas, setPersonas] = useState<AiPersonaRow[]>([]);
  const [stats, setStats] = useState<VoraAiStats | null>(null);
  const [presenceStats, setPresenceStats] = useState<VoraPresenceStats | null>(null);
  const [contentStats, setContentStats] = useState<AiPersonaContentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [seedCount, setSeedCount] = useState<number>(25);
  const [customSeedInput, setCustomSeedInput] = useState('');
  const [personaGender, setPersonaGender] = useState<'female' | 'male' | 'mixed'>('mixed');

  const effectiveSeedCount = useMemo(() => {
    const maxBatch = presence?.manual_persona_batch_max ?? 100;
    const parsed = Number(customSeedInput.trim());
    const base = Number.isFinite(parsed) && parsed > 0 ? parsed : seedCount;
    return Math.min(Math.max(1, Math.floor(base)), maxBatch);
  }, [customSeedInput, seedCount, presence?.manual_persona_batch_max]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const [map, presenceSettings, personaRows, statsRes, presenceStatsRes, aiContentStats] = await Promise.all([
      fetchVoraAiSettings(),
      fetchVoraPresenceSettings(),
      fetchAiPersonas(),
      supabase.rpc('admin_vora_ai_stats'),
      fetchVoraPresenceStats(),
      fetchAiPersonaContentStats(),
    ]);

    setSettings(map);
    setPresence(presenceSettings.config);
    setPresenceEnabled(presenceSettings.enabled);
    setMasterEnabled(presenceSettings.master_enabled);
    if (presenceSettings.config.default_persona_gender) {
      setPersonaGender(presenceSettings.config.default_persona_gender);
    }
    setPersonas(personaRows);
    setStats((statsRes.data as VoraAiStats | null) ?? null);
    setPresenceStats(presenceStatsRes);
    setContentStats(aiContentStats);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredPersonas = useMemo(() => {
    const q = personaSearch.trim().toLowerCase();
    return personas.filter((persona) => {
      if (personaFilter === 'active' && !persona.enabled) return false;
      if (personaFilter === 'inactive' && persona.enabled) return false;
      if (!q) return true;
      return (
        persona.display_name.toLowerCase().includes(q) ||
        persona.username.toLowerCase().includes(q) ||
        persona.bio.toLowerCase().includes(q)
      );
    });
  }, [personas, personaFilter, personaSearch]);

  const handleMasterToggle = async (next: boolean) => {
    if (!user) return;
    if (!next) {
      Alert.alert(
        'Vora AI tamamen kapatılsın mı?',
        'Harita, keşfet ve otomatik paylaşım dahil tüm Vora AI özellikleri devre dışı kalır.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Kapat',
            style: 'destructive',
            onPress: async () => {
              setSavingId('master');
              const { error } = await setVoraMasterEnabled(false, user.id);
              setSavingId(null);
              if (error) Alert.alert('Hata', error);
              else await load(true);
            },
          },
        ],
      );
      return;
    }
    setSavingId('master');
    const { error } = await setVoraMasterEnabled(true, user.id);
    setSavingId(null);
    if (error) Alert.alert('Hata', error);
    else await load(true);
  };

  const savePresence = async (nextEnabled: boolean, nextConfig: VoraPresenceConfig) => {
    if (!user) return;
    setSavingId('presence');
    const { error } = await updateVoraPresenceSettings(nextEnabled, nextConfig, user.id);
    setSavingId(null);
    if (error) Alert.alert('Hata', error);
    else await load(true);
  };

  const handlePresenceToggle = async (next: boolean) => {
    if (!presence) return;
    if (!masterEnabled) {
      Alert.alert('Vora AI kapalı', 'Önce ana anahtarı açın.');
      return;
    }
    if (!next) {
      Alert.alert('Otomatik paylaşımı durdur', 'Persona profilleri paylaşım yapmayı bırakır.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Durdur', style: 'destructive', onPress: () => savePresence(false, presence) },
      ]);
      return;
    }
    await savePresence(true, presence);
  };

  const handleModuleToggle = async (module: VoraAiModuleId, label: string, next: boolean) => {
    if (!user) return;
    if (!masterEnabled && next) {
      Alert.alert('Vora AI kapalı', 'Modül açmak için önce ana anahtarı açın.');
      return;
    }
    if (!next) {
      Alert.alert('Modülü kapat', `"${label}" tüm kullanıcılarda devre dışı kalacak.`, [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Kapat', style: 'destructive', onPress: () => applyModuleToggle(module, next) },
      ]);
      return;
    }
    await applyModuleToggle(module, next);
  };

  const applyModuleToggle = async (module: VoraAiModuleId, enabled: boolean) => {
    if (!user) return;
    setSavingId(module);
    const { error } = await updateVoraAiModule(module, enabled, user.id);
    setSavingId(null);
    if (error) Alert.alert('Hata', error);
    else await load(true);
  };

  const updatePresenceConfig = (patch: Partial<VoraPresenceConfig>) => {
    if (!presence) return;
    const next = { ...presence, ...patch };
    setPresence(next);
    void savePresence(presenceEnabled, next);
  };

  const toggleCategory = (categoryId: string) => {
    if (!presence || !presenceEnabled || !masterEnabled) return;
    const current = presence.categories?.[categoryId] === true;
    updatePresenceConfig({
      categories: { ...(presence.categories ?? {}), [categoryId]: !current },
    });
  };

  const handleGeneratePersonas = async (count = effectiveSeedCount) => {
    setBusyAction('seed');
    const { error, created, skipped } = await generateAiPersonas(count, personaGender, {
      persona_username_style: presence?.persona_username_style,
      persona_avatar_mode: presence?.persona_avatar_mode,
      manual_persona_batch_max: presence?.manual_persona_batch_max,
    });
    setBusyAction(null);
    if (error) {
      Alert.alert('Hata', error);
    } else if ((created ?? 0) === 0) {
      Alert.alert('Profil üretilemedi', `${skipped ?? 0} profil atlandı. Tekrar deneyin veya farklı cinsiyet seçin.`);
    } else {
      await load(true);
      if (presenceEnabled && masterEnabled) {
        setBusyAction('run');
        const result = await runVoraPresenceNow(created ?? count);
        setBusyAction(null);
        if (result.error) {
          Alert.alert('Profiller oluşturuldu', `${created} profil eklendi ama paylaşım hatası: ${result.error}`);
        } else {
          Alert.alert(
            'Tamam',
            `${created} profil oluşturuldu · ${result.posts_created ?? 0} gönderi paylaşıldı.`,
          );
        }
        await load(true);
        return;
      }
      Alert.alert('Tamam', `${created} yeni Karadeniz profili oluşturuldu. Paylaşım için otomasyonu açıp "Şimdi Paylaştır" deyin.`);
    }
    await load(true);
  };

  const handleRunNow = async () => {
    if (personas.length === 0) {
      Alert.alert('Persona yok', 'Paylaşım için önce persona profili oluşturun.');
      return;
    }
    if (!presenceEnabled) {
      Alert.alert('Otomasyon kapalı', 'Şimdi paylaştırmak için otomatik paylaşımı açın.');
      return;
    }

    const activeCount = personas.filter((p) => p.enabled).length;
    setBusyAction('run');
    const result = await runVoraPresenceNow(activeCount);
    setBusyAction(null);
    if (result.error) {
      Alert.alert('Hata', result.error);
    } else if (result.skipped || (result.posts_created ?? 0) === 0) {
      Alert.alert('Paylaşım yapılmadı', result.message ?? 'Aktif persona bulunamadı veya gönderi kaydedilemedi.');
    } else {
      Alert.alert('Tamam', result.message ?? `${result.posts_created} gönderi oluşturuldu (${activeCount} aktif persona).`);
    }
    await load(true);
  };

  const handlePersonaToggle = async (persona: AiPersonaRow, next: boolean) => {
    setSavingId(persona.id);
    const { error } = await setAiPersonaEnabled(persona.id, next);
    setSavingId(null);
    if (error) Alert.alert('Hata', error);
    else await load(true);
  };

  const handleDeletePersonaPosts = async (personaId?: string) => {
    setBusyAction(personaId ? `delete-posts-${personaId}` : 'delete-all-posts');
    const { error, result } = await deleteAiPersonaPosts(personaId);
    setBusyAction(null);
    if (error) {
      Alert.alert('Hata', error);
    } else {
      Alert.alert(
        'Silindi',
        `${result?.posts_deleted ?? 0} gönderi, ${result?.comments_deleted ?? 0} yorum kaldırıldı.`,
      );
    }
    await load(true);
  };

  const handleDeletePersona = async (persona: AiPersonaRow) => {
    setBusyAction(`delete-persona-${persona.id}`);
    const { error, displayName } = await deleteAiPersona(persona.id);
    setBusyAction(null);
    if (error) {
      Alert.alert('Hata', error);
    } else {
      Alert.alert('Silindi', `${displayName ?? persona.display_name} profili kaldırıldı.`);
    }
    await load(true);
  };

  const handleDeleteAllPersonas = async () => {
    setBusyAction('delete-all-personas');
    const { error, deleted } = await deleteAllAiPersonas();
    setBusyAction(null);
    if (error) {
      Alert.alert('Hata', error);
    } else {
      Alert.alert('Tamam', `${deleted ?? 0} AI profili kalıcı olarak silindi.`);
    }
    await load(true);
  };

  const controlsDisabled = !masterEnabled || !presenceEnabled;

  return (
    <AdminShell
      title="Vora AI"
      subtitle="Yapay zekâ, otomasyon ve persona yönetimi"
      refreshing={refreshing}
      onRefresh={() => load(true)}
      requireAdmin
    >
      {loading ? (
        <AdminEmptyState loading />
      ) : (
        <>
          <AdminVoraAiHeroStrip
            masterEnabled={masterEnabled}
            presenceEnabled={presenceEnabled}
            savingMaster={savingId === 'master'}
            presenceStats={presenceStats}
            stats={stats}
            onMasterToggle={handleMasterToggle}
          />

          <AdminFilterChip options={TABS} value={tab} onChange={setTab} />

          {tab === 'overview' ? (
            <>
              <AdminSectionHeader
                title="Profil üretimi"
                hint={`Bugün ${presenceStats?.personas_today ?? 0} / ${presence?.daily_persona_quota ?? 25} profil`}
              />
              <GlassCard style={styles.sectionCard}>
                <SettingRow
                  title="Günlük otomatik profil"
                  subtitle={`Her gün ${presence?.daily_persona_quota ?? 25} Türk profili oluşturur`}
                  value={presence?.auto_daily_personas === true}
                  disabled={!masterEnabled || savingId === 'presence'}
                  onChange={(value) => updatePresenceConfig({ auto_daily_personas: value })}
                />

                <SectionDivider />

                <AdminVoraAiOptionChips
                  label="Günlük kota"
                  options={VORA_AI_DAILY_PERSONA_QUOTAS.map((quota) => ({
                    id: quota,
                    label: `${quota}/gün`,
                  }))}
                  value={presence?.daily_persona_quota ?? 25}
                  disabled={!masterEnabled}
                  onChange={(quota) => updatePresenceConfig({ daily_persona_quota: quota })}
                />

                <AdminVoraAiOptionChips
                  label="Toplu profil cinsiyeti"
                  options={VORA_AI_PERSONA_GENDER_OPTIONS}
                  value={personaGender}
                  disabled={!masterEnabled}
                  onChange={(value) => {
                    setPersonaGender(value);
                    updatePresenceConfig({ default_persona_gender: value });
                  }}
                />

                <AdminVoraAiOptionChips
                  label="Kullanıcı adı stili"
                  options={VORA_AI_PERSONA_USERNAME_STYLES.map((item) => ({
                    id: item.id,
                    label: item.label,
                  }))}
                  value={presence?.persona_username_style ?? 'underscore'}
                  disabled={!masterEnabled}
                  onChange={(style) => updatePresenceConfig({ persona_username_style: style })}
                />

                <AdminVoraAiOptionChips
                  label="Profil fotoğrafı"
                  options={VORA_AI_PERSONA_AVATAR_MODES.map((item) => ({
                    id: item.id,
                    label: item.label,
                  }))}
                  value={presence?.persona_avatar_mode ?? 'always'}
                  disabled={!masterEnabled}
                  onChange={(mode) => updatePresenceConfig({ persona_avatar_mode: mode })}
                />

                <AdminVoraAiOptionChips
                  label="Kaç profil oluşturulsun?"
                  options={VORA_AI_PERSONA_BATCH_PRESETS.map((count) => ({
                    id: count,
                    label: `${count} adet`,
                  }))}
                  value={seedCount}
                  disabled={!masterEnabled}
                  onChange={(count) => {
                    setSeedCount(count);
                    setCustomSeedInput('');
                  }}
                />

                <View style={styles.customCountRow}>
                  <Text variant="caption" style={styles.blockLabel}>
                    Özel adet (en fazla {presence?.manual_persona_batch_max ?? 100})
                  </Text>
                  <TextInput
                    style={[
                      styles.customCountInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: `${colors.surface}CC`,
                      },
                    ]}
                    placeholder={`1–${presence?.manual_persona_batch_max ?? 100}`}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={customSeedInput}
                    editable={masterEnabled}
                    onChangeText={setCustomSeedInput}
                  />
                </View>

                <AdminVoraAiOptionChips
                  label="Toplu oluşturma üst sınırı"
                  options={[50, 100, 150, 200].map((max) => ({ id: max, label: `${max}` }))}
                  value={presence?.manual_persona_batch_max ?? 100}
                  disabled={!masterEnabled}
                  onChange={(max) => updatePresenceConfig({ manual_persona_batch_max: max })}
                />

                <View style={styles.actionStack}>
                  <AdminActionChip
                    label={busyAction === 'seed' ? 'Oluşturuluyor…' : `${effectiveSeedCount} Profil Oluştur`}
                    icon="people-outline"
                    tone="primary"
                    fullWidth
                    loading={busyAction === 'seed'}
                    disabled={!!busyAction || !masterEnabled}
                    onPress={() => handleGeneratePersonas(effectiveSeedCount)}
                  />
                  <AdminActionChip
                    label="Özel Profil Ekle"
                    icon="person-add-outline"
                    tone="default"
                    fullWidth
                    disabled={!!busyAction || !masterEnabled}
                    onPress={() => setCreateSheetOpen(true)}
                  />
                </View>
              </GlassCard>

              <AdminSectionHeader
                title="Otomatik paylaşım"
                hint="Gerçekçi profiller metin + fotoğraf paylaşır, beğeni/yorum yapar"
              />
              <GlassCard style={styles.sectionCard}>
                <SettingRow
                  title="Persona otomasyonu"
                  subtitle={
                    presenceStats
                      ? `${presenceStats.personas_active}/${presenceStats.personas_total} aktif · ${presenceStats.posts_total} gönderi`
                      : undefined
                  }
                  value={presenceEnabled}
                  disabled={!masterEnabled || savingId === 'presence'}
                  onChange={handlePresenceToggle}
                />

                <SectionDivider />

                <AdminVoraAiOptionChips
                  label="Paylaşım aralığı"
                  options={VORA_AI_PRESENCE_INTERVALS.map((item) => ({
                    id: item.minutes,
                    label: item.label,
                  }))}
                  value={presence?.interval_minutes ?? VORA_AI_PRESENCE_INTERVALS[0].minutes}
                  disabled={controlsDisabled}
                  onChange={(minutes) => updatePresenceConfig({ interval_minutes: minutes })}
                />

                <AdminVoraAiOptionChips
                  label="Tur başına gönderi"
                  options={VORA_AI_PRESENCE_MAX_POSTS.map((count) => ({
                    id: count,
                    label: String(count),
                  }))}
                  value={presence?.max_posts_per_run ?? 10}
                  disabled={controlsDisabled}
                  onChange={(count) => updatePresenceConfig({ max_posts_per_run: count })}
                />

                <Text variant="caption" style={styles.blockLabel}>
                  Paylaşım kategorileri
                </Text>
                <View style={styles.categoryToggles}>
                  {VORA_AI_PRESENCE_CATEGORIES.map((cat) => (
                    <SettingRow
                      key={cat.id}
                      title={cat.label}
                      value={presence?.categories?.[cat.id] === true}
                      disabled={controlsDisabled}
                      onChange={() => toggleCategory(cat.id)}
                    />
                  ))}
                </View>

                <AdminActionChip
                  label={busyAction === 'run' ? 'Çalışıyor…' : 'Şimdi Paylaştır'}
                  icon="flash-outline"
                  tone="success"
                  fullWidth
                  loading={busyAction === 'run'}
                  disabled={!!busyAction || !presenceEnabled || !masterEnabled}
                  onPress={handleRunNow}
                />
              </GlassCard>

              <AdminSectionHeader title="Medya ve etkileşim" hint="Fotoğraf sıklığı ve persona tepkileri" />
              <GlassCard style={styles.sectionCard}>
                <SettingRow
                  title="Fotoğraflı paylaşım"
                  subtitle="Bölge ve kategoriye uygun görseller eklenir"
                  value={presence?.allow_photos !== false}
                  disabled={controlsDisabled}
                  onChange={(value) => updatePresenceConfig({ allow_photos: value })}
                />

                {presence?.allow_photos !== false ? (
                  <AdminVoraAiOptionChips
                    label="Fotoğraf sıklığı"
                    options={VORA_AI_PRESENCE_PHOTO_CHANCE_OPTIONS.map((item) => ({
                      id: item.value,
                      label: item.label,
                    }))}
                    value={presence?.photo_chance ?? 0.65}
                    disabled={controlsDisabled}
                    onChange={(value) => updatePresenceConfig({ photo_chance: value })}
                  />
                ) : null}

                <SectionDivider />

                <SettingRow
                  title="Video paylaşımı"
                  subtitle="Yakında — şimdilik yalnızca fotoğraf"
                  value={presence?.allow_videos === true}
                  disabled
                  onChange={() => undefined}
                />

                <SettingRow
                  title="Etkileşim (beğeni/yorum)"
                  subtitle="Personalar bölgedeki gönderilere tepki verir"
                  value={presence?.allow_engagement !== false}
                  disabled={controlsDisabled}
                  onChange={(value) => updatePresenceConfig({ allow_engagement: value })}
                />
              </GlassCard>

              <GlassCard style={[styles.infoBanner, { borderColor: `${colors.primary}22` }]}>
                <View style={styles.infoRow}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                  <Text secondary variant="caption" style={styles.infoText}>
                    Persona profilleri uygulamada normal kullanıcı gibi görünür. Yönetim yalnızca bu
                    panelden yapılır; otomasyon kapalıyken mevcut profiller durur.
                  </Text>
                </View>
              </GlassCard>
            </>
          ) : null}

          {tab === 'personas' ? (
            <>
              <AdminVoraAiCleanupPanel
                stats={contentStats}
                busy={!!busyAction}
                onDeleteAllPosts={() => void handleDeletePersonaPosts()}
                onDeleteAllPersonas={() => void handleDeleteAllPersonas()}
              />

              <AdminSearchInput
                value={personaSearch}
                onChangeText={setPersonaSearch}
                placeholder="Persona ara…"
              />
              <AdminFilterChip options={PERSONA_FILTERS} value={personaFilter} onChange={setPersonaFilter} />

              <View style={styles.personaToolbar}>
                <Text secondary variant="caption" style={styles.personaCount}>
                  {filteredPersonas.length} / {personas.length} persona
                </Text>
                <View style={styles.personaToolbarActions}>
                  <AdminActionChip
                    label="Özel profil ekle"
                    icon="create-outline"
                    tone="primary"
                    fullWidth
                    disabled={!!busyAction || !masterEnabled}
                    onPress={() => setCreateSheetOpen(true)}
                  />
                  <AdminActionChip
                    label="Hazır paket (10 profil)"
                    icon="download-outline"
                    tone="default"
                    fullWidth
                    loading={busyAction === 'seed'}
                    disabled={!!busyAction || !masterEnabled}
                    onPress={() => handleGeneratePersonas(10)}
                  />
                </View>
              </View>

              {personas.length === 0 ? (
                <AdminEmptyState
                  title="Henüz persona yok"
                  message="Hazır paket (12 Karadeniz profili) veya Özel Profil ile başlayın."
                  icon="people-outline"
                />
              ) : filteredPersonas.length === 0 ? (
                <AdminEmptyState
                  title="Sonuç yok"
                  message="Arama veya filtreyi değiştirin."
                  icon="search-outline"
                />
              ) : (
                filteredPersonas.map((persona) => (
                  <AdminVoraAiPersonaCard
                    key={persona.id}
                    persona={persona}
                    saving={savingId === persona.id}
                    deleting={busyAction === `delete-posts-${persona.id}` || busyAction === `delete-persona-${persona.id}`}
                    onToggle={(value) => handlePersonaToggle(persona, value)}
                    onDeletePosts={() => void handleDeletePersonaPosts(persona.id)}
                    onDeletePersona={() => void handleDeletePersona(persona)}
                  />
                ))
              )}
            </>
          ) : null}

          {tab === 'modules' ? (
            <>
              <AdminSectionHeader
                title="Özellik modülleri"
                hint="Harita, keşfet ve diğer Vora AI yeteneklerini ayrı ayrı yönetin"
              />
              <View style={styles.moduleGrid}>
                {VORA_AI_MODULES.map((mod) => (
                  <AdminVoraAiModuleTile
                    key={mod.id}
                    id={mod.id}
                    label={mod.label}
                    enabled={settings?.[mod.id] ?? true}
                    masterEnabled={masterEnabled}
                    saving={savingId === mod.id}
                    onToggle={(value) => handleModuleToggle(mod.id, mod.label, value)}
                  />
                ))}
              </View>
            </>
          ) : null}

          <AdminVoraAiCreatePersonaSheet
            visible={createSheetOpen}
            onClose={() => setCreateSheetOpen(false)}
            onCreated={() => load(true)}
            personaOptions={{
              persona_username_style: presence?.persona_username_style,
              persona_avatar_mode: presence?.persona_avatar_mode,
            }}
          />
        </>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  sectionCard: { gap: spacing.md, marginBottom: spacing.md },
  blockLabel: { fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  settingText: { flex: 1, gap: 2, minWidth: 0 },
  settingSwitch: { flexShrink: 0 },
  actionStack: { gap: spacing.sm, marginTop: spacing.xs },
  customCountRow: { gap: spacing.xs },
  customCountInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  categoryToggles: { gap: spacing.xs },
  infoBanner: { marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  infoText: { flex: 1, lineHeight: 18 },
  personaToolbar: {
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  personaCount: { fontWeight: '600' },
  personaToolbarActions: { gap: spacing.sm },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
});
