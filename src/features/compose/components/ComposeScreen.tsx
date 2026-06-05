import { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { createPost } from '@/features/compose/services/createPost';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { FEED_FILTERS } from '@/features/feed/constants';
import { REGIONS } from '@/constants/regions';
import { DISTRICTS } from '@/constants/districts';
import type { RegionId } from '@/constants/regions';
import type { PostCategory } from '@/types/database';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

const CATEGORIES = FEED_FILTERS.filter(
  (f) => !['all', 'reels', 'following'].includes(f.id),
).map((f) => ({
  id: f.id as PostCategory,
  label: f.label,
}));

export function ComposeScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { requireAuth } = useRequireAuth();

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [category, setCategory] = useState<PostCategory>('general');
  const [mediaUris, setMediaUris] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState('');

  const regionId = (profile?.region_id ?? 'trabzon') as RegionId;
  const district = profile?.district ?? null;

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.8,
    });

    if (!result.canceled) {
      setMediaUris((prev) => [
        ...prev,
        ...result.assets.map((a) => a.uri).slice(0, 4 - prev.length),
      ]);
    }
  };

  const handleSubmit = async () => {
    if (!requireAuth('Paylaşım')) return;
    if (!user) return;
    if (!content.trim()) {
      Alert.alert('Eksik', 'İçerik yazmalısınız.');
      return;
    }

    setSubmitting(true);
    const { postId, error } = await createPost(
      {
        authorId: user.id,
        regionId,
        district,
        locationLabel: locationLabel.trim() || null,
        title: title.trim() || null,
        content: content.trim(),
        category,
        mediaUris,
      },
      (stage) => setProgress(stage === 'uploading' ? 'Medyalar yükleniyor...' : 'Kaydediliyor...'),
    );
    setSubmitting(false);
    setProgress('');

    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    Alert.alert('Paylaşıldı', 'Gönderiniz akışa eklendi.', [
      { text: 'Tamam', onPress: () => router.back() },
    ]);
    void postId;
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <AuthHeader title="Gönderi Oluştur" subtitle="Bölgenle paylaş" />

        <View style={[styles.field, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text variant="caption" secondary>
            Bölge: {REGIONS.find((r) => r.id === regionId)?.name}
            {district ? ` · ${district}` : ''}
          </Text>
        </View>

        <TextInput
          style={[styles.titleInput, { color: colors.text, borderColor: colors.border }]}
          placeholder="Başlık (isteğe bağlı)"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={[styles.contentInput, { color: colors.text, borderColor: colors.border }]}
          placeholder="Ne oluyor? #hashtag kullanabilirsin"
          placeholderTextColor={colors.textMuted}
          value={content}
          onChangeText={setContent}
          multiline
        />

        <TextInput
          style={[styles.locationInput, { color: colors.text, borderColor: colors.border }]}
          placeholder="Konum etiketi (ör. Trabzon Meydan)"
          placeholderTextColor={colors.textMuted}
          value={locationLabel}
          onChangeText={setLocationLabel}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => setCategory(cat.id)}
              style={[
                styles.chip,
                {
                  borderColor: category === cat.id ? colors.primary : colors.border,
                  backgroundColor: category === cat.id ? 'rgba(30,136,229,0.15)' : colors.surface,
                },
              ]}
            >
              <Text variant="caption" style={{ color: category === cat.id ? colors.primary : colors.textSecondary }}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          style={[styles.mediaBtn, { borderColor: colors.border }]}
          onPress={pickImages}
          disabled={mediaUris.length >= 4}
        >
          <Ionicons name="images-outline" size={22} color={colors.primary} />
          <Text variant="caption">Fotoğraf ekle ({mediaUris.length}/4)</Text>
        </Pressable>

        {mediaUris.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
            {mediaUris.map((uri, i) => (
              <View key={uri} style={styles.mediaWrap}>
                <Image source={{ uri }} style={styles.thumb} />
                <Pressable style={styles.removeMedia} onPress={() => setMediaUris((p) => p.filter((_, j) => j !== i))}>
                  <Ionicons name="close-circle" size={22} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}

        {progress ? <Text secondary variant="caption">{progress}</Text> : null}

        <Button title="Paylaş" onPress={handleSubmit} loading={submitting} disabled={!content.trim()} />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  field: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  titleInput: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, fontSize: 18, fontWeight: '600' },
  contentInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 120,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  locationInput: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, fontSize: 14 },
  chips: { gap: spacing.sm },
  chip: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  mediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    borderStyle: 'dashed',
    padding: spacing.md,
  },
  mediaRow: { gap: spacing.sm },
  mediaWrap: { position: 'relative' },
  thumb: { width: 80, height: 80, borderRadius: radius.md },
  removeMedia: { position: 'absolute', top: -6, right: -6 },
});
