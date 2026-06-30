import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { OptionPicker } from '@/components/auth/OptionPicker';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
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

export function IdentityVerificationScreen() {
  const { colors } = useTheme();
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState<IdentityVerificationRequest | null>(null);
  const [showForm, setShowForm] = useState(false);

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

  const handleSubmit = async () => {
    setError(null);

    if (!user?.id) {
      setError('Oturum bulunamadı.');
      return;
    }

    if (!fullName.trim()) {
      setError('Ad soyad gereklidir.');
      return;
    }

    const birthError = birthDate ? validateBirthDate(birthDate) : null;
    if (birthError) {
      setError(birthError);
      return;
    }

    if (!documentType) {
      setError('Belge türü seçin.');
      return;
    }

    if (!idFront) {
      setError('Kimlik ön yüz fotoğrafı gereklidir.');
      return;
    }

    if (documentType !== 'passport' && !idBack) {
      setError('Kimlik arka yüz fotoğrafı gereklidir.');
      return;
    }

    if (!selfie) {
      setError('Selfie fotoğrafı gereklidir.');
      return;
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
      documentType,
      fullName: fullName.trim(),
      birthDate: birthIso,
      idFront,
      idBack,
      selfie,
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
          <GlassCard style={styles.card}>
            <Text variant="h2">✅ Kimliğiniz doğrulandı</Text>
            <Text secondary>
              Hesabınız doğrulanmış durumda. Profilinizde mavi rozet görünür.
            </Text>
          </GlassCard>
        </ScrollView>
      </GradientBackground>
    );
  }

  if (request && !showForm && (request.status === 'pending' || request.status === 'in_review')) {
    const status = IDENTITY_STATUS_LABELS[request.status];
    return (
      <GradientBackground>
        <ScrollView contentContainerStyle={styles.page}>
          <AuthHeader title="Kimlik Doğrulama" showBack />
          <GlassCard style={styles.card}>
            <Text variant="h2">
              {status.emoji} {status.label}
            </Text>
            <Text secondary>{status.description}</Text>
            <Text secondary variant="caption">
              Başvuru tarihi:{' '}
              {new Date(request.createdAt).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </GlassCard>
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
            <Text variant="label" style={{ color: colors.danger }}>
              Önceki başvuru reddedildi
            </Text>
            <Text secondary variant="caption">
              {request.rejectionReason ?? 'Gerekçe belirtilmedi.'}
            </Text>
          </GlassCard>
        ) : null}

        <GlassCard style={styles.card}>
          <Text variant="label">Kişisel Bilgiler</Text>
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

        <GlassCard style={styles.card}>
          <Text variant="label">Belgeler</Text>
          <Text secondary variant="caption">
            Belgelerin net, okunaklı ve güncel olduğundan emin olun. Verileriniz yalnızca doğrulama
            amacıyla kullanılır.
          </Text>

          <IdentityDocumentCapture
            label="Kimlik Ön Yüz"
            hint="Kimliğinizin ön yüzünü çekin veya yükleyin."
            value={idFront}
            onChange={setIdFront}
          />
          <IdentityDocumentCapture
            label="Kimlik Arka Yüz"
            hint={
              documentType === 'passport'
                ? 'Pasaport için arka yüz opsiyoneldir.'
                : 'Kimliğinizin arka yüzünü çekin veya yükleyin.'
            }
            value={idBack}
            onChange={setIdBack}
            required={documentType !== 'passport'}
          />
          <IdentityDocumentCapture
            label="Selfie"
            hint="Yüzünüzün net göründüğü bir selfie çekin. Kimlik belgesini elinizde tutabilirsiniz."
            value={selfie}
            onChange={setSelfie}
          />
        </GlassCard>

        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

        <Button title="Başvuruyu Gönder" loading={submitting} onPress={handleSubmit} />

        <Button
          title="Profili Yenile"
          variant="ghost"
          onPress={async () => {
            await refreshProfile();
            await load();
          }}
        />
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
});
