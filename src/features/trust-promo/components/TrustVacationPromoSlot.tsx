import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TrustVacationPromoCard } from '@/features/trust-promo/components/TrustVacationPromoCard';
import { TRUST_PROMO_DISMISS_KEY } from '@/features/trust-promo/constants';
import type { TrustVacationPromoPlacement } from '@/features/trust-promo/types';
import { spacing } from '@/constants/theme';
import { DEFAULT_APP_APPEARANCE } from '@/features/app-appearance/constants';
import { useAppearanceOptional } from '@/providers/appearanceContext';

type Props = {
  placement: TrustVacationPromoPlacement;
  currentScore?: number | null;
  maxScore?: number;
  compact?: boolean;
};

export function TrustVacationPromoSlot({ placement, currentScore, maxScore, compact }: Props) {
  const appearance = useAppearanceOptional();
  const promo = (appearance?.config ?? DEFAULT_APP_APPEARANCE).trust_vacation_promo;
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(!promo.dismissible);

  useEffect(() => {
    if (!promo.dismissible) {
      setReady(true);
      return;
    }

    let cancelled = false;
    const load = async () => {
      const value = await AsyncStorage.getItem(TRUST_PROMO_DISMISS_KEY);
      if (!cancelled) {
        setDismissed(value === '1');
        setReady(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [promo.dismissible]);

  if (!ready) return null;
  if (!promo.enabled || !promo.title.trim()) return null;
  if (!promo.placements[placement]) return null;
  if (promo.dismissible && dismissed) return null;

  const dismiss = async () => {
    await AsyncStorage.setItem(TRUST_PROMO_DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <View style={styles.wrap}>
      <TrustVacationPromoCard
        config={promo}
        currentScore={currentScore}
        maxScore={maxScore}
        onDismiss={() => void dismiss()}
        compact={compact}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xs,
  },
});
