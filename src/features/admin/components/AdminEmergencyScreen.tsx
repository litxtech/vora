import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  deactivateEmergency,
  fetchActiveEmergencies,
  sendEmergencyBroadcast,
} from '@/features/admin/services/broadcasts';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const TEMPLATES = [
  { id: 'flood', title: 'Sel uyarısı', body: 'Bölgenizde sel riski bulunmaktadır. Güvenli alanlara geçiniz.' },
  { id: 'fire', title: 'Yangın uyarısı', body: 'Yangın riski nedeniyle bölgeden uzaklaşınız.' },
  { id: 'road', title: 'Yol kapanması', body: 'Ana yol trafiğe kapatılmıştır. Alternatif güzergahları kullanınız.' },
  { id: 'power', title: 'Elektrik kesintisi', body: 'Planlı elektrik kesintisi uygulanmaktadır.' },
];

export function AdminEmergencyScreen() {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [active, setActive] = useState<Record<string, unknown>[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const { data } = await fetchActiveEmergencies();
    setActive(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Eksik bilgi', 'Başlık ve mesaj gerekli.');
      return;
    }
    Alert.alert('Acil duyuru', 'Kırmızı acil durum duyurusu yayınlansın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Yayınla',
        style: 'destructive',
        onPress: async () => {
          setSending(true);
          const { error } = await sendEmergencyBroadcast(title.trim(), body.trim());
          setSending(false);
          if (error) Alert.alert('Hata', error);
          else {
            Alert.alert('Yayınlandı');
            setTitle('');
            setBody('');
            load(true);
          }
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="Acil Durum Paneli"
      subtitle="Kırmızı duyuru yayını"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <AdminSectionHeader title="Hızlı şablonlar" hint="Bir şablon seçerek formu doldurun" />
      <View style={styles.templates}>
        {TEMPLATES.map((t) => (
          <AdminActionChip
            key={t.id}
            label={t.title}
            icon="flash-outline"
            tone="danger"
            onPress={() => {
              setTitle(t.title);
              setBody(t.body);
            }}
          />
        ))}
      </View>

      <GlassCard style={[styles.form, { borderColor: colors.danger, borderWidth: 1 }]}>
        <Text variant="label" style={{ color: colors.danger }}>
          Acil duyuru
        </Text>
        <AdminFormField
          placeholder="Başlık"
          value={title}
          onChangeText={setTitle}
          accent={colors.danger}
        />
        <AdminFormField
          placeholder="Mesaj"
          value={body}
          onChangeText={setBody}
          multiline
          accent={colors.danger}
        />
        <Button
          title={sending ? 'Yayınlanıyor...' : 'Acil duyuru yayınla'}
          onPress={handleSend}
          disabled={sending}
        />
      </GlassCard>

      <AdminSectionHeader title="Aktif duyurular" />
      {loading ? (
        <AdminEmptyState loading />
      ) : active.length === 0 ? (
        <AdminEmptyState title="Aktif duyuru yok" message="Şu an yayında acil durum duyurusu bulunmuyor." icon="megaphone-outline" />
      ) : (
        active.map((item) => (
          <GlassCard key={item.id as string} style={{ borderColor: colors.danger, borderWidth: 1, gap: spacing.sm }}>
            <Text variant="label" style={{ color: colors.danger }}>
              {item.title as string}
            </Text>
            <Text variant="caption">{item.body as string}</Text>
            <AdminActionChip
              label="Sonlandır"
              icon="stop-circle-outline"
              tone="danger"
              onPress={async () => {
                await deactivateEmergency(item.id as string);
                load(true);
              }}
            />
          </GlassCard>
        ))
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  templates: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  form: { gap: spacing.md },
});
