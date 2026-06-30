import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  createMusicCategory,
  deleteMusicTrack,
  fetchAdminMusicCategories,
  fetchAdminMusicTracks,
  pickMusicAudioFile,
  pickMusicCoverFile,
  uploadMusicAudio,
  uploadMusicCover,
  upsertMusicTrack,
  type UpsertMusicTrackInput,
} from '@/features/admin/services/musicLibraryManagement';
import {
  isMusicTrackPlayable,
  MUSIC_ACCEPTED_AUDIO_EXTENSIONS,
  MUSIC_LICENSE_STATUSES,
  MUSIC_PUBLICATION_STATUSES,
} from '@/features/music/constants';
import { formatMusicDuration } from '@/features/music/utils/formatMusicTime';
import type { MusicLicenseStatus, MusicPublicationStatus, MusicTrackAdminRow } from '@/features/music/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

const EMPTY_FORM: UpsertMusicTrackInput = {
  title: '',
  displayTitle: '',
  artist: '',
  album: '',
  licenseStatus: 'pending',
  publicationStatus: 'hidden',
  isTrending: false,
  isFeatured: false,
  isEditorPick: false,
  sortOrder: 0,
};

const PUBLISH_READY_FORM: Pick<UpsertMusicTrackInput, 'licenseStatus' | 'publicationStatus'> = {
  licenseStatus: 'licensed',
  publicationStatus: 'active',
};

function licenseLabel(status: MusicLicenseStatus) {
  return MUSIC_LICENSE_STATUSES.find((s) => s.id === status)?.label ?? status;
}

function publicationLabel(status: MusicPublicationStatus) {
  return MUSIC_PUBLICATION_STATUSES.find((s) => s.id === status)?.label ?? status;
}

function publicationTone(status: MusicPublicationStatus): 'success' | 'warning' | 'danger' {
  if (status === 'active') return 'success';
  if (status === 'blocked') return 'danger';
  return 'warning';
}

function licenseTone(status: MusicLicenseStatus): 'success' | 'warning' | 'danger' {
  if (status === 'licensed') return 'success';
  if (status === 'unlicensed') return 'danger';
  return 'warning';
}

type StepItemProps = {
  done: boolean;
  label: string;
  hint?: string;
};

