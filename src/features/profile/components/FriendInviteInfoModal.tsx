import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  FRIEND_INVITE_RULES_TABLE,
  TRUST_SCORE_OUTCOMES_TABLE,
  TRUST_SCORE_PURPOSE_NOTE,
} from '@/features/profile/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type FriendInviteInfoModalProps = {
  visible: boolean;
  onClose: () => void;
};

type TableColumn = { key: string; label: string; flex: number };

function InfoTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: TableColumn[];
  rows: Record<string, string>[];
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.tableWrap}>
      <Text variant="label" style={styles.tableTitle}>
        {title}
      </Text>
      <View style={[styles.table, { borderColor: colors.border }]}>
        <View style={[styles.tableHeader, { backgroundColor: `${colors.primary}10`, borderBottomColor: colors.border }]}>
          {columns.map((col) => (
            <Text
              key={col.key}
              variant="caption"
              style={[styles.headerCell, { flex: col.flex, color: colors.primary }]}
            >
              {col.label}
            </Text>
          ))}
        </View>
        {rows.map((row, index) => (
          <View
            key={`${title}-${index}`}
            style={[
              styles.tableRow,
              {
                borderBottomColor: colors.border,
                backgroundColor: index % 2 === 0 ? 'transparent' : `${colors.surfaceElevated}`,
              },
              index === rows.length - 1 && styles.tableRowLast,
            ]}
          >
            {columns.map((col) => (
              <Text key={col.key} variant="caption" style={[styles.bodyCell, { flex: col.flex }]}>
                {row[col.key]}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

export function FriendInviteInfoModal({ visible, onClose }: FriendInviteInfoModalProps) {
  const { colors } = useTheme();

  const inviteRows = FRIEND_INVITE_RULES_TABLE.map((row) => ({
    kural: row.kural,
    aciklama: row.aciklama,
  }));

  const outcomeRows = TRUST_SCORE_OUTCOMES_TABLE.map((row) => ({
    seviye: row.seviye,
    puan: row.puan,
    sonuc: row.sonuc,
  }));

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('fade')} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
            <Text variant="h3" style={styles.headerTitle}>
              Güven Puanı & Davet
            </Text>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text secondary variant="caption" style={styles.intro}>
              {TRUST_SCORE_PURPOSE_NOTE}
            </Text>

            <InfoTable
              title="Davet kodu kuralları"
              columns={[
                { key: 'kural', label: 'Kural', flex: 1 },
                { key: 'aciklama', label: 'Açıklama', flex: 2 },
              ]}
              rows={inviteRows}
            />

            <InfoTable
              title="Puan seviyeleri ve sonuçlar"
              columns={[
                { key: 'seviye', label: 'Seviye', flex: 1.1 },
                { key: 'puan', label: 'Puan', flex: 0.7 },
                { key: 'sonuc', label: 'Sonuç', flex: 1.6 },
              ]}
              rows={outcomeRows}
            />
          </ScrollView>

          <Pressable
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Kapat"
          >
            <Text variant="label" style={styles.closeBtnText}>
              Anladım
            </Text>
          </Pressable>
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
    maxWidth: 380,
    maxHeight: '85%',
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  intro: {
    lineHeight: 18,
  },
  tableWrap: {
    gap: spacing.sm,
  },
  tableTitle: {
    marginBottom: 2,
  },
  table: {
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  headerCell: {
    fontWeight: '700',
    paddingHorizontal: spacing.xs,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  bodyCell: {
    paddingHorizontal: spacing.xs,
    lineHeight: 17,
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    margin: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radius.full,
  },
  closeBtnText: {
    color: '#fff',
  },
});
