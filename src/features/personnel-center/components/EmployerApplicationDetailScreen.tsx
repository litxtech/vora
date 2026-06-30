import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import {
  APPLICATION_STATUS_LABELS,
  EMPLOYER_STATUS_ACTIONS,
  PERSONNEL_ACCENT,
  listingDetailPath,
} from '@/features/personnel-center/constants';
import { useEmployerApplicationActions } from '@/features/personnel-center/hooks/useEmployerApplicationActions';
import { fetchEmployerApplicationById } from '@/features/personnel-center/services/applicationData';
import {
  applicantDisplayName,
  applicantPhone,
  callApplicant,
  hasSeekerSummary,
  openApplicantChat,
} from '@/features/personnel-center/services/employerContact';
import { openUserProfile } from '@/features/personnel-center/services/personnelActions';
import { PERSONNEL_FEATURE } from '@/features/personnel-center/featureFlags';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import type { EmployerApplication, JobApplicationStatus } from '@/features/personnel-center/types';
import { getTrustScoreColor } from '@/features/profile/constants';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const STATUS_COLORS: Record<JobApplicationStatus, string> = {
  sent: '#1E88E5',
  reviewing: '#FFB300',
  interview: '#9C27B0',
  accepted: '#43A047',
  rejected: '#EF5350',
};

const STATUS_ACTION_ICONS: Record<JobApplicationStatus, keyof typeof Ionicons.glyphMap> = {
  sent: 'paper-plane-outline',
  reviewing: 'eye-outline',
  interview: 'chatbubbles-outline',
  accepted: 'checkmark-circle-outline',
  rejected: 'close-circle-outline',
};

type Props = {
  applicationId: string;
};

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <GlassCard style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: `${PERSONNEL_ACCENT}14` }]}>
          <Ionicons name={icon} size={16} color={PERSONNEL_ACCENT} />
        </View>
        <Text variant="label">{title}</Text>
      </View>
      <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />
      <View style={styles.sectionBody}>{children}</View>
    </GlassCard>
  );
}

