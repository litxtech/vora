import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { StickyKeyboardFooter } from '@/components/keyboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { IncidentMediaPicker } from '@/features/incidents/components/IncidentMediaPicker';
import { IncidentThreadHero } from '@/features/incidents/components/IncidentThreadHero';
import { IncidentUpdateTimeline } from '@/features/incidents/components/IncidentUpdateTimeline';
import {
  addIncidentUpdate,
  deleteIncidentReport,
  fetchIncidentThread,
  verifyIncident,
} from '@/features/incidents/services/incidentData';
import {
  type IncidentPendingMedia,
  uploadIncidentMediaBatch,
} from '@/features/incidents/services/incidentMediaUpload';
import type { IncidentThread } from '@/features/incidents/types';
import { PlatformMap } from '@/features/map/components/PlatformMap';
import type { MapMarker } from '@/features/map/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

export function IncidentThreadScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const { id, demo } = useLocalSearchParams<{ id: string; demo?: string }>();

  const [thread, setThread] = useState<IncidentThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [updateText, setUpdateText] = useState('');
  const [updateMedia, setUpdateMedia] = useState<IncidentPendingMedia[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const data = await fetchIncidentThread(id);
    setThread(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id, demo]);

  const mapMarker = useMemo<MapMarker | null>(() => {
    if (!thread || thread.latitude == null || thread.longitude == null) return null;
    return {
      id: `incident-thread-${thread.id}`,
      sourceId: thread.id,
      layer: 'incidents',
      title: thread.title,
      subtitle: thread.severity,
      description: thread.description,
      latitude: thread.latitude,
      longitude: thread.longitude,
      createdAt: thread.createdAt,
    };
  }, [thread]);

  const role = profile?.role;
  const canModerate = role === 'moderator' || role === 'admin' || role === 'super_admin';
  const isOwner = !!user && !!thread && user.id === thread.reporter.id;
  const canDelete = !!thread && !thread.isDemo && (isOwner || canModerate);

  const handleAddUpdate = async () => {
    if (!(await requireAuth('Gelişme ekleme'))) return;
    if (!user || !thread) return;
    if (!updateText.trim() && updateMedia.length === 0) return;

    setSubmitting(true);

    let mediaUrls: string[] = [];
    if (updateMedia.length > 0) {
      const upload = await uploadIncidentMediaBatch(user.id, updateMedia);
      if (upload.error) {
        setSubmitting(false);
        Alert.alert('Medya', upload.error);
        return;
      }
      mediaUrls = upload.urls;
    }

    const hasVideo = updateMedia.some((item) => item.kind === 'video');
    const updateType = hasVideo ? 'video' : updateMedia.length > 0 ? 'photo' : 'update';

    const content = updateText.trim() || (hasVideo ? 'Video ekledi' : 'Fotoğraf ekledi');
    const { error } = await addIncidentUpdate(thread.id, user.id, content, updateType, mediaUrls);
    setSubmitting(false);

    if (!error) {
      setUpdateText('');
      setUpdateMedia([]);
      setComposeOpen(false);
      await load();
    }
  };

  const handleVerify = async () => {
    if (!(await requireAuth('Doğrulama'))) return;
    if (!user || !thread) return;

    const { error } = await verifyIncident(thread.id, user.id);
    if (!error) await load();
  };

  const handleDelete = () => {
    if (!thread) return;
    Alert.alert(
      'Olayı kaldır',
      'Bu olay ve tüm gelişmeleri kalıcı olarak silinecek. Devam edilsin mi?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const { error } = await deleteIncidentReport(thread.id);
            setDeleting(false);
            if (error) {
              Alert.alert('Kaldırılamadı', error);
              return;
            }
            if (router.canGoBack()) router.back();
            else router.replace('/incidents' as never);
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </GradientBackground>
    );
  }

  if (!thread) {
    return (
      <GradientBackground>
        <View style={[styles.page, { paddingTop: insets.top + spacing.sm }]}>
          <ScreenBackButton />
          <GlassCard style={styles.notFoundCard}>
            <View style={[styles.notFoundIcon, { backgroundColor: `${colors.danger}14` }]}>
              <Ionicons name="document-text-outline" size={28} color={colors.danger} />
            </View>
            <Text variant="label">Olay bulunamadı</Text>
            <Text secondary>Olay kaydı mevcut değil veya kaldırılmış olabilir.</Text>
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.page,
          {
            paddingTop: insets.top + spacing.sm,
            paddingBottom: thread.isDemo
              ? insets.bottom + spacing.xxl
              : insets.bottom + (composeOpen ? 220 : 96),
          },
        ]}
        showsVerticalScrollIndicator={false}
        bottomOffset={thread.isDemo ? 24 : 150}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.navRow}>
          <ScreenBackButton />
          {canDelete ? (
            <Pressable
              onPress={handleDelete}
              disabled={deleting}
              hitSlop={10}
              style={[styles.deleteBtn, { borderColor: `${colors.danger}55`, opacity: deleting ? 0.5 : 1 }]}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={15} color={colors.danger} />
                  <Text variant="caption" style={{ color: colors.danger, fontWeight: '700' }}>
                    Kaldır
                  </Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>

        <IncidentThreadHero thread={thread} />

        {mapMarker ? (
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <GlassCard style={styles.mapCard}>
              <View style={styles.mapHeader}>
                <Ionicons name="location-outline" size={16} color={colors.danger} />
                <Text variant="label">Olay konumu</Text>
              </View>
              <View style={styles.mapWrap}>
                <PlatformMap
                  markers={[mapMarker]}
                  fitCoordinates={[{ latitude: mapMarker.latitude, longitude: mapMarker.longitude }]}
                  mapStyle="dark"
                  scrollEnabled={false}
                  zoomEnabled={false}
                  showsUserLocation={false}
                  clusterMarkers={false}
                  cameraAutoFit
                />
              </View>
            </GlassCard>
          </Animated.View>
        ) : null}

        <IncidentUpdateTimeline updates={thread.updates} verifications={thread.verifications} />
      </KeyboardAwareScrollView>

      {!thread.isDemo ? (
        <StickyKeyboardFooter backgroundColor="transparent">
          {composeOpen ? (
            <GlassCard style={styles.compose}>
              <View style={styles.composeHeader}>
                <View style={styles.composeHeaderTitle}>
                  <Ionicons name="create-outline" size={16} color={colors.primary} />
                  <Text variant="label">Gelişme ekle</Text>
                </View>
                <Pressable onPress={() => setComposeOpen(false)} hitSlop={10}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceElevated,
                  },
                ]}
                placeholder="Son durumu paylaş..."
                placeholderTextColor={colors.textMuted}
                value={updateText}
                onChangeText={setUpdateText}
                multiline
                autoFocus
              />
              <IncidentMediaPicker media={updateMedia} onChange={setUpdateMedia} disabled={submitting} />
              <Button
                title="Gelişme Paylaş"
                onPress={handleAddUpdate}
                loading={submitting}
                disabled={!updateText.trim() && updateMedia.length === 0}
              />
            </GlassCard>
          ) : (
            <View style={styles.composeBar}>
              <Button
                title="Gelişme ekle"
                onPress={async () => {
                  if (!(await requireAuth('Gelişme ekleme'))) return;
                  setComposeOpen(true);
                }}
                fullWidth={false}
                style={styles.actionBtn}
              />
              <Button
                title="Doğrula"
                variant="outline"
                onPress={handleVerify}
                fullWidth={false}
                style={styles.actionBtn}
              />
            </View>
          )}
        </StickyKeyboardFooter>
      ) : null}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundCard: {
    marginTop: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  notFoundIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCard: {
    gap: spacing.sm,
    overflow: 'hidden',
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  mapWrap: {
    height: 160,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  compose: {
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  composeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  composeHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  composeBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
