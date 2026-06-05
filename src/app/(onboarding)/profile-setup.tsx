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
import { DISTRICTS } from '@/constants/districts';
import { PHASE_1_REGIONS } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useOnboardingStore } from '@/features/auth/store/onboardingStore';
import { useTheme } from '@/providers/ThemeProvider';

export default function ProfileSetupScreen() {
  const { colors } = useTheme();
  const { avatarUri, regionId, district, bio, occupation, setAvatarUri, setRegionId, setDistrict, setBio, setOccupation } =
    useOnboardingStore();
  const [error, setError] = useState<string | null>(null);

  const districts = regionId ? DISTRICTS[regionId as keyof typeof DISTRICTS] ?? [] : [];

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

        <Text variant="label" style={styles.sectionLabel}>
          Şehir
        </Text>
        <View style={styles.chipRow}>
          {PHASE_1_REGIONS.map((region) => (
            <Pressable
              key={region.id}
              style={[
                styles.chip,
                {
                  borderColor: regionId === region.id ? colors.primary : colors.border,
                  backgroundColor: regionId === region.id ? 'rgba(30,136,229,0.15)' : colors.surface,
                },
              ]}
              onPress={() => setRegionId(region.id)}
            >
              <Text variant="caption">{region.name}</Text>
            </Pressable>
          ))}
        </View>

        {districts.length > 0 ? (
          <>
            <Text variant="label" style={styles.sectionLabel}>
              İlçe
            </Text>
            <View style={styles.chipRow}>
              {districts.map((item) => (
                <Pressable
                  key={item}
                  style={[
                    styles.chip,
                    {
                      borderColor: district === item ? colors.primary : colors.border,
                      backgroundColor: district === item ? 'rgba(30,136,229,0.15)' : colors.surface,
                    },
                  ]}
                  onPress={() => setDistrict(item)}
                >
                  <Text variant="caption">{item}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

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
  sectionLabel: {
    marginTop: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
