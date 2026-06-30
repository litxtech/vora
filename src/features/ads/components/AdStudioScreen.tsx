import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { AdPreviewPanel } from '@/features/ads/components/AdPreviewPanel';
import { AdWalletTopupPanel } from '@/features/ads/components/AdWalletTopupPanel';
import { AdRegionPicker } from '@/features/ads/components/studio/AdRegionPicker';
import { AdStudioStepIndicator } from '@/features/ads/components/studio/AdStudioStepIndicator';
import {
  AD_CPC_CENTS,
  AD_CTA_OPTIONS,
  AD_SESSION_HOURS,
  AD_STUDIO_STEPS,
  AD_TYPES,
  INTEREST_OPTIONS,
  MIN_AD_BUDGET_CENTS,
  estimateClicksFromBudget,
  formatBudget,
  formatCpcKurus,
  type AdStudioStepId,
} from '@/features/ads/constants';
import { createPremiumAd } from '@/features/ads/services/adData';
import { uploadAdCreativeImage } from '@/features/ads/services/adImageUpload';
import { hasAdPolicyAccepted, saveAdPolicyAcceptance } from '@/features/ads/services/adPolicyConsent';
import { fetchAdWalletSummary } from '@/features/ads/services/adWallet';
import type { AdCtaLabel, AdStudioDraft, AdType, AdWalletSummary } from '@/features/ads/types';
import { fetchBusinessRecordByOwner } from '@/features/profile/services/businessProfile';
import { businessCategoryLabel } from '@/features/businesses/constants';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const EMPTY_DRAFT: AdStudioDraft = {
  title: '',
  description: '',
  adType: 'feed',
  audienceScope: 'general',
  targetRegionIds: [],
  targetDistrict: '',
  targetAgeMin: null,
  targetAgeMax: null,
  targetInterests: [],
  endsAt: null,
  ctaLabel: 'learn_more',
  destinationUrl: '',
  imageUrl: null,
  localImageUri: null,
};

