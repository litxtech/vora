import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { EditProfileSection } from '@/features/profile/components/EditProfileSection';
import { useJobSeekerProfile } from '@/features/job-seekers/hooks/useJobSeekerProfile';
import { computeProfileCompletion } from '@/features/job-seekers/services/seekerProfileUtils';
import {
  JOB_TYPE_OPTIONS,
  MILITARY_STATUS_OPTIONS,
  PERSONNEL_ACCENT,
  SKILL_TAGS,
} from '@/features/personnel-center/constants';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function JobSeekerProfileScreen() {
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const {
    loading,
    saving,
    hasProfile,
    isVisibleOnMap,
    occupation,
    setOccupation,
    experienceYears,
    setExperienceYears,
    phoneVisible,
    setPhoneVisible,
    intro,
    setIntro,
    skills,
    toggleSkill,
    jobTypes,
    toggleJobType,
    education,
    setEducation,
    languages,
    setLanguages,
    drivingLicense,
    setDrivingLicense,
    militaryStatus,
    setMilitaryStatus,
    salaryExpectation,
    setSalaryExpectation,
    isReady,
    setIsReady,
    saveProfile,
    enableMapVisibility,
    disableMapVisibility,
  } = useJobSeekerProfile(user, profile);

  if (!user || !profile) return null;

  const completion = computeProfileCompletion({
    occupation,
    intro,
    experienceYears,
    skills,
    jobTypes,
    education,
    languages,
  });

  const handleSave = async () => {
    const result = await saveProfile();
    if (result.error) Alert.alert('Hata', result.error);
    else Alert.alert('Kaydedildi', 'İş arayan profiliniz güncellendi.');
  };

  const handleVisibilityToggle = async (next: boolean) => {
    if (saving) return;

    if (next) {
      if (!occupation.trim()) {
        Alert.alert('Meslek gerekli', 'Haritada görünmek için önce meslek bilginizi kaydedin.');
        return;
      }
      if (!hasProfile) {
        const saveResult = await saveProfile();
        if (saveResult.error) {
          Alert.alert('Hata', saveResult.error);
          return;
        }
      }
      const result = await enableMapVisibility();
      if (result.error) Alert.alert('Hata', result.error);
      else Alert.alert('Haritada görünüyorsunuz', 'Personel Merkezi ve haritada listeleneceksiniz.');
    } else {
      const result = await disableMapVisibility();
      if (result.error) Alert.alert('Hata', result.error);
    }
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <AuthHeader title="İş Arayan Profili" showBack />

        <View style={[styles.hero, { backgroundColor: `${PERSONNEL_ACCENT}14`, borderColor: `${PERSONNEL_ACCENT}33` }]}>
          <View style={[styles.heroIcon, { backgroundColor: `${PERSONNEL_ACCENT}22` }]}>
            <Ionicons name="briefcase" size={28} color={PERSONNEL_ACCENT} />
          </View>
          <View style={styles.heroCopy}>
            <Text variant="h3">Kariyer Profiliniz</Text>
            <Text secondary variant="caption">
              İş başvurularında ve işverenlerin sizi bulmasında kullanılır
            </Text>
          </View>
          <View style={styles.completionWrap}>
            <Text variant="label" style={{ color: PERSONNEL_ACCENT }}>
              %{completion}
            </Text>
            <Text secondary variant="caption">
              dolu
            </Text>
          </View>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${completion}%`, backgroundColor: PERSONNEL_ACCENT },
            ]}
          />
        </View>

        <EditProfileSection icon="person-outline" title="Temel Bilgiler">
          <Input
            label="Meslek / Pozisyon"
            value={occupation}
            onChangeText={setOccupation}
            placeholder="Örn: Garson, Resepsiyonist, Aşçı..."
            editable={!saving}
          />
          <Input
            label="Deneyim (yıl)"
            value={experienceYears}
            onChangeText={setExperienceYears}
            keyboardType="number-pad"
            placeholder="0"
            editable={!saving}
          />
          <Input
            label="Kendinizi Tanıtın"
            value={intro}
            onChangeText={setIntro}
            placeholder="Deneyiminiz, güçlü yönleriniz ve iş beklentileriniz..."
            multiline
            style={styles.textArea}
            editable={!saving}
          />
        </EditProfileSection>

        <EditProfileSection icon="construct-outline" title="Yetenekler">
          <View style={styles.chipGrid}>
            {SKILL_TAGS.map((tag) => {
              const selected = skills.includes(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => toggleSkill(tag)}
                  disabled={saving}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? PERSONNEL_ACCENT : colors.border,
                      backgroundColor: selected ? `${PERSONNEL_ACCENT}16` : colors.surfaceElevated,
                    },
                  ]}
                >
                  <Text variant="caption" style={{ color: selected ? PERSONNEL_ACCENT : colors.textSecondary }}>
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </EditProfileSection>

        <EditProfileSection icon="time-outline" title="Çalışma Tercihi">
          <View style={styles.chipGrid}>
            {JOB_TYPE_OPTIONS.map((opt) => {
              const selected = jobTypes.includes(opt.value);
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => toggleJobType(opt.value)}
                  disabled={saving}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? `${colors.primary}16` : colors.surfaceElevated,
                    },
                  ]}
                >
                  <Text variant="caption" style={{ color: selected ? colors.primary : colors.textSecondary }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </EditProfileSection>

        <EditProfileSection icon="school-outline" title="Eğitim & Dil">
          <Input
            label="Eğitim Durumu"
            value={education}
            onChangeText={setEducation}
            placeholder="Örn: Turizm Meslek Lisesi mezunu"
            editable={!saving}
          />
          <Input
            label="Yabancı Diller"
            value={languages}
            onChangeText={setLanguages}
            placeholder="İngilizce, Almanca..."
            editable={!saving}
          />
          <Input
            label="Maaş Beklentisi"
            value={salaryExpectation}
            onChangeText={setSalaryExpectation}
            placeholder="Örn: 25.000 TL net"
            editable={!saving}
          />
        </EditProfileSection>

        <EditProfileSection icon="options-outline" title="Ek Bilgiler">
          <View style={styles.switchRow}>
            <Text variant="caption">Ehliyetim var</Text>
            <Switch
              value={drivingLicense}
              onValueChange={setDrivingLicense}
              disabled={saving}
              trackColor={{ false: colors.border, true: `${colors.primary}88` }}
              thumbColor={drivingLicense ? colors.primary : colors.surfaceElevated}
            />
          </View>

          <Text variant="caption" secondary>
            Askerlik Durumu
          </Text>
          <View style={styles.chipGrid}>
            {MILITARY_STATUS_OPTIONS.map((opt) => {
              const selected = militaryStatus === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setMilitaryStatus(opt.value)}
                  disabled={saving}
                  style={[
                    styles.chip,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? `${colors.primary}16` : colors.surfaceElevated,
                    },
                  ]}
                >
                  <Text variant="caption" style={{ color: selected ? colors.primary : colors.textSecondary }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.readyRow, { borderColor: colors.border, backgroundColor: `${colors.success}10` }]}>
            <View style={styles.switchMeta}>
              <Text variant="label">İşe Başlamaya Hazırım</Text>
              <Text secondary variant="caption">
                İşverenler bu filtreyi kullanabilir
              </Text>
            </View>
            <Switch
              value={isReady}
              onValueChange={setIsReady}
              disabled={saving}
              trackColor={{ false: colors.border, true: `${colors.success}88` }}
              thumbColor={isReady ? colors.success : colors.surfaceElevated}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchMeta}>
              <Text variant="caption">Telefon numaram görünsün</Text>
              <Text secondary variant="caption">
                İşverenler profilinizde görebilir
              </Text>
            </View>
            <Switch
              value={phoneVisible}
              onValueChange={setPhoneVisible}
              disabled={saving}
              trackColor={{ false: colors.border, true: `${colors.primary}88` }}
              thumbColor={phoneVisible ? colors.primary : colors.surfaceElevated}
            />
          </View>
        </EditProfileSection>

        <EditProfileSection icon="map-outline" title="Görünürlük">
          <View style={styles.switchRow}>
            <View style={styles.switchMeta}>
              <Text variant="label">Haritada ve listede görün</Text>
              <Text secondary variant="caption">
                Personel Merkezi ve harita katmanında listelenirsiniz
              </Text>
            </View>
            <Switch
              value={isVisibleOnMap}
              onValueChange={handleVisibilityToggle}
              disabled={saving || loading}
              trackColor={{ false: colors.border, true: `${PERSONNEL_ACCENT}88` }}
              thumbColor={isVisibleOnMap ? PERSONNEL_ACCENT : colors.surfaceElevated}
            />
          </View>
        </EditProfileSection>

        <Button title="Profili Kaydet" loading={saving} onPress={handleSave} />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1, gap: 4 },
  completionWrap: { alignItems: 'center', gap: 2 },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: -spacing.sm,
  },
  progressFill: { height: '100%', borderRadius: 2 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchMeta: { flex: 1, gap: 2 },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
