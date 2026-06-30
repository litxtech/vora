import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { REGIONS } from '@/constants/regions';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { IstanbulDateTimePicker } from '@/features/admin/components/shared/IstanbulDateTimePicker';
import {
  defaultIstanbulSchedule,
  formatIstanbulSchedule,
  istanbulPartsToIso,
  isFutureIstanbulSchedule,
  type IstanbulScheduleParts,
} from '@/features/admin/utils/istanbulSchedule';
import { PushPhonePreview } from '@/features/push-automation/components/PushPhonePreview';
import {
  PUSH_DEEP_LINK_NONE,
  PUSH_DEEP_LINK_PRESETS,
  PUSH_SEND_MODE_OPTIONS,
} from '@/features/push-automation/constants';
import {
  previewQuickPushRecipients,
  sendQuickPush,
  testPushAutomationTemplate,
  upsertPushAutomationTemplate,
} from '@/features/push-automation/services/pushAutomationAdmin';
import type { PushAutomationTemplate } from '@/features/push-automation/types';
import {
  ensureUniquePushTemplateSlug,
} from '@/features/push-automation/utils/slug';
import { QUICK_PUSH_DEFAULTS } from '@/features/push-automation/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const REGION_OPTIONS = [{ id: 'all', label: 'Tüm şehirler' }, ...REGIONS.map((r) => ({ id: r.id, label: r.name }))];

type Props = {
  templates: PushAutomationTemplate[];
  onComplete: () => void;
};

