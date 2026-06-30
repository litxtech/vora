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
import type { RegionId } from '@/constants/regions';
import { CHANNEL_TYPES } from '@/features/channels/constants';
import { createChannel } from '@/features/channels/services/channelData';
import type { ChannelType } from '@/features/channels/types';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function CreateChannelScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [channelType, setChannelType] = useState<ChannelType>('news');
  const [regionId, setRegionId] = useState<RegionId | null>((profile?.region_id as RegionId) ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!user || !name.trim()) {
      setError('Kanal adı gerekli.');
      return;
    }

    setLoading(true);
    setError(null);

    const channel = await createChannel(
      {
        name: name.trim(),
        description: description.trim(),
        channelType,
        regionId,
      },
      user.id,
    );

    setLoading(false);

    if (!channel) {
      setError('Kanal oluşturulamadı.');
      return;
    }

    router.replace(`/channels/${channel.id}` as never);
  };

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <AuthHeader title="Kanal Oluştur" subtitle="Tek yönlü yayın kanalı açın" />

        <Input label="Kanal Adı" value={name} onChangeText={setName} placeholder="Örn. Trabzon Haber" />
        <Input
          label="Açıklama"
          value={description}
          onChangeText={setDescription}
          placeholder="Kanal hakkında kısa bilgi"
          multiline
        />

        <Text variant="label" style={styles.label}>
          Kanal Türü
        </Text>
        <View style={styles.chipRow}>
          {CHANNEL_TYPES.map((t) => (
            <Button
              key={t.id}
              title={t.label}
              fullWidth={false}
              variant={channelType === t.id ? 'primary' : 'outline'}
              onPress={() => setChannelType(t.id)}
            />
          ))}
        </View>

        <Text variant="label" style={styles.label}>
          Bölge
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
