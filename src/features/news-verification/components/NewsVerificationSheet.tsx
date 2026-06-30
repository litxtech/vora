import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { VerificationNotesList } from '@/features/news-verification/components/VerificationNotesList';
import {
  NEWS_VERIFICATION_STATUS,
  NEWS_VERIFICATION_VOTES,
  REPORTER_ROLES,
} from '@/features/news-verification/constants';
import {
  canUserVoteVerification,
  fetchVerificationNotes,
  fetchVerificationSummary,
  submitVerification,
} from '@/features/news-verification/services/newsVerificationData';
import type {
  NewsVerificationNote,
  NewsVerificationSummary,
  NewsVerificationTarget,
  NewsVerificationVote,
} from '@/features/news-verification/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type NewsVerificationSheetProps = {
  visible: boolean;
  target: NewsVerificationTarget;
  onClose: () => void;
  onUpdated?: (summary: NewsVerificationSummary) => void;
  variant?: 'default' | 'reel';
};

export function NewsVerificationSheet({
  visible,
  target,
  onClose,
  onUpdated,
  variant = 'default',
}: NewsVerificationSheetProps) {
  const { colors, isDark } = useTheme();
  const { user, profile, refreshProfile } = useAuth();
  const [summary, setSummary] = useState<NewsVerificationSummary | null>(null);
  const [notes, setNotes] = useState<NewsVerificationNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedVote, setSelectedVote] = useState<NewsVerificationVote | null>(null);
  const [note, setNote] = useState('');
  const [canVote, setCanVote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReporter = REPORTER_ROLES.includes(profile?.role as (typeof REPORTER_ROLES)[number]);

  const load = useCallback(async () => {
    setLoading(true);
    const [nextSummary, voteAllowed, nextNotes] = await Promise.all([
      fetchVerificationSummary(target),
      canUserVoteVerification(user?.id ?? null),
      fetchVerificationNotes(target),
    ]);
    setSummary(nextSummary);
    setCanVote(voteAllowed);
    setNotes(nextNotes);
    setLoading(false);
  }, [target, user?.id]);

  useEffect(() => {
    if (!visible) return;
    setSelectedVote(null);
    setNote('');
    setError(null);
    void load();
  }, [visible, load]);

  const handleSubmit = async () => {
    if (!user || !selectedVote) return;
    setSubmitting(true);
    setError(null);

    const result = await submitVerification(
      target,
      user.id,
      selectedVote,
      note.trim() || undefined,
      isReporter,
    );

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? 'Doğrulama kaydedilemedi.');
      return;
    }

    const [nextSummary, nextNotes] = await Promise.all([
      fetchVerificationSummary(target),
      fetchVerificationNotes(target),
    ]);
    setSummary(nextSummary);
    setNotes(nextNotes);
    onUpdated?.(nextSummary);
    if (isReporter) {
      await refreshProfile?.();
    }
    onClose();
  };

  const statusConfig = NEWS_VERIFICATION_STATUS[summary?.status ?? 'none'];
  const totalVotes =
    (summary?.correctCount ?? 0) +
    (summary?.incorrectCount ?? 0) +
    (summary?.unverifiedCount ?? 0) +
    (summary?.verifiedVotes ?? 0) +
    (summary?.misinfoVotes ?? 0) +
    (summary?.reviewingVotes ?? 0);

  const statusBanner = (
    <View
      style={[
        styles.statusBanner,
        {
          backgroundColor: `${statusConfig.color}${isDark ? '18' : '12'}`,
          borderColor: `${statusConfig.color}44`,
        },
      ]}
    >
      <Ionicons name={statusConfig.icon} size={18} color={statusConfig.color} />
      <View style={{ flex: 1 }}>
        <Text variant="label" style={{ color: statusConfig.color }}>
          {statusConfig.label}
        </Text>
        <Text variant="caption" secondary style={{ marginTop: 2 }}>
          {statusConfig.description}
        </Text>
      </View>
    </View>
  );

  const statsRow =
    totalVotes > 0 ? (
      <View style={styles.statsRow}>
        <StatPill label="Doğru" count={summary!.correctCount + summary!.verifiedVotes} color="#43A047" />
        <StatPill label="İnceleme" count={summary!.unverifiedCount + summary!.reviewingVotes} color="#F9A825" />
        <StatPill label="Yanlış" count={summary!.incorrectCount + summary!.misinfoVotes} color="#E53935" />
      </View>
    ) : null;

  const voteOptions =
    canVote && user ? (
      <View style={styles.voteSection}>
        <Text variant="label" style={styles.sectionTitle}>
          {isReporter ? 'Muhabir değerlendirmesi' : 'Değerlendirmeniz'}
        </Text>

        <View style={styles.voteList}>
          {NEWS_VERIFICATION_VOTES.map((option) => {
            const selected = selectedVote === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => {
                  setSelectedVote(option.id);
                  setError(null);
                }}
                style={[
                  styles.voteCard,
                  {
                    borderColor: selected ? option.color : colors.border,
                    backgroundColor: selected
                      ? `${option.color}${isDark ? '22' : '14'}`
                      : colors.surface,
                  },
                ]}
              >
                <View style={styles.voteCardHeader}>
                  <View style={[styles.voteIconWrap, { backgroundColor: `${option.color}18` }]}>
                    <Ionicons name={option.icon} size={20} color={option.color} />
                  </View>
                  <View style={styles.voteCardText}>
                    <Text variant="label" style={{ color: option.color }}>
                      {option.label}
                    </Text>
                    <Text variant="caption" secondary>
                      {option.subtitle}
                    </Text>
                  </View>
                  <Ionicons
                    name={selected ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={selected ? option.color : colors.textMuted}
                  />
                </View>

                {selected ? (
                  <View style={styles.voteCardBody}>
                    {isReporter ? (
                      <TextInput
                        style={[
                          styles.noteInput,
                          {
                            color: colors.text,
                            borderColor: colors.border,
                            backgroundColor: colors.surfaceElevated,
                          },
                        ]}
                        placeholder="Not bırakın (ör. kaynak teyit edildi, görüntü eski tarihli...)"
                        placeholderTextColor={colors.textMuted}
                        value={note}
                        onChangeText={setNote}
                        multiline
                        maxLength={500}
                      />
                    ) : null}

                    {error ? (
                      <Text variant="caption" style={{ color: colors.danger }}>
                        {error}
                      </Text>
                    ) : null}

                    <Button
                      title="Doğrulamayı Kaydet"
                      onPress={handleSubmit}
                      loading={submitting}
                      style={styles.submitButton}
                    />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    ) : (
      <View style={[styles.hintBox, { backgroundColor: `${colors.primary}10` }]}>
        <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
        <Text variant="caption" secondary style={{ flex: 1 }}>
          {user
            ? 'Doğrulama yapmak için güven puanınızın 70 olması, admin panelinden yetki verilmesi veya muhabir yetkisine sahip olmanız gerekir.'
            : 'Doğrulama yapmak için giriş yapın.'}
        </Text>
      </View>
    );

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <LinearGradient
              colors={[`${statusConfig.color}33`, `${statusConfig.color}08`]}
              style={styles.headerIcon}
            >
              <Ionicons name={statusConfig.icon} size={22} color={statusConfig.color} />
            </LinearGradient>
            <View style={styles.headerText}>
              <Text variant="h3">Haber Doğrulama</Text>
              <Text variant="caption" secondary>
                {statusConfig.description}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : (
            <KeyboardAwareScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              bottomOffset={24}
              extraKeyboardSpace={16}
              showsVerticalScrollIndicator={false}
            >
              {statusBanner}
              {statsRow}
              <VerificationNotesList notes={notes} />
              {voteOptions}
            </KeyboardAwareScrollView>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

function StatPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={[styles.statPill, { backgroundColor: `${color}14`, borderColor: `${color}33` }]}>
      <Text variant="label" style={{ color, fontSize: 16 }}>
        {count}
      </Text>
      <Text variant="caption" style={{ color, fontSize: 10 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    height: '88%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.35)',
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  voteSection: {
    gap: spacing.sm,
  },
  voteList: {
    gap: spacing.sm,
  },
  voteCard: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  voteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  voteIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteCardText: {
    flex: 1,
    gap: 2,
  },
  voteCardBody: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
    paddingTop: spacing.md,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 88,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  submitButton: {
    alignSelf: 'stretch',
  },
  hintBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'flex-start',
  },
});
