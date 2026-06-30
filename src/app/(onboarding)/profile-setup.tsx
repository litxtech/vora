import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { OnboardingProgress } from '@/components/auth/OnboardingProgress';
import { Button } from '@/components/ui/Button';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { RegionDistrictPicker } from '@/components/location/RegionDistrictPicker';
import type { RegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useOnboardingStore } from '@/features/auth/store/onboardingStore';
import { useTheme } from '@/providers/ThemeProvider';

export default function ProfileSetupScreen() {
  const { colors } = useTheme();
  const avatarUri = useOnboardingStore((s) => s.avatarUri);
  const regionId = useOnboardingStore((s) => s.regionId);
  const district = useOnboardingStore((s) => s.district);
  const bio = useOnboardingStore((s) => s.bio);
  const occupation = useOnboardingStore((s) => s.occupation);
  const setAvatarUri = useOnboardingStore((s) => s.setAvatarUri);
  const setRegionId = useOnboardingStore((s) => s.setRegionId);
  const setDistrict = useOnboardingStore((s) => s.setDistrict);
  const setBio = useOnboardingStore((s) => s.setBio);
  const setOccupation = useOnboardingStore((s) => s.setOccupation);
  const [error, setError] = useState<string | null>(null);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleContinue = () => {
    if (!regionId) {
      setError('Lütfen bir şehir seçin.');
      return;
    }
    if (!district) {
      setError('Lütfen bir ilçe seçin.');
      return;
    }
    setError(null);
    router.push('/(onboarding)/preferences');
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <OnboardingProgress currentStep={1} />
        <AuthHeader
          title="Profilini Oluştur"
          subtitle="Topluluğa katılmak için birkaç bilgi daha"
          showBack={false}
        />

        <Pressable style={styles.avatarWrap} onPress={pickAvatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
              <Text variant="caption" muted>
                Profil fotoğrafı ekle
              </Text>
            </View>
          )}
        </Pressable>

        <RegionDistrictPicker
          regionId={(regionId as RegionId) ?? null}
          district={district}
          onRegionChange={(id) => setRegionId(id)}
          onDistrictChange={setDistrict}
        />

        <Input
          label="Kısa Biyografi"
          value={bio}
          onChangeText={setBio}
          placeholder="Kendinizi kısaca tanıtın"
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />
        <Input
          label="Meslek (isteğe bağlı)"
          value={occupation}
          onChangeText={setOccupation}
          placeholder="Örn. Yazılım Geliştirici"
        />

        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

        <Button title="Devam Et" onPress={handleContinue} />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  avatarWrap: {
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  avatarPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
