import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { IZDIVAC_SPECIAL_BADGES, IZDIVAC_SPECIAL_BADGE_ORDER } from '@/features/izdivac/constants';
import {
  deleteIzdivacBadgeNote,
  fetchIzdivacBadgeNotes,
  setIzdivacBadgeNote,
} from '@/features/izdivac/services/izdivacBadgeNotes';
import type { IzdivacSpecialBadgeType } from '@/features/izdivac/types';
import { radius, spacing } from '@/constants/theme';
import { useAdminGuard } from '@/features/admin/hooks/useAdminGuard';
import { useTheme } from '@/providers/ThemeProvider';

type DraftState = Record<IzdivacSpecialBadgeType, { label: string; note: string; overridden: boolean }>;

function emptyDraft(): DraftState {
  return {
    jigolo: { label: '', note: '', overridden: false },
    tilki: { label: '', note: '', overridden: false },
    finansman: { label: '', note: '', overridden: false },
  };
}

export function AdminIzdivacBadgeNotesScreen() {
  const { colors } = useTheme();
  const guard = useAdminGuard();
  const [draft, setDraft] = useState<DraftState>(emptyDraft());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<IzdivacSpecialBadgeType | null>(null);

  const load = useCallback(async () => {
    if (guard.status !== 'allowed') return;
    setLoading(true);
    const map = await fetchIzdivacBadgeNotes(true);
    const next = emptyDraft();
    for (const badge of IZDIVAC_SPECIAL_BADGE_ORDER) {
      const override = map[badge];
      next[badge] = {
        label: override?.label ?? '',
        note: override?.note ?? '',
        overridden: Boolean(override),
      };
    }
    setDraft(next);
    setLoading(false);
  }, [guard.status]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (badge: IzdivacSpecialBadgeType) => {
    const entry = draft[badge];
    const note = entry.note.trim();
    if (!note) {
      Alert.alert('Hata', 'Not boş olamaz. Varsayılana dönmek için "Varsayılana dön" kullanın.');
      return;
    }
    setBusy(badge);
    const { error } = await setIzdivacBadgeNote(badge, note, entry.label.trim() || null);
    setBusy(null);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }
    Alert.alert('Kaydedildi', `${IZDIVAC_SPECIAL_BADGES[badge].label} notu güncellendi.`);
    void load();
  };

  const resetToDefault = (badge: IzdivacSpecialBadgeType) => {
    Alert.alert(
      'Varsayılana dön',
      `${IZDIVAC_SPECIAL_BADGES[badge].label} tikinin özel notu silinecek ve varsayılan not gösterilecek. Onaylıyor musunuz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setBusy(badge);
            const { error } = await deleteIzdivacBadgeNote(badge);
            setBusy(null);
            if (error) {
              Alert.alert('Hata', error);
              return;
            }
            void load();
          },
        },
      ],
    );
  };

  if (guard.status === 'denied') return null;

  return (
    <AdminShell title="İzdivaç Tik Notları" requireAdmin>
      <Text secondary variant="caption" style={styles.intro}>
        Tike tıklanınca açılan açıklama notunu buradan düzenleyin. "Varsayılana dön" özel notu siler ve
        uygulamadaki varsayılan metni geri getirir.
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
      ) : (
        IZDIVAC_SPECIAL_BADGE_ORDER.map((badge) => {
          const def = IZDIVAC_SPECIAL_BADGES[badge];
          const entry = draft[badge];
          return (
            <GlassCard key={badge} style={styles.card}>
              <View style={styles.head}>
                <View style={[styles.icon, { backgroundColor: `${def.color}22` }]}>
                  <Ionicons name={def.icon} size={18} color={def.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="label" style={{ color: def.color }}>
                    {def.label}
                  </Text>
                  <Text secondary variant="caption" style={{ fontSize: 11 }}>
                    {entry.overridden ? 'Özel not aktif' : 'Varsayılan not gösteriliyor'}
                  </Text>
                </View>
              </View>

              <Text secondary variant="caption" style={styles.fieldLabel}>
                Başlık (boş bırakılırsa "{def.label}")
              </Text>
              <TextInput
                value={entry.label}
                onChangeText={(t) =>
                  setDraft((prev) => ({ ...prev, [badge]: { ...prev[badge], label: t } }))
                }
                placeholder={def.label}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              />

              <Text secondary variant="caption" style={styles.fieldLabel}>
                Not
              </Text>
              <TextInput
                value={entry.note}
                onChangeText={(t) =>
                  setDraft((prev) => ({ ...prev, [badge]: { ...prev[badge], note: t } }))
                }
                placeholder={def.note}
                placeholderTextColor={colors.textMuted}
                multiline
                style={[
                  styles.input,
                  styles.noteInput,
                  { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
                ]}
              />

              <View style={styles.actions}>
                <AdminActionChip
                  compact
                  label="Kaydet"
                  icon="checkmark-circle-outline"
                  tone="primary"
                  loading={busy === badge}
                  onPress={() => save(badge)}
                />
                <AdminActionChip
                  compact
                  label="Varsayılana dön"
                  icon="refresh-outline"
                  tone="danger"
                  onPress={() => resetToDefault(badge)}
                  disabled={!entry.overridden || busy === badge}
                />
              </View>
            </GlassCard>
          );
        })
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: spacing.md, lineHeight: 18 },
  card: { gap: spacing.sm, marginBottom: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: { fontSize: 11, fontWeight: '600', marginTop: spacing.xs },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
  },
  noteInput: { minHeight: 90, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
});
