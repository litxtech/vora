import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { DISTRICTS } from '@/constants/districts';
import { neighborhoodsForDistrict } from '@/constants/neighborhoods';
import { REGIONS } from '@/constants/regions';
import type { RegionId } from '@/constants/regions';
import { PUSH_PREF_OPTIONS } from '@/constants/notifications';
import type { PushPrefId } from '@/constants/notifications';
import { NotificationPrefRow } from '@/features/notifications/components/NotificationPrefRow';
import {
  EMERGENCY_ACCENT,
  PUSH_PREF_CATEGORY,
  PUSH_PREF_ICONS,
  REGIONAL_PREF_ICONS,
  SETTINGS_FILTER_TABS,
  type SettingsFilterTabId,
} from '@/features/notifications/constants';
import {
  fetchNotificationSettings,
  updateNotificationPrefs,
  updateQuietHours,
  updateRegionalSubscription,
} from '@/features/notifications/services/notificationPrefs';
import type { QuietHoursSettings } from '@/lib/notifications/types';
import {
  getIosPushPermissionIssue,
  hasNotificationPermission,
  iosPushPermissionHint,
  registerPushTokens,
  requestNotificationPermissions,
} from '@/lib/notifications/register';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const QUIET_START_OPTIONS = ['21:00', '22:00', '23:00', '00:00'];
const QUIET_END_OPTIONS = ['06:00', '07:00', '08:00', '09:00'];

type RegionalState = {
  districts: string[];
  neighborhoods: string[];
  notifyEmergency: boolean;
  notifyIncidents: boolean;
  notifyEvents: boolean;
  notifyJobs: boolean;
};

