import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OptionPicker } from '@/components/auth/OptionPicker';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { IdentityDocumentCapture } from '@/features/identity-verification/components/IdentityDocumentCapture';
import {
  IDENTITY_DOCUMENT_OPTIONS,
  IDENTITY_STATUS_LABELS,
  type IdentityDocumentType,
} from '@/features/identity-verification/constants';
import { submitVerificationRequest } from '@/features/identity-verification/services/submitVerificationRequest';
import { fetchLatestVerificationRequest } from '@/features/identity-verification/services/verificationStatus';
import type { IdentityVerificationRequest, PickedImage } from '@/features/identity-verification/types';
import {
  formatBirthDateInput,
  validateBirthDate,
} from '@/features/auth/services/validation';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type StepId = 0 | 1 | 2;

const STEPS: { id: StepId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 0, label: 'Bilgiler', icon: 'person-outline' },
  { id: 1, label: 'Belgeler', icon: 'card-outline' },
  { id: 2, label: 'Selfie', icon: 'happy-outline' },
];

export function IdentityVerificationScreen() {
  const { colors } = useTheme();
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState<IdentityVerificationRequest | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState<StepId>(0);

  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [documentType, setDocumentType] = useState<IdentityDocumentType | null>('national_id');
  const [idFront, setIdFront] = useState<PickedImage | null>(null);
  const [idBack, setIdBack] = useState<PickedImage | null>(null);
  const [selfie, setSelfie] = useState<PickedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const latest = await fetchLatestVerificationRequest(user.id);
    setRequest(latest);
    setShowForm(!profile?.is_verified && (!latest || latest.status === 'rejected'));
    setLoading(false);
  }, [user?.id, profile?.is_verified]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      if (profile.birth_date) {
        const [y, m, d] = profile.birth_date.split('-');
        setBirthDate(`${d}.${m}.${y}`);
      }
    }
  }, [profile]);

  useEffect(() => {
    void load();
  }, [load]);

  const backRequired = documentType !== 'passport';

  const stepDone: Record<StepId, boolean> = useMemo(
    () => ({
      0: Boolean(fullName.trim() && documentType && (!birthDate || !validateBirthDate(birthDate))),
      1: Boolean(idFront && (!backRequired || idBack)),
      2: Boolean(selfie),
    }),
    [fullName, documentType, birthDate, idFront, idBack, backRequired, selfie],
  );

  const validateStep = (target: StepId): string | null => {
    if (target === 0) {
      if (!fullName.trim()) return 'Ad soyad gereklidir.';
      const birthError = birthDate ? validateBirthDate(birthDate) : null;
      if (birthError) return birthError;
      if (!documentType) return 'Belge türü seçin.';
      return null;
    }
    if (target === 1) {
      if (!idFront) return 'Kimlik ön yüz fotoğrafı gereklidir.';
      if (backRequired && !idBack) return 'Kimlik arka yüz fotoğrafı gereklidir.';
      return null;
    }
    if (!selfie) return 'Selfie fotoğrafı gereklidir.';
    return null;
  };

  const goNext = () => {
    const validation = validateStep(step);
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    if (step < 2) setStep((step + 1) as StepId);
  };

  const goBack = () => {
    setError(null);
    if (step > 0) setStep((step - 1) as StepId);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!user?.id) {
      setError('Oturum bulunamadı.');
      return;
    }

    for (const s of [0, 1, 2] as StepId[]) {
      const validation = validateStep(s);
      if (validation) {
        setStep(s);
        setError(validation);
        return;
      }
    }

    setSubmitting(true);

    const birthIso = birthDate
      ? (() => {
          const parts = birthDate.split('.');
          if (parts.length !== 3) return null;
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        })()
      : null;

    const { error: submitError } = await submitVerificationRequest(user.id, {
      documentType: documentType as IdentityDocumentType,
      fullName: fullName.trim(),
      birthDate: birthIso,
      idFront: idFront as PickedImage,
      idBack,
      selfie: selfie as PickedImage,
    });

    setSubmitting(false);

    if (submitError) {
      setError(submitError);
      return;
    }

    Alert.alert('Başvuru alındı', 'Kimlik doğrulama başvurunuz incelenmek üzere gönderildi.');
    setIdFront(null);
    setIdBack(null);
    setSelfie(null);
    setStep(0);
    await load();
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.page}>
          <AuthHeader title="Kimlik Doğrulama" showBack />
          <Text secondary>Yükleniyor…</Text>
        </View>
      </GradientBackground>
    );
  }

  if (profile?.is_verified) {
    return (
      <GradientBackground>
        <ScrollView contentContainerStyle={styles.page}>
          <AuthHeader title="Kimlik Doğrulama" showBack />
          <GlassCard style={[styles.card, styles.centerCard]}>
            <View style={[styles.bigBadge, { backgroundColor: `${colors.success}22` }]}>
              <Ionicons name="shield-checkmark" size={44} color={colors.success} />
            </View>
            <Text variant="h2">Kimliğiniz doğrulandı</Text>
            <Text secondary style={styles.centerText}>
              Hesabınız doğrulanmış durumda. Profilinizde mavi rozet görünür.
            </Text>
          </GlassCard>
        </ScrollView>
      </GradientBackground>
    );
  }

  if (request && !showForm && (request.status === 'pending' || request.status === 'in_review')) {
    const inReview = request.status === 'in_review';
    return (
      <GradientBackground>
        <ScrollView contentContainerStyle={styles.page}>
          <AuthHeader title="Kimlik Doğrulama" showBack />
          <GlassCard style={[styles.card, styles.centerCard]}>
            <View style={[styles.bigBadge, { backgroundColor: `${colors.warning}22` }]}>
              <Ionicons
                name={inReview ? 'search' : 'time-outline'}
                size={44}
                color={colors.warning}
              />
            </View>
            <Text variant="h2">{IDENTITY_STATUS_LABELS[request.status].label}</Text>
            <Text secondary style={styles.centerText}>
              {IDENTITY_STATUS_LABELS[request.status].description}
            </Text>

            <View style={styles.timeline}>
              <View style={styles.timelineRow}>
                <View style={[styles.timelineDot, { backgroundColor: colors.success }]}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
                <View style={styles.timelineBody}>
                  <Text variant="label">Başvuru alındı</Text>
                  <Text variant="caption" secondary>
                    {new Date(request.createdAt).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
              <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
              <View style={styles.timelineRow}>
                <View
                  style={[
                    styles.timelineDot,
                    { backgroundColor: inReview ? colors.warning : colors.surfaceElevated, borderWidth: inReview ? 0 : 1, borderColor: colors.border },
                  ]}
                >
                  {inReview ? <Ionicons name="search" size={12} color="#fff" /> : null}
                </View>
                <View style={styles.timelineBody}>
                  <Text variant="label" secondary={!inReview}>
                    İnceleme
                  </Text>
                  <Text variant="caption" secondary>
                    Ekibimiz belgeleri kontrol ediyor
                  </Text>
                </View>
              </View>
              <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
              <View style={styles.timelineRow}>
                <View
                  style={[
                    styles.timelineDot,
                    { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
                  ]}
                />
                <View style={styles.timelineBody}>
                  <Text variant="label" secondary>
                    Sonuç
                  </Text>
                  <Text variant="caption" secondary>
                    Onaylanınca mavi rozet profilinize eklenir
                  </Text>
                </View>
              </View>
            </View>
          </GlassCard>

          <Button
            title="Durumu Yenile"
            variant="outline"
            onPress={async () => {
              await refreshProfile();
              await load();
            }}
          />
        </ScrollView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <AuthHeader
          title="Kimlik Doğrulama"
          subtitle="Kimliğinizi doğrulayarak profilinize mavi rozet kazanın"
          showBack
        />

        {request?.status === 'rejected' ? (
          <GlassCard style={[styles.card, { borderColor: colors.danger }]}>
            <View style={styles.rejectHeader}>
              <Ionicons name="close-circle" size={20} color={colors.danger} />
              <Text variant="label" style={{ color: colors.danger }}>
                Önceki başvuru reddedildi
              </Text>
            </View>
            <Text secondary variant="caption">
              {request.rejectionReason ?? 'Gerekçe belirtilmedi.'}
            </Text>
          </GlassCard>
        ) : null}

        <View style={styles.stepper}>
          {STEPS.map((s, i) => {
            const active = step === s.id;
            const done = stepDone[s.id] && step > s.id;
            return (
              <View key={s.id} style={styles.stepperItem}>
                {i > 0 ? (
                  <View
                    style={[
                      styles.stepperLine,
                      { backgroundColor: step >= s.id ? colors.primary : colors.border },
                    ]}
                  />
                ) : null}
                <Pressable
                  onPress={() => {
                    if (s.id < step) {
                      setError(null);
                      setStep(s.id);
                    }
                  }}
                  style={styles.stepperBtn}
                >
                  <View
                    style={[
                      styles.stepperDot,
                      {
                        backgroundColor: active || done ? colors.primary : colors.surfaceElevated,
                        borderColor: active || done ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={done ? 'checkmark' : s.icon}
                      size={16}
                      color={active || done ? '#fff' : colors.textSecondary}
                    />
                  </View>
                  <Text
                    variant="caption"
                    style={{
                      color: active ? colors.primary : colors.textSecondary,
                      fontWeight: active ? '700' : '500',
                    }}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {step === 0 ? (
          <GlassCard style={styles.card}>
            <Text variant="label">Kişisel Bilgiler</Text>
            <Text secondary variant="caption">
              Bilgiler kimlik belgenizdeki ile birebir aynı olmalıdır.
            </Text>
            <Input label="Ad Soyad" value={fullName} onChangeText={setFullName} placeholder="Ad Soyad" />
            <Input
              label="Doğum Tarihi"
              value={birthDate}
              onChangeText={(text) => setBirthDate(formatBirthDateInput(text))}
              placeholder="GG.AA.YYYY"
              keyboardType="number-pad"
              maxLength={10}
            />
            <OptionPicker
              label="Belge Türü"
              options={IDENTITY_DOCUMENT_OPTIONS}
              value={documentType}
              onChange={(value) => setDocumentType(value as IdentityDocumentType)}
            />
          </GlassCard>
        ) : null}

        {step === 1 ? (
          <GlassCard style={styles.card}>
            <Text variant="label">Belge Fotoğrafları</Text>
            <Text secondary variant="caption">
              Belgeyi düz bir zemine koyun; köşe kılavuzlarına oturacak şekilde, parlamadan çekin.
            </Text>

            <IdentityDocumentCapture
              label="Kimlik Ön Yüz"
              hint="Belgenin ön yüzü net ve okunaklı olsun"
              value={idFront}
              onChange={setIdFront}
              icon="card-outline"
            />
            <IdentityDocumentCapture
              label="Kimlik Arka Yüz"
              hint={
                documentType === 'passport'
                  ? 'Pasaport için arka yüz opsiyoneldir'
                  : 'Belgenin arka yüzü net ve okunaklı olsun'
              }
              value={idBack}
              onChange={setIdBack}
              required={backRequired}
              icon="card"
            />
          </GlassCard>
        ) : null}

        {step === 2 ? (
          <GlassCard style={styles.card}>
            <Text variant="label">Selfie</Text>
            <Text secondary variant="caption">
              Yüzünüz net görünsün; isterseniz kimlik belgenizi elinizde tutabilirsiniz.
            </Text>
            <IdentityDocumentCapture
              label="Selfie"
              hint="Ön kamerayla iyi aydınlatılmış bir ortamda çekin"
              value={selfie}
              onChange={setSelfie}
              shape="selfie"
            />
            <View style={[styles.privacyNote, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
              <Text variant="caption" secondary style={styles.privacyText}>
                Belgeleriniz şifreli saklanır, yalnızca doğrulama için kullanılır ve üçüncü
                taraflarla paylaşılmaz.
              </Text>
            </View>
          </GlassCard>
        ) : null}

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: `${colors.danger}18` }]}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text variant="caption" style={{ color: colors.danger, flex: 1 }}>
              {error}
            </Text>
          </View>
        ) : null}

        <View style={styles.navRow}>
          {step > 0 ? (
            <View style={styles.navBtn}>
              <Button title="Geri" variant="secondary" onPress={goBack} />
            </View>
          ) : null}
          <View style={styles.navBtn}>
            {step < 2 ? (
              <Button title="Devam" onPress={goNext} />
            ) : (
              <Button title="Başvuruyu Gönder" loading={submitting} onPress={handleSubmit} />
            )}
          </View>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: { gap: spacing.sm },
  centerCard: { alignItems: 'center', paddingVertical: spacing.xl },
  centerText: { textAlign: 'center' },
  bigBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  timeline: { alignSelf: 'stretch', marginTop: spacing.md, gap: 2 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  timelineLine: { width: 2, height: 18, marginLeft: 10 },
  timelineBody: { flex: 1, gap: 1 },
  rejectHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stepper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  stepperItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  stepperLine: { flex: 1, height: 2, marginBottom: 18 },
  stepperBtn: { alignItems: 'center', gap: 4 },
  stepperDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  privacyText: { flex: 1 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  navRow: { flexDirection: 'row', gap: spacing.sm },
  navBtn: { flex: 1 },
});
