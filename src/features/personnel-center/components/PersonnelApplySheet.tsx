import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { StickyKeyboardFooter } from '@/components/keyboard/StickyKeyboardFooter';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { PERSONNEL_ACCENT } from '@/features/personnel-center/constants';
import { fetchMyJobSeekerProfile } from '@/features/job-seekers/services/seekerData';
import { hasUsableSeekerProfileContent } from '@/features/job-seekers/services/seekerProfileUtils';
import {
  buildDefaultApplicationForm,
  mergeFormWithSeekerProfile,
  validateApplicationForm,
} from '@/features/personnel-center/services/applicationFormUtils';
import type { ApplicantProfileSnapshot, JobApplicationFormData } from '@/features/personnel-center/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  visible: boolean;
  listingTitle: string;
  userId: string | null;
  onClose: () => void;
  onSubmit: (form: JobApplicationFormData, attachProfile: boolean) => Promise<void>;
};

function snapshotFromSeekerProfile(
  profile: Awaited<ReturnType<typeof fetchMyJobSeekerProfile>>,
): Omit<
  ApplicantProfileSnapshot,
  keyof JobApplicationFormData
> | null {
  if (!profile) return null;
  return {
    title: profile.title,
    occupation: profile.occupation,
    experienceYears: profile.experienceYears,
    skills: profile.skills,
    education: profile.education,
    intro: profile.intro,
    isReady: profile.isReady,
    salaryExpectation: profile.salaryExpectation,
  };
}

