import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { DateAccessGate } from '@/features/date/components/DateAccessGate';
import { DateCard } from '@/features/date/components/DateCard';
import { DateUserSearchPicker } from '@/features/date/components/DateUserSearchPicker';
import {
  DATE_ACCENT,
  DATE_ACTIVITY_MAX,
  DATE_CATEGORY_MAX,
  DATE_DESCRIPTION_MAX,
  DATE_DESTINATION_MAX,
  DATE_LOOKING_FOR_MAX,
  DATE_SOUGHT_GENDER_OPTIONS,
  DATE_TITLE_MAX,
} from '@/features/date/constants';
import type { DateOuting, DateParticipant, DateSoughtGender } from '@/features/date/types';
import { createDateOuting } from '@/features/date/services/dateData';
import { fetchFriendsList, type FriendUser } from '@/features/profile/services/friendship';
import type { DateUserSnippet } from '@/features/date/services/dateProfiles';
import { snippetToParticipant } from '@/features/date/services/dateProfiles';
import { resolveMarketplaceRegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  maxLength: number;
  multiline?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        maxLength={maxLength}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
        ]}
      />
    </View>
  );
}

function CounterField({
  label,
  value,
  onChange,
  min = 1,
  max = 20,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.counterCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text variant="label">{label}</Text>
      <View style={styles.counterRow}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - 1))}
          style={[styles.counterBtn, { borderColor: colors.border }]}
        >
          <Ionicons name="remove" size={18} color={colors.text} />
        </Pressable>
        <Text variant="label" style={styles.counterValue}>
          {value}
        </Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          style={[styles.counterBtn, { borderColor: colors.border }]}
        >
          <Ionicons name="add" size={18} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

