import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { OptionPicker } from '@/components/auth/OptionPicker';
import {
  JOB_MAX_WORKPLACE_PHOTOS,
  JOB_TYPE_OPTIONS,
  PERSONNEL_ACCENT,
  PERSONNEL_GRADIENT,
  SALARY_TYPE_OPTIONS,
  jobTypeLabel,
} from '@/features/personnel-center/constants';
import {
  createJobListing,
  fetchJobListingForEdit,
  fetchMyBusiness,
  removeJobListing,
  updateJobListing,
} from '@/features/personnel-center/services/listingData';
import {
  fetchPersonnelCenterStats,
  type PersonnelCenterStats,
} from '@/features/personnel-center/services/personnelStats';
import { uploadJobWorkplaceImages } from '@/features/personnel-center/services/workplaceMediaUpload';
import { PersonnelMotivationBanner } from '@/features/personnel-center/components/PersonnelMotivationBanner';
import { EmployerNameChip } from '@/features/personnel-center/components/EmployerNameChip';
import type { JobType, SalaryType } from '@/features/personnel-center/types';
import { DISTRICTS } from '@/constants/districts';
import type { RegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

function FormSection({
  step,
  title,
  subtitle,
  children,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <LinearGradient colors={[`${PERSONNEL_ACCENT}44`, `${PERSONNEL_ACCENT}22`]} style={styles.stepBadge}>
          <Text variant="caption" style={{ color: PERSONNEL_ACCENT, fontWeight: '800' }}>
            {step}
          </Text>
        </LinearGradient>
        <View style={styles.sectionTitles}>
          <Text variant="label">{title}</Text>
          {subtitle ? (
            <Text secondary variant="caption">
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function LivePreviewCard({
  title,
  description,
  employerDisplayName,
  jobType,
  salaryType,
  salaryRange,
  district,
  housingProvided,
  mealProvided,
  isUrgent,
  workplacePhotoUris,
}: {
  title: string;
  description: string;
  employerDisplayName: string;
  jobType: JobType;
  salaryType: SalaryType;
  salaryRange: string;
  district: string;
  housingProvided: boolean;
  mealProvided: boolean;
  isUrgent: boolean;
  workplacePhotoUris: string[];
}) {
  const { colors } = useTheme();
  const coverUri = workplacePhotoUris[0] ?? null;
  const salaryLabel =
    salaryType === 'negotiable'
      ? 'Görüşülecek'
      : salaryRange.trim() || (salaryType === 'net' ? 'Net maaş' : 'Maaş aralığı');

  return (
    <View style={[styles.previewCard, { borderColor: `${PERSONNEL_ACCENT}33` }]}>
      <Text variant="caption" style={[styles.previewLabel, { color: PERSONNEL_ACCENT }]}>
        Canlı önizleme
      </Text>

      {coverUri ? (
        <View style={styles.previewHeroWrap}>
          <Image source={{ uri: coverUri }} style={styles.previewHeroImage} />
        </View>
      ) : (
        <LinearGradient colors={[`${PERSONNEL_ACCENT}44`, `${PERSONNEL_ACCENT}18`]} style={styles.previewHero}>
          <View style={styles.previewBadges}>
            {isUrgent ? (
              <View style={[styles.previewBadge, { backgroundColor: colors.danger }]}>
                <Ionicons name="flash" size={10} color="#fff" />
                <Text variant="caption" style={styles.previewBadgeText}>
                  Acil
                </Text>
              </View>
            ) : null}
            <View style={[styles.previewBadge, { backgroundColor: `${PERSONNEL_ACCENT}DD` }]}>
              <Text variant="caption" style={styles.previewBadgeText}>
                {jobTypeLabel(jobType)}
              </Text>
            </View>
          </View>
          <Text variant="label" numberOfLines={2} style={styles.previewTitle}>
            {title.trim() || 'Pozisyon başlığınız'}
          </Text>
          {employerDisplayName.trim() ? (
            <EmployerNameChip name={employerDisplayName.trim()} variant="inline" />
          ) : null}
          <Text variant="caption" style={styles.previewSalary}>
            {salaryLabel}
          </Text>
        </LinearGradient>
      )}

      <View style={coverUri ? styles.previewTextBelow : undefined}>
        {coverUri ? (
          <>
            <View style={styles.previewBadges}>
              {isUrgent ? (
                <View style={[styles.previewBadgeMuted, { backgroundColor: `${colors.danger}18` }]}>
                  <Ionicons name="flash" size={10} color={colors.danger} />
                  <Text variant="caption" style={{ color: colors.danger, fontWeight: '700' }}>
                    Acil
                  </Text>
                </View>
              ) : null}
              <View style={[styles.previewBadgeMuted, { backgroundColor: `${PERSONNEL_ACCENT}14` }]}>
                <Text variant="caption" style={{ color: PERSONNEL_ACCENT, fontWeight: '700' }}>
                  {jobTypeLabel(jobType)}
                </Text>
              </View>
            </View>
            <Text variant="label" numberOfLines={2}>
              {title.trim() || 'Pozisyon başlığınız'}
            </Text>
            {employerDisplayName.trim() ? (
              <EmployerNameChip name={employerDisplayName.trim()} variant="inline" />
            ) : null}
            <Text variant="caption" style={{ color: PERSONNEL_ACCENT, fontWeight: '800' }}>
              {salaryLabel}
            </Text>
          </>
        ) : null}
      </View>

      {description.trim() ? (
        <Text secondary variant="caption" numberOfLines={2}>
          {description}
        </Text>
      ) : null}

      <View style={styles.previewMeta}>
        {district ? (
          <View style={styles.previewMetaRow}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text secondary variant="caption">
              {district}
            </Text>
          </View>
        ) : null}
        {housingProvided || mealProvided ? (
          <View style={styles.previewMetaRow}>
            <Ionicons name="home-outline" size={13} color={colors.textMuted} />
            <Text secondary variant="caption">
              {[housingProvided ? 'Konaklama' : null, mealProvided ? 'Yemek' : null].filter(Boolean).join(' · ')}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function WorkplacePhotoTile({
  uri,
  index,
  onRemove,
  onSetCover,
}: {
  uri: string;
  index: number;
  onRemove: () => void;
  onSetCover: () => void;
}) {
  const { colors } = useTheme();
  const isCover = index === 0;

  return (
    <View style={styles.photoTile}>
      <Pressable
        onPress={onSetCover}
        onLongPress={onRemove}
        style={[
          styles.photoFrame,
          {
            borderColor: isCover ? PERSONNEL_ACCENT : colors.border,
            backgroundColor: colors.surfaceElevated,
          },
        ]}
      >
        <Image source={{ uri }} style={styles.photo} />
        <Pressable
          onPress={onRemove}
          hitSlop={6}
          style={[styles.photoRemove, { backgroundColor: colors.danger, borderColor: colors.surface }]}
        >
          <Ionicons name="close" size={12} color="#fff" />
        </Pressable>
      </Pressable>
      <Text
        variant="caption"
        numberOfLines={1}
        style={[
          styles.photoCaption,
          { color: isCover ? PERSONNEL_ACCENT : colors.textMuted, fontWeight: isCover ? '700' : '500' },
        ]}
      >
        {isCover ? 'Kapak görseli' : `Görsel ${index + 1}`}
      </Text>
    </View>
  );
}

type Props = {
  editJobId?: string;
};

export function CreateJobScreen({ editJobId: editJobIdProp }: Props) {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const paramId = Array.isArray(params.id) ? params.id[0] : params.id;
  const editJobId = editJobIdProp ?? paramId;
  const isEdit = Boolean(editJobId);

  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user, profile } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [district, setDistrict] = useState(profile?.district ?? '');
  const [experienceRequired, setExperienceRequired] = useState('');
  const [jobType, setJobType] = useState<JobType>('full_time');
  const [salaryType, setSalaryType] = useState<SalaryType>('negotiable');
  const [housingProvided, setHousingProvided] = useState(false);
  const [mealProvided, setMealProvided] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [employerDisplayName, setEmployerDisplayName] = useState('');
  const [hasLinkedBusiness, setHasLinkedBusiness] = useState(false);
  const [workplacePhotoUris, setWorkplacePhotoUris] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingJob, setLoadingJob] = useState(isEdit);
  const [centerStats, setCenterStats] = useState<PersonnelCenterStats | null>(null);

  const regionId = profile?.region_id ?? 'trabzon';
  const districts = DISTRICTS[regionId as RegionId] ?? [];

  const completionScore = useMemo(() => {
    let score = 0;
    if (title.trim()) score += 25;
    if (description.trim()) score += 25;
    if (district) score += 15;
    if (salaryType === 'negotiable' || salaryRange.trim()) score += 15;
    if (jobType) score += 10;
    if (workplacePhotoUris.length > 0) score += 10;
    if (employerDisplayName.trim()) score += 5;
    return score;
  }, [title, description, district, salaryType, salaryRange, jobType, workplacePhotoUris.length, employerDisplayName]);

  useEffect(() => {
    fetchPersonnelCenterStats(regionId).then(setCenterStats);
  }, [regionId]);

  useEffect(() => {
    if (!user?.id) return;
    if (!isEdit) {
      fetchMyBusiness(user.id).then((biz) => {
        if (biz) {
          setBusinessId(biz.id);
          setHasLinkedBusiness(true);
          if (biz.name) setEmployerDisplayName(biz.name);
          if (biz.district) setDistrict(biz.district);
        }
      });
    }
  }, [user?.id, isEdit]);

  useEffect(() => {
    if (!isEdit || !editJobId || !user?.id) return;

    setLoadingJob(true);
    fetchJobListingForEdit(editJobId, user.id).then((record) => {
      setLoadingJob(false);
      if (!record) {
        Alert.alert('Düzenlenemez', 'İlan bulunamadı veya yetkiniz yok.', [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
        return;
      }
      setTitle(record.title);
      setDescription(record.description);
      setSalaryRange(record.salaryRange ?? '');
      setDistrict(record.district ?? '');
      setExperienceRequired(record.experienceRequired ?? '');
      setJobType(record.jobType);
      setSalaryType(record.salaryType);
      setHousingProvided(record.housingProvided);
      setMealProvided(record.mealProvided);
      setIsUrgent(record.isUrgent);
      setEmployerDisplayName(record.employerDisplayName ?? record.businessName ?? '');
      setWorkplacePhotoUris(record.workplaceMediaUrls ?? []);
    });
  }, [isEdit, editJobId, user?.id]);

  const pickWorkplacePhotos = async () => {
    const remaining = JOB_MAX_WORKPLACE_PHOTOS - workplacePhotoUris.length;
    if (remaining <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled) {
      setWorkplacePhotoUris((prev) =>
        [...prev, ...result.assets.map((a) => a.uri)].slice(0, JOB_MAX_WORKPLACE_PHOTOS),
      );
    }
  };

  const removeWorkplacePhoto = (index: number) => {
    setWorkplacePhotoUris((prev) => prev.filter((_, i) => i !== index));
  };

  const setCoverWorkplacePhoto = (index: number) => {
    if (index === 0) return;
    setWorkplacePhotoUris((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next;
    });
  };

  const handleRemove = () => {
    if (!editJobId || !user?.id) return;
    Alert.alert('İlanı Kaldır', 'İş ilanı yayından kaldırılacak. Devam etmek istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          const result = await removeJobListing(editJobId, user.id);
          setSaving(false);
          if (result.error) Alert.alert('Hata', result.error);
          else Alert.alert('Kaldırıldı', 'İş ilanı yayından kaldırıldı.', [
            { text: 'Tamam', onPress: () => router.replace('/personnel-center' as never) },
          ]);
        },
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    if (!title.trim() || !description.trim()) {
      Alert.alert('Eksik bilgi', 'Pozisyon ve açıklama zorunludur.');
      return;
    }
    if (salaryType !== 'negotiable' && !salaryRange.trim()) {
      Alert.alert('Maaş', 'Maaş bilgisi girin veya "Görüşülecek" seçin.');
      return;
    }

    let latitude: number | undefined;
    let longitude: number | undefined;
    if (!isEdit) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      }
    }

    setSaving(true);

    const localUris = workplacePhotoUris.filter((u) => !u.startsWith('http'));
    const remoteUris = workplacePhotoUris.filter((u) => u.startsWith('http'));
    const uploaded = localUris.length ? await uploadJobWorkplaceImages(user.id, localUris) : [];
    const workplaceMediaUrls = [...remoteUris, ...uploaded].slice(0, JOB_MAX_WORKPLACE_PHOTOS);

    if (isEdit && editJobId) {
      const result = await updateJobListing(editJobId, user.id, {
        employerDisplayName: employerDisplayName.trim() || null,
        title: title.trim(),
        description: description.trim(),
        jobType,
        salaryRange: salaryType === 'negotiable' ? null : salaryRange.trim() || null,
        salaryType,
        district: district || null,
        housingProvided,
        mealProvided,
        experienceRequired: experienceRequired.trim() || null,
        isUrgent,
        workplaceMediaUrls,
      });
      setSaving(false);
      if (result.error) {
        Alert.alert('Hata', result.error);
        return;
      }
      Alert.alert('Güncellendi', 'İş ilanı kaydedildi.', [
        { text: 'Tamam', onPress: () => router.replace(`/detail/jobs/${editJobId}` as never) },
      ]);
      return;
    }

    const result = await createJobListing({
      authorId: user.id,
      businessId,
      employerDisplayName: employerDisplayName.trim() || null,
      regionId,
      title: title.trim(),
      description: description.trim(),
      jobType,
      salaryRange: salaryType === 'negotiable' ? null : salaryRange.trim() || null,
      salaryType,
      district: district || null,
      housingProvided,
      mealProvided,
      experienceRequired: experienceRequired.trim() || null,
      startDate: null,
      isUrgent,
      latitude,
      longitude,
      workplaceMediaUrls,
    });
    setSaving(false);

    if (result.error) {
      Alert.alert('Hata', result.error);
      return;
    }

    Alert.alert('İlan yayınlandı', 'İş ilanınız haritada ve akışta görünecek.', [
      {
        text: 'Tamam',
        onPress: () =>
          result.id
            ? router.replace(`/detail/jobs/${result.id}` as never)
            : router.back(),
      },
    ]);
  };

  if (loadingJob) {
    return (
      <GradientBackground>
        <View style={styles.loading}>
          <ActivityIndicator color={PERSONNEL_ACCENT} size="large" />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + 100 },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={48}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: `${colors.surface}E6` }]}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.topBarText}>
            <Text variant="label">{isEdit ? 'İş İlanını Düzenle' : 'İş İlanı Ver'}</Text>
            <Text secondary variant="caption" numberOfLines={1}>
              {isEdit ? 'Pozisyon bilgilerini güncelleyin' : 'Personel arayan işletmeler için'}
            </Text>
          </View>
        </View>

        <LinearGradient
          colors={
            isDark
              ? ([`${PERSONNEL_ACCENT}33`, `${PERSONNEL_ACCENT}12`, 'transparent'] as const)
              : ([`${PERSONNEL_ACCENT}28`, `${PERSONNEL_ACCENT}10`, 'transparent'] as const)
          }
          style={styles.heroStrip}
        >
          <View style={styles.heroRow}>
            <LinearGradient colors={[PERSONNEL_GRADIENT[0], PERSONNEL_GRADIENT[1]]} style={styles.heroIcon}>
              <Ionicons name="briefcase" size={20} color="#fff" />
            </LinearGradient>
            <View style={styles.heroCopy}>
              <Text variant="caption" style={{ color: PERSONNEL_ACCENT, fontWeight: '700' }}>
                %{completionScore} tamamlandı
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: `${PERSONNEL_ACCENT}22` }]}>
                <View style={[styles.progressFill, { width: `${completionScore}%`, backgroundColor: PERSONNEL_ACCENT }]} />
              </View>
            </View>
          </View>
        </LinearGradient>

        {centerStats && !isEdit ? <PersonnelMotivationBanner stats={centerStats} compact /> : null}

        <LivePreviewCard
          title={title}
          description={description}
          employerDisplayName={employerDisplayName}
          jobType={jobType}
          salaryType={salaryType}
          salaryRange={salaryRange}
          district={district}
          housingProvided={housingProvided}
          mealProvided={mealProvided}
          isUrgent={isUrgent}
          workplacePhotoUris={workplacePhotoUris}
        />

        <FormSection step={1} title="Pozisyon" subtitle="Başlık ve iş tanımı">
          <Input
            label="İşletme adı"
            value={employerDisplayName}
            onChangeText={setEmployerDisplayName}
            placeholder="Örn: Karadeniz Otel & Spa"
            autoCapitalize="words"
          />
          <Text secondary variant="caption" style={styles.fieldHint}>
            {hasLinkedBusiness
              ? 'Kayıtlı işletmenizden alındı — akışta işletme olarak görünür.'
              : 'Bireysel paylaşıyorsanız işletme veya marka adınızı girin; kişisel adınızdan ayrı gösterilir.'}
          </Text>
          <Input
            label="Pozisyon"
            value={title}
            onChangeText={setTitle}
            placeholder="Örn: Resepsiyon Görevlisi"
          />
          <Input
            label="Açıklama"
            value={description}
            onChangeText={setDescription}
            placeholder="İş tanımı, beklentiler, vardiya bilgisi..."
            multiline
            numberOfLines={4}
            style={styles.textarea}
          />
        </FormSection>

        <FormSection
          step={2}
          title="İşyeri görselleri"
          subtitle={`Opsiyonel · ${workplacePhotoUris.length}/${JOB_MAX_WORKPLACE_PHOTOS} görsel`}
        >
          <View style={[styles.workplaceCard, { backgroundColor: `${PERSONNEL_ACCENT}08`, borderColor: `${PERSONNEL_ACCENT}22` }]}>
            <View style={styles.workplaceCardHeader}>
              <View style={[styles.workplaceCardIcon, { backgroundColor: `${PERSONNEL_ACCENT}18` }]}>
                <Ionicons name="business-outline" size={18} color={PERSONNEL_ACCENT} />
              </View>
              <View style={styles.flex}>
                <Text variant="label">İşletme ortamı</Text>
                <Text secondary variant="caption">
                  Adaylar işyerini görsün — yazılar görselin dışında kalır
                </Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoScroll}>
              <Pressable onPress={pickWorkplacePhotos} style={[styles.photoAdd, { borderColor: `${PERSONNEL_ACCENT}55` }]}>
                <LinearGradient colors={[`${PERSONNEL_ACCENT}22`, `${PERSONNEL_ACCENT}08`]} style={styles.photoAddInner}>
                  <Ionicons name="add" size={28} color={PERSONNEL_ACCENT} />
                </LinearGradient>
              </Pressable>
              {workplacePhotoUris.map((uri, i) => (
                <WorkplacePhotoTile
                  key={`${uri}-${i}`}
                  uri={uri}
                  index={i}
                  onRemove={() => removeWorkplacePhoto(i)}
                  onSetCover={() => setCoverWorkplacePhoto(i)}
                />
              ))}
            </ScrollView>

            <View style={[styles.workplaceHint, { backgroundColor: `${colors.surface}CC` }]}>
              <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
              <Text secondary variant="caption" style={styles.flex}>
                İlk sıradaki görsel kapaktır. Dokunarak kapak değiştirin, uzun basarak silin.
              </Text>
            </View>
          </View>
        </FormSection>

        <FormSection step={3} title="Çalışma & maaş" subtitle="Tür ve ücret bilgisi">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            {JOB_TYPE_OPTIONS.map((option) => {
              const selected = jobType === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setJobType(option.value)}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? PERSONNEL_ACCENT : colors.border,
                      backgroundColor: selected ? `${PERSONNEL_ACCENT}16` : colors.surfaceElevated,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: selected ? PERSONNEL_ACCENT : colors.textSecondary,
                      fontWeight: selected ? '700' : '400',
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <OptionPicker
            label="Maaş Bilgisi"
            value={salaryType}
            options={SALARY_TYPE_OPTIONS.map((o) => ({ id: o.value, label: o.label }))}
            onChange={(v) => setSalaryType(v as SalaryType)}
          />

          {salaryType !== 'negotiable' ? (
            <Input
              label={salaryType === 'net' ? 'Net Maaş' : 'Maaş Aralığı'}
              value={salaryRange}
              onChangeText={setSalaryRange}
              placeholder="Örn: 25.000 TL"
            />
          ) : null}

          <Input
            label="Deneyim"
            value={experienceRequired}
            onChangeText={setExperienceRequired}
            placeholder="Örn: En az 2 yıl (opsiyonel)"
          />
        </FormSection>

        <FormSection step={4} title="Konum & yan haklar" subtitle="İlçe ve sağlanan imkanlar">
          {districts.length > 0 ? (
            <OptionPicker
              label="İlçe"
              value={district}
              options={districts.map((d) => ({ id: d, label: d }))}
              onChange={setDistrict}
            />
          ) : (
            <Input label="İlçe" value={district} onChangeText={setDistrict} />
          )}

          <ToggleRow
            label="Konaklama sağlanır"
            hint="Personel için barınma imkânı"
            value={housingProvided}
            onChange={setHousingProvided}
            icon="bed-outline"
          />
          <ToggleRow
            label="Yemek sağlanır"
            hint="Günlük yemek veya yemek kartı"
            value={mealProvided}
            onChange={setMealProvided}
            icon="restaurant-outline"
          />
          <ToggleRow
            label="Acil ilan"
            hint="Öncelikli gösterim ve bildirim"
            value={isUrgent}
            onChange={setIsUrgent}
            icon="flash-outline"
            accent={colors.danger}
          />
        </FormSection>

        {isEdit ? (
          <View style={[styles.dangerZone, { borderColor: `${colors.danger}44`, backgroundColor: `${colors.danger}08` }]}>
            <Text variant="label" style={{ color: colors.danger }}>
              Tehlikeli bölge
            </Text>
            <Text secondary variant="caption">
              İlanı yayından kaldırabilirsiniz.
            </Text>
            <Pressable
              onPress={handleRemove}
              disabled={saving}
              style={({ pressed }) => [
                styles.dangerBtn,
                { borderColor: colors.danger, opacity: saving || pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text variant="caption" style={{ color: colors.danger, fontWeight: '700' }}>
                İlanı Kaldır
              </Text>
            </Pressable>
          </View>
        ) : null}
      </KeyboardAwareScrollView>

      <View
        style={[
          styles.stickyBar,
          {
            paddingBottom: insets.bottom + spacing.sm,
            borderTopColor: colors.border,
            backgroundColor: `${colors.surface}F5`,
          },
        ]}
      >
        <Pressable
          onPress={() => void handleSubmit()}
          disabled={saving}
          style={({ pressed }) => [{ borderRadius: radius.full, overflow: 'hidden', opacity: saving || pressed ? 0.88 : 1 }]}
        >
          <LinearGradient
            colors={[PERSONNEL_GRADIENT[0], PERSONNEL_GRADIENT[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.publishBtn}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name={isEdit ? 'save' : 'megaphone'} size={20} color="#fff" />
                <Text variant="label" style={{ color: '#fff' }}>
                  {isEdit ? 'Değişiklikleri Kaydet' : 'İlanı Yayınla'}
                </Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </GradientBackground>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
  icon,
  accent,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: string;
}) {
  const { colors } = useTheme();
  const tone = accent ?? PERSONNEL_ACCENT;

  return (
    <View style={[styles.toggleRow, { backgroundColor: `${tone}10`, borderColor: `${tone}33` }]}>
      <View style={styles.toggleCopy}>
        <Ionicons name={icon} size={18} color={tone} />
        <View style={styles.flex}>
          <Text variant="label">{label}</Text>
          {hint ? (
            <Text secondary variant="caption">
              {hint}
            </Text>
          ) : null}
        </View>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: tone }} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  page: { paddingHorizontal: spacing.lg, gap: spacing.md },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarText: { flex: 1, gap: 2 },
  heroStrip: { borderRadius: radius.lg, padding: spacing.md },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1, gap: spacing.xs },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  previewCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  previewLabel: { fontWeight: '700' },
  previewHeroWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  previewHeroImage: {
    width: '100%',
    height: 156,
  },
  previewTextBelow: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  previewBadgeMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  previewHero: {
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 120,
    justifyContent: 'flex-end',
    gap: 4,
  },
  previewBadges: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xs },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  previewBadgeText: { color: '#fff', fontWeight: '700', fontSize: 10 },
  previewTitle: { color: '#fff', fontWeight: '700' },
  previewSalary: { color: '#fff', fontWeight: '800' },
  previewMeta: { gap: 4 },
  previewMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  section: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitles: { flex: 1, gap: 2 },
  sectionBody: { gap: spacing.sm },
  fieldHint: { marginTop: -4, marginBottom: spacing.xs, lineHeight: 16 },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  workplaceCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  workplaceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  workplaceCardIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workplaceHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  photoScroll: { gap: spacing.md, paddingVertical: spacing.xs, paddingRight: spacing.sm },
  photoAdd: {
    width: 108,
    height: 108,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  photoAddInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTile: {
    width: 108,
    gap: spacing.xs,
    alignItems: 'center',
  },
  photoFrame: {
    width: 108,
    height: 108,
    borderRadius: radius.lg,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: { width: '100%', height: '100%' },
  photoCaption: {
    fontSize: 11,
    textAlign: 'center',
    width: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipScroll: { gap: spacing.xs, paddingRight: spacing.sm },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toggleCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  dangerZone: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
});
