import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { PushCampaignEditor } from '@/features/push-automation/components/PushCampaignEditor';
import { PushCampaignListItem } from '@/features/push-automation/components/PushCampaignListItem';
import { PushQuickComposer } from '@/features/push-automation/components/PushQuickComposer';
import {
  deletePushAutomationTemplate,
  fetchPushAutomationRuns,
  fetchPushAutomationTemplates,
  runPushAutomationTemplate,
  upsertPushAutomationTemplate,
} from '@/features/push-automation/services/pushAutomationAdmin';
import type { PushAutomationRun, PushAutomationTemplate } from '@/features/push-automation/types';
import { formFromTemplate } from '@/features/push-automation/utils/form';
import { spacing } from '@/constants/theme';

export function AdminPushAutomationScreen() {
  const [templates, setTemplates] = useState<PushAutomationTemplate[]>([]);
  const [runs, setRuns] = useState<PushAutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PushAutomationTemplate | null | 'new'>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const [tRes, rRes] = await Promise.all([fetchPushAutomationTemplates(), fetchPushAutomationRuns()]);
    setTemplates(tRes.data);
    setRuns(rRes.data);
    setLoading(false);
    setRefreshing(false);
    if (tRes.error) Alert.alert('Hata', tRes.error);
  };

  useEffect(() => {
    void load();
  }, []);

  const sortedTemplates = useMemo(
    () => [...templates].sort((a, b) => {
      const aTime = a.nextRunAt ?? a.lastRunAt ?? a.updatedAt;
      const bTime = b.nextRunAt ?? b.lastRunAt ?? b.updatedAt;
      return bTime.localeCompare(aTime);
    }),
    [templates],
  );

  if (editingTemplate !== null) {
    return (
      <PushCampaignEditor
        template={editingTemplate === 'new' ? null : editingTemplate}
        templates={templates}
        onClose={() => setEditingTemplate(null)}
        onSaved={() => void load(true)}
      />
    );
  }

  const handleDelete = (template: PushAutomationTemplate) => {
    Alert.alert('Sil', `"${template.title}" kampanyası silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deletePushAutomationTemplate(template.id);
          if (error) Alert.alert('Hata', error);
          else void load(true);
        },
      },
    ]);
  };

  const handleRunNow = (template: PushAutomationTemplate) => {
    Alert.alert('Gönder', `"${template.title}" hemen gitsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Gönder',
        onPress: async () => {
          const region = template.regionIds?.[0];
          const { recipients, error, pushProcessed } = await runPushAutomationTemplate(template.id, region);
          if (error) Alert.alert('Hata', error);
          else if (recipients <= 0) Alert.alert('Alıcı yok', 'Push tokenı olan kullanıcı bulunamadı.');
          else Alert.alert('Gönderildi', `${recipients} kişi · ${pushProcessed} push`);
          void load(true);
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="Push Bildirimleri"
      subtitle="Başlık ve mesaj yazın — anasayfa seçmeden gönderin"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <PushQuickComposer templates={templates} onComplete={() => void load(true)} />

      <View style={styles.sectionHead}>
        <AdminSectionHeader title="Kayıtlı kampanyalar" hint={`${sortedTemplates.length} kayıt`} />
        <Button title="+ Kampanya" variant="secondary" onPress={() => setEditingTemplate('new')} />
      </View>

      {loading ? (
        <AdminEmptyState title="Yükleniyor…" />
      ) : sortedTemplates.length === 0 ? (
        <AdminEmptyState
          title="Kayıtlı kampanya yok"
          subtitle="Hızlı gönderim yeterli — tekrar kullanmak isterseniz kampanya kaydedin."
        />
      ) : (
        sortedTemplates.map((template) => (
          <PushCampaignListItem
            key={template.id}
            template={template}
            onEdit={() => setEditingTemplate(template)}
            onSendNow={() => void handleRunNow(template)}
            onDelete={() => handleDelete(template)}
            onToggleEnabled={(enabled) => {
              void upsertPushAutomationTemplate({ ...formFromTemplate(template), enabled }).then(({ error }) => {
                if (error) Alert.alert('Hata', error);
                else void load(true);
              });
            }}
          />
        ))
      )}

      {runs.length > 0 ? (
        <GlassCard style={styles.history}>
          <AdminSectionHeader title="Son gönderimler" />
          {runs.slice(0, 6).map((run) => (
            <View key={run.id} style={styles.runRow}>
              <Text variant="caption">
                {new Date(run.createdAt).toLocaleString('tr-TR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                · {run.recipientsCount} kişi
              </Text>
              <Text secondary variant="caption">
                {run.status}
              </Text>
            </View>
          ))}
        </GlassCard>
      ) : null}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  history: { gap: spacing.xs, marginTop: spacing.md, marginBottom: spacing.xxl },
  runRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
});