export function PushQuickComposer({ templates, onComplete }: Props) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [regionScope, setRegionScope] = useState('all');
  const [sendMode, setSendMode] = useState<'now' | 'scheduled'>('now');
  const [scheduleParts, setScheduleParts] = useState<IstanbulScheduleParts>(defaultIstanbulSchedule);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [showRedirect, setShowRedirect] = useState(false);
  const [deepLink, setDeepLink] = useState(PUSH_DEEP_LINK_NONE);
  const [saveAsCampaign, setSaveAsCampaign] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);

  const scheduleLabel = useMemo(() => formatIstanbulSchedule(scheduleParts), [scheduleParts]);

  useEffect(() => {
    void previewQuickPushRecipients(regionScope === 'all' ? undefined : regionScope).then((res) =>
      setPreviewCount(res.count),
    );
  }, [regionScope]);

  const reset = () => {
    setTitle('');
    setBody('');
    setRegionScope('all');
    setSendMode('now');
    setScheduleParts(defaultIstanbulSchedule());
    setImageUri(null);
    setShowRedirect(false);
    setDeepLink(PUSH_DEEP_LINK_NONE);
    setSaveAsCampaign(false);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleTest = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Eksik bilgi', 'Test için başlık ve mesaj yazın.');
      return;
    }

    setTesting(true);
    const slug = ensureUniquePushTemplateSlug(
      `test-${Date.now().toString(36)}`,
      templates,
    );
    const { id, error } = await upsertPushAutomationTemplate({
      name: `Test · ${title.trim().slice(0, 32)}`,
      slug,
      title: title.trim(),
      body: body.trim(),
      ...QUICK_PUSH_DEFAULTS,
      triggerType: 'manual',
      deepLink: deepLink || PUSH_DEEP_LINK_NONE,
      regionIds: regionScope === 'all' ? null : [regionScope],
      imageUrl: imageUri,
    });
    if (error || !id) {
      setTesting(false);
      Alert.alert('Hata', error ?? 'Test kaydı oluşturulamadı');
      return;
    }

    const test = await testPushAutomationTemplate(id);
    setTesting(false);
    if (test.error) Alert.alert('Hata', test.error);
    else Alert.alert('Test gönderildi', 'Bildirim cihazınıza iletildi.');
  };

  const handleSubmit = () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Eksik bilgi', 'Başlık ve mesaj zorunludur.');
      return;
    }

    if (sendMode === 'scheduled' && !isFutureIstanbulSchedule(scheduleParts)) {
      Alert.alert('Geçersiz zaman', 'Gönderim zamanı gelecekte olmalıdır.');
      return;
    }

    const confirmTitle = sendMode === 'scheduled' ? 'Push zamanla' : 'Push gönder';
    const confirmBody =
      sendMode === 'scheduled'
        ? `${scheduleLabel} tarihinde ~${previewCount?.toLocaleString('tr-TR') ?? '—'} kişiye gidecek.`
        : `~${previewCount?.toLocaleString('tr-TR') ?? '—'} kişiye hemen gönderilecek.`;

    Alert.alert(confirmTitle, confirmBody, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: sendMode === 'scheduled' ? 'Zamanla' : 'Gönder',
        onPress: async () => {
          setSubmitting(true);
          const result = await sendQuickPush({
            title,
            body,
            regionScope,
            sendWhen: sendMode,
            scheduleIso: sendMode === 'scheduled' ? istanbulPartsToIso(scheduleParts) : null,
            imageUri,
            deepLink: showRedirect ? deepLink : PUSH_DEEP_LINK_NONE,
            saveAsCampaign: saveAsCampaign || sendMode === 'scheduled',
            existingTemplates: templates,
          });
          setSubmitting(false);

          if (result.error) {
            Alert.alert('Hata', result.error);
            return;
          }

          if (result.scheduled) {
            Alert.alert('Zamanlandı', `${scheduleLabel} tarihinde otomatik gidecek.`);
          } else if (result.recipients <= 0) {
            Alert.alert('Alıcı yok', 'Push tokenı olan aktif kullanıcı bulunamadı.');
          } else {
            Alert.alert(
              'Gönderildi',
              `${result.recipients} kişiye iletildi${result.pushProcessed ? ` · ${result.pushProcessed} push` : ''}.`,
            );
          }

          reset();
          onComplete();
        },
      },
    ]);
  };

  return (
    <GlassCard style={styles.card}>
      <AdminSectionHeader
        title="Hızlı gönder"
        hint="Başlık ve mesaj yazın — sayfa seçimi zorunlu değil"
      />

      <PushPhonePreview title={title} body={body} imageUrl={imageUri} />

      <AdminFormField
        label="Başlık"
        value={title}
        onChangeText={setTitle}
        placeholder="Örn. Bu akşam etkinlik var!"
      />
      <AdminFormField
        label="Mesaj"
        value={body}
        onChangeText={setBody}
        placeholder="Kullanıcıların göreceği kısa metin"
        multiline
      />

      <Text secondary variant="caption">
        Hedef · ~{previewCount?.toLocaleString('tr-TR') ?? '—'} kişi (push tokenlı)
      </Text>
      <AdminFilterChip options={REGION_OPTIONS} value={regionScope} onChange={setRegionScope} />

      <Text secondary variant="caption">
        Zamanlama
      </Text>
      <AdminFilterChip options={PUSH_SEND_MODE_OPTIONS} value={sendMode} onChange={setSendMode} />
      {sendMode === 'scheduled' ? (
        <View style={styles.scheduleBlock}>
          <IstanbulDateTimePicker value={scheduleParts} onChange={setScheduleParts} />
        </View>
      ) : null}

      {imageUri ? (
        <Pressable onPress={() => void pickImage()} style={[styles.imageBtn, { borderColor: colors.border }]}>
          <Ionicons name="image-outline" size={18} color={colors.primary} />
          <Text variant="caption">Görseli değiştir · kaldır</Text>
        </Pressable>
      ) : null}
      <View style={styles.imageActions}>
        <Button
          title={imageUri ? 'Görseli kaldır' : 'Görsel ekle (isteğe bağlı)'}
          variant="secondary"
          onPress={() => (imageUri ? setImageUri(null) : void pickImage())}
        />
      </View>

      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Text variant="label">Tıklanınca sayfa aç</Text>
          <Text secondary variant="caption">
            Kapalıyken yalnızca bildirim kutusuna düşer
          </Text>
        </View>
        <Switch value={showRedirect} onValueChange={setShowRedirect} />
      </View>
      {showRedirect ? (
        <AdminFilterChip
          options={PUSH_DEEP_LINK_PRESETS.map((p) => ({ id: p.id, label: p.label }))}
          value={deepLink}
          onChange={setDeepLink}
        />
      ) : null}

      {sendMode === 'now' ? (
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <Text variant="label">Kampanya olarak kaydet</Text>
            <Text secondary variant="caption">
              Tekrar göndermek için listeye ekler
            </Text>
          </View>
          <Switch value={saveAsCampaign} onValueChange={setSaveAsCampaign} />
        </View>
      ) : (
        <Text secondary variant="caption">
          Zamanlanmış gönderimler otomatik olarak kaydedilir.
        </Text>
      )}

      <View style={styles.actions}>
        <Button
          title={
            submitting
              ? 'Gönderiliyor…'
              : sendMode === 'scheduled'
                ? 'Zamanla'
                : 'Gönder'
          }
          onPress={() => void handleSubmit()}
          disabled={submitting}
        />
        <Button
          title={testing ? 'Test…' : 'Bana test et'}
          variant="secondary"
          onPress={() => void handleTest()}
          disabled={testing || submitting}
        />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.md },
  scheduleBlock: { gap: spacing.sm },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  flex: { flex: 1 },
  imageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
  },
  imageActions: { marginTop: spacing.xs },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
});
