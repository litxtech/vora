import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { PIONEER_ICON, PIONEER_NOTE } from '@/features/pioneer/constants';
import { PIONEER_THEME } from '@/features/pioneer/theme';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type PioneerInfoModalProps = {
  visible: boolean;
  onClose: () => void;
  earnedAt?: string | null;
};

function formatEarnedDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function PioneerInfoModal({ visible, onClose, earnedAt }: PioneerInfoModalProps) {
  const { colors } = useTheme();
  const theme = PIONEER_THEME;

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('fade')} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <LinearGradient
            colors={[...theme.gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={[styles.heroIcon, { borderColor: `${theme.rim}88` }]}>
              <Ionicons name={PIONEER_ICON} size={32} color="#fff" />
            </View>
            <Text variant="h3" style={styles.heroTitle}>
              {theme.title}
            </Text>
          </LinearGradient>

          <View style={styles.body}>
            <Text variant="body" style={styles.description}>
              {theme.description}
            </Text>

            {earnedAt ? (
              <View style={[styles.metaRow, { backgroundColor: `${theme.accent}14` }]}>
                <Ionicons name="calendar-outline" size={16} color={theme.accent} />
                <Text secondary variant="caption">
                  Verilme tarihi: {formatEarnedDate(earnedAt)}
                </Text>
              </View>
            ) : null}

            <View
              style={[
                styles.noteBox,
                { backgroundColor: `${theme.accent}12`, borderColor: `${theme.accent}30` },
              ]}
            >
              <Ionicons name="information-circle-outline" size={18} color={theme.accent} />
              <Text secondary variant="caption" style={styles.noteText}>
                {PIONEER_NOTE}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.accent }]}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
            >
              <Text variant="label" style={styles.closeBtnText}>
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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
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
  description: {
    lineHeight: 22,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignSelf: 'center',
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
    marginTop: spacing.xs,
  },
  closeBtnText: {
    color: '#fff',
  },
});