export function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, profile, refreshProfile } = useAuth();

  const [prefs, setPrefs] = useState<Partial<Record<PushPrefId, boolean>>>({});
  const [quietHours, setQuietHours] = useState<QuietHoursSettings>({
    enabled: false,
    start: '22:00',
    end: '08:00',
    timezone: 'Europe/Istanbul',
  });
  const [regional, setRegional] = useState<RegionalState>({
    districts: [],
    neighborhoods: [],
    notifyEmergency: true,
    notifyIncidents: true,
    notifyEvents: true,
    notifyJobs: true,
  });
  const [activeTab, setActiveTab] = useState<SettingsFilterTabId>('all');
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [iosPushHint, setIosPushHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const regionName = REGIONS.find((r) => r.id === profile?.region_id)?.name ?? profile?.region_id;

  const refreshPermission = useCallback(async () => {
    const current = await Notifications.getPermissionsAsync();
    setPermissionGranted(hasNotificationPermission(current));
    setIosPushHint(iosPushPermissionHint(getIosPushPermissionIssue(current)));
  }, []);

  useEffect(() => {
    if (!user) return;

    fetchNotificationSettings(user.id).then((data) => {
      setPrefs(data.prefs);
      setQuietHours(data.quietHours);
      if (data.regional) {
        setRegional({
          districts: data.regional.districts,
          neighborhoods: data.regional.neighborhoods,
          notifyEmergency: data.regional.notifyEmergency,
          notifyIncidents: data.regional.notifyIncidents,
          notifyEvents: data.regional.notifyEvents,
          notifyJobs: data.regional.notifyJobs,
        });
      }
      setLoading(false);
    });

    refreshPermission();
  }, [user?.id, refreshPermission]);

  const filteredPrefs = useMemo(() => {
    if (activeTab === 'all') return PUSH_PREF_OPTIONS;
    return PUSH_PREF_OPTIONS.filter((opt) => PUSH_PREF_CATEGORY[opt.id] === activeTab);
  }, [activeTab]);

  const enabledCount = useMemo(
    () => PUSH_PREF_OPTIONS.filter((opt) => prefs[opt.id] ?? true).length,
    [prefs],
  );

  const markDirty = () => setDirty(true);

  const togglePref = (id: PushPrefId, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [id]: value }));
    markDirty();
  };

  const toggleAllPrefs = (enabled: boolean) => {
    const next: Partial<Record<PushPrefId, boolean>> = {};
    for (const opt of PUSH_PREF_OPTIONS) {
      next[opt.id] = opt.id === 'emergency' ? true : enabled;
    }
    setPrefs(next);
    markDirty();
  };

  const cycleQuietTime = (field: 'start' | 'end') => {
    const options = field === 'start' ? QUIET_START_OPTIONS : QUIET_END_OPTIONS;
    const current = quietHours[field];
    const idx = options.indexOf(current);
    const next = options[(idx + 1) % options.length];
    setQuietHours((prev) => ({ ...prev, [field]: next }));
    markDirty();
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const [{ error: prefError }, { error: quietError }] = await Promise.all([
      updateNotificationPrefs(user.id, prefs),
      updateQuietHours(user.id, quietHours),
    ]);

    if (profile?.region_id) {
      const { error: regionalError } = await updateRegionalSubscription(user.id, profile.region_id, regional);
      if (regionalError) {
        setSaving(false);
        Alert.alert('Hata', regionalError);
        return;
      }
    }

    setSaving(false);

    if (prefError || quietError) {
      Alert.alert('Hata', prefError ?? quietError ?? 'Kaydedilemedi');
      return;
    }

    await refreshProfile();
    setDirty(false);
    Alert.alert('Kaydedildi', 'Bildirim tercihleriniz güncellendi.');
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermissions();
    await refreshPermission();

    if (granted && user) {
      await registerPushTokens(user.id);
      Alert.alert('İzin verildi', 'Push bildirimleri etkinleştirildi.');
      return;
    }

    Alert.alert(
      'İzin gerekli',
      'Ayarlar → Vora → Bildirimler bölümünden "Bildirimlere İzin Ver", "Bildirimler", "Rozetler" ve "Sesler" seçeneklerini açın.',
    );
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text secondary style={styles.loadingText}>
            Ayarlar yükleniyor…
          </Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <View style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + 96 }]}
          showsVerticalScrollIndicator={false}
        >
          <AuthHeader
            title="Bildirim Ayarları"
            subtitle="Ne zaman, nasıl ve hangi konularda haberdar olacağınızı belirleyin"
          />

          <PermissionStatusCard
            granted={permissionGranted}
            enabledCount={enabledCount}
            totalCount={PUSH_PREF_OPTIONS.length}
            iosHint={iosPushHint}
            onRequestPermission={handleRequestPermission}
          />

          <SectionHeader icon="options-outline" title="Bildirim Türleri" />
          <GlassCard style={styles.section} padded={false}>
            <View style={styles.sectionInner}>
              <View style={styles.masterRow}>
                <View style={styles.masterCopy}>
                  <Text variant="label">Tüm bildirimler</Text>
                  <Text variant="caption" secondary>
                    Acil durum bildirimleri her zaman açık kalır
                  </Text>
                </View>
                <Switch
                  value={enabledCount > 1}
                  onValueChange={toggleAllPrefs}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                  ios_backgroundColor={colors.border}
                />
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabRow}
              >
                {SETTINGS_FILTER_TABS.map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <Pressable
                      key={tab.id}
                      onPress={() => setActiveTab(tab.id)}
                      style={[
                        styles.tabChip,
                        {
                          backgroundColor: active ? colors.primary : colors.surfaceElevated,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={tab.icon as keyof typeof Ionicons.glyphMap}
                        size={14}
                        color={active ? '#fff' : colors.textMuted}
                      />
                      <Text
                        variant="caption"
                        style={{
                          color: active ? '#fff' : colors.text,
                          fontWeight: active ? '600' : '400',
                        }}
                      >
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.prefList}>
                {filteredPrefs.map((option) => (
                  <NotificationPrefRow
                    key={option.id}
                    icon={PUSH_PREF_ICONS[option.id]}
                    label={option.label}
                    description={option.description}
                    value={prefs[option.id] ?? true}
                    onValueChange={(value) => togglePref(option.id, value)}
                    accent={option.id === 'emergency' ? EMERGENCY_ACCENT : colors.primary}
                    highlight={option.id === 'emergency'}
                    disabled={option.id === 'emergency'}
                  />
                ))}
              </View>
            </View>
          </GlassCard>

          <SectionHeader icon="moon-outline" title="Sessiz Saatler" />
          <GlassCard style={styles.section}>
            <Text variant="caption" secondary>
              Belirlediğiniz saatlerde normal bildirimler sessiz gider. Acil durum ve güvenlik uyarıları
              her zaman iletilir.
            </Text>

            <NotificationPrefRow
              icon="moon-outline"
              label="Sessiz saatleri etkinleştir"
              value={quietHours.enabled}
              onValueChange={(value) => {
                setQuietHours((prev) => ({ ...prev, enabled: value }));
                markDirty();
              }}
              accent={colors.accent}
            />

            {quietHours.enabled ? (
              <View style={styles.quietTimes}>
                <TimeChip
                  label="Başlangıç"
                  value={quietHours.start}
                  onPress={() => cycleQuietTime('start')}
                />
                <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
                <TimeChip
                  label="Bitiş"
                  value={quietHours.end}
                  onPress={() => cycleQuietTime('end')}
                />
              </View>
            ) : null}
          </GlassCard>

          {profile?.region_id ? (
            <>
              <SectionHeader icon="location-outline" title="Bölgesel Bildirimler" />
              <GlassCard style={styles.section}>
                <View style={[styles.regionBadge, { backgroundColor: `${colors.accent}14`, borderColor: `${colors.accent}33` }]}>
                  <Ionicons name="map-outline" size={16} color={colors.accent} />
                  <Text variant="label" style={{ color: colors.accent }}>
                    {regionName}
                  </Text>
                  <Text variant="caption" secondary>
                    · İlçe seçmezseniz tüm ilçeler dahil edilir
                  </Text>
                </View>

                <Text variant="caption" secondary style={styles.subLabel}>
                  İlçe filtresi
                </Text>
                <ChipGrid
                  items={DISTRICTS[profile.region_id as RegionId] ?? []}
                  selected={regional.districts}
                  onToggle={(district) => {
                    markDirty();
                    setRegional((prev) => {
                      const districts = prev.districts.includes(district)
                        ? prev.districts.filter((d) => d !== district)
                        : [...prev.districts, district];
                      return { ...prev, districts, neighborhoods: [] };
                    });
                  }}
                />

                {regional.districts.length === 1 ? (
                  <>
                    <Text variant="caption" secondary style={styles.subLabel}>
                      Mahalle (isteğe bağlı)
                    </Text>
                    <ChipGrid
                      items={neighborhoodsForDistrict(profile.region_id as RegionId, regional.districts[0])}
                      selected={regional.neighborhoods}
                      onToggle={(n) => {
                        markDirty();
                        setRegional((prev) => ({
                          ...prev,
                          neighborhoods: prev.neighborhoods.includes(n)
                            ? prev.neighborhoods.filter((x) => x !== n)
                            : [...prev.neighborhoods, n],
                        }));
                      }}
                    />
                  </>
                ) : null}

                <View style={styles.prefList}>
                  <NotificationPrefRow
                    icon={REGIONAL_PREF_ICONS.notifyEmergency}
                    label="Acil durum yayınları"
                    value={regional.notifyEmergency}
                    onValueChange={(value) => {
                      setRegional((prev) => ({ ...prev, notifyEmergency: value }));
                      markDirty();
                    }}
                    accent={EMERGENCY_ACCENT}
                  />
                  <NotificationPrefRow
                    icon={REGIONAL_PREF_ICONS.notifyIncidents}
                    label="Bölgesel olay bildirimleri"
                    value={regional.notifyIncidents}
                    onValueChange={(value) => {
                      setRegional((prev) => ({ ...prev, notifyIncidents: value }));
                      markDirty();
                    }}
                  />
                  <NotificationPrefRow
                    icon={REGIONAL_PREF_ICONS.notifyEvents}
                    label="Yakındaki etkinlikler"
                    value={regional.notifyEvents}
                    onValueChange={(value) => {
                      setRegional((prev) => ({ ...prev, notifyEvents: value }));
                      markDirty();
                    }}
                  />
                  <NotificationPrefRow
                    icon={REGIONAL_PREF_ICONS.notifyJobs}
                    label="İş ve personel ilanları"
                    value={regional.notifyJobs}
                    onValueChange={(value) => {
                      setRegional((prev) => ({ ...prev, notifyJobs: value }));
                      markDirty();
                    }}
                  />
                </View>
              </GlassCard>
            </>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, spacing.md),
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          {dirty ? (
            <Text variant="caption" secondary style={styles.unsavedHint}>
              Kaydedilmemiş değişiklikler var
            </Text>
          ) : null}
          <Button
            title={saving ? 'Kaydediliyor…' : dirty ? 'Değişiklikleri Kaydet' : 'Kaydet'}
            onPress={handleSave}
            loading={saving}
            disabled={!dirty && !saving}
          />
        </View>
      </View>
    </GradientBackground>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text variant="label">{title}</Text>
    </View>
  );
}

function PermissionStatusCard({
  granted,
  enabledCount,
  totalCount,
  iosHint,
  onRequestPermission,
}: {
  granted: boolean | null;
  enabledCount: number;
  totalCount: number;
  iosHint?: string | null;
  onRequestPermission: () => void;
}) {
  const { colors } = useTheme();
  const isGranted = granted === true;
  const accent = isGranted ? colors.success : colors.warning;

  return (
    <GlassCard style={[styles.permissionCard, { borderColor: `${accent}55` }]}>
      <View style={styles.permissionTop}>
        <View style={[styles.permissionIcon, { backgroundColor: `${accent}18` }]}>
          <Ionicons
            name={isGranted ? 'notifications' : 'notifications-off-outline'}
            size={22}
            color={accent}
          />
        </View>
        <View style={styles.permissionCopy}>
          <Text variant="label">
            {granted === null
              ? 'İzin durumu kontrol ediliyor…'
              : isGranted
                ? 'Push bildirimleri aktif'
                : 'Push izni gerekli'}
          </Text>
          <Text variant="caption" secondary>
            {isGranted
              ? `${enabledCount}/${totalCount} bildirim türü açık`
              : 'Üstten banner ve ses için cihaz izni verin'}
          </Text>
        </View>
      </View>

      {!isGranted ? (
        <Button title="Devam Et" variant="outline" onPress={onRequestPermission} />
      ) : null}

      {isGranted && iosHint ? (
        <Text variant="caption" style={{ color: colors.warning }}>
          {iosHint}
        </Text>
      ) : null}
    </GlassCard>
  );
}

function TimeChip({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.timeChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
    >
      <Text variant="caption" secondary>
        {label}
      </Text>
      <Text variant="label">{value}</Text>
    </Pressable>
  );
}

function ChipGrid({
  items,
  selected,
  onToggle,
}: {
  items: string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  const { colors } = useTheme();

  if (items.length === 0) return null;

  return (
    <View style={styles.chipGrid}>
      {items.map((item) => {
        const active = selected.includes(item);
        return (
          <Pressable
            key={item}
            onPress={() => onToggle(item)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.primary : colors.surfaceElevated,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
          >
            <Text variant="caption" style={{ color: active ? '#fff' : colors.text, fontWeight: active ? '600' : '400' }}>
              {item}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  loadingText: { marginTop: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  section: {
    gap: spacing.md,
  },
  sectionInner: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  permissionCard: {
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  permissionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  permissionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionCopy: {
    flex: 1,
    gap: 2,
  },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.25)',
  },
  masterCopy: {
    flex: 1,
    gap: 2,
  },
  tabRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  prefList: {
    gap: spacing.sm,
  },
  quietTimes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  timeChip: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  regionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  subLabel: {
    marginTop: spacing.xs,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  unsavedHint: {
    textAlign: 'center',
  },
});
