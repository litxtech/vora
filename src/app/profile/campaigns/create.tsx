import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { fetchBusinessByOwner } from '@/features/profile/services/businessProfile';
import { createBusinessCampaign } from '@/features/profile/services/campaignCreate';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export default function CreateCampaignRoute() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchBusinessByOwner(user.id).then((b) => setBusinessId(b?.id ?? null));
  }, [user?.id]);

  const handleSubmit = async () => {
    if (!user || !businessId) return;
    if (!title.trim() || !description.trim()) {
      Alert.alert('Eksik', 'Başlık ve açıklama gerekli.');
      return;
    }
    setSaving(true);
    const { error } = await createBusinessCampaign(businessId, user.id, {
      title: title.trim(),
      description: description.trim(),
    });
    setSaving(false);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }
    Alert.alert('Yayınlandı', 'Kampanyanız profilinizde görünecek.', [
      { text: 'Tamam', onPress: () => router.back() },
    ]);
  };

  if (!user) return null;

  if (!businessId) {
    return (
      <GradientBackground>
        <View style={[styles.centered, { paddingTop: insets.top + spacing.md }]}>
          <AuthHeader title="Kampanya Oluştur" subtitle="Onaylı işletme hesabı gerekli" />
          <Text secondary>Onaylı işletme hesabı gerekli.</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader title="Kampanya Oluştur" subtitle="İşletme profilinizde yayınlanır" />

        <GlassCard style={styles.section}>
          <Text variant="label">Başlık</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            placeholder="Örn: Yaz İndirimi %20"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text variant="label">Açıklama</Text>
          <TextInput
            style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border }]}
            placeholder="Kampanya detayları..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
          />
        </GlassCard>

        <Button title={saving ? 'Kaydediliyor...' : 'Yayınla'} onPress={handleSubmit} disabled={saving} />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing.lg, gap: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  section: { gap: spacing.sm },
  input: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
});
