import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { submitServiceReview } from '@/features/vora-hizmetler/services/reviewData';
import { VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const CRITERIA = [
  { key: 'quality' as const, label: 'İş Kalitesi' },
  { key: 'punctuality' as const, label: 'Dakiklik' },
  { key: 'cleanliness' as const, label: 'Temizlik' },
  { key: 'valueForMoney' as const, label: 'Fiyat Performans' },
  { key: 'communication' as const, label: 'İletişim' },
];

export function ServiceReviewForm() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [scores, setScores] = useState<Record<string, number>>({
    quality: 5,
    punctuality: 5,
    cleanliness: 5,
    valueForMoney: 5,
    communication: 5,
  });
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const setScore = (key: string, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!user?.id || !jobId) return;

    setSaving(true);
    const result = await submitServiceReview({
      jobId,
      reviewerId: user.id,
      quality: scores.quality,
      punctuality: scores.punctuality,
      cleanliness: scores.cleanliness,
      valueForMoney: scores.valueForMoney,
      communication: scores.communication,
      wouldRecommend,
      comment: comment.trim() || null,
    });
    setSaving(false);

    if (result.error) {
      Alert.alert('Hata', result.error);
      return;
    }

    Alert.alert('Teşekkürler', 'Değerlendirmeniz kaydedildi.', [
      { text: 'Tamam', onPress: () => router.back() },
    ]);
  };

  return (
    <GradientBackground>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
        bottomOffset={96}
      >
        <ScreenBackButton />
        <Text variant="h2" style={styles.heading}>
          Değerlendirme
        </Text>

        <GlassCard style={styles.form}>
          {CRITERIA.map(({ key, label }) => (
            <View key={key} style={styles.criteriaRow}>
              <Text variant="label">{label}</Text>
              <StarPicker value={scores[key]} onChange={(v) => setScore(key, v)} />
            </View>
          ))}

          <View style={styles.criteriaRow}>
            <Text variant="label">Tekrar Tercih Eder misiniz?</Text>
            <Pressable
              onPress={() => setWouldRecommend((v) => !v)}
              style={[styles.recommendBtn, { borderColor: colors.border }]}
            >
              <Ionicons
                name={wouldRecommend ? 'checkmark-circle' : 'close-circle-outline'}
                size={22}
                color={wouldRecommend ? '#10B981' : colors.textSecondary}
              />
              <Text variant="caption">{wouldRecommend ? 'Evet' : 'Hayır'}</Text>
            </Pressable>
          </View>

          <Input
            label="Yorum (isteğe bağlı)"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />
        </GlassCard>

        <Button title="Değerlendirmeyi Gönder" onPress={handleSubmit} loading={saving} />
      </KeyboardAwareScrollView>
    </GradientBackground>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable key={star} onPress={() => onChange(star)} hitSlop={8}>
          <Ionicons name={star <= value ? 'star' : 'star-outline'} size={24} color="#F59E0B" />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    paddingBottom: 120,
  },
  heading: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  criteriaRow: {
    gap: spacing.sm,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
  },
  recommendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
