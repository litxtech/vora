import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { IZDIVAC_SPECIAL_BADGES, IZDIVAC_SPECIAL_BADGE_ORDER } from '@/features/izdivac/constants';
import { resolveIzdivacBadgeNote } from '@/features/izdivac/services/izdivacBadgeNotes';
import type { IzdivacSpecialBadgeType } from '@/features/izdivac/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  badges: IzdivacSpecialBadgeType[];
  size?: 'sm' | 'md';
  /** Yalnızca ikon (kompakt kartlar için) */
  iconOnly?: boolean;
};

function orderBadges(badges: IzdivacSpecialBadgeType[]): IzdivacSpecialBadgeType[] {
  const set = new Set(badges);
  return IZDIVAC_SPECIAL_BADGE_ORDER.filter((b) => set.has(b));
}

export function IzdivacBadgeChips({ badges, size = 'sm', iconOnly = false }: Props) {
  const [active, setActive] = useState<IzdivacSpecialBadgeType | null>(null);
  const ordered = orderBadges(badges);
  if (ordered.length === 0) return null;

  const iconSize = size === 'md' ? 13 : 11;
  const fontSize = size === 'md' ? 11 : 9;

  return (
    <>
      <View style={styles.row}>
        {ordered.map((badge) => {
          const def = IZDIVAC_SPECIAL_BADGES[badge];
          return (
            <Pressable
              key={badge}
              onPress={(e) => {
                e.stopPropagation?.();
                setActive(badge);
              }}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`${def.label} tiki — bilgi`}
              style={[
                styles.chip,
                iconOnly && styles.chipIconOnly,
                { backgroundColor: `${def.color}1F`, borderColor: `${def.color}40` },
              ]}
            >
              <Ionicons name={def.icon} size={iconSize} color={def.color} />
              {iconOnly ? null : (
                <Text variant="caption" style={{ color: def.color, fontSize, fontWeight: '800' }}>
                  {def.label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <IzdivacBadgeInfoModal badge={active} onClose={() => setActive(null)} />
    </>
  );
}

function IzdivacBadgeInfoModal({
  badge,
  onClose,
}: {
  badge: IzdivacSpecialBadgeType | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const [label, setLabel] = useState<string>(badge ? IZDIVAC_SPECIAL_BADGES[badge].label : '');
  const [note, setNote] = useState<string>(badge ? IZDIVAC_SPECIAL_BADGES[badge].note : '');

  useEffect(() => {
    if (!badge) return;
    const def = IZDIVAC_SPECIAL_BADGES[badge];
    setLabel(def.label);
    setNote(def.note);
    let cancelled = false;
    void resolveIzdivacBadgeNote(badge).then((resolved) => {
      if (cancelled) return;
      setLabel(resolved.label);
      setNote(resolved.note);
    });
    return () => {
      cancelled = true;
    };
  }, [badge]);

  if (!badge) return null;
  const def = IZDIVAC_SPECIAL_BADGES[badge];

  return (
    <Modal visible transparent animationType={resolveModalAnimationType('fade')} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <LinearGradient
            colors={[...def.gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroIcon}>
              <Ionicons name={def.icon} size={30} color="#fff" />
            </View>
            <Text variant="h3" style={styles.heroTitle}>
              {label}
            </Text>
          </LinearGradient>

          <View style={styles.body}>
            <View style={[styles.noteBox, { backgroundColor: `${def.color}12`, borderColor: `${def.color}30` }]}>
              <Ionicons name="information-circle-outline" size={18} color={def.color} />
              <Text secondary variant="caption" style={styles.noteText}>
                {note}
              </Text>
            </View>

            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: def.color }]}>
              <Text variant="label" style={{ color: '#fff' }}>
                Anladım
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipIconOnly: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: '#fff',
    textAlign: 'center',
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  noteText: {
    flex: 1,
    lineHeight: 18,
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
});
