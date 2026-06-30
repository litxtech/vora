import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { BoostCampaignDisplay } from '@/features/profile/components/BoostCampaignDisplay';
import { BoostCampaignSheet } from '@/features/profile/components/BoostCampaignSheet';
import {
  cancelProfileBoost,
  formatBoostRemaining,
  isProfileBoosted,
} from '@/features/profile/services/profileBoost';
import { hasPremiumEntitlement } from '@/features/profile/services/premiumAccess';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type ProfileBoostPanelProps = {
  onRefresh?: () => void | Promise<void>;
  /** Reklam Merkezi gibi sıkı satır düzeni */
  inline?: boolean;
};

export function ProfileBoostPanel({ onRefresh, inline = false }: ProfileBoostPanelProps) {
  const { colors } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const [boosting, setBoosting] = useState(false);
  const [boostSheetOpen, setBoostSheetOpen] = useState(false);
  const [boostSheetMode, setBoostSheetMode] = useState<'start' | 'edit'>('start');

  const boostedUntil = profile?.profile_boosted_until ?? null;
  const boostMessage = profile?.profile_boost_message ?? null;
  const isPremium = hasPremiumEntitlement(profile?.is_premium);
  const boosted = isProfileBoosted(boostedUntil);

  const refresh = async () => {
    await refreshProfile();
    await onRefresh?.();
  };

  const handleBoost = () => {
    if (!isPremium) {
      return;
    }

    if (boosted) {
      Alert.alert('Profil vitrini', 'Kampanya metnini güncelleyebilir veya öne çıkarmayı durdurabilirsiniz.', [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Metni düzenle',
          onPress: () => {
            setBoostSheetMode('edit');
            setBoostSheetOpen(true);
          },
        },
        {
          text: 'Durdur',
          style: 'destructive',
          onPress: async () => {
            setBoosting(true);
            const { error } = await cancelProfileBoost();
            setBoosting(false);
            if (error) Alert.alert('Hata', error);
            else {
              await refresh();
              Alert.alert('Durduruldu', 'Profil öne çıkarma sonlandırıldı.');
            }
          },
        },
      ]);
      return;
    }

    setBoostSheetMode('start');
    setBoostSheetOpen(true);
  };

  return (
    <>
      <Pressable
        onPress={handleBoost}
        disabled={boosting}
        style={({ pressed }) => [
          inline ? styles.inlineRow : styles.cardRow,
          {
            borderColor: boosted ? `${colors.primary}44` : colors.border,
            backgroundColor: colors.surface,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}14` }]}>
          <Ionicons name={boosted ? 'rocket' : 'rocket-outline'} size={15} color={colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text variant="caption" style={{ fontWeight: '600' }}>
            Profil öne çıkarma
          </Text>
          <Text secondary variant="caption" style={{ fontSize: 11 }} numberOfLines={1}>
            {boosted
              ? boostMessage || formatBoostRemaining(boostedUntil)
              : isPremium
                ? '7 günlük vitrin · Premium'
                : 'Premium gerekir'}
          </Text>
        </View>
        {boosted && boostMessage && !inline ? (
          <View style={styles.displayWrap}>
            <BoostCampaignDisplay message={boostMessage} compact />
          </View>
        ) : null}
        <Text variant="caption" style={{ color: colors.primary, fontWeight: '600', fontSize: 11 }}>
          {boosting ? '...' : boosted ? 'Yönet' : isPremium ? 'Başlat' : 'Premium'}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      </Pressable>

      <BoostCampaignSheet
        visible={boostSheetOpen}
        mode={boostSheetMode}
        initialMessage={boostMessage}
        onClose={() => setBoostSheetOpen(false)}
        onSuccess={() => void refresh()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 1,
    minWidth: 120,
  },
  displayWrap: {
    width: '100%',
  },
});
