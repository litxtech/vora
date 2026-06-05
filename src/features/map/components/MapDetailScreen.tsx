import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { DetailMetaRow } from '@/features/map/components/DetailMetaRow';
import { LAYER_BY_ID } from '@/features/map/constants';
import { useContentFollow } from '@/features/map/hooks/useContentFollow';
import { fetchMapDetail, type MapDetailRecord } from '@/features/map/services/detailData';
import { expressJobInterest } from '@/features/jobs/services/jobData';
import type { ContentFollowType, MapDetailType } from '@/features/map/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MapDetailScreenProps = {
  type: MapDetailType;
};

function followTypeForLayer(type: MapDetailType): ContentFollowType | null {
  if (type === 'events') return 'event';
  if (type === 'incidents') return 'incident';
  return null;
}

export function MapDetailScreen({ type }: MapDetailScreenProps) {
  const { colors } = useTheme();
  const { requireAuth } = useRequireAuth();
  const { id, demo } = useLocalSearchParams<{ id: string; demo?: string }>();
  const [record, setRecord] = useState<MapDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const followType = followTypeForLayer(type);
  const { following, loading: followLoading, toggle: toggleFollow } = useContentFollow(
    followType ?? 'event',
    followType ? id : null,
  );

  const layer = LAYER_BY_ID[type];
  const phoneField = useMemo(
    () => record?.fields.find((field) => field.label === 'Telefon' && field.value !== '—'),
    [record],
  );

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    fetchMapDetail(type, id, demo === '1')
      .then((data) => {
        if (!data) {
          setError('Kayıt bulunamadı.');
          setRecord(null);
          return;
        }
        setRecord(data);
      })
      .catch(() => setError('Detaylar yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [type, id, demo]);

  const openMaps = () => {
    if (!record?.latitude || !record?.longitude) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${record.latitude},${record.longitude}`;
    Linking.openURL(url);
  };

  const callPhone = () => {
    if (!phoneField?.value) return;
    Linking.openURL(`tel:${phoneField.value.replace(/\s/g, '')}`);
  };

  const handleFollow = async () => {
    if (!followType || !requireAuth('Takip')) return;
    const result = await toggleFollow();
    if (result?.error) Alert.alert('Hata', result.error);
    else if (result?.following) Alert.alert('Takip ediliyor', 'Yeni gelişmeler bildirim olarak gelecek.');
  };

  const handleApply = async () => {
    if (!requireAuth('Başvuru') || !id) return;
    setApplying(true);
    const result = await expressJobInterest(id);
    setApplying(false);
    if (result.error) Alert.alert('Hata', result.error);
    else Alert.alert('Başvuru', 'İlginiz işverene iletildi. Mesajlar üzerinden dönüş alabilirsiniz.');
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </GradientBackground>
    );
  }

  if (error || !record) {
    return (
      <GradientBackground>
        <View style={styles.page}>
          <AuthHeader title="Detay" subtitle="İçerik bulunamadı" />
          <GlassCard>
            <Text secondary>{error ?? 'Kayıt mevcut değil.'}</Text>
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <AuthHeader title={layer.label} subtitle={record.isDemo ? 'Örnek içerik' : 'Detay sayfası'} />

        <GlassCard style={styles.hero}>
          <View style={[styles.iconWrap, { backgroundColor: `${layer.color}22` }]}>
            <Ionicons name={layer.icon as keyof typeof Ionicons.glyphMap} size={28} color={layer.color} />
          </View>
          <Text variant="h2">{record.title}</Text>
          {record.subtitle ? <Text secondary>{record.subtitle}</Text> : null}
          {record.isDemo ? (
            <View style={[styles.demoBadge, { borderColor: colors.warning, backgroundColor: `${colors.warning}18` }]}>
              <Text variant="caption" style={{ color: colors.warning }}>
                Demo veri — gerçek kayıt değil
              </Text>
            </View>
          ) : null}
        </GlassCard>

        {record.description ? (
          <GlassCard style={styles.section}>
            <Text variant="label">Açıklama</Text>
            <Text secondary style={styles.body}>
              {record.description}
            </Text>
          </GlassCard>
        ) : null}

        <GlassCard style={styles.section}>
          <Text variant="label">Bilgiler</Text>
          {record.fields.map((field) => (
            <DetailMetaRow key={field.label} label={field.label} value={field.value} />
          ))}
        </GlassCard>

        <View style={styles.actions}>
          {type === 'jobs' ? (
            <Button title="Başvur" loading={applying} onPress={handleApply} />
          ) : null}

          {followType ? (
            <Button
              title={following ? 'Takip Ediliyor' : 'Takip Et'}
              variant={following ? 'secondary' : 'primary'}
              loading={followLoading}
              onPress={handleFollow}
            />
          ) : null}

          {type === 'events' ? (
            <View style={styles.row}>
              <Button title="Katılacağım" variant="outline" onPress={() => Alert.alert('Etkinlik', 'Katılım kaydedildi.')} />
              <Button title="Paylaş" variant="ghost" onPress={() => Alert.alert('Paylaş', 'Paylaşım yakında.')} />
            </View>
          ) : null}

          {record.latitude != null && record.longitude != null ? (
            <>
              <Button title="Yol Tarifi" variant="outline" onPress={openMaps} />
              <Pressable style={[styles.coords, { borderColor: colors.border }]} onPress={openMaps}>
                <Ionicons name="navigate-outline" size={18} color={colors.primary} />
                <Text variant="caption" style={{ color: colors.primary }}>
                  {record.latitude.toFixed(5)}, {record.longitude.toFixed(5)}
                </Text>
              </Pressable>
            </>
          ) : null}

          {phoneField ? (
            <Button title="Telefon Et" variant="outline" onPress={callPhone} />
          ) : null}

          {(type === 'businesses' || type === 'emergency_pois') && phoneField ? (
            <Button title="Mesaj Gönder" variant="ghost" onPress={() => Alert.alert('Mesaj', 'Mesajlaşma yakında.')} />
          ) : null}
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  demoBadge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  body: {
    lineHeight: 24,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  row: {
    gap: spacing.sm,
  },
  coords: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
