import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { REGIONS } from '@/constants/regions';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { IstanbulScheduleFields } from '@/features/admin/components/shared/IstanbulScheduleFields';
import {
  defaultIstanbulSchedule,
  formatIstanbulSchedule,
  isoToIstanbulParts,
  istanbulPartsToIso,
  isFutureIstanbulSchedule,
  type IstanbulScheduleParts,
} from '@/features/admin/utils/istanbulSchedule';
import { PushPhonePreview } from '@/features/push-automation/components/PushPhonePreview';
import {
  DEFAULT_PUSH_TEMPLATE,
  PUSH_AUTOMATION_TRIGGER_OPTIONS,
  PUSH_DEEP_LINK_NONE,
  PUSH_DEEP_LINK_PRESETS,
  PUSH_PREF_KEY_OPTIONS,
  PUSH_TEMPLATE_BODY_VARIABLES,
  QUICK_PUSH_DEFAULTS,
} from '@/features/push-automation/constants';
import {
  previewPushAutomationTemplate,
  removePushTemplateImage,
  testPushAutomationTemplate,
  uploadPushTemplateImage,
  upsertPushAutomationTemplate,
} from '@/features/push-automation/services/pushAutomationAdmin';
import type {
  PushAutomationTemplate,
  PushAutomationTemplateInput,
  PushAutomationTriggerType,
} from '@/features/push-automation/types';
import {
  ensureUniquePushTemplateSlug,
  isPushTemplateSlugTaken,
  isValidPushTemplateSlug,
  slugifyPushTemplate,
} from '@/features/push-automation/utils/slug';
import { radius, spacing } from '@/constants/theme';

const REGION_OPTIONS = [{ id: 'all', label: 'Tüm şehirler' }, ...REGIONS.map((r) => ({ id: r.id, label: r.name }))];
const ADVANCED_TRIGGERS = PUSH_AUTOMATION_TRIGGER_OPTIONS.filter((o) => o.id !== 'scheduled');

type Props = {
  template: PushAutomationTemplate | null;
  templates: PushAutomationTemplate[];
  onClose: () => void;
  onSaved: () => void;
};

function formFromTemplate(t: PushAutomationTemplate): PushAutomationTemplateInput {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    enabled: t.enabled,
    triggerType: t.triggerType,
    eventType: t.eventType,
    title: t.title,
    body: t.body,
    imageUrl: t.imageUrl,
    deepLink: t.deepLink ?? PUSH_DEEP_LINK_NONE,
    regionIds: t.regionIds,
    minPostsInWindow: t.minPostsInWindow,
    activityWindowMinutes: t.activityWindowMinutes,
    userCooldownHours: t.userCooldownHours,
    regionCooldownMinutes: t.regionCooldownMinutes,
    intervalHours: t.intervalHours,
    intervalDays: t.intervalDays,
    nextRunAt: t.nextRunAt,
    sortOrder: t.sortOrder,
    prefKey: t.prefKey,
  };
}

function emptyForm(): PushAutomationTemplateInput {
  return { name: '', slug: '', title: '', body: '', ...QUICK_PUSH_DEFAULTS };
}