function FormStepItem({ done, label, hint }: StepItemProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.stepRow}>
      <View
        style={[
          styles.stepDot,
          {
            backgroundColor: done ? `${colors.success}22` : `${colors.textMuted}18`,
            borderColor: done ? colors.success : `${colors.textMuted}55`,
          },
        ]}
      >
        <Ionicons name={done ? 'checkmark' : 'ellipse-outline'} size={14} color={done ? colors.success : colors.textMuted} />
      </View>
      <View style={styles.stepTexts}>
        <Text variant="caption" style={{ fontWeight: '600', color: done ? colors.text : colors.textSecondary }}>
          {label}
        </Text>
        {hint ? (
          <Text secondary variant="caption">
            {hint}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

type StatusBadgeProps = {
  label: string;
  tone: 'success' | 'warning' | 'danger';
};

function StatusBadge({ label, tone }: StatusBadgeProps) {
  const { colors } = useTheme();
  const color = tone === 'success' ? colors.success : tone === 'danger' ? colors.danger : colors.warning;

  return (
    <View style={[styles.statusBadge, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}>
      <Text variant="caption" style={{ color, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

export function AdminMusicLibraryScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [tracks, setTracks] = useState<MusicTrackAdminRow[]>([]);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState<UpsertMusicTrackInput>(EMPTY_FORM);
  const [newCategory, setNewCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingAudio, setPendingAudio] = useState<{ uri: string; name: string } | null>(null);
  const [pendingCover, setPendingCover] = useState<{ uri: string; name: string } | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const [trackRows, categoryRows] = await Promise.all([
      fetchAdminMusicTracks(search),
      fetchAdminMusicCategories(),
    ]);

    setTracks(trackRows);
    setCategories(categoryRows.map((c) => ({ id: c.id, label: c.label })));
    setLoading(false);
    setRefreshing(false);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const formSteps = useMemo(
    () => ({
      info: Boolean(form.title.trim() && form.displayTitle.trim()),
      audio: form.id ? isMusicTrackPlayable(form.audioUrl) || Boolean(pendingAudio) : Boolean(pendingAudio),
      publishReady: form.licenseStatus === 'licensed' && form.publicationStatus === 'active',
    }),
    [form, pendingAudio],
  );

  const canSave = formSteps.info && formSteps.audio;

  const activeCount = useMemo(() => tracks.filter((t) => t.publicationStatus === 'active').length, [tracks]);

  const handleSave = async () => {
    if (!user) return;
    if (!form.title.trim() || !form.displayTitle.trim()) {
      Alert.alert('Eksik bilgi', 'Şarkı adı ve kullanıcıya görünecek ad zorunludur.');
      return;
    }
    if (!form.id && !pendingAudio) {
      Alert.alert(
        'Ses dosyası gerekli',
        `Yeni parça için MP3 veya benzeri bir ses dosyası seçin.\n\nDesteklenen: ${MUSIC_ACCEPTED_AUDIO_EXTENSIONS.join(', ').toUpperCase()}`,
      );
      return;
    }
    if (form.licenseStatus === 'unlicensed') {
      Alert.alert('Lisans uyarısı', 'Lisanssız müzikler Vora Studio\'da kullanıcıya gösterilmez.');
    }
    if (form.publicationStatus === 'active' && form.licenseStatus !== 'licensed') {
      Alert.alert('Yayın engeli', 'Kullanıcıya göstermek için lisans durumunu "Lisanslı" yapın veya yayını "Gizli" bırakın.');
      return;
    }

    setSaving(true);
    const { id, error } = await upsertMusicTrack(user.id, form);
    if (error) {
      setSaving(false);
      Alert.alert('Hata', error);
      return;
    }

    const trackId = id ?? form.id;
    if (trackId && pendingAudio) {
      const upload = await uploadMusicAudio(user.id, trackId, pendingAudio.uri, pendingAudio.name);
      if (upload.error) {
        setSaving(false);
        Alert.alert('Ses yükleme', upload.error);
        return;
      }
    }

    if (trackId && pendingCover) {
      const cover = await uploadMusicCover(trackId, pendingCover.uri, pendingCover.name);
      if (cover.error) {
        setSaving(false);
        Alert.alert('Kapak yükleme', cover.error);
        return;
      }
    }

    setSaving(false);
    Alert.alert('Kaydedildi', form.id ? 'Müzik güncellendi.' : 'Müzik kütüphaneye eklendi ve kullanıma hazır.');
    setForm(EMPTY_FORM);
    setPendingAudio(null);
    setPendingCover(null);
    await load(true);
  };

  const handlePickPendingAudio = async () => {
    const pick = await pickMusicAudioFile();
    if (pick.canceled || !pick.assets?.[0]) return;
    const asset = pick.assets[0];
    setPendingAudio({ uri: asset.uri, name: asset.name ?? 'track.mp3' });
  };

  const handlePickPendingCover = async () => {
    const pick = await pickMusicCoverFile();
    if (pick.canceled || !pick.assets?.[0]) return;
    const asset = pick.assets[0];
    setPendingCover({ uri: asset.uri, name: asset.name ?? 'cover.jpg' });
  };

  const handleEdit = (track: MusicTrackAdminRow) => {
    setForm({
      id: track.id,
      title: track.title,
      displayTitle: track.displayTitle,
      artist: track.artist,
      album: track.album,
      categoryId: track.categoryId,
      licenseStatus: track.licenseStatus,
      licenseInfo: track.licenseInfo,
      publicationStatus: track.publicationStatus,
      isTrending: track.isTrending,
      isFeatured: track.isFeatured,
      isEditorPick: track.isEditorPick,
      sortOrder: track.sortOrder,
      audioUrl: track.audioUrl,
      coverUrl: track.coverUrl,
    });
    setPendingAudio(null);
    setPendingCover(null);
  };

  const handleUploadAudio = async (trackId: string) => {
    if (!user) return;
    const pick = await pickMusicAudioFile();
    if (pick.canceled || !pick.assets?.[0]) return;
    const asset = pick.assets[0];
    const { error } = await uploadMusicAudio(user.id, trackId, asset.uri, asset.name);
    if (error) Alert.alert('Hata', error);
    else await load(true);
  };

  const handleUploadCover = async (trackId: string) => {
    const pick = await pickMusicCoverFile();
    if (pick.canceled || !pick.assets?.[0]) return;
    const asset = pick.assets[0];
    const { error } = await uploadMusicCover(trackId, asset.uri, asset.name);
    if (error) Alert.alert('Hata', error);
    else await load(true);
  };

  const handleDelete = (track: MusicTrackAdminRow) => {
    Alert.alert('Müziği sil', `"${track.displayTitle}" kalıcı olarak silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteMusicTrack(track.id);
          if (error) Alert.alert('Hata', error);
          else await load(true);
        },
      },
    ]);
  };

  const handleCreateCategory = async () => {
    if (!newCategory.trim()) return;
    const slug = newCategory.trim().toLowerCase().replace(/\s+/g, '-');
    const { error } = await createMusicCategory(newCategory.trim(), slug);
    if (error) Alert.alert('Hata', error);
    else {
      setNewCategory('');
      setShowCategoryForm(false);
      await load(true);
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setPendingAudio(null);
    setPendingCover(null);
  };

  const applyPublishReady = () => {
    setForm((f) => ({ ...f, ...PUBLISH_READY_FORM }));
  };

  return (
    <AdminShell
      title="Müzik Kütüphanesi"
      subtitle={`${tracks.length} parça · ${activeCount} yayında · Vora Studio`}
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <GlassCard style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle" size={18} color={colors.primary} />
          <Text variant="label" style={{ color: colors.primary }}>
            Nasıl eklenir?
          </Text>
        </View>
        <Text secondary variant="caption">
          1. Parça bilgilerini doldurun · 2. Ses dosyasını seçin · 3. Lisanslı + Aktif yapın · 4. Kaydedin
        </Text>
        <Text secondary variant="caption">
          Kullanıcılar telefona müzik indirmez; ses dosyasını buradan yüklemeniz yeterli. MP3 önerilir.
        </Text>
      </GlassCard>

      <GlassCard style={styles.formCard}>
        <View style={styles.formTitleRow}>
          <View>
            <Text variant="label">{form.id ? 'Parçayı düzenle' : 'Yeni parça ekle'}</Text>
            <Text secondary variant="caption">
              {form.id ? 'Mevcut kayıt güncellenir' : 'Kayıttan sonra Vora Studio müzik listesinde görünür'}
            </Text>
          </View>
          {form.id ? (
            <AdminActionChip label="Yeni parça" icon="add" compact onPress={resetForm} />
          ) : null}
        </View>

        <View style={[styles.checklist, { borderColor: `${colors.primary}33`, backgroundColor: `${colors.primary}08` }]}>
          <FormStepItem done={formSteps.info} label="Parça bilgileri" hint="Şarkı adı ve görünecek ad" />
          <FormStepItem
            done={formSteps.audio}
            label="Ses dosyası"
            hint={form.id && isMusicTrackPlayable(form.audioUrl) ? 'Mevcut ses yüklü' : pendingAudio ? pendingAudio.name : 'MP3 / M4A seçin'}
          />
          <FormStepItem
            done={formSteps.publishReady}
            label="Yayına hazır"
            hint="Lisanslı + Aktif (kullanıcıya görünür)"
          />
        </View>

        <AdminSectionHeader title="1 · Parça bilgileri" hint="Studio ve aramada görünen metinler" />

        <AdminFormField
          label="Şarkı adı (iç kullanım)"
          value={form.title}
          onChangeText={(title) => setForm((f) => ({ ...f, title }))}
          placeholder="Örn: summer_vibes_01"
        />
        <AdminFormField
          label="Kullanıcıya görünecek ad"
          value={form.displayTitle}
          onChangeText={(displayTitle) => setForm((f) => ({ ...f, displayTitle }))}
          placeholder="Örn: Yaz Esintisi"
        />
        <AdminFormField
          label="Sanatçı"
          value={form.artist}
          onChangeText={(artist) => setForm((f) => ({ ...f, artist }))}
          placeholder="Örn: Karadeniz Beats"
        />
        <AdminFormField
          label="Albüm (opsiyonel)"
          value={form.album ?? ''}
          onChangeText={(album) => setForm((f) => ({ ...f, album }))}
          placeholder="Boş bırakılabilir"
        />
        <AdminFormField
          label="Lisans notu (opsiyonel)"
          value={form.licenseInfo ?? ''}
          onChangeText={(licenseInfo) => setForm((f) => ({ ...f, licenseInfo }))}
          placeholder="Örn: Pixabay lisansı #12345"
        />

        <AdminSectionHeader title="2 · Dosyalar" hint={`${MUSIC_ACCEPTED_AUDIO_EXTENSIONS.join(', ').toUpperCase()}`} />

        <View style={styles.uploadRow}>
          <AdminActionChip
            label={pendingAudio ? pendingAudio.name : form.id && isMusicTrackPlayable(form.audioUrl) ? 'Ses yüklü · değiştir' : 'Ses dosyası seç *'}
            icon="musical-notes-outline"
            tone={pendingAudio || (form.id && isMusicTrackPlayable(form.audioUrl)) ? 'success' : 'primary'}
            onPress={handlePickPendingAudio}
            style={styles.uploadChip}
          />
          <AdminActionChip
            label={pendingCover ? pendingCover.name : 'Kapak (opsiyonel)'}
            icon="image-outline"
            tone={pendingCover ? 'success' : 'default'}
            onPress={handlePickPendingCover}
            style={styles.uploadChip}
          />
        </View>

        <AdminSectionHeader title="3 · Yayın ayarları" hint="Kullanıcıya görünürlük ve lisans" />

        <View style={styles.presetRow}>
          <AdminActionChip
            label="Yayına hazır ayarla"
            icon="rocket-outline"
            tone={formSteps.publishReady ? 'success' : 'primary'}
            onPress={applyPublishReady}
          />
          <Text secondary variant="caption" style={styles.presetHint}>
            Lisanslı + Aktif
          </Text>
        </View>

        <Text variant="caption" secondary>
          Lisans durumu
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {MUSIC_LICENSE_STATUSES.map((s) => (
            <AdminActionChip
              key={s.id}
              label={s.label}
              tone={form.licenseStatus === s.id ? (s.id === 'licensed' ? 'success' : s.id === 'unlicensed' ? 'danger' : 'warning') : 'default'}
              onPress={() => setForm((f) => ({ ...f, licenseStatus: s.id }))}
            />
          ))}
        </ScrollView>

        <Text variant="caption" secondary>
          Yayın durumu
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {MUSIC_PUBLICATION_STATUSES.map((s) => (
            <AdminActionChip
              key={s.id}
              label={s.label}
              tone={form.publicationStatus === s.id ? publicationTone(s.id) : 'default'}
              onPress={() => setForm((f) => ({ ...f, publicationStatus: s.id }))}
            />
          ))}
        </ScrollView>

        {categories.length > 0 ? (
          <>
            <Text variant="caption" secondary>
              Kategori
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {categories.map((c) => (
                <AdminActionChip
                  key={c.id}
                  label={c.label}
                  tone={form.categoryId === c.id ? 'primary' : 'default'}
                  onPress={() => setForm((f) => ({ ...f, categoryId: f.categoryId === c.id ? null : c.id }))}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        <AdminSectionHeader title="4 · Vitrin (opsiyonel)" hint="Trend ve öne çıkarma" />

        <View style={styles.flagRow}>
          <AdminActionChip label="Trend" icon="flame" tone={form.isTrending ? 'warning' : 'default'} onPress={() => setForm((f) => ({ ...f, isTrending: !f.isTrending }))} />
          <AdminActionChip label="Öne çıkan" icon="star" tone={form.isFeatured ? 'primary' : 'default'} onPress={() => setForm((f) => ({ ...f, isFeatured: !f.isFeatured }))} />
          <AdminActionChip label="Editör seçimi" icon="sparkles" tone={form.isEditorPick ? 'success' : 'default'} onPress={() => setForm((f) => ({ ...f, isEditorPick: !f.isEditorPick }))} />
        </View>

        <View style={styles.formActions}>
          <Button
            title={saving ? 'Kaydediliyor…' : form.id ? 'Değişiklikleri kaydet' : 'Kütüphaneye ekle'}
            onPress={handleSave}
            disabled={saving || !canSave}
          />
          {form.id ? <Button title="İptal" variant="secondary" onPress={resetForm} /> : null}
        </View>

        {!canSave ? (
          <Text secondary variant="caption" style={{ color: colors.warning }}>
            Kaydetmek için parça bilgilerini ve ses dosyasını tamamlayın.
          </Text>
        ) : null}
      </GlassCard>

      <GlassCard style={styles.formCard}>
        <View style={styles.formTitleRow}>
          <AdminSectionHeader title="Kategoriler" hint="Müzik listelerinde filtre" />
          <AdminActionChip
            label={showCategoryForm ? 'Gizle' : 'Yeni kategori'}
            icon={showCategoryForm ? 'chevron-up' : 'add'}
            compact
            onPress={() => setShowCategoryForm((v) => !v)}
          />
        </View>

        {showCategoryForm ? (
          <>
            <AdminFormField label="Kategori adı" value={newCategory} onChangeText={setNewCategory} placeholder="Örn: Pop, Lo-fi" />
            <Button title="Kategori oluştur" variant="secondary" onPress={handleCreateCategory} />
          </>
        ) : (
          <Text secondary variant="caption">
            {categories.length > 0 ? `${categories.length} kategori tanımlı` : 'Henüz kategori yok — eklemek için "Yeni kategori"ye dokunun'}
          </Text>
        )}
      </GlassCard>

      <AdminSectionHeader title="Kütüphane" hint="Mevcut parçalar" />
      <AdminSearchInput value={search} onChangeText={setSearch} placeholder="Parça veya sanatçı ara…" />

      {loading ? (
        <AdminEmptyState loading />
      ) : tracks.length === 0 ? (
        <AdminEmptyState title="Henüz müzik yok" message="Yukarıdaki formdan ilk parçayı ekleyin." icon="musical-notes-outline" />
      ) : (
        tracks.map((track) => {
          const playable = isMusicTrackPlayable(track.audioUrl);
          return (
            <GlassCard key={track.id} style={styles.trackRow}>
              <View style={styles.trackHeader}>
                <View style={styles.trackTitleBlock}>
                  <Text variant="label">{track.displayTitle}</Text>
                  <Text secondary variant="caption">
                    {track.artist || 'Sanatçı belirtilmedi'}
                    {track.categoryLabel ? ` · ${track.categoryLabel}` : ''}
                  </Text>
                </View>
                <View style={styles.badgeRow}>
                  <StatusBadge label={publicationLabel(track.publicationStatus)} tone={publicationTone(track.publicationStatus)} />
                  <StatusBadge label={licenseLabel(track.licenseStatus)} tone={licenseTone(track.licenseStatus)} />
                </View>
              </View>

              <View style={styles.metaRow}>
                <Ionicons name={playable ? 'checkmark-circle' : 'alert-circle'} size={14} color={playable ? colors.success : colors.warning} />
                <Text secondary variant="caption">
                  {playable ? formatMusicDuration(track.durationSec) : 'Ses yüklenmedi'}
                  {' · '}
                  {track.usageCount} kullanım · {track.viewCount} görüntülenme
                </Text>
              </View>

              {(track.isTrending || track.isFeatured || track.isEditorPick) && (
                <View style={styles.flagRow}>
                  {track.isTrending ? <Text variant="caption">🔥 Trend</Text> : null}
                  {track.isFeatured ? <Text variant="caption">⭐ Öne çıkan</Text> : null}
                  {track.isEditorPick ? <Text variant="caption">✨ Editör</Text> : null}
                </View>
              )}

              <View style={styles.trackActions}>
                <AdminActionChip label="Düzenle" icon="create-outline" onPress={() => handleEdit(track)} />
                <AdminActionChip label="Ses" icon="cloud-upload-outline" onPress={() => handleUploadAudio(track.id)} />
                <AdminActionChip label="Kapak" icon="image-outline" onPress={() => handleUploadCover(track.id)} />
                <AdminActionChip
                  label={track.publicationStatus === 'active' ? 'Gizle' : 'Yayınla'}
                  icon={track.publicationStatus === 'active' ? 'eye-off-outline' : 'eye-outline'}
                  tone="warning"
                  onPress={() =>
                    upsertMusicTrack(user!.id, {
                      ...track,
                      id: track.id,
                      title: track.title,
                      displayTitle: track.displayTitle,
                      artist: track.artist,
                      album: track.album,
                      categoryId: track.categoryId,
                      licenseStatus: track.licenseStatus,
                      licenseInfo: track.licenseInfo,
                      publicationStatus: track.publicationStatus === 'active' ? 'hidden' : 'active',
                      audioUrl: track.audioUrl,
                    }).then(() => load(true))
                  }
                />
                <AdminActionChip label="Sil" icon="trash-outline" tone="danger" onPress={() => handleDelete(track)} />
              </View>
            </GlassCard>
          );
        })
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  infoCard: { gap: spacing.sm },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  formCard: { gap: spacing.sm, marginBottom: spacing.md },
  formTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  checklist: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTexts: { flex: 1, gap: 2 },
  uploadRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  uploadChip: { flexGrow: 1, minWidth: '45%' },
  presetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  presetHint: { flex: 1 },
  chips: { gap: spacing.xs, paddingVertical: spacing.xs },
  flagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  trackRow: { gap: spacing.sm, marginBottom: spacing.sm },
  trackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  trackTitleBlock: { flex: 1, gap: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'flex-end' },
  statusBadge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  trackActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