export function AdStudioScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();
  const [step, setStep] = useState<AdStudioStepId>('placement');
  const [draft, setDraft] = useState<AdStudioDraft>(EMPTY_DRAFT);
  const [budgetText, setBudgetText] = useState('100');
  const [ageMinText, setAgeMinText] = useState('');
  const [ageMaxText, setAgeMaxText] = useState('');
  const [wallet, setWallet] = useState<AdWalletSummary | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const prefillApplied = useRef(false);

  const stepIndex = AD_STUDIO_STEPS.findIndex((s) => s.id === step);

  const loadMeta = useCallback(async () => {
    if (!user) return;
    const [w, business] = await Promise.all([fetchAdWalletSummary(), fetchBusinessRecordByOwner(user.id)]);
    setWallet(w);
    setBusinessId(business?.id ?? null);

    // Mağazası olan hesaplar için reklam taslağını tek seferlik otomatik doldur
    if (prefill === 'store' && business && !prefillApplied.current) {
      prefillApplied.current = true;
      const categoryLabel = businessCategoryLabel(business.category);
      setDraft((prev) => ({
        ...prev,
        adType: 'business',
        title: business.name,
        description:
          business.description?.trim() ||
          `${business.name} · ${categoryLabel}. Bizi ziyaret edin!`,
        ctaLabel: business.website ? 'visit' : 'contact',
        destinationUrl: business.website ?? '',
        imageUrl: business.coverUrl ?? business.logoUrl ?? null,
        localImageUri: null,
      }));
    }
  }, [user, prefill]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const patchDraft = (patch: Partial<AdStudioDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const previewData = useMemo(
    () => ({
      title: draft.title,
      description: draft.description,
      adType: draft.adType,
      imageUri: draft.localImageUri ?? draft.imageUrl,
      ctaLabel: draft.ctaLabel,
      advertiserName: profile?.username ?? 'Hesabınız',
      advertiserAvatarUrl: profile?.avatar_url ?? null,
    }),
    [draft, profile],
  );

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: draft.adType === 'reels' ? [9, 16] : [16, 9],
    });
    if (result.canceled || !result.assets[0]) return;
    patchDraft({ localImageUri: result.assets[0].uri });
  };

  const validateStep = (): string | null => {
    switch (step) {
      case 'placement':
        return null;
      case 'creative':
        if (!draft.title.trim()) return 'Reklam başlığı gerekli.';
        if (!draft.description.trim()) return 'Reklam metni gerekli.';
        return null;
      case 'audience':
        if (draft.audienceScope === 'regional' && draft.targetRegionIds.length === 0) {
          return 'Bölgesel hedefleme için en az bir şehir seçin.';
        }
        return null;
      case 'budget': {
        const budgetCents = Math.round(parseFloat(budgetText.replace(',', '.')) * 100);
        if (!Number.isFinite(budgetCents) || budgetCents < MIN_AD_BUDGET_CENTS) {
          return `Minimum kampanya bütçesi ${formatBudget(MIN_AD_BUDGET_CENTS)} olmalıdır.`;
        }
        return null;
      }
      case 'preview':
        return null;
      default:
        return null;
    }
  };

  const goNext = () => {
    const err = validateStep();
    if (err) {
      Alert.alert('Eksik bilgi', err);
      return;
    }
    const next = AD_STUDIO_STEPS[stepIndex + 1];
    if (next) setStep(next.id);
  };

  const goBack = () => {
    const prev = AD_STUDIO_STEPS[stepIndex - 1];
    if (prev) setStep(prev.id);
    else router.back();
  };

  const handlePublish = async () => {
    if (!user || !wallet) return;

    const err = validateStep();
    if (err || step !== 'preview') {
      Alert.alert('Eksik bilgi', err ?? 'Lütfen tüm adımları tamamlayın.');
      return;
    }

    if (wallet.balanceCents < wallet.cpcCents) {
      Alert.alert(
        'Bakiye gerekli',
        'Reklam yayınlamak için cüzdanınıza bakiye yükleyin. Her tıklamada 8 kuruş düşülür.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Reklam Merkezi', onPress: () => router.replace('/ads' as never) },
        ],
      );
      return;
    }

    if (!hasAdPolicyAccepted(profile?.policy_consents)) {
      Alert.alert(
        'Reklam Politikası',
        'İlk reklamınızı göndermeden önce Reklam Yayınlama Politikamızı okumanız ve bir kez onaylamanız gerekir.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Politikayı Oku', onPress: () => router.push('/ads/policy' as never) },
          {
            text: 'Okudum, Onaylıyorum',
            onPress: () => void acceptPolicyAndPublish(),
          },
        ],
      );
      return;
    }

    await submitAd();
  };

  const acceptPolicyAndPublish = async () => {
    if (!user) return;
    const { error } = await saveAdPolicyAcceptance(user.id, profile?.policy_consents ?? {});
    if (error) {
      Alert.alert('Hata', error);
      return;
    }
    await submitAd();
  };

  const submitAd = async () => {
    if (!user) return;
    setLoading(true);
    let imageUrl = draft.imageUrl;
    if (draft.localImageUri) {
      const uploaded = await uploadAdCreativeImage(user.id, draft.localImageUri);
      if (uploaded.error) {
        setLoading(false);
        Alert.alert('Görsel yüklenemedi', uploaded.error);
        return;
      }
      imageUrl = uploaded.url;
    }

    const budgetCents = Math.round(parseFloat(budgetText.replace(',', '.')) * 100);

    const { error } = await createPremiumAd(
      user.id,
      {
        title: draft.title.trim(),
        description: draft.description.trim(),
        imageUrl,
        ctaLabel: draft.ctaLabel,
        destinationUrl: draft.destinationUrl?.trim() || null,
        adType: draft.adType,
        billingMode: 'wallet_cpc',
        budgetCents,
        cpcCents: AD_CPC_CENTS,
        targetRegionIds: draft.audienceScope === 'general' ? [] : draft.targetRegionIds,
        targetDistrict: draft.targetDistrict?.trim() || null,
        targetAgeMin: ageMinText ? parseInt(ageMinText, 10) : null,
        targetAgeMax: ageMaxText ? parseInt(ageMaxText, 10) : null,
        targetInterests: draft.targetInterests,
        endsAt: null,
      },
      businessId,
    );
    setLoading(false);

    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    Alert.alert(
      'Gönderildi',
      `Reklam incelemeye gönderildi. Onaylandığında ${AD_SESSION_HOURS} saat yayınlanır; tıklamalar cüzdanınızdan ${formatCpcKurus(AD_CPC_CENTS)} düşülür.`,
      [{ text: 'Tamam', onPress: () => router.replace('/ads' as never) }],
    );
  };

  const budgetCentsPreview = Math.round(parseFloat(budgetText.replace(',', '.')) * 100) || 0;
  const estimatedClicks = estimateClicksFromBudget(budgetCentsPreview, AD_CPC_CENTS);

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.page,
            { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthHeader
            compact
            title="Reklam Stüdyosu"
            subtitle={`Tıklama ${formatCpcKurus(AD_CPC_CENTS)} · ${AD_SESSION_HOURS} saat oturum`}
          />
          <AdStudioStepIndicator step={step} />
          {wallet ? <AdWalletTopupPanel wallet={wallet} variant="compact" /> : null}

          <GlassCard style={styles.stepCard}>
            {step === 'placement' ? (
              <View style={styles.section}>
                <Text variant="label">Yerleşim seçin</Text>
                <View style={styles.typeGrid}>
                  {AD_TYPES.map((type) => {
                    const selected = draft.adType === type.id;
                    return (
                      <Pressable
                        key={type.id}
                        onPress={() => patchDraft({ adType: type.id as AdType })}
                        style={[
                          styles.typeCard,
                          {
                            borderColor: selected ? type.color : colors.border,
                            backgroundColor: selected ? `${type.color}14` : colors.surfaceElevated,
                          },
                        ]}
                      >
                        <Ionicons name={type.icon} size={24} color={type.color} />
                        <Text variant="caption" style={{ fontWeight: selected ? '700' : '500', textAlign: 'center' }}>
                          {type.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {step === 'creative' ? (
              <View style={styles.section}>
                <Input label="Başlık" value={draft.title} onChangeText={(title) => patchDraft({ title })} placeholder="Kampanya başlığı" />
                <Input
                  label="Ana metin"
                  value={draft.description}
                  onChangeText={(description) => patchDraft({ description })}
                  placeholder="Mesajınız"
                  multiline
                />
                <Pressable onPress={() => void pickImage()} style={[styles.imagePicker, { borderColor: colors.border }]}>
                  {draft.localImageUri ? (
                    <Image source={{ uri: draft.localImageUri }} style={styles.pickedImage} />
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={28} color={colors.primary} />
                      <Text secondary variant="caption">Görsel ekle</Text>
                    </>
                  )}
                </Pressable>
                <Text variant="label">CTA</Text>
                <View style={styles.chipRow}>
                  {AD_CTA_OPTIONS.map((cta) => (
                    <Button
                      key={cta.id}
                      title={cta.label}
                      fullWidth={false}
                      variant={draft.ctaLabel === cta.id ? 'primary' : 'outline'}
                      onPress={() => patchDraft({ ctaLabel: cta.id as AdCtaLabel })}
                    />
                  ))}
                </View>
                <Input
                  label="Hedef link"
                  value={draft.destinationUrl ?? ''}
                  onChangeText={(destinationUrl) => patchDraft({ destinationUrl })}
                  placeholder="https://"
                  autoCapitalize="none"
                />
              </View>
            ) : null}

            {step === 'audience' ? (
              <View style={styles.section}>
                <AdRegionPicker
                  scope={draft.audienceScope}
                  selected={draft.targetRegionIds}
                  onScopeChange={(audienceScope) => patchDraft({ audienceScope })}
                  onChange={(targetRegionIds) => patchDraft({ targetRegionIds })}
                />
                <Input
                  label="Hedef ilçe (opsiyonel)"
                  value={draft.targetDistrict ?? ''}
                  onChangeText={(targetDistrict) => patchDraft({ targetDistrict })}
                />
                <View style={styles.ageRow}>
                  <View style={styles.ageField}>
                    <Input label="Min yaş" value={ageMinText} onChangeText={setAgeMinText} keyboardType="numeric" />
                  </View>
                  <View style={styles.ageField}>
                    <Input label="Max yaş" value={ageMaxText} onChangeText={setAgeMaxText} keyboardType="numeric" />
                  </View>
                </View>
                <Text variant="label">İlgi alanları</Text>
                <View style={styles.chipRow}>
                  {INTEREST_OPTIONS.map((interest) => (
                    <Button
                      key={interest}
                      title={interest}
                      fullWidth={false}
                      variant={draft.targetInterests.includes(interest) ? 'primary' : 'outline'}
                      onPress={() =>
                        patchDraft({
                          targetInterests: draft.targetInterests.includes(interest)
                            ? draft.targetInterests.filter((i) => i !== interest)
                            : [...draft.targetInterests, interest],
                        })
                      }
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {step === 'budget' ? (
              <View style={styles.section}>
                <View style={[styles.infoBox, { backgroundColor: `${colors.primary}12` }]}>
                  <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                  <Text secondary variant="caption" style={styles.infoText}>
                    Sabit tıklama ücreti: {formatCpcKurus(AD_CPC_CENTS)}. Her tıklamada cüzdanınızdan düşülür;
                    bütçe dolunca veya bakiye bitince reklam durur.
                  </Text>
                </View>
                <Input label="Kampanya bütçe tavanı (₺)" value={budgetText} onChangeText={setBudgetText} keyboardType="numeric" />
                <View style={[styles.estimateBox, { borderColor: colors.border }]}>
                  <Text variant="caption" secondary>Tahmini tıklama (bütçe tavanı)</Text>
                  <Text variant="h3">{estimatedClicks.toLocaleString('tr-TR')}</Text>
                  <Text secondary variant="caption">
                    {formatBudget(budgetCentsPreview)} ÷ {formatCpcKurus(AD_CPC_CENTS)}
                  </Text>
                </View>
              </View>
            ) : null}

            {step === 'preview' ? (
              <View style={styles.section}>
                <Text variant="label">Canlı önizleme</Text>
                <AdPreviewPanel data={previewData} />
              </View>
            ) : null}
          </GlassCard>

          {step !== 'preview' ? <AdPreviewPanel data={previewData} /> : null}

          <View style={styles.actions}>
            <Button title="Geri" variant="outline" onPress={goBack} fullWidth={false} />
            {step === 'preview' ? (
              <Button
                title={loading ? 'Gönderiliyor…' : 'Yayınla'}
                onPress={() => void handlePublish()}
                loading={loading}
                disabled={loading}
                fullWidth={false}
              />
            ) : (
              <Button title="Devam" onPress={goNext} fullWidth={false} />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  stepCard: { gap: spacing.md },
  section: { gap: spacing.md },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeCard: {
    width: '47%',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    minHeight: 96,
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  imagePicker: {
    height: 180,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: spacing.xs,
  },
  pickedImage: { width: '100%', height: '100%' },
  ageRow: { flexDirection: 'row', gap: spacing.sm },
  ageField: { flex: 1 },
  infoBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  infoText: { flex: 1, lineHeight: 18 },
  estimateBox: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
