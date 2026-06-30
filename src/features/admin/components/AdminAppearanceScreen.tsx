import { useCallback, useState } from 'react';
import { Alert, Image, StyleSheet, Switch, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { CentersFeaturedPicker } from '@/features/centers/components/CentersFeaturedPicker';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  DEFAULT_APP_APPEARANCE,
  EDITABLE_COLOR_KEYS,
  EDITABLE_RADIUS_KEYS,
  EDITABLE_SPACING_KEYS,
  EDITABLE_TYPOGRAPHY_KEYS,
  LOBBY_ANNOUNCEMENT_TONE_LABELS,
  TAB_BAR_COLOR_KEYS,
} from '@/features/app-appearance/constants';
import { updateAppAppearanceConfig } from '@/features/app-appearance/services/appAppearance';
import type {
  AppAppearanceConfig,
  LobbyAnnouncement,
  LobbyAnnouncementTone,
  ThemeColorOverrides,
  ThemeMode,
} from '@/features/app-appearance/types';
import type { TrustVacationPromoPlacement } from '@/features/trust-promo/types';
import {
  removeTrustVacationPromoImage,
  uploadTrustVacationPromoImage,
} from '@/features/trust-promo';
import { spacing, radius, colors as themeColors } from '@/constants/theme';
import { useAppearance } from '@/providers/AppearanceProvider';
import { useTheme } from '@/providers/ThemeProvider';

