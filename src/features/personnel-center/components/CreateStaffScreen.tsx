import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { OptionPicker } from '@/components/auth/OptionPicker';
import {
  JOB_TYPE_OPTIONS,
  PERSONNEL_ACCENT,
  PERSONNEL_GRADIENT,
  SKILL_TAGS,
  jobTypeLabel,
} from '@/features/personnel-center/constants';
import {
  createStaffRequest,
  fetchMyBusiness,
  fetchStaffListingForEdit,
  removeStaffRequest,
  updateStaffRequest,
} from '@/features/personnel-center/services/listingData';
import {
  fetchPersonnelCenterStats,
  type PersonnelCenterStats,
} from '@/features/personnel-center/services/personnelStats';
import { PersonnelMotivationBanner } from '@/features/personnel-center/components/PersonnelMotivationBanner';
import type { JobType } from '@/features/personnel-center/types';
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
  jobType,
  salaryRange,
  district,
  positionsCount,
  selectedPositions,
  housingProvided,
  mealProvided,
  isUrgent,
}: {
  title: string;
  description: string;
  jobType: JobType;
  salaryRange: string;
  district: string;
  positionsCount: string;
  selectedPositions: string[];
  housingProvided: boolean;
  mealProvided: boolean;
  isUrgent: boolean;
}) {
  const { colors } = useTheme();
  const count = Math.max(1, Number.parseInt(positionsCount, 10) || 1);
  const salaryLabel = salaryRange.trim() || 'Görüşülecek';

  return (
    <View style={[styles.previewCard, { borderColor: `${PERSONNEL_ACCENT}33` }]}>
      <Text variant="caption" style={[styles.previewLabel, { color: PERSONNEL_ACCENT }]}>
        Canlı önizleme
      </Text>

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
              {count} kişi
            </Text>
          </View>
          <View style={[styles.previewBadge, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
            <Text variant="caption" style={styles.previewBadgeText}>
              {jobTypeLabel(jobType)}
            </Text>
          </View>
        </View>
        <Text variant="label" numberOfLines={2} style={styles.previewTitle}>
          {title.trim() || 'Personel talebiniz'}
        </Text>
        <Text variant="caption" style={styles.previewSalary}>
          {salaryLabel}
        </Text>
      </LinearGradient>

      {description.trim() ? (
        <Text secondary variant="caption" numberOfLines={2}>
          {description}
        </Text>
      ) : null}

      {selectedPositions.length > 0 ? (
        <View style={styles.previewTags}>
          {selectedPositions.slice(0, 4).map((pos) => (
            <View key={pos} style={[styles.previewTag, { backgroundColor: `${PERSONNEL_ACCENT}14` }]}>
              <Text variant="caption" style={{ color: PERSONNEL_ACCENT, fontWeight: '600' }}>
                {pos}
              </Text>
            </View>
          ))}
        </View>
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

type Props = {
  editStaffId?: string;
};

export function CreateStaffScreen({ editStaffId: editStaffIdProp }: Props) {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const paramId = Array.isArray(params.id) ? params.id[0] : params.id;
  const editStaffId = editStaffIdProp ?? paramId;
  const isEdit = Boolean(editStaffId);

  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user, profile } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [district, setDistrict] = useState(profile?.district ?? '');
  const [positionsCount, setPositionsCount] = useState('1');
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [jobType, setJobType] = useState<JobType>('full_time');
  const [housingProvided, setHousingProvided] = useState(false);
  const [mealProvided, setMealProvided] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(isEdit);
  const [centerStats, setCenterStats] = useState<PersonnelCenterStats | null>(null);

  const regionId = profile?.region_id ?? 'trabzon';
  const districts = DISTRICTS[regionId as RegionId] ?? [];

  const completionScore = useMemo(() => {
    let score = 0;
    if (title.trim()) score += 25;
    if (description.trim()) score += 25;
    if (district) score += 15;
    if (selectedPositions.length > 0) score += 15;
    if (positionsCount.trim()) score += 10;
    if (salaryRange.trim() || !isUrgent) score += 10;
    return Math.min(100, score);
  }, [title, description, district, selectedPositions.length, positionsCount, salaryRange, isUrgent]);

  useEffect(() => {
    fetchPersonnelCenterStats(regionId).then(setCenterStats);
  }, [regionId]);

  useEffect(() => {
    if (!user?.id) return;
    if (!isEdit) {
      fetchMyBusiness(user.id).then((biz) => {
        if (biz) {
          setBusinessId(biz.id);
          if (biz.district) setDistrict(biz.district);
        }
      });
    }
  }, [user?.id, isEdit]);

  useEffect(() => {
    if (!isEdit || !editStaffId || !user?.id) return;

    setLoadingStaff(true);
    fetchStaffListingForEdit(editStaffId, user.id).then((record) => {
      setLoadingStaff(false);
      if (!record) {
        Alert.alert('Düzenlenemez', 'Talep bulunamadı veya yetkiniz yok.', [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
        return;
      }
      setTitle(record.title);
      setDescription(record.description);
      setSalaryRange(record.salaryRange ?? '');
      setDistrict(record.district ?? '');
      setPositionsCount(String(record.positionsCount ?? 1));
      setSelectedPositions(record.positions);
      setJobType(record.jobType);
      setHousingProvided(record.housingProvided);
      setMealProvided(record.mealProvided);
      setIsUrgent(record.isUrgent);
    });
  }, [isEdit, editStaffId, user?.id]);

  const togglePosition = (pos: string) => {
    setSelectedPositions((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos],
    );
  };

  const handleRemove = () => {
    if (!editStaffId || !user?.id) return;
    Alert.alert('Talebi Kaldır', 'Personel talebi yayından kaldırılacak. Devam etmek istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          const result = await removeStaffRequest(editStaffId, user.id);
          setSaving(false);
          if (result.error) Alert.alert('Hata', result.error);
          else Alert.alert('Kaldırıldı', 'Personel talebi yayından kaldırıldı.', [
            { text: 'Tamam', onPress: () => router.replace('/personnel-center' as never) },
          ]);
        },
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    if (!title.trim() || !description.trim()) {
      Alert.alert('Eksik bilgi', 'Başlık ve açıklama zorunludur.');
      return;
    }

    setSaving(true);

    if (isEdit && editStaffId) {
      const result = await updateStaffRequest(editStaffId, user.id, {
        title: title.trim(),
        description: description.trim(),
        positions: selectedPositions,
        positionsCount: Math.max(1, Number.parseInt(positionsCount, 10) || 1),
        jobType,
        salaryRange: salaryRange.trim() || null,
        district: district || null,
        housingProvided,
        mealProvided,
        isUrgent,
        neededBy: isUrgent ? new Date().toISOString() : null,
      });
      setSaving(false);
      if (result.error) {
        Alert.alert('Hata', result.error);
        return;
      }
      Alert.alert('Güncellendi', 'Personel talebi kaydedildi.', [
        { text: 'Tamam', onPress: () => router.replace(`/detail/staff/${editStaffId}` as never) },
      ]);
      return;
    }

    let latitude: number | undefined;
    let longitude: number | undefined;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
    }

    const result = await createStaffRequest({
      authorId: user.id,
      businessId,
      regionId,
      title: title.trim(),
      description: description.trim(),
      positions: selectedPositions,
      positionsCount: Math.max(1, Number.parseInt(positionsCount, 10) || 1),
      jobType,
      salaryRange: salaryRange.trim() || null,
      district: district || null,
      housingProvided,
      mealProvided,
      isUrgent,
      neededBy: isUrgent ? new Date().toISOString() : null,
      latitude,
      longitude,
    });
    setSaving(false);

    if (result.error) {
      Alert.alert('Hata', result.error);
      return;
    }

    const msg = isUrgent
      ? 'Acil personel talebiniz yayınlandı. Yakındaki iş arayanlara bildirim gider.'
      : 'Personel talebiniz yayınlandı.';
    Alert.alert('Talep oluşturuldu', msg, [
      {
        text: 'Tamam',
        onPress: () =>
          result.id
            ? router.replace(`/detail/staff/${result.id}` as never)
            : router.back(),
      },
    ]);
  };

  if (loadingStaff) {
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
            <Text variant="label">{isEdit ? 'Talebi Düzenle' : 'Personel Talebi'}</Text>
            <Text secondary variant="caption" numberOfLines={1}>
              {isEdit ? 'Pozisyon ve ihtiyaç bilgilerini güncelleyin' : 'İşletmeniz için personel arayın'}
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
              <Ionicons name="people" size={20} color="#fff" />
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
          jobType={jobType}
          salaryRange={salaryRange}
          district={district}
          positionsCount={positionsCount}
          selectedPositions={selectedPositions}
          housingProvided={housingProvided}
          mealProvided={mealProvided}
          isUrgent={isUrgent}
        />

        <FormSection step={1} title="Talep özeti" subtitle="Başlık ve ihtiyaç detayı">
          <Input
            label="Başlık"
            value={title}
            onChangeText={setTitle}
            placeholder="Örn: Bu Akşam İçin 2 Garson"
          />
          <Input
            label="Açıklama"
            value={description}
            onChangeText={setDescription}
            placeholder="Vardiya, süre, beklentiler..."
            multiline
            numberOfLines={4}
            style={styles.textarea}
          />
          <Input
            label="Kaç kişi aranıyor?"
            value={positionsCount}
            onChangeText={setPositionsCount}
            keyboardType="number-pad"
          />
        </FormSection>

        <FormSection step={2} title="Pozisyonlar" subtitle="İhtiyaç duyduğunuz rolleri seçin">
          <View style={styles.tagGrid}>
            {SKILL_TAGS.map((tag) => {
              const selected = selectedPositions.includes(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => togglePosition(tag)}
                  style={[
                    styles.tagChip,
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
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </FormSection>

        <FormSection step={3} title="Çalışma & ücret" subtitle="Tür ve maaş bilgisi">
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
          <Input
            label="Maaş (opsiyonel)"
            value={salaryRange}
            onChangeText={setSalaryRange}
            placeholder="Görüşülecek veya aralık"
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
            label="Acil personel"
            hint="Yakındaki iş arayanlara bildirim gönderilir"
            value={isUrgent}
            onChange={setIsUrgent}
            icon="flash-outline"
            accent={colors.danger}
          />
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
        </FormSection>

        {isEdit ? (
          <View style={[styles.dangerZone, { borderColor: `${colors.danger}44`, backgroundColor: `${colors.danger}08` }]}>
            <Text variant="label" style={{ color: colors.danger }}>
              Tehlikeli bölge
            </Text>
            <Text secondary variant="caption">
              Talebi yayından kaldırabilirsiniz.
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
                Talebi Kaldır
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
                <Ionicons name={isEdit ? 'save' : isUrgent ? 'flash' : 'people'} size={20} color="#fff" />
                <Text variant="label" style={{ color: '#fff' }}>
                  {isEdit ? 'Değişiklikleri Kaydet' : isUrgent ? 'Acil Talebi Yayınla' : 'Talebi Yayınla'}
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
  previewHero: {
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 120,
    justifyContent: 'flex-end',
    gap: 4,
  },
  previewBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xs },
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
  previewTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  previewTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
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
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tagChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
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