export function DateCreateScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [activity, setActivity] = useState('');
  const [destination, setDestination] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [organizerCount, setOrganizerCount] = useState(1);
  const [seekingCount, setSeekingCount] = useState(1);
  const [soughtGender, setSoughtGender] = useState<DateSoughtGender>('any');
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [selectedOrganizers, setSelectedOrganizers] = useState<DateUserSnippet[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const friendSnippets = useMemo(
    (): DateUserSnippet[] =>
      friends.map((friend) => ({
        id: friend.id,
        username: friend.username,
        fullName: friend.fullName,
        avatarUrl: friend.avatarUrl,
        gender: null,
      })),
    [friends],
  );

  const previewOrganizers = useMemo((): DateParticipant[] => {
    const me: DateParticipant[] =
      user && profile
        ? [
            {
              userId: user.id,
              username: profile.username,
              fullName: profile.full_name ?? null,
              avatarUrl: profile.avatar_url ?? null,
              gender: profile.gender === 'female' || profile.gender === 'male' ? profile.gender : null,
              isCreator: true,
            },
          ]
        : [];
    return [...me, ...selectedOrganizers.map((item) => snippetToParticipant(item))];
  }, [profile, selectedOrganizers, user]);

  useEffect(() => {
    if (!user) return;
    void fetchFriendsList(user.id, user.id).then(setFriends);
  }, [user]);

  const previewOuting = useMemo((): DateOuting => ({
    id: 'preview',
    creatorId: user?.id ?? '',
    title: title.trim() || 'Date başlığı',
    activity: activity.trim() || 'Ne yapılacak',
    destination: destination.trim() || 'Nereye',
    lookingFor: lookingFor.trim() || 'Ne aranıyor',
    category: category.trim() || null,
    organizerCount,
    seekingCount,
    approvedCount: 0,
    soughtGender,
    scheduledAt: null,
    description: description.trim() || null,
    status: 'open',
    regionId: resolveMarketplaceRegionId(profile?.region_id) ?? null,
    createdAt: new Date().toISOString(),
    organizers: previewOrganizers,
    approvedMembers: [],
    conversationId: null,
    myPendingRequestId: null,
    isOrganizer: true,
    isApprovedMember: false,
  }), [
    activity,
    category,
    description,
    destination,
    lookingFor,
    organizerCount,
    profile?.region_id,
    seekingCount,
    soughtGender,
    title,
    previewOrganizers,
    user?.id,
  ]);

  useEffect(() => {
    setOrganizerCount(1 + selectedOrganizers.length);
  }, [selectedOrganizers.length]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !activity.trim() || !destination.trim() || !lookingFor.trim()) {
      Alert.alert('Eksik bilgi', 'Başlık, aktivite, yer ve aranan kişi bilgisi zorunludur.');
      return;
    }

    setSubmitting(true);
    const { id, error } = await createDateOuting({
      title: title.trim(),
      activity: activity.trim(),
      destination: destination.trim(),
      lookingFor: lookingFor.trim(),
      organizerCount,
      seekingCount,
      soughtGender,
      category: category.trim() || null,
      description: description.trim() || null,
      regionId: resolveMarketplaceRegionId(profile?.region_id) ?? null,
      organizerUserIds: selectedOrganizers.map((item) => item.id),
    });
    setSubmitting(false);

    if (error || !id) {
      Alert.alert('Oluşturulamadı', error ?? 'Bilinmeyen hata');
      return;
    }

    router.replace(`/date-center/${id}` as Href);
  }, [
    activity,
    category,
    description,
    destination,
    lookingFor,
    organizerCount,
    profile?.region_id,
    seekingCount,
    soughtGender,
    selectedOrganizers,
    title,
  ]);

  return (
    <DateAccessGate>
      <GradientBackground style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <ScreenBackButton />
          <Text variant="h2" style={styles.headerTitle}>
            Date oluştur
          </Text>
        </View>

        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          bottomOffset={24}
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
        >
          <DateCard outing={previewOuting} onPress={() => {}} showJoinAction={false} />

          <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FormField label="Başlık" value={title} onChangeText={setTitle} placeholder="Antalya hafta sonu" maxLength={DATE_TITLE_MAX} />
            <FormField label="Ne yapılacak?" value={activity} onChangeText={setActivity} placeholder="Tatil, yemek, içmek..." maxLength={DATE_ACTIVITY_MAX} />
            <FormField label="Nereye?" value={destination} onChangeText={setDestination} placeholder="Antalya, merkez cafe..." maxLength={DATE_DESTINATION_MAX} />
            <FormField label="Ne aranıyor?" value={lookingFor} onChangeText={setLookingFor} placeholder="2 kız, eğlenceli grup..." maxLength={DATE_LOOKING_FOR_MAX} multiline />
            <FormField label="Kategori (serbest)" value={category} onChangeText={setCategory} placeholder="Tatil, gece, spor..." maxLength={DATE_CATEGORY_MAX} />

            <Text variant="label" style={styles.fieldGap}>
              Aranan cinsiyet *
            </Text>
            <View style={styles.genderRow}>
              {DATE_SOUGHT_GENDER_OPTIONS.map((opt) => {
                const active = soughtGender === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setSoughtGender(opt.id)}
                    style={[
                      styles.genderChip,
                      {
                        borderColor: active ? DATE_ACCENT : colors.border,
                        backgroundColor: active ? `${DATE_ACCENT}14` : 'transparent',
                      },
                    ]}
                  >
                    <Text variant="caption" style={{ fontWeight: '700', color: active ? DATE_ACCENT : colors.text }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.counterGrid}>
              <CounterField label="Biz kaç kişiyiz?" value={organizerCount} onChange={setOrganizerCount} />
              <CounterField label="Kaç kişi arıyoruz?" value={seekingCount} onChange={setSeekingCount} />
            </View>

            <DateUserSearchPicker
              label="Bizden kimler var? (opsiyonel)"
              hint="Arkadaşını veya kullanıcı adıyla bulduğun kişiyi gruba ekle."
              selected={selectedOrganizers}
              onChangeSelected={setSelectedOrganizers}
              excludeUserIds={user ? [user.id] : []}
              quickPicks={friendSnippets}
              quickPicksLabel="Arkadaşlarından hızlı seç"
            />

            <FormField
              label="Açıklama (opsiyonel)"
              value={description}
              onChangeText={setDescription}
              placeholder="Bütçe, kurallar, detaylar..."
              maxLength={DATE_DESCRIPTION_MAX}
              multiline
            />
          </View>

          <Button
            title={submitting ? 'Paylaşılıyor...' : 'Date\'i paylaş'}
            onPress={() => void handleSubmit()}
            disabled={submitting}
            style={styles.submit}
          />
        </KeyboardAwareScrollView>
      </GradientBackground>
    </DateAccessGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  headerTitle: { fontWeight: '800', flex: 1 },
  scroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  formCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.md,
  },
  field: { gap: spacing.xs },
  fieldGap: { marginTop: spacing.xs },
  input: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  genderChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  counterGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  counterCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    minWidth: 28,
    textAlign: 'center',
    fontWeight: '800',
  },
  friendsBlock: { gap: spacing.sm },
  submit: {
    marginTop: spacing.sm,
  },
});
