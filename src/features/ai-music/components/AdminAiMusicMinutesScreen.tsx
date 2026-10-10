import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminUserSearchPicker } from '@/features/admin/components/shared/AdminUserSearchPicker';
import type { AdminUserRow } from '@/features/admin/types';
import { formatAiMusicAllowance } from '@/features/ai-music/constants';
import { fetchAdminAiMusicAccount, grantAdminAiMusicMinutes } from '@/features/ai-music/services/aiMusicMinutes';
import type { AiMusicAdminAccount } from '@/features/ai-music/types';
import { spacing } from '@/constants/theme';

const SOURCE_LABEL = {
  free: 'Ücretsiz hak',
  purchase: 'Satın alma',
  admin: 'Yönetici',
} as const;

export function AdminAiMusicMinutesScreen() {
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [account, setAccount] = useState<AiMusicAdminAccount | null>(null);
  const [minutes, setMinutes] = useState('10');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectUser = async (user: AdminUserRow | null) => {
    setSelectedUser(user);
    setAccount(null);
    if (!user) return;
    setLoading(true);
    const result = await fetchAdminAiMusicAccount(user.id);
    setLoading(false);
    if (result.error) {
      Alert.alert('Hesap okunamadı', result.error);
      return;
    }
    setAccount(result.account);
  };

  const grant = async () => {
    if (!selectedUser || saving) return;
    const amount = Number(minutes.replace(',', '.'));
    if (!Number.isInteger(amount) || amount < 1 || amount > 1440) {
      Alert.alert('Dakika', '1 ile 1440 arasında tam dakika yaz.');
      return;
    }
    setSaving(true);
    const result = await grantAdminAiMusicMinutes(selectedUser.id, amount, note);
    setSaving(false);
    if (result.error || !result.account) {
      Alert.alert('Tanımlanamadı', result.error ?? 'Dakika yazılamadı.');
      return;
    }
    setAccount(result.account);
    setNote('');
    Alert.alert('Tanımlandı', `${amount} dakika hesaba eklendi. Kalan hak ${formatAiMusicAllowance(result.account.availableSec)}.`);
  };

  return (
    <AdminShell title="Vora Müzik Dakikası" subtitle="İstediğin hesaba üretim dakikası tanımla" requireAdmin>
      <AdminUserSearchPicker
        selectedUser={selectedUser}
        onSelectUser={(user) => void selectUser(user)}
        placeholder="Dakika tanımlanacak hesabı ara"
      />

      {loading ? <Text secondary>Hak okunuyor…</Text> : null}

      {account ? (
        <GlassCard style={styles.card}>
          <AdminSectionHeader title="Mevcut hak" hint={`@${account.username ?? 'hesap'}`} />
          <Text style={styles.available}>{formatAiMusicAllowance(account.availableSec)} kullanılabilir</Text>
          <Text secondary variant="caption">
            Tanımlı {formatAiMusicAllowance(account.grantedSec)} · onayda kullanılan {formatAiMusicAllowance(account.spentSec)} · ayrılmış {formatAiMusicAllowance(account.reservedSec)}
          </Text>
          <AdminFormField label="Dakika" value={minutes} onChangeText={setMinutes} placeholder="10" />
          <AdminFormField label="Not" value={note} onChangeText={setNote} placeholder="İsteğe bağlı" />
          <Button title="Hesaba tanımla" loading={saving} onPress={() => void grant()} />
          {account.grants.length > 0 ? (
            <View style={styles.grants}>
              {account.grants.map((grantRow) => (
                <Text key={`${grantRow.createdAt}-${grantRow.source}-${grantRow.seconds}`} secondary variant="caption">
                  {SOURCE_LABEL[grantRow.source]} · {formatAiMusicAllowance(grantRow.seconds)}
                  {grantRow.note ? ` · ${grantRow.note}` : ''}
                </Text>
              ))}
            </View>
          ) : null}
        </GlassCard>
      ) : null}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginTop: spacing.md },
  available: { fontSize: 22, fontWeight: '800' },
  grants: { gap: 4, marginTop: spacing.xs },
});
