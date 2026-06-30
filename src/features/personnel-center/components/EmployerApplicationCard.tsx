import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { APPLICATION_STATUS_LABELS, PERSONNEL_ACCENT } from '@/features/personnel-center/constants';
import {
  applicantDisplayName,
  applicantPhone,
} from '@/features/personnel-center/services/employerContact';
import { openEmployerApplication } from '@/features/personnel-center/services/personnelActions';
import type { EmployerApplication, JobApplicationStatus } from '@/features/personnel-center/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const STATUS_COLORS: Record<JobApplicationStatus, string> = {
  sent: '#1E88E5',
  reviewing: '#FFB300',
  interview: '#9C27B0',
  accepted: '#43A047',
  rejected: '#EF5350',
};

type EmployerApplicationCardProps = {
  application: EmployerApplication;
};

export function EmployerApplicationCard({ application }: EmployerApplicationCardProps) {
  const { colors } = useTheme();
  const displayName = applicantDisplayName(application);
  const phone = applicantPhone(application);
  const statusColor = STATUS_COLORS[application.status];
  const resume = application.applicantProfileSnapshot?.resume;

  const openDetail = () => openEmployerApplication(application.id);

  return (
    <GlassCard style={styles.card}>
      <Pressable onPress={openDetail} style={styles.applicantRow}>
        {application.applicantAvatar ? (
          <Image source={{ uri: application.applicantAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: `${PERSONNEL_ACCENT}22` }]}>
            <Ionicons name="person" size={20} color={PERSONNEL_ACCENT} />
          </View>
        )}
        <View style={styles.applicantInfo}>
          <Text variant="label" numberOfLines={1}>
            {displayName}
          </Text>
          <Text secondary variant="caption" numberOfLines={1}>
            {application.listingTitle}
          </Text>
          <Text secondary variant="caption" numberOfLines={1}>
            {new Date(application.createdAt).toLocaleDateString('tr-TR')}
            {phone ? ` · ${phone}` : ''}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
          <Text variant="caption" style={{ color: statusColor }} numberOfLines={1}>
            {APPLICATION_STATUS_LABELS[application.status]}
          </Text>
        </View>
      </Pressable>

      {resume ? (
        <Pressable onPress={openDetail}>
          <Text secondary variant="caption" numberOfLines={2}>
            {resume}
          </Text>
        </Pressable>
      ) : null}

      {application.applicantSkills.length > 0 ? (
        <View style={styles.skills}>
          {application.applicantSkills.slice(0, 4).map((skill) => (
            <View key={skill} style={[styles.skill, { borderColor: colors.border }]}>
              <Text variant="caption" secondary>
                {skill}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Button title="Başvuruyu Görüntüle" onPress={openDetail} />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  applicantRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 48, height: 48, borderRadius: radius.full },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applicantInfo: { flex: 1, gap: 4, minWidth: 0 },
  statusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    maxWidth: 100,
    alignSelf: 'flex-start',
  },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  skill: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
