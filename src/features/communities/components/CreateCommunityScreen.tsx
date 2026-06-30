import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { REGIONS } from '@/constants/regions';
import { COMMUNITY_CATEGORIES } from '@/features/communities/constants';
import { createCommunity } from '@/features/communities/services/communityData';
import type { CommunityCategory } from '@/features/communities/types';
import type { RegionId } from '@/constants/regions';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function CreateCommunityScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rulesSummary, setRulesSummary] = useState('');
  const [category, setCategory] = useState<CommunityCategory>('general');
  const [regionId, setRegionId] = useState<RegionId | null>((profile?.region_id as RegionId) ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!user || !name.trim()) {
      setError('Topluluk adı gerekli.');
      return;
    }

    setLoading(true);
    setError(null);

    const community = await createCommunity(
      {
        name: name.trim(),
        description: description.trim(),
        regionId,
        category,
        rulesSummary: rulesSummary.trim(),
      },
      user.id,
    );

    setLoading(false);

    if (!community) {
      setError('Topluluk oluşturulamadı.');
      return;
    }

    router.replace(`/communities/${community.id}` as never);
  };

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <AuthHeader
          title="Topluluk Oluştur"
          subtitle="Gönderi, sohbet ve etkinliklerle canlı bir topluluk kurun"
        />

        <Input label="Topluluk Adı" value={name} onChangeText={setName} placeholder="Örn. Trabzonspor" />
        <Input
          label="Açıklama"
          value={description}
          onChangeText={setDescription}
          placeholder="Topluluk hakkında kısa bilgi"
          multiline
        />
        <Input
          label="Kurallar"
          value={rulesSummary}
          onChangeText={setRulesSummary}
          placeholder="Temel kurallarınızı yazın"
          multiline
        />

        <Text variant="label" style={styles.label}>
          Kategori
        </Text>
        <View style={styles.chipRow}>
          {COMMUNITY_CATEGORIES.map((c) => (
            <Button
              key={c.id}
              title={c.label}
              fullWidth={false}
              variant={category === c.id ? 'primary' : 'outline'}
              onPress={() => setCategory(c.id)}
            />
          ))}
        </View>

        <Text variant="label" style={styles.label}>
          Bölge (opsiyonel)
        </Text>
        <View style={styles.chipRow}>
          <Button
            title="Karadeniz Geneli"
            fullWidth={false}
            variant={regionId === null ? 'primary' : 'outline'}
            onPress={() => setRegionId(null)}
          />
          {REGIONS.map((r) => (
            <Button
              key={r.id}
              title={r.name}
              fullWidth={false}
              variant={regionId === r.id ? 'primary' : 'outline'}
              onPress={() => setRegionId(r.id)}
            />
          ))}
        </View>

        {error ? (
          <Text variant="caption" style={{ color: colors.danger }}>
            {error}
          </Text>
        ) : null}

        <Button title="Oluştur" onPress={handleCreate} loading={loading} />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  label: {
    marginTop: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
