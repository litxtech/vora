import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import { useMyProviderProfile } from '@/features/vora-hizmetler/hooks/useProviderProfile';
import { uploadHizmetlerMedia } from '@/features/vora-hizmetler/services/mediaUpload';
import {
  addProviderCertificate,
  setProviderWorkplaceVerified,
  syncProviderVerification,
} from '@/features/vora-hizmetler/services/providerData';
import { pickCoverImage } from '@/features/profile/services/profileImagePicker';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type VerifyItem = {
  key: 'identity' | 'workplace';
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  verified: boolean;
  actionLabel: string;
  onAction: () => void;
};

export function ProviderVerificationScreen() {
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const { provider, loading, reloadProfile } = useMyProviderProfile(user?.id ?? null);
  const [uploading, setUploading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      void syncProviderVerification(user.id).then(() => reloadProfile());
    }, [reloadProfile, user?.id]),
  );

  const handleWorkplaceUpload = async () => {
    if (!user?.id || !provider) return;

    const uri = await pickCoverImage();
    if (!uri) return;

    setUploading(true);
    const upload = await uploadHizmetlerMedia(user.id, uri, 'workplace');
    if (upload.error || !upload.url) {
      setUploading(false);
      Alert.alert('Hata', upload.error ?? 'Yükleme başarısız.');
      return;
    }

    const cert = await addProviderCertificate({
      providerId: provider.id,
      title: 'İşyeri Doğrulama',
      documentUrl: upload.url,
    });

    if (cert.error) {
      setUploading(false);
      Alert.alert('Hata', cert.error);
      return;
    }

    const verify = await setProviderWorkplaceVerified(provider.id, true);
    setUploading(false);

    if (verify.error) {
      Alert.alert('Hata', verify.error);
      return;
    }

    await reloadProfile();
    Alert.alert('Yüklendi', 'İşyeri fotoğrafınız kaydedildi.');
  };

  if (loading || !provider) {
    return (
      <GradientBackground>
        <ScreenBackButton />
        <Text variant="body" style={{ padding: spacing.lg }}>
          {loading ? 'Yükleniyor…' : 'Profil bulunamadı.'}
        </Text>
      </GradientBackground>
    );
  }

  const items: VerifyItem[] = [
    {
      key: 'identity',
      label: 'Kimlik Doğrulama',
      description: provider.identityVerified
        ? 'Kimliğiniz onaylandı. Güven rozeti profilinizde görünür.'
        : profile?.is_verified
          ? 'Kimlik doğrulamanız senkronlanıyor…'
          : 'Kimlik belgesi ve selfie ile doğrulama başlatın.',
      icon: 'person-circle-outline',
      verified: provider.identityVerified || !!profile?.is_verified,
      actionLabel: provider.identityVerified || profile?.is_verified ? 'Doğrulandı' : 'Başvur',
      onAction: () => router.push('/settings/identity-verification' as never),
    },
    {
      key: 'workplace',
      label: 'İşyeri Doğrulama',
      description: provider.workplaceVerified
        ? 'İşyeri fotoğrafınız onaylandı.'
        : 'Atölye, dükkan veya çalışma alanınızın fotoğrafını yükleyin.',
      icon: 'business-outline',
      verified: provider.workplaceVerified,
      actionLabel: provider.workplaceVerified ? 'Doğrulandı' : 'Fotoğraf Yükle',
      onAction: handleWorkplaceUpload,
    },
  ];

  const doneCount = items.filter((item) => item.verified).length;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <ScreenBackButton />
        <Text variant="h2">Doğrulama Merkezi</Text>
        <Text secondary variant="body">
          Doğrulanmış ustalar daha fazla iş alır. {doneCount}/2 tamamlandı.
        </Text>

        {items.map((item) => (
          <GlassCard key={item.key} style={styles.card}>
            <View style={styles.cardTop}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: item.verified ? '#22C55E18' : `${VORA_HIZMETLER_ACCENT}14` },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={24}
                  color={item.verified ? '#22C55E' : VORA_HIZMETLER_ACCENT}
                />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.titleRow}>
                  <Text variant="label">{item.label}</Text>
                  {item.verified ? (
                    <View style={styles.okBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                      <Text variant="caption" style={{ color: '#22C55E', fontWeight: '700' }}>
                        Onaylı
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text secondary variant="caption">
                  {item.description}
                </Text>
              </View>
            </View>
            {!item.verified ? (
              <Button
                title={item.actionLabel}
                variant="secondary"
                loading={item.key === 'workplace' && uploading}
                onPress={item.onAction}
                style={styles.actionBtn}
              />
            ) : null}
          </GlassCard>
        ))}

        <Pressable
          onPress={() => router.push('/vora-hizmetler/provider-edit' as never)}
          style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
        >
          <Text variant="caption" style={{ color: colors.textSecondary, textAlign: 'center' }}>
            Profil adını veya fotoğrafını değiştirmek için Profili Düzenle sayfasına gidin.
          </Text>
        </Pressable>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    paddingBottom: 96,
    gap: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  okBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    alignSelf: 'flex-start',
  },
});
