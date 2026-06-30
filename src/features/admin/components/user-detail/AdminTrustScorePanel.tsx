import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import {
  adminAdjustUserTrustScore,
  adminSetUserContributionScore,
  type AdminTrustAdjustAction,
} from '@/features/admin/services/trustScoreManagement';
import { TRUST_SCORE_MAX } from '@/features/profile/constants';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  userId: string;
  trustScore: number;
  contributionScore: number;
  onUpdated: () => void;
};

export function AdminTrustScorePanel({ userId, trustScore, contributionScore, onUpdated }: Props) {
  const { colors } = useTheme();
  const [reason, setReason] = useState('');
  const [targetScore, setTargetScore] = useState(String(trustScore));
  const [deltaScore, setDeltaScore] = useState('');
  const [resetScore, setResetScore] = useState('50');
  const [contributionValue, setContributionValue] = useState(String(contributionScore));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTargetScore(String(trustScore));
    setContributionValue(String(contributionScore));
  }, [trustScore, contributionScore]);

  const runTrustAction = async (action: AdminTrustAdjustAction, value: number | null) => {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      Alert.alert('Gerekçe gerekli', 'Platform düzenlemesi için en az 3 karakterlik açıklama yazın.');
      return;
    }

    setBusy(true);
    const { data, error } = await adminAdjustUserTrustScore(userId, action, value, trimmedReason);
    setBusy(false);

    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    if (data?.unchanged) {
      Alert.alert('Bilgi', 'Puan değişmedi.');
      return;
    }

    Alert.alert('Tamam', data?.note ?? 'Güven puanı güncellendi.');
    setReason('');
    onUpdated();
  };

  const handleContribution = async () => {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      Alert.alert('Gerekçe gerekli', 'Düzenleme için en az 3 karakterlik açıklama yazın.');
      return;
    }

    const parsed = parseInt(contributionValue, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      Alert.alert('Hata', 'Geçerli bir katkı puanı girin.');
      return;
    }

    setBusy(true);
    const { ok, error } = await adminSetUserContributionScore(userId, parsed, trimmedReason);
    setBusy(false);

    if (!ok) {
      Alert.alert('Hata', error ?? 'İşlem başarısız.');
      return;
    }

    Alert.alert('Tamam', 'Katkı puanı güncellendi.');
    onUpdated();
  };

  const confirmReset = () => {
    const parsed = parseInt(resetScore, 10);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > TRUST_SCORE_MAX) {
      Alert.alert('Hata', `Sıfırlama puanı 0–${TRUST_SCORE_MAX} arasında olmalı.`);
      return;
    }

    Alert.alert(
      'Geçmişi sıfırla',
      'Tüm güven puanı hareketleri silinir ve tek bir platform düzenlemesi kaydı oluşturulur. Devam?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: () => void runTrustAction('reset', parsed),
        },
      ],
    );
  };

  return (
    <View style={styles.wrap}>
      <AdminSectionHeader
        title="Güven puanı yönetimi"
        hint="Cüzdanda platform düzenlemesi olarak görünür"
      />

      <AdminFormField
        label="Düzenleme gerekçesi"
        placeholder="Örn: Yanlış puan kazanımı düzeltildi"
        value={reason}
        onChangeText={setReason}
      />

      <Text variant="label" style={styles.blockTitle}>
        Güven puanı ({trustScore}/{TRUST_SCORE_MAX})
      </Text>
      <AdminFormField
        label="Hedef puan (0–100)"
        placeholder="72"
        value={targetScore}
        onChangeText={setTargetScore}
        keyboardType="number-pad"
      />
      <View style={styles.actions}>
        <AdminActionChip
          compact
          label="Puana ayarla"
          icon="create-outline"
          tone="primary"
          onPress={() => {
            const parsed = parseInt(targetScore, 10);
            if (Number.isNaN(parsed)) {
              Alert.alert('Hata', 'Geçerli bir puan girin.');
              return;
            }
            void runTrustAction('set', parsed);
          }}
        />
      </View>

      <AdminFormField
        label="Ekle / çıkar (+/-)"
        placeholder="+5 veya -10"
        value={deltaScore}
        onChangeText={setDeltaScore}
        keyboardType="numbers-and-punctuation"
      />
      <View style={styles.actions}>
        <AdminActionChip
          compact
          label="Değişim uygula"
          icon="swap-vertical-outline"
          tone="warning"
          onPress={() => {
            const parsed = parseInt(deltaScore, 10);
            if (Number.isNaN(parsed) || parsed === 0) {
              Alert.alert('Hata', 'Sıfır olmayan bir değişim girin.');
              return;
            }
            void runTrustAction('add', parsed);
          }}
        />
      </View>

      <AdminFormField
        label="Sıfırlama sonrası puan"
        placeholder="50"
        value={resetScore}
        onChangeText={setResetScore}
        keyboardType="number-pad"
      />
      <View style={styles.actions}>
        <AdminActionChip
          compact
          label="Geçmişi sil ve sıfırla"
          icon="trash-outline"
          tone="danger"
          onPress={confirmReset}
        />
      </View>

      <Text variant="label" style={styles.blockTitle}>
        Katkı puanı ({contributionScore})
      </Text>
      <AdminFormField
        label="Katkı puanı"
        placeholder="0"
        value={contributionValue}
        onChangeText={setContributionValue}
        keyboardType="number-pad"
      />
      <View style={styles.actions}>
        <AdminActionChip
          compact
          label="Katkı puanını güncelle"
          icon="trophy-outline"
          tone="primary"
          onPress={() => void handleContribution()}
        />
      </View>

      {busy ? (
        <View style={styles.busyRow}>
          <Ionicons name="hourglass-outline" size={14} color={colors.textMuted} />
          <Text secondary variant="caption">
            İşlem uygulanıyor…
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  blockTitle: {
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
