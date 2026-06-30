import { StyleSheet, Switch, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { BUSINESS_ACCENT } from '@/features/business-center/constants';
import type { LinkedSiblingProfile } from '@/features/account-switch/types';
import { spacing } from '@/constants/theme';

type Props = {
  linkedSibling: LinkedSiblingProfile | null;
  shopPublished: boolean;
  value: boolean;
  onValueChange: (next: boolean) => void;
};

export function BusinessShopPersonalToggle({
  linkedSibling,
  shopPublished,
  value,
  onValueChange,
}: Props) {
  const hasPersonalSibling = linkedSibling?.accountType === 'personal';
  if (!hasPersonalSibling) return null;

  const siblingLabel = linkedSibling.fullName?.trim() || `@${linkedSibling.username}`;
  const disabled = !shopPublished;

  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="label">Bireysel profilde göster</Text>
        <Text secondary variant="caption">
          {disabled
            ? 'Önce mağazayı yayınlayın'
            : `${siblingLabel} profilini ziyaret edenler mağazanızı görebilir`}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: BUSINESS_ACCENT }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
