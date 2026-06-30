import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { useAdminGuard } from '@/features/admin/hooks/useAdminGuard';
import { formatReferralCents } from '@/features/referral-earnings/constants';
import {
  fetchReferralSettings,
  updateReferralSettings,
} from '@/features/referral-earnings/services/referralAdmin';
import type { ReferralSettings } from '@/features/referral-earnings/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function AdminReferralSettingsScreen() {
  const guard = useAdminGuard();
  const { colors } = useTheme();
  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (guard.status !== 'allowed') return;
    void (async () => {
      setLoading(true);
      setSettings(await fetchReferralSettings());
      setLoading(false);
    })();
  }, [guard.status]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const result = await updateReferralSettings(settings);
    setSaving(false);
    if (!result.ok) Alert.alert('Hata', result.error);
    else Alert.alert('Kaydedildi', 'Hakediş ayarları güncellendi.');
  };

  const patch = (partial: Partial<ReferralSettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  return (
    <AdminShell title="Hakediş Ayarları" subtitle={settings?.campaignName ?? ''}>
      {loading ? (
        <AdminEmptyState loading />
      ) : !settings ? (
        <AdminEmptyState title="Ayar yok" message="Kampanya ayarları yüklenemedi." />
      ) : (
        <GlassCard style={styles.card}>
          <Input
            label="Hakediş Tutarı (kuruş)"
            value={String(settings.rewardAmountCents)}
            onChangeText={(v) => patch({ rewardAmountCents: Number(v) || 0 })}
            keyboardType="number-pad"
            hint={`Görünen: ${formatReferralCents(settings.rewardAmountCents)}`}
          />
          <Input
            label="Minimum Gün"
            value={String(settings.minDays)}
            onChangeText={(v) => patch({ minDays: Number(v) || 0 })}
            keyboardType="number-pad"
          />
          <Input
            label="Minimum Aktif Süre (dk)"
            value={String(settings.minActiveMinutes)}
            onChangeText={(v) => patch({ minActiveMinutes: Number(v) || 0 })}
            keyboardType="number-pad"
          />
          <Input
            label="Minimum Paylaşım"
            value={String(settings.minShares)}
            onChangeText={(v) => patch({ minShares: Number(v) || 0 })}
            keyboardType="number-pad"
          />
          <Input
            label="Minimum Etkileşim"
            value={String(settings.minInteractions)}
            onChangeText={(v) => patch({ minInteractions: Number(v) || 0 })}
            keyboardType="number-pad"
          />
          <Input
            label="Minimum Çekim (kuruş)"
            value={String(settings.minWithdrawCents)}
            onChangeText={(v) => patch({ minWithdrawCents: Number(v) || 0 })}
            keyboardType="number-pad"
            hint={formatReferralCents(settings.minWithdrawCents)}
          />

          <ToggleRow
            label="Otomatik Onay"
            value={settings.autoApprove}
            onChange={(v) => patch({ autoApprove: v })}
          />
          <ToggleRow
            label="Şüpheli Hesap Kontrolü"
            value={settings.suspiciousCheck}
            onChange={(v) => patch({ suspiciousCheck: v })}
          />
          <ToggleRow
            label="Hesap Aktif Olmalı"
            value={settings.requireAccountActive}
            onChange={(v) => patch({ requireAccountActive: v })}
          />
          <ToggleRow
            label="Spam Cezası Kontrolü"
            value={settings.requireNoSpam}
            onChange={(v) => patch({ requireNoSpam: v })}
          />

          <Button title="Kaydet" onPress={() => void save()} loading={saving} />
        </GlassCard>
      )}
    </AdminShell>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.toggleRow}>
      <Text variant="body">{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
