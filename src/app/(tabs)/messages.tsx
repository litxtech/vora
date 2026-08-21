import { lazy, Suspense, useState, useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { MESSAGING_FEATURE } from '@/features/messaging/featureFlags';
import { ConversationInbox } from '@/features/messaging/components/ConversationInbox';
import { MessagesTabBar } from '@/features/messaging/components/MessagesTabBar';
import { useTabMessagingBadge } from '@/features/messaging/hooks/useTabMessagingBadge';
import type { MessagesTab } from '@/features/messaging/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const CallHistoryList = lazy(() =>
  import('@/features/messaging/components/CallHistoryList').then((m) => ({ default: m.CallHistoryList })),
);
const ContactsList = lazy(() =>
  import('@/features/messaging/components/ContactsList').then((m) => ({ default: m.ContactsList })),
);
const MessageRequestsInbox = lazy(() =>
  import('@/features/messaging/components/MessageRequestsInbox').then((m) => ({
    default: m.MessageRequestsInbox,
  })),
);
const FriendsList = lazy(() =>
  import('@/features/messaging/components/FriendsList').then((m) => ({ default: m.FriendsList })),
);
const ChannelsInbox = lazy(() =>
  import('@/features/channels/components/ChannelsInbox').then((m) => ({ default: m.ChannelsInbox })),
);

/** Spinner yok — alt sekmeler sessizce doldurulur. */
function LazyMessagesPanel({ children }: { children: ReactNode }) {
  return <Suspense fallback={<View style={styles.tabFallback} />}>{children}</Suspense>;
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const totalUnread = useTabMessagingBadge();
  const [tab, setTab] = useState<MessagesTab>('chats');
  const channelsVisible = useFeatureVisible('channels');
  const callsVisible = useFeatureVisible('calls');
  const requestsVisible = useFeatureVisible(MESSAGING_FEATURE.tab.requests);
  const contactsVisible = useFeatureVisible(MESSAGING_FEATURE.tab.contacts);
  const friendsVisible = useFeatureVisible(MESSAGING_FEATURE.tab.friends);

  useEffect(() => {
    if (tab === 'channels' && !channelsVisible) setTab('chats');
    if (tab === 'calls' && !callsVisible) setTab('chats');
    if (tab === 'requests' && !requestsVisible) setTab('chats');
    if (tab === 'contacts' && !contactsVisible) setTab('chats');
    if (tab === 'friends' && !friendsVisible) setTab('chats');
  }, [tab, channelsVisible, callsVisible, requestsVisible, contactsVisible, friendsVisible]);

  if (!user) {
    return (
      <Screen>
        <Text variant="h2">Mesajlar</Text>
        <GlassCard style={styles.guestCard}>
          <View style={[styles.guestIcon, { backgroundColor: `${colors.primary}14` }]}>
            <Ionicons name="chatbubbles-outline" size={28} color={colors.primary} />
          </View>
          <Text secondary>
            Mesaj göndermek ve arama yapmak için giriş yapmanız veya kayıt olmanız gerekiyor.
          </Text>
          <Button title="Giriş Yap" onPress={() => router.push('/(auth)/login')} />
          <Button title="Kayıt Ol" variant="outline" onPress={() => router.push('/(auth)/register')} />
        </GlassCard>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text variant="h2">Mesajlar</Text>
            <Text secondary>Güvenli ve gerçek zamanlı iletişim</Text>
          </View>
          {totalUnread > 0 ? (
            <View style={[styles.unreadPill, { backgroundColor: colors.primary }]}>
              <Text variant="caption" style={styles.unreadPillText}>
                {totalUnread > 99 ? '99+' : totalUnread} yeni
              </Text>
            </View>
          ) : null}
        </View>
        <MessagesTabBar active={tab} onChange={setTab} unreadCount={totalUnread} />
      </View>

      <View style={styles.body}>
        {tab === 'chats' ? <ConversationInbox /> : null}
        {tab === 'channels' ? (
          <LazyMessagesPanel>
            <ChannelsInbox />
          </LazyMessagesPanel>
        ) : null}
        {tab === 'requests' ? (
          <LazyMessagesPanel>
            <MessageRequestsInbox />
          </LazyMessagesPanel>
        ) : null}
        {tab === 'contacts' ? (
          <LazyMessagesPanel>
            <ContactsList />
          </LazyMessagesPanel>
        ) : null}
        {tab === 'friends' ? (
          <LazyMessagesPanel>
            <FriendsList />
          </LazyMessagesPanel>
        ) : null}
        {tab === 'calls' ? (
          <LazyMessagesPanel>
            <CallHistoryList />
          </LazyMessagesPanel>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  unreadPill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginTop: 4,
  },
  unreadPillText: {
    color: '#fff',
    fontWeight: '700',
  },
  body: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  guestCard: {
    marginTop: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  guestIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  tabFallback: {
    flex: 1,
  },
});
