import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Switch, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { adminGoBack } from '@/features/admin/services/adminNavigation';
import {
  EMPTY_GUIDE_SECTION,
  PLATFORM_GUIDE_CATEGORY_META,
  PLATFORM_GUIDE_ICON_OPTIONS,
} from '@/features/platform-guide/constants';
import {
  uploadPlatformGuideImage,
  uploadPlatformGuideVideo,
} from '@/features/platform-guide/services/mediaUpload';
import {
  fetchAdminPlatformGuides,
  previewPlatformGuideRecipients,
  publishPlatformGuide,
  savePlatformGuide,
} from '@/features/platform-guide/services/platformGuideAdmin';
import type { PlatformGuideCategory, PlatformGuideDraft } from '@/features/platform-guide/types';
import { flushNotificationOutbox } from '@/lib/notifications/flushOutbox';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[ğ]/g, 'g')
    .replace(/[ü]/g, 'u')
    .replace(/[ş]/g, 's')
    .replace(/[ı]/g, 'i')
    .replace(/[ö]/g, 'o')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

const EMPTY_DRAFT: PlatformGuideDraft = {
  id: null,
  slug: '',
  title: '',
  summary: '',
  icon: 'book-outline',
  category: 'general',
  sections: [{ ...EMPTY_GUIDE_SECTION }],
  imageUrl: null,
  videoUrl: null,
  footerNote: '',
  sortOrder: 100,
  isPublished: false,
};

export function AdminPlatformGuideEditorScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isNew = id === 'new';

  const [draft, setDraft] = useState<PlatformGuideDraft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [notifyOnPublish, setNotifyOnPublish] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [localVideoUri, setLocalVideoUri] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const loadExisting = useCallback(async () => {
    if (isNew || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await fetchAdminPlatformGuides();
    const found = data.find((row) => row.id === id);
    if (!found) {
      Alert.alert('Bulunamadı', 'Rehber kaydı bulunamadı.');
      adminGoBack();
      return;
    }
    setDraft({
      id: found.id,
      slug: found.slug,
      title: found.title,
      summary: found.summary,
      icon: found.icon,
      category: found.category,
      sections: found.sections.length > 0 ? found.sections : [{ ...EMPTY_GUIDE_SECTION }],
      imageUrl: found.imageUrl,
      videoUrl: found.videoUrl,
      footerNote: found.footerNote ?? '',
      sortOrder: found.sortOrder,
      isPublished: found.isPublished,
    });
    setSlugTouched(true);
    setLoading(false);
  }, [id, isNew]);

  useEffect(() => {
    void loadExisting();
  }, [loadExisting]);

  useEffect(() => {
    void previewPlatformGuideRecipients().then(({ count }) => setRecipientCount(count));
  }, []);

  const patchDraft = (patch: Partial<PlatformGuideDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const handleTitleChange = (title: string) => {
    if (!slugTouched && isNew) {
      patchDraft({ title, slug: slugifyTitle(title) });
      return;
    }
    patchDraft({ title });
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setLocalImageUri(result.assets[0].uri);
      patchDraft({ imageUrl: result.assets[0].uri });
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setLocalVideoUri(result.assets[0].uri);
      patchDraft({ videoUrl: result.assets[0].uri });
    }
  };

  const validate = (): string | null => {
    if (!draft.title.trim()) return 'Başlık gerekli.';
    if (!draft.slug.trim()) return 'Kısa bağlantı (slug) gerekli.';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) {
      return 'Slug yalnızca küçük harf, rakam ve tire içerebilir.';
    }
    const hasContent = draft.sections.some((s) => s.heading.trim() || s.body.trim());
    if (!hasContent && !draft.imageUrl && !draft.videoUrl) {
      return 'En az bir bölüm veya medya ekleyin.';
    }
    return null;
  };

  const handleSave = async (publish: boolean) => {
    const validationError = validate();
    if (validationError) {
      Alert.alert('Eksik bilgi', validationError);
      return;
    }

    setSaving(true);

    let workingDraft: PlatformGuideDraft = {
      ...draft,
      isPublished: publish ? true : draft.isPublished,
    };

    const { id: savedId, error: saveError } = await savePlatformGuide(workingDraft);
    if (saveError || !savedId) {
      setSaving(false);
      Alert.alert('Kayıt hatası', saveError ?? 'Kaydedilemedi.');
      return;
    }

    let imageUrl = workingDraft.imageUrl;
    let videoUrl = workingDraft.videoUrl;

    if (localImageUri && !localImageUri.startsWith('http')) {
      const { url, error } = await uploadPlatformGuideImage(savedId, localImageUri);
      if (error) {
        setSaving(false);
        Alert.alert('Görsel yüklenemedi', error);
        return;
      }
      imageUrl = url;
    }

    if (localVideoUri && !localVideoUri.startsWith('http')) {
      const { url, error } = await uploadPlatformGuideVideo(savedId, localVideoUri);
      if (error) {
        setSaving(false);
        Alert.alert('Video yüklenemedi', error);
        return;
      }
      videoUrl = url;
    }

    if (imageUrl !== workingDraft.imageUrl || videoUrl !== workingDraft.videoUrl) {
      workingDraft = { ...workingDraft, id: savedId, imageUrl, videoUrl };
      const { error: mediaSaveError } = await savePlatformGuide(workingDraft);
      if (mediaSaveError) {
        setSaving(false);
        Alert.alert('Medya kaydı', mediaSaveError);
        return;
      }
    }

    let notified = 0;
    if (publish && notifyOnPublish) {
      const { recipientCount: count, error: publishError } = await publishPlatformGuide(
        savedId,
        true,
      );
      if (publishError) {
        setSaving(false);
        Alert.alert('Bildirim hatası', publishError);
        return;
      }
      notified = count;
      await flushNotificationOutbox();
    } else if (publish) {
      const { error: publishError } = await publishPlatformGuide(savedId, false);
      if (publishError) {
        setSaving(false);
        Alert.alert('Yayın hatası', publishError);
        return;
      }
    }

    setSaving(false);
    Alert.alert(
      publish ? 'Yayınlandı' : 'Kaydedildi',
      publish && notifyOnPublish
        ? `Rehber yayında. ~${notified.toLocaleString('tr-TR')} kişiye bildirim gönderildi.`
        : publish
          ? 'Rehber yayınlandı (bildirim gönderilmedi).'
          : 'Taslak kaydedildi.',
      [{ text: 'Tamam', onPress: () => router.replace('/admin/platform-guide') }],
    );
  };

  const confirmPublish = () => {
    const body = notifyOnPublish
      ? `Özet metin bildirim önizlemesi olarak gidecek.${
          recipientCount != null ? ` Tahmini alıcı: ~${recipientCount.toLocaleString('tr-TR')}.` : ''
        }`
      : 'Bildirim gönderilmeyecek; yalnızca yayınlanacak.';

    Alert.alert('Yayınla', body, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Yayınla', onPress: () => void handleSave(true) },
    ]);
  };

  if (loading) {
    return (
      <AdminShell title="Rehber düzenle" requireAdmin>
        <AdminEmptyState loading />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={isNew ? 'Yeni rehber' : 'Rehberi düzenle'}
      subtitle="Rahat yazım alanı · isteğe bağlı görsel/video"
      requireAdmin
    >
      <GlassCard style={styles.section}>
        <AdminSectionHeader title="Temel bilgiler" />
        <AdminFormField label="Başlık" value={draft.title} onChangeText={handleTitleChange} />
        <AdminFormField
          label="Kısa bağlantı (slug)"
          value={draft.slug}
          onChangeText={(slug) => {
            setSlugTouched(true);
            patchDraft({ slug: slug.toLowerCase() });
          }}
          placeholder="ornek-rehber"
        />
        <AdminFormField
          label="Özet (bildirim önizlemesi)"
          value={draft.summary}
          onChangeText={(summary) => patchDraft({ summary })}
          multiline
          placeholder="Kullanıcıya gösterilecek kısa tanıtım ve push metni"
        />
        <AdminFormField
          label="Sıra"
          value={String(draft.sortOrder)}
          onChangeText={(value) => patchDraft({ sortOrder: Number(value) || 0 })}
        />

        <Text secondary variant="caption">
          Kategori
        </Text>
        <View style={styles.chipRow}>
          {(Object.keys(PLATFORM_GUIDE_CATEGORY_META) as PlatformGuideCategory[]).map((category) => (
            <AdminActionChip
              key={category}
              label={PLATFORM_GUIDE_CATEGORY_META[category].label}
              compact
              tone={draft.category === category ? 'primary' : 'default'}
              onPress={() => patchDraft({ category })}
            />
          ))}
        </View>

        <Text secondary variant="caption">
          İkon
        </Text>
        <View style={styles.chipRow}>
          {PLATFORM_GUIDE_ICON_OPTIONS.map((icon) => (
            <Pressable
              key={icon}
              onPress={() => patchDraft({ icon })}
              style={[
                styles.iconChip,
                {
                  borderColor: draft.icon === icon ? colors.primary : colors.border,
                  backgroundColor: draft.icon === icon ? `${colors.primary}18` : 'transparent',
                },
              ]}
            >
              <Ionicons name={icon} size={18} color={draft.icon === icon ? colors.primary : colors.textMuted} />
            </Pressable>
          ))}
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <AdminSectionHeader title="İçerik bölümleri" hint="Başlık + açıklama ekleyin" />
        {draft.sections.map((section, index) => (
          <GlassCard key={`section-${index}`} style={styles.sectionCard}>
            <AdminFormField
              label={`Bölüm ${index + 1} başlığı`}
              value={section.heading}
              onChangeText={(heading) => {
                const sections = [...draft.sections];
                sections[index] = { ...sections[index], heading };
                patchDraft({ sections });
              }}
            />
            <AdminFormField
              label="Metin"
              value={section.body}
              onChangeText={(body) => {
                const sections = [...draft.sections];
                sections[index] = { ...sections[index], body };
                patchDraft({ sections });
              }}
              multiline
            />
            {draft.sections.length > 1 ? (
              <AdminActionChip
                label="Bölümü kaldır"
                icon="trash-outline"
                tone="danger"
                compact
                onPress={() => patchDraft({ sections: draft.sections.filter((_, i) => i !== index) })}
              />
            ) : null}
          </GlassCard>
        ))}
        <AdminActionChip
          label="Bölüm ekle"
          icon="add-outline"
          compact
          onPress={() => patchDraft({ sections: [...draft.sections, { ...EMPTY_GUIDE_SECTION }] })}
        />
      </GlassCard>

      <GlassCard style={styles.section}>
        <AdminSectionHeader title="Medya (isteğe bağlı)" />
        <View style={styles.mediaActions}>
          <AdminActionChip label="Görsel seç" icon="image-outline" compact onPress={() => void pickImage()} />
          <AdminActionChip label="Video seç" icon="videocam-outline" compact onPress={() => void pickVideo()} />
          {draft.imageUrl ? (
            <AdminActionChip
              label="Görseli kaldır"
              icon="close-outline"
              tone="danger"
              compact
              onPress={() => {
                setLocalImageUri(null);
                patchDraft({ imageUrl: null });
              }}
            />
          ) : null}
          {draft.videoUrl ? (
            <AdminActionChip
              label="Videoyu kaldır"
              icon="close-outline"
              tone="danger"
              compact
              onPress={() => {
                setLocalVideoUri(null);
                patchDraft({ videoUrl: null });
              }}
            />
          ) : null}
        </View>
        {draft.imageUrl ? (
          <Image source={{ uri: draft.imageUrl }} style={styles.previewImage} resizeMode="cover" />
        ) : null}
      </GlassCard>

      <GlassCard style={styles.section}>
        <AdminSectionHeader title="Alt not (isteğe bağlı)" />
        <AdminFormField
          label="Sayfa sonu notu"
          value={draft.footerNote}
          onChangeText={(footerNote) => patchDraft({ footerNote })}
          multiline
          placeholder="Önemli uyarı veya ek bilgi"
        />
      </GlassCard>

      <GlassCard style={styles.section}>
        <AdminSectionHeader title="Yayın" />
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text variant="body">Yayınlarken bildirim gönder</Text>
            <Text secondary variant="caption">
              Özet metin akıllı ön bilgilendirme olarak kullanılır
            </Text>
          </View>
          <Switch value={notifyOnPublish} onValueChange={setNotifyOnPublish} />
        </View>
        {notifyOnPublish && recipientCount != null ? (
          <Text secondary variant="caption">
            Tahmini alıcı: ~{recipientCount.toLocaleString('tr-TR')} (sistem bildirimleri açık olanlar)
          </Text>
        ) : null}
        <View style={styles.formActions}>
          <Button
            title={saving ? 'Kaydediliyor…' : 'Taslak kaydet'}
            variant="secondary"
            onPress={() => void handleSave(false)}
            disabled={saving}
          />
          <Button
            title={saving ? 'Yayınlanıyor…' : 'Yayınla'}
            onPress={confirmPublish}
            disabled={saving}
          />
        </View>
      </GlassCard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  sectionCard: { gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  previewImage: { width: '100%', height: 160, borderRadius: radius.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchCopy: { flex: 1, gap: spacing.xs },
  formActions: { gap: spacing.sm },
});