function createAnnouncementId(): string {
  return `ann_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function isValidColor(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(trimmed) || /^rgba?\(.+\)$/.test(trimmed);
}

type ColorEditorProps = {
  mode: ThemeMode;
  overrides: ThemeColorOverrides;
  defaults: (typeof themeColors)['dark'];
  onChange: (mode: ThemeMode, key: string, value: string) => void;
};

function ColorEditor({ mode, overrides, defaults, onChange }: ColorEditorProps) {
  const { colors } = useTheme();
  const modeLabel = mode === 'dark' ? 'Koyu tema' : 'Açık tema';

  return (
    <View style={styles.section}>
      <AdminSectionHeader title={modeLabel} hint="Boş bırakırsanız varsayılan renk kullanılır" />
      {EDITABLE_COLOR_KEYS.map(({ key, label }) => {
        const value = overrides[key] ?? '';
        const preview = value || defaults[key] || colors.primary;
        return (
          <GlassCard key={`${mode}-${key}`} style={styles.colorRow}>
            <View style={[styles.colorSwatch, { backgroundColor: preview }]} />
            <View style={styles.colorField}>
              <AdminFormField
                label={label}
                placeholder={defaults[key] ?? '#000000'}
                value={value}
                onChangeText={(text) => onChange(mode, key, text)}
              />
            </View>
          </GlassCard>
        );
      })}
    </View>
  );
}

type AnnouncementEditorProps = {
  item: LobbyAnnouncement;
  onChange: (next: LobbyAnnouncement) => void;
  onRemove: () => void;
};

function AnnouncementEditor({ item, onChange, onRemove }: AnnouncementEditorProps) {
  const { colors } = useTheme();
  const tones = Object.keys(LOBBY_ANNOUNCEMENT_TONE_LABELS) as LobbyAnnouncementTone[];

  return (
    <GlassCard style={styles.announcementCard}>
      <View style={styles.switchRow}>
        <Text variant="body">Aktif</Text>
        <Switch value={item.enabled} onValueChange={(enabled) => onChange({ ...item, enabled })} />
      </View>
      <AdminFormField label="Başlık" value={item.title} onChangeText={(title) => onChange({ ...item, title })} />
      <AdminFormField
        label="Mesaj"
        value={item.message}
        onChangeText={(message) => onChange({ ...item, message })}
        multiline
      />
      <View style={styles.toneRow}>
        {tones.map((tone) => (
          <AdminActionChip
            key={tone}
            label={LOBBY_ANNOUNCEMENT_TONE_LABELS[tone]}
            tone={tone === 'warning' ? 'warning' : tone === 'success' ? 'success' : 'primary'}
            compact
            onPress={() => onChange({ ...item, tone })}
            style={item.tone === tone ? styles.toneSelected : undefined}
          />
        ))}
      </View>
      <View style={styles.switchRow}>
        <Text variant="body">Kapatılabilir</Text>
        <Switch
          value={item.dismissible}
          onValueChange={(dismissible) => onChange({ ...item, dismissible })}
        />
      </View>
      <AdminActionChip label="Kaldır" icon="trash-outline" tone="danger" compact onPress={onRemove} />
      <Text secondary variant="caption" style={{ color: colors.textMuted }}>
        ID: {item.id}
      </Text>
    </GlassCard>
  );
}

export function AdminAppearanceScreen() {
  const { colors } = useTheme();
  const { config, refresh, isReady } = useAppearance();
  const [form, setForm] = useState<AppAppearanceConfig | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingPromoImageUri, setPendingPromoImageUri] = useState<string | null>(null);
  const [promoImageUploading, setPromoImageUploading] = useState(false);

  const working = form ?? config;
  const promoImagePreview =
    pendingPromoImageUri ?? working.trust_vacation_promo.image_url?.trim() ?? null;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setForm(null);
    setPendingPromoImageUri(null);
    setRefreshing(false);
  }, [refresh]);

  const pickPromoImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Görsel seçmek için galeri erişimine izin verin.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setPendingPromoImageUri(result.assets[0].uri);
    }
  };

  const patchColors = (mode: ThemeMode, key: string, value: string) => {
    setForm((prev) => {
      const base = prev ?? config;
      const nextOverrides = { ...base.colors[mode] };
      if (value.trim()) {
        nextOverrides[key] = value.trim();
      } else {
        delete nextOverrides[key];
      }
      return {
        ...base,
        colors: {
          ...base.colors,
          [mode]: nextOverrides,
        },
      };
    });
  };

  const patchLobby = (updates: Partial<AppAppearanceConfig['lobby']>) => {
    setForm((prev) => {
      const base = prev ?? config;
      return {
        ...base,
        lobby: { ...base.lobby, ...updates },
      };
    });
  };

  const patchNumeric = (
    section: 'spacing' | 'radius',
    key: string,
    value: string,
    defaults: Record<string, number>,
  ) => {
    setForm((prev) => {
      const base = prev ?? config;
      const next = { ...base[section] };
      const parsed = Number(value);
      if (value.trim() && Number.isFinite(parsed) && parsed > 0) {
        next[key as keyof typeof next] = parsed;
      } else {
        delete next[key as keyof typeof next];
      }
      return { ...base, [section]: next };
    });
  };

  const patchTypography = (variant: string, field: 'fontSize' | 'lineHeight', value: string) => {
    setForm((prev) => {
      const base = prev ?? config;
      const typography = { ...base.typography };
      const current = { ...(typography[variant as keyof typeof typography] ?? {}) };
      const parsed = Number(value);
      if (value.trim() && Number.isFinite(parsed) && parsed > 0) {
        current[field] = parsed;
      } else {
        delete current[field];
      }
      if (Object.keys(current).length === 0) delete typography[variant as keyof typeof typography];
      else typography[variant as keyof typeof typography] = current;
      return { ...base, typography };
    });
  };

  const patchTabBar = (mode: ThemeMode, key: string, value: string) => {
    setForm((prev) => {
      const base = prev ?? config;
      const next = { ...base.tab_bar[mode] };
      if (value.trim()) next[key as keyof typeof next] = value.trim();
      else delete next[key as keyof typeof next];
      return { ...base, tab_bar: { ...base.tab_bar, [mode]: next } };
    });
  };

  const patchFeedBanner = (updates: Partial<AppAppearanceConfig['feed']['banner']>) => {
    setForm((prev) => {
      const base = prev ?? config;
      return { ...base, feed: { banner: { ...base.feed.banner, ...updates } } };
    });
  };

  const patchTrustPromo = (updates: Partial<AppAppearanceConfig['trust_vacation_promo']>) => {
    setForm((prev) => {
      const base = prev ?? config;
      return {
        ...base,
        trust_vacation_promo: { ...base.trust_vacation_promo, ...updates },
      };
    });
  };

  const patchTrustPromoPlacement = (placement: TrustVacationPromoPlacement, enabled: boolean) => {
    setForm((prev) => {
      const base = prev ?? config;
      return {
        ...base,
        trust_vacation_promo: {
          ...base.trust_vacation_promo,
          placements: { ...base.trust_vacation_promo.placements, [placement]: enabled },
        },
      };
    });
  };

  const clearPromoImage = () => {
    setPendingPromoImageUri(null);
    patchTrustPromo({ image_url: null });
  };

  const patchCentersHub = (updates: Partial<AppAppearanceConfig['centers_hub']>) => {
    setForm((prev) => {
      const base = prev ?? config;
      return { ...base, centers_hub: { ...base.centers_hub, ...updates } };
    });
  };

  const patchBranding = (updates: Partial<AppAppearanceConfig['branding']>) => {
    setForm((prev) => {
      const base = prev ?? config;
      return { ...base, branding: { ...base.branding, ...updates } };
    });
  };

  const updateAnnouncement = (index: number, next: LobbyAnnouncement) => {
    setForm((prev) => {
      const base = prev ?? config;
      const announcements = [...base.lobby.announcements];
      announcements[index] = next;
      return { ...base, lobby: { ...base.lobby, announcements } };
    });
  };

  const addAnnouncement = () => {
    const next: LobbyAnnouncement = {
      id: createAnnouncementId(),
      enabled: true,
      title: 'Yeni bilgilendirme',
      message: '',
      tone: 'info',
      dismissible: true,
    };
    patchLobby({ announcements: [...working.lobby.announcements, next] });
  };

  const removeAnnouncement = (index: number) => {
    patchLobby({
      announcements: working.lobby.announcements.filter((_, i) => i !== index),
    });
  };

  const validate = (): string | null => {
    for (const mode of ['dark', 'light'] as const) {
      for (const [key, value] of Object.entries(working.colors[mode])) {
        if (value && !isValidColor(value)) {
          return `${mode === 'dark' ? 'Koyu' : 'Açık'} tema — ${key}: geçersiz renk`;
        }
      }
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      Alert.alert('Geçersiz renk', validationError);
      return;
    }

    setSaving(true);

    let configToSave = working;

    if (pendingPromoImageUri && !pendingPromoImageUri.startsWith('http')) {
      setPromoImageUploading(true);
      const { url, error: uploadError } = await uploadTrustVacationPromoImage(pendingPromoImageUri);
      setPromoImageUploading(false);

      if (uploadError || !url) {
        setSaving(false);
        Alert.alert('Görsel yüklenemedi', uploadError ?? 'Bilinmeyen hata');
        return;
      }

      configToSave = {
        ...working,
        trust_vacation_promo: { ...working.trust_vacation_promo, image_url: url },
      };
    } else if (!working.trust_vacation_promo.image_url && config.trust_vacation_promo.image_url) {
      await removeTrustVacationPromoImage();
    }

    const { error } = await updateAppAppearanceConfig(configToSave);
    setSaving(false);

    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    await refresh();
    setForm(null);
    setPendingPromoImageUri(null);
    Alert.alert('Kaydedildi', 'Görünüm ayarları canlıya yansıdı. Açık uygulamalarda birkaç saniye içinde güncellenir.');
  };

  const handleReset = () => {
    Alert.alert('Sıfırla', 'Tüm görünüm ayarları varsayılana dönsün mü?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sıfırla',
        style: 'destructive',
        onPress: () => setForm({ ...DEFAULT_APP_APPEARANCE }),
      },
    ]);
  };

  const defaultDark = themeColors.dark;
  const defaultLight = themeColors.light;

  return (
    <AdminShell
      title="Görünüm & Tasarım"
      subtitle="Renkler, lobi, akış, tab bar ve tipografi — build almadan canlı"
      requireAdmin
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      {!isReady ? (
        <AdminEmptyState loading />
      ) : (
        <>
          <GlassCard style={[styles.infoBanner, { borderColor: `${colors.primary}33` }]}>
            <View style={styles.infoRow}>
              <Ionicons name="color-palette-outline" size={22} color={colors.primary} />
              <View style={styles.infoText}>
                <Text variant="label">Canlı tasarım</Text>
                <Text secondary variant="caption">
                  Kaydettiğinizde tüm kullanıcılara anında yansır. Buton renkleri ana renk (primary) üzerinden
                  güncellenir.
                </Text>
              </View>
            </View>
          </GlassCard>

          <AdminSectionHeader title="Lobi metinleri" />
          <GlassCard style={styles.form}>
            <AdminFormField
              label="Alt başlık (tagline)"
              value={working.lobby.tagline}
              onChangeText={(tagline) => patchLobby({ tagline })}
            />
            <AdminFormField
              label="Karşılama başlığı"
              value={working.lobby.welcome_title}
              onChangeText={(welcome_title) => patchLobby({ welcome_title })}
            />
            <AdminFormField
              label="Karşılama alt metni"
              value={working.lobby.welcome_subtitle}
              onChangeText={(welcome_subtitle) => patchLobby({ welcome_subtitle })}
            />
          </GlassCard>

          <AdminSectionHeader
            title="Lobi bilgilendirmeleri"
            hint="Giriş ekranında banner olarak gösterilir"
          />
          {working.lobby.announcements.map((item, index) => (
            <AnnouncementEditor
              key={item.id}
              item={item}
              onChange={(next) => updateAnnouncement(index, next)}
              onRemove={() => removeAnnouncement(index)}
            />
          ))}
          <AdminActionChip label="Bilgilendirme ekle" icon="add-circle-outline" tone="primary" onPress={addAnnouncement} />

          <AdminSectionHeader title="Akış banner" hint="Feed üstünde gösterilir" />
          <GlassCard style={styles.form}>
            <View style={styles.switchRow}>
              <Text variant="body">Banner aktif</Text>
              <Switch
                value={working.feed.banner.enabled}
                onValueChange={(enabled) => patchFeedBanner({ enabled })}
              />
            </View>
            <AdminFormField
              label="Başlık"
              value={working.feed.banner.title}
              onChangeText={(title) => patchFeedBanner({ title })}
            />
            <AdminFormField
              label="Mesaj"
              value={working.feed.banner.message}
              onChangeText={(message) => patchFeedBanner({ message })}
              multiline
            />
          </GlassCard>

          <AdminSectionHeader
            title="Tatil promosyon kartı"
            hint="Güven puanı kampanyası — akış, cüzdan, içgörüler ve lobi"
          />
          <GlassCard style={styles.form}>
            <View style={styles.switchRow}>
              <Text variant="body">Kart aktif</Text>
              <Switch
                value={working.trust_vacation_promo.enabled}
                onValueChange={(enabled) => patchTrustPromo({ enabled })}
              />
            </View>
            <AdminFormField
              label="Rozet metni"
              value={working.trust_vacation_promo.badge}
              onChangeText={(badge) => patchTrustPromo({ badge })}
              placeholder="Tatil heyecanı"
            />
            <AdminFormField
              label="Başlık"
              value={working.trust_vacation_promo.title}
              onChangeText={(title) => patchTrustPromo({ title })}
            />
            <AdminFormField
              label="Vurgu satırı"
              value={working.trust_vacation_promo.highlight}
              onChangeText={(highlight) => patchTrustPromo({ highlight })}
              placeholder="100 puan · Rize & Uzungöl"
            />
            <AdminFormField
              label="Mesaj"
              value={working.trust_vacation_promo.message}
              onChangeText={(message) => patchTrustPromo({ message })}
              multiline
            />
            <AdminFormField
              label="Buton metni"
              value={working.trust_vacation_promo.cta_label}
              onChangeText={(cta_label) => patchTrustPromo({ cta_label })}
            />
            <AdminFormField
              label="Buton yolu"
              value={working.trust_vacation_promo.cta_href}
              onChangeText={(cta_href) => patchTrustPromo({ cta_href })}
              placeholder="/settings/insights"
            />
            <View style={styles.promoImageBlock}>
              <Text variant="label">Kart görseli</Text>
              <Text secondary variant="caption">
                Galeriden seçin; kaydettiğinizde otomatik yüklenir. Boş bırakırsanız varsayılan ikonlar görünür.
              </Text>
              {promoImagePreview ? (
                <Image source={{ uri: promoImagePreview }} style={styles.promoImagePreview} resizeMode="cover" />
              ) : (
                <View style={[styles.promoImagePlaceholder, { borderColor: colors.border }]}>
                  <Ionicons name="image-outline" size={28} color={colors.textMuted} />
                  <Text secondary variant="caption">
                    Henüz görsel yok
                  </Text>
                </View>
              )}
              <View style={styles.promoImageActions}>
                <AdminActionChip
                  label={promoImageUploading ? 'Yükleniyor…' : 'Galeriden seç'}
                  icon="image-outline"
                  tone="primary"
                  compact
                  loading={promoImageUploading}
                  onPress={() => void pickPromoImage()}
                />
                {promoImagePreview ? (
                  <AdminActionChip
                    label="Görseli kaldır"
                    icon="trash-outline"
                    tone="danger"
                    compact
                    onPress={clearPromoImage}
                  />
                ) : null}
              </View>
            </View>
            <View style={styles.switchRow}>
              <Text variant="body">Kapatılabilir</Text>
              <Switch
                value={working.trust_vacation_promo.dismissible}
                onValueChange={(dismissible) => patchTrustPromo({ dismissible })}
              />
            </View>
          </GlassCard>
          <GlassCard style={styles.form}>
            <Text variant="label" style={{ marginBottom: spacing.sm }}>
              Gösterim yerleri
            </Text>
            {(
              [
                ['feed', 'Akış'],
                ['wallet', 'Cüzdan'],
                ['insights', 'İçgörüler'],
                ['lobby', 'Giriş lobisi'],
              ] as const
            ).map(([key, label]) => (
              <View key={key} style={styles.switchRow}>
                <Text variant="body">{label}</Text>
                <Switch
                  value={working.trust_vacation_promo.placements[key]}
                  onValueChange={(enabled) => patchTrustPromoPlacement(key, enabled)}
                />
              </View>
            ))}
          </GlassCard>

          <AdminSectionHeader title="Merkezler hub" />
          <GlassCard style={styles.form}>
            <AdminFormField
              label="Başlık"
              value={working.centers_hub.title}
              onChangeText={(title) => patchCentersHub({ title })}
            />
            <AdminFormField
              label="Alt başlık"
              value={working.centers_hub.subtitle}
              onChangeText={(subtitle) => patchCentersHub({ subtitle })}
            />
            <AdminFormField
              label="Vurgu rengi (opsiyonel)"
              value={working.centers_hub.accent ?? ''}
              onChangeText={(accent) => patchCentersHub({ accent })}
              placeholder={colors.primary}
            />
            <Text variant="label" style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
              Öne çıkan merkezler
            </Text>
            <CentersFeaturedPicker
              featuredIds={working.centers_hub.featured_center_ids}
              onChange={(featured_center_ids) => patchCentersHub({ featured_center_ids })}
            />
          </GlassCard>

          <AdminSectionHeader title="Marka & kabuk" hint="Native ikon/splash için build gerekir; lobi ikonu ve açılış rengi canlı" />
          <GlassCard style={styles.form}>
            <AdminFormField
              label="Lobi ikon URL"
              value={working.branding.lobby_icon_url ?? ''}
              onChangeText={(lobby_icon_url) => patchBranding({ lobby_icon_url })}
              placeholder="https://..."
            />
            <AdminFormField
              label="Açılış arka plan (koyu)"
              value={working.branding.shell_background_dark ?? ''}
              onChangeText={(shell_background_dark) => patchBranding({ shell_background_dark })}
              placeholder={themeColors.dark.background}
            />
            <AdminFormField
              label="Açılış arka plan (açık)"
              value={working.branding.shell_background_light ?? ''}
              onChangeText={(shell_background_light) => patchBranding({ shell_background_light })}
              placeholder={themeColors.light.background}
            />
          </GlassCard>

          <AdminSectionHeader title="Boşluklar (spacing)" hint="Piksel — boş = varsayılan" />
          <GlassCard style={styles.form}>
            {EDITABLE_SPACING_KEYS.map(({ key, label }) => (
              <AdminFormField
                key={key}
                label={label}
                value={working.spacing[key]?.toString() ?? ''}
                onChangeText={(v) => patchNumeric('spacing', key, v, themeColors as unknown as Record<string, number>)}
                placeholder={String(spacing[key])}
              />
            ))}
          </GlassCard>

          <AdminSectionHeader title="Köşe yuvarlaklığı (radius)" />
          <GlassCard style={styles.form}>
            {EDITABLE_RADIUS_KEYS.map(({ key, label }) => (
              <AdminFormField
                key={key}
                label={label}
                value={working.radius[key]?.toString() ?? ''}
                onChangeText={(v) => patchNumeric('radius', key, v, {})}
              />
            ))}
          </GlassCard>

          <AdminSectionHeader title="Tipografi" hint="fontSize / lineHeight" />
          <GlassCard style={styles.form}>
            {EDITABLE_TYPOGRAPHY_KEYS.map(({ key, label }) => (
              <View key={key} style={styles.typoRow}>
                <Text variant="label">{label}</Text>
                <AdminFormField
                  label="fontSize"
                  value={working.typography[key]?.fontSize?.toString() ?? ''}
                  onChangeText={(v) => patchTypography(key, 'fontSize', v)}
                />
                <AdminFormField
                  label="lineHeight"
                  value={working.typography[key]?.lineHeight?.toString() ?? ''}
                  onChangeText={(v) => patchTypography(key, 'lineHeight', v)}
                />
              </View>
            ))}
          </GlassCard>

          {(['dark', 'light'] as const).map((mode) => (
            <View key={`tab-${mode}`} style={styles.section}>
              <AdminSectionHeader title={`Tab bar — ${mode === 'dark' ? 'Koyu' : 'Açık'}`} />
              <GlassCard style={styles.form}>
                {TAB_BAR_COLOR_KEYS.map(({ key, label }) => (
                  <AdminFormField
                    key={`${mode}-${key}`}
                    label={label}
                    value={working.tab_bar[mode][key as keyof typeof working.tab_bar.dark] ?? ''}
                    onChangeText={(v) => patchTabBar(mode, key, v)}
                  />
                ))}
              </GlassCard>
            </View>
          ))}

          <ColorEditor
            mode="dark"
            overrides={working.colors.dark}
            defaults={defaultDark}
            onChange={patchColors}
          />
          <ColorEditor
            mode="light"
            overrides={working.colors.light}
            defaults={defaultLight}
            onChange={patchColors}
          />

          <AdminFormField
            label="İç not (yalnızca admin)"
            value={working.admin_note ?? ''}
            onChangeText={(admin_note) => setForm((prev) => ({ ...(prev ?? config), admin_note }))}
            multiline
          />

          <View style={styles.actions}>
            <AdminActionChip
              label="Kaydet ve canlıya al"
              icon="cloud-upload-outline"
              tone="success"
              loading={saving || promoImageUploading}
              fullWidth
              onPress={() => void handleSave()}
            />
            <AdminActionChip label="Varsayılana sıfırla" icon="refresh-outline" tone="danger" fullWidth onPress={handleReset} />
          </View>
        </>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  form: {
    gap: spacing.md,
  },
  infoBanner: {
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    gap: spacing.xs,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginTop: spacing.lg,
  },
  colorField: {
    flex: 1,
  },
  announcementCard: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toneRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  toneSelected: {
    opacity: 1,
  },
  typoRow: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
  promoImageBlock: {
    gap: spacing.sm,
  },
  promoImagePreview: {
    width: '100%',
    height: 160,
    borderRadius: radius.lg,
  },
  promoImagePlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  promoImageActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
