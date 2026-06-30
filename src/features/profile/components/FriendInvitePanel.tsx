import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { FRIEND_INVITE_POINTS } from '@/features/profile/constants';
import { FriendInviteInfoModal } from '@/features/profile/components/FriendInviteInfoModal';
import {
  fetchOwnFriendInviteStatus,
  normalizeFriendInviteCodeInput,
  redeemFriendInviteCode,
  type FriendInviteStatus,
} from '@/features/profile/services/friendInvite';
import { useTheme } from '@/providers/ThemeProvider';

type FriendInvitePanelProps = {
  onPointsEarned?: () => void;
};

export function FriendInvitePanel({ onPointsEarned }: FriendInvitePanelProps) {
  const { colors } = useTheme();
  const [status, setStatus] = useState<FriendInviteStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    const next = await fetchOwnFriendInviteStatus();
    setStatus(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleCopyCode = async () => {
    if (!status?.invite_code) return;
    await Clipboard.setStringAsync(status.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRedeem = async () => {
    const normalized = normalizeFriendInviteCodeInput(codeInput);
    if (!normalized) {
      setError('Davet kodunu girin');
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await redeemFriendInviteCode(normalized);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setCodeInput('');
    await loadStatus();
    onPointsEarned?.();

    Alert.alert(
      'Tebrikler!',
      `Davet kodu uygulandı. Siz ve arkadaşınız ${result.points} güven puanı kazandınız.`,
    );
  };

  if (loading) {
    return (
      <Text secondary variant="caption">
        Yükleniyor…
      </Text>
    );
  }

  if (!status) {
    return (
      <Text secondary variant="caption">
        Davet bilgileri yüklenemedi.
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.codeCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <View style={styles.codeTopRow}>
          <View style={[styles.iconBadge, { backgroundColor: `${colors.primary}14` }]}>
            <Ionicons name="gift-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.codeInfo}>
            <Text variant="label">Davet kodun</Text>
            <Text secondary variant="caption">
              Paylaş, ikiniz de +{FRIEND_INVITE_POINTS} puan kazanın
            </Text>
          </View>
          <Pressable
            onPress={() => setInfoVisible(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Güven puanı ve davet kodu bilgisi"
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
        <Pressable
          onPress={() => void handleCopyCode()}
          style={({ pressed }) => [
            styles.codePill,
            {
              backgroundColor: colors.surface,
              borderColor: copied ? colors.success : colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text variant="body" style={[styles.codeText, { color: colors.primary }]}>
            {status.invite_code}
          </Text>
          <View style={styles.copyHint}>
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={16}
              color={copied ? colors.success : colors.primary}
            />
            <Text variant="caption" style={{ color: copied ? colors.success : colors.primary }}>
              {copied ? 'Kopyalandı' : 'Kopyala'}
            </Text>
          </View>
        </Pressable>
      </View>

      {status.has_redeemed ? (
        <View style={[styles.doneCard, { backgroundColor: `${colors.success}12`, borderColor: `${colors.success}40` }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text variant="caption" style={{ color: colors.success, flex: 1 }}>
            Arkadaşının davet kodunu zaten kullandın.
          </Text>
        </View>
      ) : (
        <View style={styles.redeemSection}>
          <Input
            label="Arkadaşının davet kodu"
            value={codeInput}
            onChangeText={(v) => {
              setCodeInput(v.toUpperCase());
              setError(null);
            }}
            placeholder="DAVET-XXXX-XXXX"
            autoCapitalize="characters"
            autoCorrect={false}
            hint="Sana verilen kodu buraya yaz veya yapıştır. Yalnızca bir kez kullanılabilir."
          />
          {error ? (
            <Text variant="caption" style={{ color: colors.error }}>
              {error}
            </Text>
          ) : null}
          <Button
            title="Davet Kodunu Uygula"
            onPress={() => void handleRedeem()}
            loading={submitting}
            disabled={!codeInput.trim()}
          />
        </View>
      )}
      <FriendInviteInfoModal visible={infoVisible} onClose={() => setInfoVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  codeCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  codeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeInfo: {
    flex: 1,
    gap: 2,
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  codeText: {
    fontWeight: '700',
    letterSpacing: 1,
    flex: 1,
  },
  copyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  redeemSection: {
    gap: spacing.sm,
  },
  doneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
});
