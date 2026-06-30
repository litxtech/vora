import { ScrollView, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { MESSAGING_FEATURE } from '@/features/messaging/featureFlags';
import type { FeatureId } from '@/features/feature-flags/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import type { MessagesTab } from '../types';

const TABS: { id: MessagesTab; label: string; featureId?: FeatureId }[] = [
  { id: 'chats', label: 'Sohbetler' },
  { id: 'channels', label: 'Kanallar', featureId: 'channels' },
  { id: 'requests', label: 'İstekler', featureId: MESSAGING_FEATURE.tab.requests },
  { id: 'contacts', label: 'Kişiler', featureId: MESSAGING_FEATURE.tab.contacts },
  { id: 'friends', label: 'Arkadaşlar', featureId: MESSAGING_FEATURE.tab.friends },
  { id: 'calls', label: 'Aramalar', featureId: 'calls' },
];

type MessagesTabBarProps = {
  active: MessagesTab;
  onChange: (tab: MessagesTab) => void;
  unreadCount?: number;
};

export function MessagesTabBar({ active, onChange, unreadCount = 0 }: MessagesTabBarProps) {
  const { colors } = useTheme();
  const channelsVisible = useFeatureVisible('channels');
  const callsVisible = useFeatureVisible('calls');
  const requestsVisible = useFeatureVisible(MESSAGING_FEATURE.tab.requests);
  const contactsVisible = useFeatureVisible(MESSAGING_FEATURE.tab.contacts);
  const friendsVisible = useFeatureVisible(MESSAGING_FEATURE.tab.friends);

  const visibleTabs = TABS.filter((tab) => {
    if (!tab.featureId) return true;
    if (tab.featureId === 'channels') return channelsVisible;
    if (tab.featureId === 'calls') return callsVisible;
    if (tab.featureId === MESSAGING_FEATURE.tab.requests) return requestsVisible;
    if (tab.featureId === MESSAGING_FEATURE.tab.contacts) return contactsVisible;
    if (tab.featureId === MESSAGING_FEATURE.tab.friends) return friendsVisible;
    return true;
  });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {visibleTabs.map((tab) => {
        const isActive = tab.id === active;
        const badge = tab.id === 'chats' && unreadCount > 0 ? unreadCount : 0;
        return (
          <Pressable
            key={tab.id}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? colors.primary : colors.surface,
                borderColor: isActive ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onChange(tab.id)}
          >
            <Text
              variant="caption"
              style={{
                color: isActive ? '#fff' : colors.textSecondary,
                fontWeight: isActive ? '700' : '500',
              }}
            >
              {tab.label}
            </Text>
            {badge > 0 ? (
              <View style={[styles.badge, { backgroundColor: isActive ? '#fff' : colors.primary }]}>
                <Text
                  variant="caption"
                  style={{
                    color: isActive ? colors.primary : '#fff',
                    fontWeight: '700',
                    fontSize: 10,
                  }}
                >
                  {badge > 99 ? '99+' : badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: spacing.xs,
    paddingBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
});
