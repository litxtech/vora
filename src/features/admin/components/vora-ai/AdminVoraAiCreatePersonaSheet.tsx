import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { createAiPersona, suggestKaradenizPersona, type VoraPresenceConfig } from '@/features/vora-ai/services/voraPresenceAdmin';
import { REGIONS } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  personaOptions?: Pick<VoraPresenceConfig, 'persona_username_style' | 'persona_avatar_mode'>;
};

export function AdminVoraAiCreatePersonaSheet({ visible, onClose, onCreated, personaOptions }: Props) {
  const { colors } = useTheme();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [district, setDistrict] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [regionId, setRegionId] = useState(REGIONS[0]?.id ?? 'trabzon');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [skipAvatar, setSkipAvatar] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const fillSuggestion = async () => {
    setSuggesting(true);
    const { error, profile } = await suggestKaradenizPersona(gender, regionId, personaOptions);
    setSuggesting(false);
    if (error || !profile) {
      Alert.alert('Hata', error ?? 'Öneri alınamadı.');
      return;
    }
    const noAvatar = profile.avatarUrl === '__none__';
    setSkipAvatar(noAvatar);
    setUsername(profile.username);
    setFullName(profile.fullName);
    setDistrict(profile.district);
    setBio(profile.bio);
    setAvatarUrl(noAvatar ? null : profile.avatarUrl);
  };

  useEffect(() => {
    if (!visible) return;
    setUsername('');
    setFullName('');
    setDistrict('');
    setBio('');
    setAvatarUrl(null);
    setSkipAvatar(false);
    setGender('female');
    setRegionId(REGIONS[0]?.id ?? 'trabzon');
  }, [visible]);

  const handleCreate = async () => {
    if (username.trim().length < 3) {
      Alert.alert('Eksik bilgi', 'Kullanıcı adı en az 3 karakter olmalı.');
      return;
    }
    if (fullName.trim().length < 2) {
      Alert.alert('Eksik bilgi', 'Ad soyad girin.');
      return;
    }

    setSaving(true);
    const { error, username: createdUsername } = await createAiPersona({
      username: username.trim(),
      fullName: fullName.trim(),
      gender,
      regionId,
      district: district.trim() || undefined,
      bio: bio.trim() || undefined,
      avatarUrl: skipAvatar ? '__none__' : avatarUrl ?? undefined,
    });
    setSaving(false);

    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    Alert.alert('Profil oluşturuldu', `@${createdUsername ?? username} uygulamada aktif.`);
    onCreated();
    onClose();
  };

  return (
    <Modal visible={visible} animationType={resolveModalAnimationType('slide')} transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={() => undefined}>
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.header}>
            <Text variant="label">Yeni Persona Profili</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Text secondary variant="caption">
              Türk isimleri ve bio ile oluşturulur. Profil fotoğrafı ayarları Genel sekmesinden gelir.
            </Text>

            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.previewAvatar} />
            ) : null}

            <Button
              title={suggesting ? 'Öneriliyor…' : 'Türk ismi & fotoğraf öner'}
              variant="outline"
              loading={suggesting}
              onPress={fillSuggestion}
            />

            <Text variant="caption" style={styles.blockLabel}>Cinsiyet</Text>
            <View style={styles.chipRow}>
              {(['female', 'male'] as const).map((value) => {
                const active = gender === value;
                return (
                  <Pressable
                    key={value}
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? `${colors.primary}18` : `${colors.surface}CC`,
                      },
                    ]}
                    onPress={() => setGender(value)}
                  >
                    <Text variant="caption" style={{ color: active ? colors.primary : colors.textSecondary, fontWeight: '700' }}>
                      {value === 'female' ? 'Kadın' : 'Erkek'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Field label="Kullanıcı adı" colors={colors}>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: `${colors.surface}CC` }]}
                placeholder="ornek_kullanici"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={setUsername}
              />
            </Field>

            <Field label="Ad soyad" colors={colors}>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: `${colors.surface}CC` }]}
                placeholder="Ayşe Yılmaz"
                placeholderTextColor={colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
              />
            </Field>

            <Text variant="caption" style={styles.blockLabel}>Bölge</Text>
            <View style={styles.chipRow}>
              {REGIONS.map((region) => {
                const active = regionId === region.id;
                return (
                  <Pressable
                    key={region.id}
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? `${colors.primary}18` : `${colors.surface}CC`,
                      },
                    ]}
                    onPress={() => setRegionId(region.id)}
                  >
                    <Text variant="caption" style={{ color: active ? colors.primary : colors.textSecondary, fontWeight: '600' }}>
                      {region.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Field label="İlçe (opsiyonel)" colors={colors}>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: `${colors.surface}CC` }]}
                placeholder="Ortahisar"
                placeholderTextColor={colors.textMuted}
                value={district}
                onChangeText={setDistrict}
              />
            </Field>

            <Field label="Bio" colors={colors}>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { color: colors.text, borderColor: colors.border, backgroundColor: `${colors.surface}CC` },
                ]}
                placeholder="Trabzon'da yaşıyorum. Sahil yürüyüşünü severim."
                placeholderTextColor={colors.textMuted}
                multiline
                value={bio}
                onChangeText={setBio}
              />
            </Field>

            <Button title="Profili Oluştur" loading={saving} onPress={handleCreate} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Field({
  label,
  colors,
  children,
}: {
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text variant="caption" style={styles.blockLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.xl,
  },
  handleWrap: { alignItems: 'center', paddingTop: spacing.sm },
  handle: { width: 42, height: 4, borderRadius: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  form: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.lg },
  field: { gap: spacing.xs },
  blockLabel: { fontWeight: '700', marginTop: spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  previewAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignSelf: 'center',
  },
});
