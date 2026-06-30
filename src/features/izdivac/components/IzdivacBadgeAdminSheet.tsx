import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import {
  type AdminIzdivacBadgeRow,
  fetchAdminIzdivacBadges,
  grantIzdivacBadge,
  revokeIzdivacBadge,
} from '@/features/izdivac/services/adminIzdivac';
import { IZDIVAC_SPECIAL_BADGES, IZDIVAC_SPECIAL_BADGE_ORDER } from '@/features/izdivac/constants';
import type { IzdivacSpecialBadgeType } from '@/features/izdivac/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  visible: boolean;
  userId: string | null;
  username: string | null;
  onClose: () => void;
};

export function IzdivacBadgeAdminSheet({ visible, userId, username, onClose }: Props) {
  const { colors } = useTheme();
  const [rows, setRows] = useState<AdminIzdivacBadgeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<IzdivacSpecialBadgeType | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const result = await fetchAdminIzdivacBadges(userId);
    setRows(result.data);
    setLoading(false);
    if (result.error) Alert.alert('Hata', result.error);
  }, [userId]);

  useEffect(() => {
    if (visible && userId) {
      void load();
    }
  }, [visible, userId, load]);

  const grant = async (badge: IzdivacSpecialBadgeType) => {
    if (!userId) return;
    setBusy(badge);
    const { error } = await grantIzdivacBadge(userId, badge);
    setBusy(null);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }
    void load();
  };

  const revoke = async (badge: IzdivacSpecialBadgeType) => {
    if (!userId) return;
    setBusy(badge);
    const { error } = await revokeIzdivacBadge(userId, badge);
    setBusy(null);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }
    void load();
  };

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <Text variant="h3" style={styles.title}>
            İzdivaç Tikleri
          </Text>
          {username ? (
            <Text secondary variant="caption" style={styles.subtitle}>
              @{username}
            </Text>
          ) : null}

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {IZDIVAC_SPECIAL_BADGE_ORDER.map((badge) => {
                const def = IZDIVAC_SPECIAL_BADGES[badge];
                const granted = rows.find((r) => r.badgeType === badge);

                return (
                  <View
                    key={badge}
                    style={[styles.badgeRow, { borderColor: colors.border, backgroundColor: `${def.color}0D` }]}
                  >
                    <View style={styles.badgeHead}>
                      <View style={[styles.badgeIcon, { backgroundColor: `${def.color}22` }]}>
                        <Ionicons name={def.icon} size={18} color={def.color} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text variant="label" style={{ color: def.color }}>
                          {def.label}
                        </Text>
                        {granted ? (
                          <Text secondary variant="caption" style={{ fontSize: 11 }}>
                            Verildi
                          </Text>
                        ) : (
                          <Text secondary variant="caption" style={{ fontSize: 11 }} numberOfLines={2}>
                            {def.note}
                          </Text>
                        )}
                      </View>

                      {granted ? (
                        <Pressable
                          onPress={() => void revoke(badge)}
                          disabled={busy === badge}
                          style={[styles.actionBtn, { backgroundColor: `${colors.danger}18` }]}
                        >
                          {busy === badge ? (
                            <ActivityIndicator size="small" color={colors.danger} />
                          ) : (
                            <Text variant="caption" style={{ color: colors.danger, fontWeight: '700' }}>
                              Kaldır
                            </Text>
                          )}
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => void grant(badge)}
                          disabled={busy === badge}
                          style={[styles.actionBtn, { backgroundColor: `${def.color}22` }]}
                        >
                          {busy === badge ? (
                            <ActivityIndicator size="small" color={def.color} />
                          ) : (
                            <Text variant="caption" style={{ color: def.color, fontWeight: '700' }}>
                              Ver
                            </Text>
                          )}
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.primary }]}>
            <Text variant="label" style={{ color: '#fff' }}>
              Kapat
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    maxHeight: '82%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)',
    marginBottom: spacing.sm,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginBottom: spacing.sm },
  list: { marginTop: spacing.sm },
  badgeRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  badgeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badgeIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    minWidth: 64,
    alignItems: 'center',
  },
  closeBtn: {
    marginTop: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
});
