import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { FullScreenMediaViewer } from '@/components/media/FullScreenMediaViewer';
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
import { useHizmetDocumentViewer } from '@/features/vora-hizmetler/hooks/useHizmetDocumentViewer';
import { useMyProviderProfile } from '@/features/vora-hizmetler/hooks/useProviderProfile';
import { uploadHizmetlerMedia } from '@/features/vora-hizmetler/services/mediaUpload';
import {
  addProviderCertificate,
  deleteProviderCertificate,
  fetchProviderCertificates,
} from '@/features/vora-hizmetler/services/providerData';
import type { ProviderCertificate } from '@/features/vora-hizmetler/types';
import * as ImagePicker from 'expo-image-picker';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export function ProviderCertificatesEditorScreen() {
  const { user } = useAuth();
  const { provider } = useMyProviderProfile(user?.id ?? null);
  const { imageViewer, opening, openDocument, closeViewer } = useHizmetDocumentViewer();
  const [items, setItems] = useState<ProviderCertificate[]>([]);
  const [title, setTitle] = useState('');
  const [issuedAt, setIssuedAt] = useState('');
  const [documentUri, setDocumentUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!provider?.id) return;
    const result = await fetchProviderCertificates(provider.id);
    setItems(result.items);
  }, [provider?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const pickDocument = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('İzin gerekli', 'Belge yüklemek için galeri izni verin.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setDocumentUri(result.assets[0].uri);
    }
  };

  const handleAdd = async () => {
    if (!user?.id || !provider?.id) return;
    if (!title.trim()) {
      Alert.alert('Başlık gerekli', 'Sertifika veya belge adını yazın.');
      return;
    }

    setSaving(true);
    let documentUrl: string | null = null;

    if (documentUri) {
      const upload = await uploadHizmetlerMedia(user.id, documentUri, 'certificates');
      if (upload.error) {
        setSaving(false);
        Alert.alert('Hata', upload.error);
        return;
      }
      documentUrl = upload.url;
    }

    const result = await addProviderCertificate({
      providerId: provider.id,
      title: title.trim(),
      documentUrl,
      issuedAt: issuedAt.trim() || null,
    });

    setSaving(false);

    if (result.error) {
      Alert.alert('Hata', result.error);
      return;
    }

    setTitle('');
    setIssuedAt('');
    setDocumentUri(null);
    await load();
  };

  const handleDelete = (item: ProviderCertificate) => {
    Alert.alert('Sil', `"${item.title}" silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const result = await deleteProviderCertificate(item.id);
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
        <Text variant="h2">Sertifikalar</Text>
        <Text secondary variant="body">
          Mesleki yeterlilik belgelerinizi ve sertifikalarınızı ekleyin.
        </Text>

        <GlassCard style={styles.form}>
          <Input label="Belge Adı" value={title} onChangeText={setTitle} placeholder="Elektrik Yeterlilik Belgesi" />
          <Input
            label="Veriliş Tarihi (opsiyonel)"
            value={issuedAt}
            onChangeText={setIssuedAt}
            placeholder="2024-06-01"
          />
          <Pressable onPress={pickDocument} style={styles.uploadBtn}>
            <Ionicons name="document-attach-outline" size={20} color={VORA_HIZMETLER_ACCENT} />
            <Text variant="label" style={{ color: VORA_HIZMETLER_ACCENT }}>
              {documentUri ? 'Belge seçildi' : 'Belge / fotoğraf yükle'}
            </Text>
          </Pressable>
          <Button title="Sertifika Ekle" onPress={handleAdd} loading={saving} />
        </GlassCard>

        <Text variant="label">Kayıtlı Belgeler ({items.length})</Text>
        {items.map((item) => (
          <GlassCard key={item.id} style={styles.item}>
            <View style={styles.itemHeader}>
              <View style={styles.itemBody}>
                <Text variant="label">{item.title}</Text>
                {item.issuedAt ? (
                  <Text secondary variant="caption">
                    {new Date(item.issuedAt).toLocaleDateString('tr-TR')}
                  </Text>
                ) : null}
              </View>
              <View style={styles.itemActions}>
                {item.documentUrl ? (
                  <Pressable
                    onPress={() => void openDocument(item.documentUrl!, item.title)}
                    disabled={opening}
                    hitSlop={8}
                  >
                    {opening ? (
                      <ActivityIndicator size="small" color={VORA_HIZMETLER_ACCENT} />
                    ) : (
                      <Ionicons name="open-outline" size={18} color={VORA_HIZMETLER_ACCENT} />
                    )}
                  </Pressable>
                ) : null}
                <Pressable onPress={() => handleDelete(item)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          </GlassCard>
        ))}
      </KeyboardAwareScrollView>

      <FullScreenMediaViewer
        urls={imageViewer?.urls ?? []}
        visible={Boolean(imageViewer)}
        startIndex={imageViewer?.startIndex ?? 0}
        onClose={closeViewer}
      />
    </GradientBackground>
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
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(14,165,233,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.2)',
  },
  item: {
    gap: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemBody: {
    flex: 1,
    gap: 2,
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
