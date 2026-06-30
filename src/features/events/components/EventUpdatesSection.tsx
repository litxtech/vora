import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { createEventUpdate, fetchEventUpdates, type EventUpdate } from '@/features/events/services/eventUpdates';
import { uploadEventCover } from '@/features/events/services/coverUpload';
import { formatEventDate } from '@/features/events/constants';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type EventUpdatesSectionProps = {
  eventId: string;
  organizerId: string;
  isDemo?: boolean;
};

export function EventUpdatesSection({ eventId, organizerId, isDemo }: EventUpdatesSectionProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [updates, setUpdates] = useState<EventUpdate[]>([]);
  const [content, setContent] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isOrganizer = user?.id === organizerId;

  const load = useCallback(() => {
    if (isDemo) return;
    fetchEventUpdates(eventId).then(setUpdates);
  }, [eventId, isDemo]);

  useEffect(() => {
    load();
  }, [load]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled && result.assets[0]) setMediaUri(result.assets[0].uri);
  };

  const handlePost = async () => {
    if (!user?.id || !content.trim()) return;
    setSaving(true);

    let mediaUrls: string[] = [];
    if (mediaUri) {
      const { url } = await uploadEventCover(user.id, `${eventId}-update-${Date.now()}`, mediaUri);
      if (url) mediaUrls = [url];
    }

    const result = await createEventUpdate(eventId, user.id, content, mediaUrls);
    setSaving(false);

    if (result.error) {
      Alert.alert('Hata', result.error);
      return;
    }

    setContent('');
    setMediaUri(null);
    load();
  };

  if (isDemo) return null;

  return (
    <GlassCard style={styles.section}>
      <Text variant="label">Etkinlik Güncellemeleri</Text>

      {isOrganizer ? (
        <View style={styles.composer}>
          <Input
            value={content}
            onChangeText={setContent}
            placeholder="Duyuru veya güncelleme paylaş..."
            multiline
            numberOfLines={3}
            style={styles.input}
          />
          {mediaUri ? (
            <Image source={{ uri: mediaUri }} style={styles.preview} />
          ) : null}
          <View style={styles.composerActions}>
            <Button title="Fotoğraf" variant="ghost" onPress={pickPhoto} />
            <Button title="Paylaş" loading={saving} onPress={handlePost} disabled={!content.trim()} />
          </View>
        </View>
      ) : null}

      {updates.length === 0 ? (
        <Text secondary variant="caption">
          Henüz güncelleme yok.
        </Text>
      ) : (
        <ScrollView style={styles.list} nestedScrollEnabled>
          {updates.map((update) => (
            <View key={update.id} style={[styles.updateRow, { borderColor: colors.border }]}>
              <View style={styles.updateHeader}>
                <Ionicons name="megaphone-outline" size={16} color={colors.primary} />
                <Text variant="caption">{update.authorName ?? 'Organizatör'}</Text>
                <Text secondary variant="caption">
                  {formatEventDate(update.createdAt)}
                </Text>
              </View>
              <Text secondary>{update.content}</Text>
              {update.mediaUrls[0] ? (
                <Image source={{ uri: update.mediaUrls[0] }} style={styles.updateImage} />
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  composer: {
    gap: spacing.sm,
  },
  input: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  preview: {
    width: '100%',
    height: 140,
    borderRadius: 12,
  },
  composerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  list: {
    maxHeight: 280,
  },
  updateRow: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  updateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  updateImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginTop: spacing.xs,
  },
});
