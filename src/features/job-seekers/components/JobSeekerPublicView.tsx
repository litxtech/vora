import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import type { PublicJobSeekerProfile } from '@/features/job-seekers/services/seekerData';
import {
  JOB_TYPE_OPTIONS,
  MILITARY_STATUS_OPTIONS,
  PERSONNEL_ACCENT,
} from '@/features/personnel-center/constants';
import { getTrustScoreColor } from '@/features/profile/constants';
import { radius, spacing } from '@/constants/theme';
import { openUrl } from '@/lib/linking/openUrl';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  profile: PublicJobSeekerProfile;
  isOwnProfile?: boolean;
  onMessage?: () => void;
  onEdit?: () => void;
};

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: `${PERSONNEL_ACCENT}14` }]}>
        <Ionicons name={icon} size={16} color={PERSONNEL_ACCENT} />
      </View>
      <View style={styles.infoCopy}>
        <Text secondary variant="caption">
          {label}
        </Text>
        <Text variant="body">{value}</Text>
      </View>
    </View>
  );
}

export function JobSeekerPublicView({ profile, isOwnProfile, onMessage, onEdit }: Props) {
  const { colors } = useTheme();
  const trustColor = getTrustScoreColor(profile.trustScore ?? 100);

  const jobTypeLabels = profile.jobTypes
    .map((t) => JOB_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t)
    .join(', ');

  const militaryLabel = profile.militaryStatus
    ? MILITARY_STATUS_OPTIONS.find((o) => o.value === profile.militaryStatus)?.label
    : null;

  const callPhone = () => {
    if (profile.phone) void openUrl(`tel:${profile.phone.replace(/\s/g, '')}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <GlassCard style={styles.hero}>
        <View style={styles.heroTop}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: `${PERSONNEL_ACCENT}22` }]}>
              <Ionicons name="person" size={32} color={PERSONNEL_ACCENT} />
            </View>
          )}
          <View style={styles.heroInfo}>
            <Text variant="h3">{profile.displayName ?? profile.title}</Text>
            <Text variant="label" style={{ color: PERSONNEL_ACCENT }}>
              {profile.occupation}
            </Text>
            {profile.experienceYears > 0 ? (
              <Text secondary variant="caption">
                {profile.experienceYears} yıl deneyim
              </Text>
            ) : null}
          </View>
          {profile.isReady ? (
            <View style={[styles.readyBadge, { backgroundColor: `${colors.success}18` }]}>
              <View style={[styles.readyDot, { backgroundColor: colors.success }]} />
              <Text variant="caption" style={{ color: colors.success }}>
                Hazır
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.badges}>
          {profile.trustScore != null ? (
            <View style={[styles.badge, { borderColor: colors.border }]}>
              <Ionicons name="shield-checkmark" size={14} color={trustColor} />
              <Text variant="caption" style={{ color: trustColor }}>
                Güven {profile.trustScore}
              </Text>
            </View>
          ) : null}
          {profile.district ? (
            <View style={[styles.badge, { borderColor: colors.border }]}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text variant="caption" secondary>
                {profile.district}
              </Text>
            </View>
          ) : null}
        </View>

        {profile.intro ? (
          <Text variant="body" style={styles.intro}>
            {profile.intro}
          </Text>
        ) : null}
      </GlassCard>

      {profile.skills.length > 0 ? (
        <GlassCard style={styles.section}>
          <Text variant="label">Yetenekler</Text>
          <View style={styles.chipGrid}>
            {profile.skills.map((skill) => (
              <View key={skill} style={[styles.chip, { borderColor: `${PERSONNEL_ACCENT}44`, backgroundColor: `${PERSONNEL_ACCENT}10` }]}>
                <Text variant="caption" style={{ color: PERSONNEL_ACCENT }}>
                  {skill}
                </Text>
              </View>
            ))}
          </View>
        </GlassCard>
      ) : null}

      <GlassCard style={styles.section}>
        <Text variant="label">Detaylar</Text>
        {jobTypeLabels ? <InfoRow icon="time-outline" label="Çalışma Tercihi" value={jobTypeLabels} /> : null}
        {profile.education ? <InfoRow icon="school-outline" label="Eğitim" value={profile.education} /> : null}
        {profile.languages.length > 0 ? (
          <InfoRow icon="language-outline" label="Diller" value={profile.languages.join(', ')} />
        ) : null}
        {profile.salaryExpectation ? (
          <InfoRow icon="cash-outline" label="Maaş Beklentisi" value={profile.salaryExpectation} />
        ) : null}
        {profile.drivingLicense ? <InfoRow icon="car-outline" label="Ehliyet" value="Var" /> : null}
        {militaryLabel ? <InfoRow icon="ribbon-outline" label="Askerlik" value={militaryLabel} /> : null}
        {profile.phone ? (
          <Pressable onPress={callPhone}>
            <InfoRow icon="call-outline" label="Telefon" value={profile.phone} />
          </Pressable>
        ) : null}
      </GlassCard>

      <View style={styles.actions}>
        {isOwnProfile && onEdit ? (
          <Button title="Profili Düzenle" variant="outline" onPress={onEdit} style={styles.actionBtn} />
        ) : null}
        {!isOwnProfile && onMessage ? (
          <Button title="Mesaj Gönder" onPress={onMessage} style={styles.actionBtn} />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  hero: { gap: spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  avatar: { width: 64, height: 64, borderRadius: radius.full },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: { flex: 1, gap: 4 },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  readyDot: { width: 6, height: 6, borderRadius: 3 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  intro: { lineHeight: 22 },
  section: { gap: spacing.md },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },
});
