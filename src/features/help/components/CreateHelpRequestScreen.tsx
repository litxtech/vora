import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { CenterShell } from '@/features/centers/components/CenterShell';
import {
  HELP_CATEGORY_OPTIONS,
  HELP_CENTER_ACCENT,
  HELP_MAX_DESCRIPTION_LENGTH,
  HELP_MAX_TITLE_LENGTH,
  HELP_MIN_DESCRIPTION_LENGTH,
  HELP_MIN_TITLE_LENGTH,
  HELP_URGENCY_OPTIONS,
  helpRequestDetailPath,
  type HelpCategory,
  type HelpUrgency,
} from '@/features/help/constants';
import { createHelpRequest } from '@/features/help/services/helpData';
import { regionNameById } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function CreateHelpRequestScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();

  const [category, setCategory] = useState<HelpCategory>('other');
  const [urgency, setUrgency] = useState<HelpUrgency>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [saving, setSaving] = useState(false);

  const regionId = profile?.region_id ?? 'trabzon';
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();

  const handleSubmit = async () => {
    if (!user?.id) return;

    if (
      trimmedTitle.length < HELP_MIN_TITLE_LENGTH ||
      trimmedTitle.length > HELP_MAX_TITLE_LENGTH
    ) {
      Alert.alert(
        'Eksik başlık',
        `Başlık ${HELP_MIN_TITLE_LENGTH}–${HELP_MAX_TITLE_LENGTH} karakter arasında olmalıdır.`,
      );
      return;
    }
    if (
      trimmedDescription.length < HELP_MIN_DESCRIPTION_LENGTH ||
      trimmedDescription.length > HELP_MAX_DESCRIPTION_LENGTH
    ) {
      Alert.alert(
        'Eksik açıklama',
        `Açıklama ${HELP_MIN_DESCRIPTION_LENGTH}–${HELP_MAX_DESCRIPTION_LENGTH} karakter arasında olmalıdır.`,
      );
      return;
    }

    setSaving(true);
    const result = await createHelpRequest({
      authorId: user.id,
      regionId,
      category,
      urgency,
      title: trimmedTitle,
      description: trimmedDescription,
      contactInfo: contactInfo.trim() || null,
    });
    setSaving(false);

    if (result.error || !result.id) {
      Alert.alert('Hata', result.error ?? 'Talep oluşturulamadı.');
      return;
    }

    Alert.alert('Talep yayınlandı', 'Yardım talebiniz bölgenizde görünecek.', [
      { text: 'Tamam', onPress: () => router.replace(helpRequestDetailPath(result.id!) as never) },
    ]);
  };

  return (
    <CenterShell
      title="Yardım Talebi"
      subtitle="Acil ihtiyacınızı bölgenizle paylaşın"
      keyboardAware
    >
      <GlassCard style={styles.form}>
        <View style={[styles.regionNote, { backgroundColor: `${HELP_CENTER_ACCENT}12` }]}>
          <Ionicons name="location-outline" size={18} color={HELP_CENTER_ACCENT} />
          <Text variant="caption" style={{ color: HELP_CENTER_ACCENT, flex: 1 }}>
            Bölge: {regionNameById(regionId) ?? regionId}
          </Text>
        </View>

        <Text variant="label">Kategori</Text>
        <View style={styles.chipGrid}>
          {HELP_CATEGORY_OPTIONS.map((option) => {
            const selected = category === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setCategory(option.value)}
                style={[
                  styles.chip,
                  {
                    borderColor: selected ? option.color : colors.border,
                    backgroundColor: selected ? `${option.color}16` : colors.surface,
                  },
                ]}
              >
                <Ionicons
                  name={option.icon as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color={selected ? option.color : colors.textMuted}
                />
                <Text variant="caption" style={{ color: selected ? option.color : colors.text, fontWeight: '600' }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text variant="label">Aciliyet</Text>
        <View style={styles.urgencyRow}>
          {HELP_URGENCY_OPTIONS.map((option) => {
            const selected = urgency === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setUrgency(option.value)}
                style={[
                  styles.urgencyChip,
                  {
                    borderColor: selected ? option.color : colors.border,
                    backgroundColor: selected ? `${option.color}18` : colors.surface,
                  },
                ]}
              >
                <Text variant="caption" style={{ color: selected ? option.color : colors.textSecondary, fontWeight: '700' }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Input label="Başlık" value={title} onChangeText={setTitle} placeholder="Örn: O Rh- kan ihtiyacı" />
        <Text variant="caption" secondary style={styles.counter}>
          {trimmedTitle.length}/{HELP_MAX_TITLE_LENGTH}
        </Text>

        <Input
          label="Açıklama"
          value={description}
          onChangeText={(text) => setDescription(text.slice(0, HELP_MAX_DESCRIPTION_LENGTH))}
          placeholder="Detaylı bilgi yazın..."
          multiline
          numberOfLines={5}
          style={styles.textarea}
        />
        <Text variant="caption" secondary style={styles.counter}>
          {trimmedDescription.length}/{HELP_MAX_DESCRIPTION_LENGTH}
        </Text>

        <Input
          label="İletişim (opsiyonel)"
          value={contactInfo}
          onChangeText={setContactInfo}
          placeholder="Telefon numarası"
          keyboardType="phone-pad"
        />

        <Button title="Talebi Paylaş" onPress={() => void handleSubmit()} loading={saving} />
      </GlassCard>
    </CenterShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  regionNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  urgencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  urgencyChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  textarea: { minHeight: 120, textAlignVertical: 'top' },
  counter: { alignSelf: 'flex-end', marginTop: -spacing.sm },
});
