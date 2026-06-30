import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { ACCOUNT_SWITCH_ROUTES } from '@/features/account-switch/constants';
import { useAccountSwitch } from '@/features/account-switch/providers/AccountSwitchProvider';
import {
  cancelPendingAccountLink,
  disconnectLinkedAccount,
} from '@/features/account-switch/services/accountSwitch';
import type { LinkedSiblingProfile } from '@/features/account-switch/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  accountType: 'personal' | 'business';
  linkedSibling: LinkedSiblingProfile | null;
  outgoingPendingUsername: string | null;
  outgoingPendingRequestId?: string | null;
  outgoingPendingTargetUserId?: string | null;
  compact?: boolean;
};

function linkTitle(accountType: 'personal' | 'business') {
  return accountType === 'personal' ? 'İşletme Hesabını Bağla' : 'Bireysel Hesabı Bağla';
}

function linkSubtitle(accountType: 'personal' | 'business') {
  return accountType === 'personal'
    ? 'Ayrı kayıt olmuş işletme hesabınızı bu profile bağlayın'
    : 'Ayrı kayıt olmuş bireysel hesabınızı işletme profilinize bağlayın';
}

export function AccountLinkStatusCard({
  accountType,
  linkedSibling,
  outgoingPendingUsername,
  outgoingPendingRequestId = null,
  outgoingPendingTargetUserId = null,
  compact = false,
}: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { refreshSwitchState } = useAccountSwitch();
  const [busy, setBusy] = useState(false);
  const accent = accountType === 'business' ? '#7C4DFF' : colors.primary;

  const confirmUnlink = () => {
    if (!user?.id || !linkedSibling || busy) return;
    const label = linkedSibling.fullName?.trim() || `@${linkedSibling.username}`;

    Alert.alert(
      'Bağlantıyı kes',
      `${label} ile hesap bağlantısı kaldırılacak. Profil geçişi ve mağaza görünürlüğü etkilenebilir. Devam edilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Bağlantıyı kes',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy(true);
              const { error } = await disconnectLinkedAccount({
                currentUserId: user.id,
                siblingId: linkedSibling.siblingId,
              });
              setBusy(false);
              if (error) {
                Alert.alert('Bağlantı kesilemedi', error);
                return;
              }
              await refreshSwitchState();
              Alert.alert('Bağlantı kesildi', 'Hesap bağlantısı kaldırıldı.');
            })();
          },
        },
      ],
    );
  };

  const confirmCancelRequest = () => {
    if (!user?.id || !outgoingPendingRequestId || busy) return;
    const target = outgoingPendingUsername ? `@${outgoingPendingUsername}` : 'karşı hesap';

    Alert.alert(
      'İsteği iptal et',
      `${target} için gönderdiğiniz bağlama isteği silinecek. Devam edilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İsteği sil',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy(true);
              const { error } = await cancelPendingAccountLink(
                outgoingPendingRequestId,
                user.id,
                outgoingPendingTargetUserId,
              );
              setBusy(false);
              if (error) {
                Alert.alert('İptal edilemedi', error);
                return;
              }
              await refreshSwitchState();
              Alert.alert('İstek silindi', 'Bağlama isteği iptal edildi.');
            })();
          },
        },
      ],
    );
  };

  if (linkedSibling) {
    const label = linkedSibling.fullName?.trim() || linkedSibling.username;
    const kind = linkedSibling.accountType === 'business' ? 'İşletme' : 'Bireysel';

    return (
      <GlassCard style={[styles.card, compact && styles.cardCompact]}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
            <Ionicons name="link" size={18} color={accent} />
          </View>
          <View style={styles.headerCopy}>
            <Text variant="label">Bağlı {kind.toLowerCase()} hesap</Text>
            <Text secondary variant="caption">
              Profil ekranındaki geçiş butonundan hesaplar arası geçiş yapabilirsiniz
            </Text>
          </View>
        </View>
        <View style={[styles.linkedRow, { borderColor: colors.border }]}>
          <ProfileAvatar
            username={linkedSibling.username}
            avatarUrl={linkedSibling.avatarUrl}
            size={44}
          />
          <View style={styles.linkedCopy}>
            <Text variant="label" numberOfLines={1}>
              {label}
            </Text>
            <Text secondary variant="caption">
              @{linkedSibling.username}
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        </View>
        <View style={styles.actions}>
          <Button
            title={busy ? 'Kesiliyor...' : 'Bağlantıyı kes'}
            variant="danger"
            size="compact"
            onPress={confirmUnlink}
            disabled={busy}
          />
        </View>
      </GlassCard>
    );
  }

  if (outgoingPendingUsername) {
    return (
      <GlassCard style={[styles.card, compact && styles.cardCompact]}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.warning}18` }]}>
            <Ionicons name="hourglass-outline" size={18} color={colors.warning} />
          </View>
          <View style={styles.headerCopy}>
            <Text variant="label">Onay bekleniyor</Text>
            <Text secondary variant="caption">
              @{outgoingPendingUsername} hesabının bildirimlerinden bağlama isteğini onaylaması
              gerekiyor.
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push(ACCOUNT_SWITCH_ROUTES.linkBusinessAccount as Href)}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <Text variant="caption" style={{ color: accent, fontWeight: '700' }}>
              Bağlantı ayrıntıları →
            </Text>
          </Pressable>
          <Button
            title={busy ? 'Siliniyor...' : 'İsteği sil'}
            variant="danger"
            size="compact"
            onPress={confirmCancelRequest}
            disabled={busy || !outgoingPendingRequestId}
          />
        </View>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
          <Ionicons name="link-outline" size={18} color={accent} />
        </View>
        <View style={styles.headerCopy}>
          <Text variant="label">{linkTitle(accountType)}</Text>
          <Text secondary variant="caption">
            {linkSubtitle(accountType)}
          </Text>
        </View>
      </View>
      <Button
        title="Bağlantıyı başlat"
        size={compact ? 'compact' : 'default'}
        onPress={() => router.push(ACCOUNT_SWITCH_ROUTES.linkBusinessAccount as Href)}
      />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  cardCompact: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, gap: 4 },
  linkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  linkedCopy: { flex: 1, gap: 2, minWidth: 0 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
});
