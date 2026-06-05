import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { DetailMetaRow } from '@/features/map/components/DetailMetaRow';
import { LAYER_BY_ID } from '@/features/map/constants';
import { fetchMapDetail, type MapDetailRecord } from '@/features/map/services/detailData';
import type { MapDetailType } from '@/features/map/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MapDetailScreenProps = {
  type: MapDetailType;
};

export function MapDetailScreen({ type }: MapDetailScreenProps) {
  const { colors } = useTheme();
  const { id, demo } = useLocalSearchParams<{ id: string; demo?: string }>();
  const [record, setRecord] = useState<MapDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const layer = LAYER_BY_ID[type];

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

        {record.latitude != null && record.longitude != null ? (
          <View style={styles.actions}>
            <Button title="Haritada Aç" variant="outline" onPress={openMaps} />
            <Pressable style={[styles.coords, { borderColor: colors.border }]} onPress={openMaps}>
              <Ionicons name="navigate-outline" size={18} color={colors.primary} />
              <Text variant="caption" style={{ color: colors.primary }}>
                {record.latitude.toFixed(5)}, {record.longitude.toFixed(5)}
              </Text>
            </Pressable>
          </View>
        ) : null}
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
