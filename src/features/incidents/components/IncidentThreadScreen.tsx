import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { UserBadge } from '@/features/feed/components/UserBadge';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { formatFeedTime } from '@/features/feed/utils';
import {
  addIncidentUpdate,
  fetchIncidentThread,
  verifyIncident,
} from '@/features/incidents/services/incidentData';
import type { IncidentThread } from '@/features/incidents/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  critical: 'Kritik',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Açık',
  verified: 'Doğrulandı',
  resolved: 'Çözüldü',
  dismissed: 'Reddedildi',
};

const UPDATE_LABELS: Record<string, string> = {
  initial: 'İlk bildirim',
  update: 'Gelişme',
  photo: 'Fotoğraf',
  video: 'Video',
  verification: 'Doğrulama',
};

export function IncidentThreadScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const { id, demo } = useLocalSearchParams<{ id: string; demo?: string }>();

  const [thread, setThread] = useState<IncidentThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [updateText, setUpdateText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const data = await fetchIncidentThread(id, demo === '1');
    setThread(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id, demo]);

  const handleAddUpdate = async () => {
    if (!requireAuth('Gelişme ekleme')) return;
    if (!user || !thread || !updateText.trim()) return;

    setSubmitting(true);
    const { error } = await addIncidentUpdate(thread.id, user.id, updateText.trim());
    setSubmitting(false);

    if (!error) {
      setUpdateText('');
      await load();
    }
  };

  const handleVerify = async () => {
    if (!requireAuth('Doğrulama')) return;
    if (!user || !thread) return;

    const { error } = await verifyIncident(thread.id, user.id);
    if (!error) await load();
  };

  const openMaps = () => {
    if (!thread?.latitude || !thread?.longitude) return;
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${thread.latitude},${thread.longitude}`,
    );
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

  if (!thread) {
    return (
      <GradientBackground>
        <View style={styles.page}>
          <AuthHeader title="Olay" subtitle="Bulunamadı" />
          <GlassCard>
            <Text secondary>Olay kaydı mevcut değil.</Text>
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <AuthHeader title="Olay Dosyası" subtitle={thread.isDemo ? 'Örnek içerik' : 'Canlı takip'} />

        <GlassCard style={styles.hero}>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: `${colors.danger}22` }]}>
              <Text variant="caption" style={{ color: colors.danger }}>
                {SEVERITY_LABELS[thread.severity] ?? thread.severity}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: `${colors.primary}22` }]}>
              <Text variant="caption" style={{ color: colors.primary }}>
                {STATUS_LABELS[thread.status] ?? thread.status}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: `${colors.success}22` }]}>
              <Text variant="caption" style={{ color: colors.success }}>
                {thread.verificationCount} doğrulama
              </Text>
            </View>
          </View>
          <Text variant="h2">{thread.title}</Text>
          <UserBadge author={thread.reporter} timeLabel={formatFeedTime(thread.createdAt)} />
          {thread.latitude != null ? (
            <Pressable onPress={openMaps} style={styles.mapLink}>
              <Ionicons name="map-outline" size={16} color={colors.primary} />
              <Text variant="caption" style={{ color: colors.primary }}>
                Haritada aç
              </Text>
            </Pressable>
          ) : null}
        </GlassCard>

        <Text variant="label" style={styles.sectionTitle}>
          Gelişmeler
        </Text>

        {thread.updates.map((update) => (
          <GlassCard key={update.id} style={styles.updateCard}>
            <View style={styles.updateHeader}>
              <Text variant="caption" style={{ color: colors.primary }}>
                {UPDATE_LABELS[update.updateType] ?? update.updateType}
              </Text>
              <Text variant="caption" secondary>
                {formatFeedTime(update.createdAt)}
              </Text>
            </View>
            <UserBadge author={update.author} showUsername={false} />
            <Text>{update.content}</Text>
            {update.mediaUrls.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.media} resizeMode="cover" />
            ))}
          </GlassCard>
        ))}

        {thread.verifications.length > 0 ? (
          <>
            <Text variant="label" style={styles.sectionTitle}>
              Doğrulamalar
            </Text>
            {thread.verifications.map((v) => (
              <GlassCard key={v.id} style={styles.updateCard}>
                <UserBadge author={v.verifier} timeLabel={formatFeedTime(v.createdAt)} />
                {v.note ? <Text secondary>{v.note}</Text> : null}
              </GlassCard>
            ))}
          </>
        ) : null}

        {!thread.isDemo ? (
          <GlassCard style={styles.compose}>
            <Text variant="label">Gelişme ekle</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder="Son durumu paylaş..."
              placeholderTextColor={colors.textMuted}
              value={updateText}
              onChangeText={setUpdateText}
              multiline
            />
            <View style={styles.composeActions}>
              <Button
                title="Gelişme Paylaş"
                onPress={handleAddUpdate}
                loading={submitting}
                disabled={!updateText.trim()}
                fullWidth={false}
                style={{ flex: 1 }}
              />
              <Button
                title="Doğrula"
                variant="outline"
                onPress={handleVerify}
                fullWidth={false}
                style={{ flex: 1 }}
              />
            </View>
          </GlassCard>
        ) : null}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  badge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionTitle: { marginTop: spacing.md },
  updateCard: { gap: spacing.sm },
  updateHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  media: { width: '100%', height: 180, borderRadius: radius.md },
  compose: { gap: spacing.sm, marginTop: spacing.md },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  composeActions: { flexDirection: 'row', gap: spacing.sm },
});