function InfoTile({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const inner = (
    <View style={[styles.infoTile, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
      <Ionicons name={icon} size={18} color={PERSONNEL_ACCENT} />
      <Text secondary variant="caption" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="body" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
  if (onPress) return <Pressable onPress={onPress} style={styles.infoTileWrap}>{inner}</Pressable>;
  return <View style={styles.infoTileWrap}>{inner}</View>;
}

function DecisionChip({
  label,
  icon,
  accent,
  loading,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.decisionChip,
        {
          borderColor: accent,
          backgroundColor: `${accent}12`,
          opacity: pressed || loading ? 0.75 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={accent} />
      ) : (
        <Ionicons name={icon} size={16} color={accent} />
      )}
      <Text variant="caption" style={{ color: accent, fontWeight: '700' }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function ApplicationDecisionCard({
  application,
  displayName,
  loadingStatus,
  onUpdateStatus,
}: {
  application: EmployerApplication;
  displayName: string;
  loadingStatus: JobApplicationStatus | null;
  onUpdateStatus: (status: JobApplicationStatus, name: string) => void;
}) {
  const { colors } = useTheme();
  const isFinal = application.status === 'accepted' || application.status === 'rejected';
  const statusColor = STATUS_COLORS[application.status];
  const availableActions = EMPLOYER_STATUS_ACTIONS.filter((a) => a.status !== application.status);

  if (isFinal) {
    return (
      <View style={[styles.finalBanner, { backgroundColor: `${statusColor}12`, borderColor: `${statusColor}44` }]}>
        <Ionicons name={STATUS_ACTION_ICONS[application.status]} size={18} color={statusColor} />
        <Text variant="caption" style={{ color: statusColor, fontWeight: '700', flex: 1 }}>
          {application.status === 'accepted' ? 'Başvuru kabul edildi' : 'Başvuru reddedildi'}
        </Text>
      </View>
    );
  }

  const actionAccent = (status: JobApplicationStatus) => {
    if (status === 'rejected') return colors.danger;
    if (status === 'accepted') return colors.success;
    if (status === 'interview') return STATUS_COLORS.interview;
    return colors.primary;
  };

  return (
    <GlassCard style={styles.decisionCard}>
      <View style={styles.decisionHeader}>
        <Ionicons name="options-outline" size={14} color={colors.textMuted} />
        <Text secondary variant="caption">
          Karar ver
        </Text>
      </View>
      <View style={styles.decisionRow}>
        {availableActions.map((action) => (
          <DecisionChip
            key={action.status}
            label={action.label}
            icon={STATUS_ACTION_ICONS[action.status]}
            accent={actionAccent(action.status)}
            loading={loadingStatus === action.status}
            onPress={() => onUpdateStatus(action.status, displayName)}
          />
        ))}
      </View>
    </GlassCard>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        {
          borderColor: colors.border,
          backgroundColor: colors.surfaceElevated,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: `${PERSONNEL_ACCENT}16` }]}>
        <Ionicons name={icon} size={18} color={PERSONNEL_ACCENT} />
      </View>
      <Text variant="caption" style={styles.quickActionLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

export function EmployerApplicationDetailScreen({ applicationId }: Props) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const showChat = useFeatureVisible(PERSONNEL_FEATURE.applicationChat);
  const showCall = useFeatureVisible(PERSONNEL_FEATURE.applicationCall);
  const showStatus = useFeatureVisible(PERSONNEL_FEATURE.applicationStatus);
  const [application, setApplication] = useState<EmployerApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEmployerApplicationById(applicationId, user.id);
      if (!data) setError('Başvuru bulunamadı.');
      else setApplication(data);
    } catch {
      setError('Başvuru yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [applicationId, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayName = application ? applicantDisplayName(application) : '';
  const { loadingStatus, updateStatus } = useEmployerApplicationActions(application, user?.id, {
    onUpdated: load,
  });

  if (loading) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top + spacing.md }]}>
          <ActivityIndicator color={PERSONNEL_ACCENT} size="large" />
        </View>
      </GradientBackground>
    );
  }

  if (error || !application) {
    return (
      <GradientBackground>
        <View style={[styles.errorPage, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom }]}>
          <ScreenBackButton />
          <Text secondary style={styles.errorText}>{error ?? 'Başvuru bulunamadı.'}</Text>
        </View>
      </GradientBackground>
    );
  }

  const snap = application.applicantProfileSnapshot;
  const phone = applicantPhone(application);
  const statusColor = STATUS_COLORS[application.status];
  const trustColor = getTrustScoreColor(application.applicantTrustScore ?? 100);
  const showSeekerSummary = hasSeekerSummary(application);
  const skills = application.applicantSkills.length ? application.applicantSkills : snap?.skills ?? [];
  const occupationLine = [
    application.applicantOccupation,
    application.applicantExperienceYears != null ? `${application.applicantExperienceYears} yıl` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <ScreenBackButton style={styles.backBtn} />
          <Text variant="h3" style={styles.screenTitle}>
            Başvuru Detayı
          </Text>
        </View>

        <GlassCard style={styles.hero}>
          <View style={styles.heroMain}>
            <Pressable onPress={() => openUserProfile(application.applicantId)}>
              {application.applicantAvatar ? (
                <Image source={{ uri: application.applicantAvatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: `${PERSONNEL_ACCENT}22` }]}>
                  <Ionicons name="person" size={26} color={PERSONNEL_ACCENT} />
                </View>
              )}
            </Pressable>
            <View style={styles.heroInfo}>
              <Text variant="label" style={styles.heroName} numberOfLines={2}>
                {displayName}
              </Text>
              {occupationLine ? (
                <Text variant="label" style={{ color: PERSONNEL_ACCENT }} numberOfLines={2}>
                  {occupationLine}
                </Text>
              ) : null}
              <Text secondary variant="caption">
                {new Date(application.createdAt).toLocaleString('tr-TR')}
              </Text>
            </View>
          </View>

          <View style={styles.heroMeta}>
            <View style={[styles.statusPill, { backgroundColor: `${statusColor}18` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text variant="caption" style={{ color: statusColor, fontWeight: '700' }}>
                {APPLICATION_STATUS_LABELS[application.status]}
              </Text>
            </View>
            {application.applicantTrustScore != null ? (
              <View style={[styles.metaPill, { borderColor: colors.border }]}>
                <Ionicons name="shield-checkmark" size={13} color={trustColor} />
                <Text variant="caption" style={{ color: trustColor }}>
                  Güven {application.applicantTrustScore}
                </Text>
              </View>
            ) : null}
            {application.applicantIsReady ? (
              <View style={[styles.metaPill, { borderColor: colors.border }]}>
                <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                <Text variant="caption" style={{ color: colors.success }}>
                  Hazır
                </Text>
              </View>
            ) : null}
          </View>
        </GlassCard>

        <View style={styles.quickRow}>
          {showChat && application.conversationId ? (
            <QuickAction icon="chatbubbles-outline" label="Sohbet" onPress={() => openApplicantChat(application)} />
          ) : null}
          {showCall && phone ? (
            <QuickAction icon="call-outline" label="Ara" onPress={() => callApplicant(phone)} />
          ) : null}
          <QuickAction icon="person-outline" label="Profil" onPress={() => openUserProfile(application.applicantId)} />
        </View>

        <SectionCard icon="briefcase-outline" title="İlan">
          <Pressable onPress={() => router.push(listingDetailPath(application.listingType, application.listingId) as never)}>
            <View style={[styles.listingRow, { backgroundColor: `${PERSONNEL_ACCENT}08`, borderColor: `${PERSONNEL_ACCENT}33` }]}>
              <Text variant="body" style={styles.listingTitle}>
                {application.listingTitle}
              </Text>
              <Ionicons name="open-outline" size={18} color={PERSONNEL_ACCENT} />
            </View>
          </Pressable>
        </SectionCard>

        {snap?.email || phone || snap?.age ? (
          <SectionCard icon="call-outline" title="İletişim">
            <View style={styles.infoGrid}>
              {snap?.email ? <InfoTile icon="mail-outline" label="E-posta" value={snap.email} /> : null}
              {phone ? (
                <InfoTile
                  icon="call-outline"
                  label="Telefon"
                  value={phone}
                  onPress={showCall ? () => callApplicant(phone) : undefined}
                />
              ) : null}
              {snap?.age ? <InfoTile icon="calendar-outline" label="Yaş" value={`${snap.age} yaş`} /> : null}
            </View>
          </SectionCard>
        ) : null}

        {snap?.resume ? (
          <SectionCard icon="document-text-outline" title="Özgeçmiş">
            <View style={[styles.resumeBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text variant="body" style={styles.resumeText}>
                {snap.resume}
              </Text>
            </View>
          </SectionCard>
        ) : null}

        {showSeekerSummary && snap ? (
          <SectionCard icon="id-card-outline" title="İş Arayan Profili">
            <View style={styles.infoGrid}>
              {snap.occupation ? <InfoTile icon="construct-outline" label="Meslek" value={snap.occupation} /> : null}
              {snap.experienceYears != null ? (
                <InfoTile icon="time-outline" label="Deneyim" value={`${snap.experienceYears} yıl`} />
              ) : null}
              {snap.education ? <InfoTile icon="school-outline" label="Eğitim" value={snap.education} /> : null}
              {snap.salaryExpectation ? (
                <InfoTile icon="cash-outline" label="Maaş" value={snap.salaryExpectation} />
              ) : null}
            </View>
            {snap.intro ? (
              <View style={styles.introBlock}>
                <Text secondary variant="caption">
                  Tanıtım
                </Text>
                <Text variant="body" style={styles.introText}>
                  {snap.intro}
                </Text>
              </View>
            ) : null}
          </SectionCard>
        ) : null}

        {skills.length > 0 ? (
          <SectionCard icon="sparkles-outline" title="Yetenekler">
            <View style={styles.chipGrid}>
              {skills.map((skill) => (
                <View
                  key={skill}
                  style={[styles.chip, { borderColor: `${PERSONNEL_ACCENT}44`, backgroundColor: `${PERSONNEL_ACCENT}10` }]}
                >
                  <Text variant="caption" style={{ color: PERSONNEL_ACCENT }}>
                    {skill}
                  </Text>
                </View>
              ))}
            </View>
          </SectionCard>
        ) : null}

        {showStatus ? (
          <ApplicationDecisionCard
            application={application}
            displayName={displayName}
            loadingStatus={loadingStatus}
            onUpdateStatus={updateStatus}
          />
        ) : null}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  errorPage: { flex: 1, paddingHorizontal: spacing.lg, gap: spacing.lg },
  errorText: { textAlign: 'center' },
  page: { paddingHorizontal: spacing.lg, gap: spacing.md },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  backBtn: {
    marginLeft: -spacing.sm,
  },
  screenTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  hero: { gap: spacing.sm, padding: spacing.md },
  heroMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroName: { fontSize: 17, fontWeight: '700' },
  avatar: { width: 56, height: 56, borderRadius: radius.full },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: { flex: 1, gap: spacing.xs, minWidth: 0 },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  quickActionIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: { textAlign: 'center', fontWeight: '600' },
  sectionCard: { gap: 0, padding: 0, overflow: 'hidden' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.md },
  sectionBody: { padding: spacing.md, gap: spacing.md },
  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  listingTitle: { flex: 1 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  infoTileWrap: { width: '48%', flexGrow: 1 },
  infoTile: {
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 88,
  },
  resumeBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  resumeText: { lineHeight: 24 },
  introBlock: { gap: spacing.xs },
  introText: { lineHeight: 22 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  decisionCard: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  decisionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  decisionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  decisionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    minWidth: '47%',
    flexGrow: 1,
    justifyContent: 'center',
  },
  finalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
