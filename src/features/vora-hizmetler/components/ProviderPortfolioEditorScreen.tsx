import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import { useMyProviderProfile } from '@/features/vora-hizmetler/hooks/useProviderProfile';
import { uploadHizmetlerMedia } from '@/features/vora-hizmetler/services/mediaUpload';
import {
  addPortfolioItem,
  deletePortfolioItem,
  fetchProviderPortfolio,
} from '@/features/vora-hizmetler/services/providerData';
import { sharePortfolioItemToFeed } from '@/features/vora-hizmetler/services/portfolioShare';
import type { ProviderPortfolioItem } from '@/features/vora-hizmetler/types';
import { pickCoverImage } from '@/features/profile/services/profileImagePicker';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export function ProviderPortfolioEditorScreen() {
  const { user } = useAuth();
  const { provider } = useMyProviderProfile(user?.id ?? null);
  const [items, setItems] = useState<ProviderPortfolioItem[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [beforeUri, setBeforeUri] = useState<string | null>(null);
  const [afterUri, setAfterUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!provider?.id) return;
    const result = await fetchProviderPortfolio(provider.id);
    setItems(result.items);
  }, [provider?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const pickBefore = async () => {
    const uri = await pickCoverImage();
    if (uri) setBeforeUri(uri);
  };

  const pickAfter = async () => {
    const uri = await pickCoverImage();
    if (uri) setAfterUri(uri);
  };

  const handleAdd = async () => {
    if (!user?.id || !provider?.id) return;
    if (!title.trim()) {
      Alert.alert('Başlık gerekli', 'İş için kısa bir başlık yazın.');
      return;
    }

    setSaving(true);
    let beforeUrl: string | null = null;
    let afterUrl: string | null = null;

    if (beforeUri) {
      const upload = await uploadHizmetlerMedia(user.id, beforeUri, 'portfolio');
      if (upload.error) {
        setSaving(false);
        Alert.alert('Hata', upload.error);
        return;
      }
      beforeUrl = upload.url;
    }

    if (afterUri) {
      const upload = await uploadHizmetlerMedia(user.id, afterUri, 'portfolio');
      if (upload.error) {
        setSaving(false);
        Alert.alert('Hata', upload.error);
        return;
      }
      afterUrl = upload.url;
    }

    const result = await addPortfolioItem({
      providerId: provider.id,
      title: title.trim(),
      description: description.trim() || null,
      beforeImageUrl: beforeUrl,
      afterImageUrl: afterUrl,
    });

    setSaving(false);

    if (result.error) {
      Alert.alert('Hata', result.error);
      return;
    }

    setTitle('');
    setDescription('');
    setBeforeUri(null);
    setAfterUri(null);
    await load();
  };

  const handleDelete = (item: ProviderPortfolioItem) => {
    Alert.alert('Sil', `"${item.title}" portfolyodan kaldırılsın mı?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const result = await deletePortfolioItem(item.id);
          if (result.error) Alert.alert('Hata', result.error);
          else await load();
        },
      },
    ]);
  };

  if (!provider) {
    return (
      <GradientBackground>
        <ScreenBackButton />
        <Text variant="body" style={{ padding: spacing.lg }}>
          Önce usta profilinizi oluşturun.
        </Text>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <KeyboardAwareScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" bottomOffset={96}>
        <ScreenBackButton />
        <Text variant="h2">Portfolyo</Text>
        <Text secondary variant="body">
          Tamamladığınız işlerin önce/sonra fotoğraflarını ekleyin. Eklediğiniz işler usta profilinizde ve ana
          profilinizde görünür; paylaş simgesiyle akışta da yayınlayabilirsiniz.
        </Text>

        <GlassCard style={styles.form}>
          <Input label="İş Başlığı" value={title} onChangeText={setTitle} placeholder="Mutfak tadilatı" />
          <Input
            label="Açıklama"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
            placeholder="Kısa açıklama…"
          />
          <View style={styles.photoRow}>
            <PhotoSlot label="Önce" uri={beforeUri} onPress={pickBefore} />
            <PhotoSlot label="Sonra" uri={afterUri} onPress={pickAfter} />
          </View>
          <Button title="Portfolyoya Ekle" onPress={handleAdd} loading={saving} />
        </GlassCard>

        <Text variant="label">Mevcut İşler ({items.length})</Text>
        {items.length === 0 ? (
          <Text secondary variant="body">
            Henüz portfolyo eklenmemiş.
          </Text>
        ) : (
          items.map((item) => (
            <GlassCard key={item.id} style={styles.item}>
              <View style={styles.itemHeader}>
                <Text variant="label">{item.title}</Text>
                <View style={styles.itemActions}>
                  <Pressable onPress={() => void sharePortfolioItemToFeed(item)} hitSlop={8}>
                    <Ionicons name="share-social-outline" size={18} color={VORA_HIZMETLER_ACCENT} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(item)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
              {item.description ? (
                <Text secondary variant="caption">
                  {item.description}
                </Text>
              ) : null}
              <View style={styles.photoRow}>
                {item.beforeImageUrl ? (
                  <Image source={{ uri: item.beforeImageUrl }} style={styles.thumb} />
                ) : null}
                {item.afterImageUrl ? (
                  <Image source={{ uri: item.afterImageUrl }} style={styles.thumb} />
                ) : null}
              </View>
            </GlassCard>
          ))
        )}
      </KeyboardAwareScrollView>
    </GradientBackground>
  );
}

function PhotoSlot({ label, uri, onPress }: { label: string; uri: string | null; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.photoSlot}>
      {uri ? (
        <Image source={{ uri }} style={styles.thumb} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Ionicons name="camera-outline" size={22} color={VORA_HIZMETLER_ACCENT} />
          <Text variant="caption" style={{ color: VORA_HIZMETLER_ACCENT }}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    paddingBottom: 96,
    gap: spacing.lg,
  },
  form: {
    gap: spacing.md,
  },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoSlot: {
    flex: 1,
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(14,165,233,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.2)',
    borderRadius: radius.lg,
  },
  thumb: {
    width: '100%',
    height: '100%',
    borderRadius: radius.lg,
  },
  item: {
    gap: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