export function PersonnelApplySheet({
  visible,
  listingTitle,
  userId,
  onClose,
  onSubmit,
}: Props) {
  const { colors } = useTheme();
  const { profile, user } = useAuth();
  const [form, setForm] = useState<JobApplicationFormData>(() =>
    buildDefaultApplicationForm(profile, user?.email),
  );
  const [attachProfile, setAttachProfile] = useState(false);
  const [useSeekerProfileInfo, setUseSeekerProfileInfo] = useState(false);
  const [seekerProfile, setSeekerProfile] = useState<
    Awaited<ReturnType<typeof fetchMyJobSeekerProfile>> | null
  >(null);
  const [seekerExtras, setSeekerExtras] = useState<
    Omit<ApplicantProfileSnapshot, keyof JobApplicationFormData> | null
  >(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [footerHeight, setFooterHeight] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setForm(buildDefaultApplicationForm(profile, user?.email));
    setAttachProfile(false);
    setUseSeekerProfileInfo(false);
    setError(null);

    if (!userId) {
      setSeekerProfile(null);
      setSeekerExtras(null);
      return;
    }

    setLoadingProfile(true);
    fetchMyJobSeekerProfile(userId).then((loaded) => {
      setSeekerProfile(loaded);
      setSeekerExtras(snapshotFromSeekerProfile(loaded));
      const usable = hasUsableSeekerProfileContent(loaded);
      if (usable && loaded) {
        setUseSeekerProfileInfo(true);
        setAttachProfile(true);
        setForm((prev) => mergeFormWithSeekerProfile(prev, loaded));
      }
      setLoadingProfile(false);
    });
  }, [profile, user?.email, userId, visible]);

  const updateField = <K extends keyof JobApplicationFormData>(key: K, value: JobApplicationFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const profilePreview = useMemo(() => {
    if (!seekerExtras || !attachProfile) return null;
    return seekerExtras;
  }, [attachProfile, seekerExtras]);

  const seekerProfileUsable = hasUsableSeekerProfileContent(seekerProfile);

  const handleUseSeekerProfileToggle = () => {
    if (!seekerProfile || !seekerProfileUsable) return;
    setUseSeekerProfileInfo((prev) => {
      const next = !prev;
      if (next) {
        setForm((current) => mergeFormWithSeekerProfile(current, seekerProfile));
      } else {
        setForm(buildDefaultApplicationForm(profile, user?.email));
      }
      return next;
    });
    if (error) setError(null);
  };

  const handleSubmit = async () => {
    const validationError = validateApplicationForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(form, attachProfile && seekerProfileUsable);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              maxHeight: '92%',
            },
          ]}
        >
          <View style={styles.handle} />

          <KeyboardAwareScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            bottomOffset={footerHeight + spacing.md}
            extraKeyboardSpace={spacing.sm}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: footerHeight + spacing.md },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={[styles.headerIcon, { backgroundColor: `${PERSONNEL_ACCENT}18` }]}>
                <Ionicons name="document-text-outline" size={20} color={PERSONNEL_ACCENT} />
              </View>
              <View style={styles.headerCopy}>
                <Text variant="h3">Başvuru Formu</Text>
                <Text secondary variant="caption" numberOfLines={2}>
                  {listingTitle}
                </Text>
              </View>
            </View>

            <Text secondary variant="caption">
              Formu doldurun — iş arayan profiliniz olmasa da başvurabilirsiniz.
            </Text>

            <View style={styles.row}>
              <View style={styles.half}>
                <Input
                  label="Ad"
                  value={form.firstName}
                  onChangeText={(value) => updateField('firstName', value)}
                  placeholder="Adınız"
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
              <View style={styles.half}>
                <Input
                  label="Soyad"
                  value={form.lastName}
                  onChangeText={(value) => updateField('lastName', value)}
                  placeholder="Soyadınız"
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.half}>
                <Input
                  label="Yaş"
                  value={form.age}
                  onChangeText={(value) => updateField('age', value.replace(/[^\d]/g, ''))}
                  placeholder="Örn: 28"
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={styles.half}>
                <Input
                  label="Telefon"
                  value={form.phone}
                  onChangeText={(value) => updateField('phone', value)}
                  placeholder="05xx xxx xx xx"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                />
              </View>
            </View>

            <Input
              label="E-posta"
              value={form.email}
              onChangeText={(value) => updateField('email', value)}
              placeholder="ornek@mail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Input
              label="Özgeçmiş"
              value={form.resume}
              onChangeText={(value) => updateField('resume', value)}
              placeholder="Deneyimleriniz, eğitiminiz, yetenekleriniz ve neden bu ilana uygun olduğunuzu yazın..."
              multiline
              style={styles.resumeInput}
            />

            {seekerProfileUsable ? (
              <>
                <Pressable
                  onPress={handleUseSeekerProfileToggle}
                  style={[styles.profileRow, { borderColor: colors.border }]}
                >
                  <Ionicons
                    name={useSeekerProfileInfo ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={PERSONNEL_ACCENT}
                  />
                  <View style={styles.profileCopy}>
                    <Text variant="label">İş arayan profil bilgilerimi kullan</Text>
                    <Text secondary variant="caption">
                      Özgeçmiş alanı profilinizden otomatik doldurulur
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setAttachProfile((value) => !value)}
                  style={[styles.profileRow, { borderColor: colors.border }]}
                >
                  <Ionicons
                    name={attachProfile ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={PERSONNEL_ACCENT}
                  />
                  <View style={styles.profileCopy}>
                    <Text variant="label">İş arayan profil özetini ekle</Text>
                    <Text secondary variant="caption">
                      Yetenek, deneyim ve eğitim özeti başvuruya eklenir
                    </Text>
                  </View>
                </Pressable>
              </>
            ) : !loadingProfile ? (
              <Text secondary variant="caption">
                İsterseniz{' '}
                <Text
                  variant="caption"
                  style={{ color: PERSONNEL_ACCENT }}
                  onPress={() => router.push('/settings/job-seeker' as never)}
                >
                  iş arayan profili
                </Text>{' '}
                oluşturabilirsiniz — zorunlu değil.
              </Text>
            ) : null}

            {loadingProfile ? (
              <ActivityIndicator color={PERSONNEL_ACCENT} />
            ) : profilePreview ? (
              <View
                style={[
                  styles.preview,
                  { backgroundColor: `${PERSONNEL_ACCENT}10`, borderColor: `${PERSONNEL_ACCENT}33` },
                ]}
              >
                <Text variant="label">{profilePreview.title}</Text>
                <Text secondary variant="caption">
                  {[profilePreview.occupation, profilePreview.experienceYears != null ? `${profilePreview.experienceYears} yıl` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                {profilePreview.skills.length > 0 ? (
                  <Text variant="caption" numberOfLines={2}>
                    {profilePreview.skills.slice(0, 4).join(' · ')}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {error ? (
              <Text variant="caption" style={{ color: colors.danger }}>
                {error}
              </Text>
            ) : null}
          </KeyboardAwareScrollView>

          <StickyKeyboardFooter
            backgroundColor={colors.surface}
            style={[styles.footer, { borderTopColor: colors.border, paddingTop: spacing.sm }]}
            onLayoutHeight={setFooterHeight}
          >
            <View style={styles.actions}>
              <Button title="Vazgeç" variant="outline" onPress={onClose} style={styles.btn} />
              <Button
                title="Başvur"
                onPress={() => void handleSubmit()}
                loading={submitting}
                style={styles.btn}
              />
            </View>
          </StickyKeyboardFooter>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.45)',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  half: {
    flex: 1,
  },
  resumeInput: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  profileCopy: {
    flex: 1,
    gap: 2,
  },
  preview: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: {
    flex: 1,
  },
});