export function PushCampaignEditor({ template, templates, onClose, onSaved }: Props) {
  const [form, setForm] = useState<PushAutomationTemplateInput>(
    template ? formFromTemplate(template) : emptyForm(),
  );
  const [regionScope, setRegionScope] = useState(
    !template?.regionIds?.length ? 'all' : template.regionIds.length === 1 ? template.regionIds[0] : 'all',
  );
  const [sendWhen, setSendWhen] = useState<'now' | 'scheduled'>(
    template?.triggerType === 'scheduled' ? 'scheduled' : 'now',
  );
  const [scheduleParts, setScheduleParts] = useState<IstanbulScheduleParts>(
    template?.nextRunAt ? isoToIstanbulParts(template.nextRunAt) : defaultIstanbulSchedule(),
  );
  const [showRedirect, setShowRedirect] = useState(!!template?.deepLink);
  const [showAdvanced, setShowAdvanced] = useState(
    template?.triggerType === 'feed_activity' || template?.triggerType === 'interval',
  );
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const patch = (p: Partial<PushAutomationTemplateInput>) => setForm((prev) => ({ ...prev, ...p }));

  useEffect(() => {
    if (!form.id) {
      setPreviewCount(null);
      return;
    }
    void previewPushAutomationTemplate(form.id, regionScope === 'all' ? undefined : regionScope).then((r) =>
      setPreviewCount(r.count),
    );
  }, [form.id, regionScope]);

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      Alert.alert('Eksik bilgi', 'Başlık ve mesaj zorunludur.');
      return;
    }

    const name = form.name.trim() || form.title.trim().slice(0, 48);
    const baseSlug = form.slug.trim() || slugifyPushTemplate(name);
    if (baseSlug.length < 3 || !isValidPushTemplateSlug(baseSlug)) {
      Alert.alert('Kayıt hatası', 'Geçersiz kampanya kimliği.');
      return;
    }
    if (form.id && isPushTemplateSlugTaken(baseSlug, templates, form.id)) {
      Alert.alert('Kayıt hatası', 'Bu kimlik başka kampanyada kullanılıyor.');
      return;
    }

    if (sendWhen === 'scheduled' && !isFutureIstanbulSchedule(scheduleParts)) {
      Alert.alert('Geçersiz zaman', 'Gönderim zamanı gelecekte olmalıdır.');
      return;
    }

    if (showAdvanced && form.triggerType === 'interval' && !form.intervalHours && !form.intervalDays) {
      Alert.alert('Zamanlama', 'Periyodik kampanya için aralık girin.');
      return;
    }

    setSaving(true);
    const slug = form.id ? baseSlug : ensureUniquePushTemplateSlug(baseSlug, templates);
    const resolvedTrigger: PushAutomationTriggerType = showAdvanced
      ? form.triggerType
      : sendWhen === 'scheduled'
        ? 'scheduled'
        : 'manual';

    const payload: PushAutomationTemplateInput = {
      ...form,
      name,
      slug,
      enabled: sendWhen === 'scheduled' || sendWhen === 'now' ? true : form.enabled,
      triggerType: resolvedTrigger,
      eventType: showAdvanced ? form.eventType : 'system',
      prefKey: showAdvanced ? form.prefKey : 'system',
      deepLink: showRedirect ? (form.deepLink || PUSH_DEEP_LINK_NONE) : PUSH_DEEP_LINK_NONE,
      regionIds: regionScope === 'all' ? null : [regionScope],
      nextRunAt:
        sendWhen === 'scheduled' && !showAdvanced ? istanbulPartsToIso(scheduleParts) : form.nextRunAt ?? null,
    };

    const { id, error } = await upsertPushAutomationTemplate(payload);
    setSaving(false);
    if (error) {
      Alert.alert('Kayıt hatası', error);
      return;
    }

    if (!form.id && id && form.imageUrl?.startsWith('file://')) {
      const up = await uploadPushTemplateImage(id, form.imageUrl);
      if (up.url) await upsertPushAutomationTemplate({ ...payload, id, imageUrl: up.url });
    }

    Alert.alert(
      'Kaydedildi',
      sendWhen === 'scheduled' && !showAdvanced
        ? `${formatIstanbulSchedule(scheduleParts)} tarihinde gidecek.`
        : 'Kampanya güncellendi.',
    );
    onSaved();
    onClose();
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    if (form.id) {
      setUploadingImage(true);
      const { url, error } = await uploadPushTemplateImage(form.id, uri);
      setUploadingImage(false);
      if (error) Alert.alert('Yükleme hatası', error);
      else if (url) {
        patch({ imageUrl: url });
        await upsertPushAutomationTemplate({ ...form, imageUrl: url });
      }
    } else {
      patch({ imageUrl: uri });
    }
  };

  return (
    <AdminShell
      title={form.id ? 'Kampanyayı düzenle' : 'Yeni kampanya'}
      subtitle="Kayıtlı push şablonu"
      requireAdmin
      onBack={onClose}
    >
      <PushPhonePreview title={form.title} body={form.body} imageUrl={form.imageUrl} />

      <GlassCard style={styles.card}>
        <AdminSectionHeader title="Mesaj" />
        <AdminFormField label="Başlık" value={form.title} onChangeText={(title) => patch({ title })} />
        <AdminFormField label="Mesaj" value={form.body} onChangeText={(body) => patch({ body })} multiline />
        <View style={styles.chipRow}>
          {PUSH_TEMPLATE_BODY_VARIABLES.map((v) => (
            <AdminActionChip
              key={v.key}
              label={v.key}
              onPress={() => patch({ body: `${form.body}${form.body ? ' ' : ''}${v.key}` })}
              compact
            />
          ))}
        </View>
      </GlassCard>

      {!showAdvanced ? (
        <GlassCard style={styles.card}>
          <AdminSectionHeader title="Zamanlama" />
          <IstanbulScheduleFields
            sendWhen={sendWhen}
            schedule={scheduleParts}
            onSendWhenChange={setSendWhen}
            onScheduleChange={setScheduleParts}
          />
        </GlassCard>
      ) : null}

      <GlassCard style={styles.card}>
        <AdminSectionHeader title="Hedef" />
        <AdminFilterChip options={REGION_OPTIONS} value={regionScope} onChange={setRegionScope} />
        {form.id && previewCount != null ? (
          <Text secondary variant="caption">
            Tahmini alıcı: ~{previewCount}
          </Text>
        ) : null}
      </GlassCard>

      <GlassCard style={styles.card}>
        <View style={styles.rowBetween}>
          <Text variant="label">Görsel</Text>
          <Button title="Seç" variant="secondary" onPress={() => void handlePickImage()} disabled={uploadingImage} />
        </View>
        {form.imageUrl ? (
          <Image source={{ uri: form.imageUrl }} style={styles.previewImage} contentFit="cover" />
        ) : null}
        <View style={styles.rowBetween}>
          <Text variant="label">Tıklanınca sayfa aç</Text>
          <Switch value={showRedirect} onValueChange={setShowRedirect} />
        </View>
        {showRedirect ? (
          <AdminFilterChip
            options={PUSH_DEEP_LINK_PRESETS.map((p) => ({ id: p.id, label: p.label }))}
            value={form.deepLink ?? PUSH_DEEP_LINK_NONE}
            onChange={(deepLink) => patch({ deepLink })}
          />
        ) : null}
      </GlassCard>

      <GlassCard style={styles.card}>
        <View style={styles.rowBetween}>
          <AdminSectionHeader title="Otomasyon" hint="Canlı akış / periyodik" />
          <Switch value={showAdvanced} onValueChange={setShowAdvanced} />
        </View>
        {showAdvanced ? (
          <>
            <AdminFilterChip
              options={ADVANCED_TRIGGERS.map((o) => ({ id: o.id, label: o.label }))}
              value={form.triggerType}
              onChange={(triggerType) => patch({ ...DEFAULT_PUSH_TEMPLATE, triggerType })}
            />
            <AdminFilterChip
              options={PUSH_PREF_KEY_OPTIONS.map((p) => ({ id: p.id, label: p.label }))}
              value={form.prefKey}
              onChange={(prefKey) => patch({ prefKey })}
            />
            {form.triggerType === 'feed_activity' ? (
              <>
                <AdminFormField
                  label="Min. gönderi"
                  value={String(form.minPostsInWindow)}
                  onChangeText={(v) => patch({ minPostsInWindow: Math.max(1, Number(v) || 1) })}
                />
                <AdminFormField
                  label="Pencere (dk)"
                  value={String(form.activityWindowMinutes)}
                  onChangeText={(v) => patch({ activityWindowMinutes: Math.max(5, Number(v) || 30) })}
                />
              </>
            ) : null}
            {form.triggerType === 'interval' ? (
              <>
                <AdminFormField
                  label="Tekrar (saat)"
                  value={form.intervalHours != null ? String(form.intervalHours) : ''}
                  onChangeText={(v) => patch({ intervalHours: v ? Number(v) : null })}
                />
                <AdminFormField
                  label="Tekrar (gün)"
                  value={form.intervalDays != null ? String(form.intervalDays) : ''}
                  onChangeText={(v) => patch({ intervalDays: v ? Number(v) : null })}
                />
              </>
            ) : null}
          </>
        ) : null}
      </GlassCard>

      <View style={styles.actions}>
        <Button title={saving ? 'Kaydediliyor…' : 'Kaydet'} onPress={() => void handleSave()} disabled={saving} />
        {form.id ? (
          <Button
            title="Bana test et"
            variant="secondary"
            onPress={async () => {
              const { error } = await testPushAutomationTemplate(form.id!);
              if (error) Alert.alert('Hata', error);
              else Alert.alert('Test gönderildi', 'Cihazınıza iletildi.');
            }}
          />
        ) : null}
        <Button title="Vazgeç" variant="ghost" onPress={onClose} />
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  previewImage: { width: '100%', height: 120, borderRadius: radius.md },
  actions: { gap: spacing.sm, marginBottom: spacing.xxl },
});
