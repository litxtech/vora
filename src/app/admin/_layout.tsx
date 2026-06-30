import { Stack } from 'expo-router';
import { getDefaultStackScreenOptions } from '@/constants/navigation';
import { useTheme } from '@/providers/ThemeProvider';

export default function AdminLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={getDefaultStackScreenOptions({
        contentStyle: { backgroundColor: colors.background },
      })}
    >
      <Stack.Screen name="index" options={{ gestureEnabled: false }} />
      <Stack.Screen name="features" />
      <Stack.Screen name="appearance" />
      <Stack.Screen name="users" />
      <Stack.Screen name="users/[id]" />
      <Stack.Screen name="users/edit/[id]" />
      <Stack.Screen name="staff" />
      <Stack.Screen name="account-lifecycle" />
      <Stack.Screen name="support" />
      <Stack.Screen name="appeals" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="ai-moderation" />
      <Stack.Screen name="vora-ai" />
      <Stack.Screen name="messaging" />
      <Stack.Screen name="content" />
      <Stack.Screen name="businesses" />
      <Stack.Screen name="business-shops" />
      <Stack.Screen name="hotels" />
      <Stack.Screen name="account-links" />
      <Stack.Screen name="proximity-match" />
      <Stack.Screen name="explorer" />
      <Stack.Screen name="identity-verification" />
      <Stack.Screen name="jobs" />
      <Stack.Screen name="personnel" />
      <Stack.Screen name="campaigns" />
      <Stack.Screen name="calls" />
      <Stack.Screen name="social-safety" />
      <Stack.Screen name="events" />
      <Stack.Screen name="lost-items" />
      <Stack.Screen name="vora-needs" />
      <Stack.Screen name="centers" />
      <Stack.Screen name="reporter" />
      <Stack.Screen name="news-verification" />
      <Stack.Screen name="verification-center" />
      <Stack.Screen name="communities" />
      <Stack.Screen name="channels" />
      <Stack.Screen name="ads" />
      <Stack.Screen name="platform-debts" />
      <Stack.Screen name="premium" />
      <Stack.Screen name="vcts" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="hashtags" />
      <Stack.Screen name="agenda" />
      <Stack.Screen name="profile-boost" />
      <Stack.Screen name="feed-curation" />
      <Stack.Screen name="reels-curation" />
      <Stack.Screen name="discovery-curation" />
      <Stack.Screen name="broadcasts" />
      <Stack.Screen name="push-automation" />
      <Stack.Screen name="emergency" />
      <Stack.Screen name="operations" />
      <Stack.Screen name="notification-sounds" />
      <Stack.Screen name="music-library" />
      <Stack.Screen name="notification-stats" />
      <Stack.Screen name="map" />
      <Stack.Screen name="logs" />
      <Stack.Screen name="statistics" />
      <Stack.Screen name="revenue" />
      <Stack.Screen name="kuru" />
      <Stack.Screen name="friend-invites" />
      <Stack.Screen name="referral-earnings" />
      <Stack.Screen name="referral-earnings/[id]" />
      <Stack.Screen name="referral-settings" />
      <Stack.Screen name="referral-finance" />
      <Stack.Screen name="badges" />
      <Stack.Screen name="app-intro" />
      <Stack.Screen name="announcements" />
      <Stack.Screen name="platform-contributions" />
      <Stack.Screen name="security" />
      <Stack.Screen name="permissions" />
      <Stack.Screen name="system" />
      <Stack.Screen name="stripe" />
      <Stack.Screen name="rides" />
      <Stack.Screen name="marketplace" />
      <Stack.Screen name="commerce-ops" />
      <Stack.Screen name="vora-hizmetler" />
      <Stack.Screen name="hotel-marketing" />
      <Stack.Screen name="platform-guide" />
      <Stack.Screen name="platform-guide/edit/[id]" />
    </Stack>
  );
}
