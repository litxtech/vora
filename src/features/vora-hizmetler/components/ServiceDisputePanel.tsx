import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { HizmetSectionHeader } from '@/features/vora-hizmetler/components/HizmetUi';
import { openServiceDispute } from '@/features/vora-hizmetler/services/disputeData';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { VORA_HIZMETLER_FEATURE } from '@/features/vora-hizmetler/featureFlags';
import { spacing } from '@/constants/theme';

type ServiceDisputePanelProps = {
  requestId: string;
  canOpenDispute: boolean;
  onOpened?: () => void;
};

export function ServiceDisputePanel({
  requestId,
  canOpenDispute,
  onOpened,
}: ServiceDisputePanelProps) {
  const visible = useFeatureVisible(VORA_HIZMETLER_FEATURE.detailDispute);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!visible || !canOpenDispute) return null;

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      Alert.alert('Eksik bilgi', 'İtiraz nedeni en az 10 karakter olmalı.');
      return;
    }

    Alert.alert(
      'İtiraz aç',
      'Usta ödemesi durdurulur ve destek ekibi inceleyebilir. Devam edilsin mi?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'İtiraz Aç',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            const result = await openServiceDispute(requestId, reason);
            setSubmitting(false);
            if (result.error) {
              Alert.alert('Hata', result.error);
              return;
            }
            setReason('');
            onOpened?.();
            Alert.alert(
              'İtiraz kaydedildi',
              'Destek ekibimiz inceleyecek. Gerekirse Heyet oturumu açılabilir.',
            );
          },
        },
      ],
    );
  };

  return (
    <GlassCard style={styles.card}>
      <HizmetSectionHeader
        title="Sorun Bildir"
        subtitle="İşten memnun değilseniz itiraz açın — usta ödemesi bekletilir"
        icon="alert-circle-outline"
      />
      <Input
        value={reason}
        onChangeText={setReason}
        placeholder="Sorunu ve yaşanan durumu açıklayın…"
        multiline
        numberOfLines={4}
        style={styles.input}
      />
      <Button title="İtiraz Aç" variant="outline" onPress={handleSubmit} loading={submitting} />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  input: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
});
