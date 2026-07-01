import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useStableTabBarInset } from '@/hooks/useStableTabBarInset';
import { isAndroid } from '@/lib/device/androidPerfProfile';
import { useTabsGuard } from '@/features/auth/hooks/useRouteGuard';
import { useTabMessagingBadge } from '@/features/messaging/hooks/useTabMessagingBadge';
import { getFloatingTabBarReserve } from '@/constants/tabBar';
import { createFloatingTabBarStyle, TabBarBackgroundView } from '@/components/navigation/floatingTabBar';
import {
  getAndroidInstantPressableProps,
  getAndroidTabLazyOption,
  getAndroidTabScreenOptions,
  shouldDetachInactiveTabScreens,
  shouldUseSolidAndroidTabBar,
} from '@/lib/device/androidPerfProfile';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { resolveDefaultTabHref } from '@/features/feature-flags/resolveDefaultTabHref';
import { useFeatureFlags } from '@/providers/FeatureFlagsProvider';
import { CreateTabButton } from '@/features/compose/components/CreateTabButton';
import { ProfileTabButton } from '@/features/account-switch/components/ProfileTabButton';
import { TabSwipeShell } from '@/components/navigation/TabSwipeShell';
import { useTheme } from '@/providers/ThemeProvider';

const TAB_ICON_SIZE = 28;

const FeedTabIcon = memo(function FeedTabIcon({ color }: { color: string }) {
  return <Ionicons name="newspaper-outline" size={TAB_ICON_SIZE} color={color} />;
});

const DiscoverTabIcon = memo(function DiscoverTabIcon({ color }: { color: string }) {
  return <Ionicons name="compass-outline" size={TAB_ICON_SIZE} color={color} />;
});

const ReelsTabIcon = memo(function ReelsTabIcon({ color }: { color: string }) {
  return <Ionicons name="play-circle-outline" size={TAB_ICON_SIZE} color={color} />;
});

export default function TabsLayout() {
  const { colors, isDark, mode, tabBar, metrics } = useTheme();
  const messagingBadge = useTabMessagingBadge();
  const { isVisible } = useFeatureFlags();
  const tabBarBottomInset = useStableTabBarInset();
  const guard = useTabsGuard();
  const showFeedTab = useFeatureVisible('feed');
  const showDiscoverTab = useFeatureVisible('discover');
  const showReelsTab = useFeatureVisible('reels');
  const showMessagesTab = useFeatureVisible('messages');
  const showProfileTab = useFeatureVisible('profile');
  const showComposeTab = useFeatureVisible('compose');

  const messagesTabBadge =
    showMessagesTab && messagingBadge > 0
      ? messagingBadge > 99
        ? '99+'
        : messagingBadge
      : undefined;

  const tabBarReserve = getFloatingTabBarReserve(tabBarBottomInset);
  const useSolidTabBar = shouldUseSolidAndroidTabBar();

  const baseTabBarStyle = useMemo(
    () =>
      createFloatingTabBarStyle({
        bottomInset: tabBarBottomInset,
        colors,
        isDark,
        mode,
        tabBar,
        radiusFull: metrics.radius.full,
      }),
    [tabBarBottomInset, colors, isDark, mode, tabBar, metrics.radius.full],
  );

  const screenOptions = useMemo(
    () => ({
      headerShown: false as const,
      freezeOnBlur: false,
      tabBarStyle: baseTabBarStyle,
      ...(useSolidTabBar
        ? {}
        : {
            tabBarBackground: () => (
              <TabBarBackgroundView isDark={isDark} mode={mode} />
            ),
          }),
      tabBarButton: (props: BottomTabBarButtonProps) => (
        <Pressable {...props} {...getAndroidInstantPressableProps()} />
      ),
      tabBarActiveTintColor: tabBar.activeTint,
      tabBarInactiveTintColor: tabBar.inactiveTint,
      ...getAndroidTabScreenOptions(),
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600' as const,
        marginTop: 2,
        marginBottom: 0,
      },
      tabBarItemStyle: {
        paddingVertical: 0,
      },
      sceneStyle: { backgroundColor: colors.background },
    }),
    [baseTabBarStyle, tabBar.activeTint, tabBar.inactiveTint, colors.background, isDark, mode, useSolidTabBar],
  );

  if (guard.status === 'loading' && !isAndroid()) {
    return <View style={[styles.bootPlaceholder, { backgroundColor: colors.background }]} />;
  }

  if (guard.status === 'redirect') {
    return <Redirect href={guard.href} />;
  }

  if (!showFeedTab) {
    const fallback = resolveDefaultTabHref(isVisible);
    if (fallback !== '/(tabs)') {
      return <Redirect href={fallback} />;
    }
  }

  return (
    <Tabs
      detachInactiveScreens={shouldDetachInactiveTabScreens()}
      safeAreaInsets={{ bottom: tabBarReserve, top: 0, left: 0, right: 0 }}
      screenOptions={screenOptions}
      screenLayout={({ children, route, navigation }) =>
        isAndroid() && route.name !== 'index' ? (
          children
        ) : (
          <TabSwipeShell routeName={route.name} navigation={navigation}>
            {children}
          </TabSwipeShell>
        )
      }
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Akış',
          href: showFeedTab ? undefined : null,
          tabBarIcon: ({ color }) => <FeedTabIcon color={color} />,
          ...getAndroidTabLazyOption('index'),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Keşfet',
          href: showDiscoverTab ? undefined : null,
          tabBarIcon: ({ color }) => <DiscoverTabIcon color={color} />,
          ...getAndroidTabLazyOption('discover'),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Harita',
          href: null,
          tabBarIcon: ({ color }) => <Ionicons name="map-outline" size={TAB_ICON_SIZE} color={color} />,
          sceneStyle: { backgroundColor: 'transparent' },
          ...getAndroidTabLazyOption('map'),
        }}
      />
      <Tabs.Screen
        name="centers"
        options={{
          title: 'Merkez',
          href: null,
          tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={TAB_ICON_SIZE} color={color} />,
          ...getAndroidTabLazyOption('centers'),
        }}
      />
      <Tabs.Screen
        name="create"
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
          },
        }}
        options={{
          title: 'Paylaş',
          href: showComposeTab ? undefined : null,
          tabBarButton: (props) => <CreateTabButton {...props} />,
          ...getAndroidTabLazyOption('create'),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mesaj',
          href: showMessagesTab ? undefined : null,
          tabBarBadge: messagesTabBadge,
          tabBarBadgeStyle: { backgroundColor: colors.danger },
          tabBarIcon: ({ color }) => (
            <Ionicons name="chatbubbles-outline" size={TAB_ICON_SIZE} color={color} />
          ),
          ...getAndroidTabLazyOption('messages'),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Hizmetler',
          href: null,
          tabBarIcon: ({ color }) => (
            <Ionicons name="construct-outline" size={TAB_ICON_SIZE} color={color} />
          ),
          ...getAndroidTabLazyOption('services'),
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          title: 'Reels',
          href: showReelsTab ? undefined : null,
          tabBarIcon: ({ color }) => <ReelsTabIcon color={color} />,
          tabBarActiveTintColor: '#fff',
          tabBarInactiveTintColor: 'rgba(255,255,255,0.55)',
          ...getAndroidTabLazyOption('reels'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          href: showProfileTab ? undefined : null,
          tabBarButton: (props) => <ProfileTabButton {...props} />,
          ...getAndroidTabLazyOption('profile'),
        }}
      />
      <Tabs.Screen name="admin" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bootPlaceholder: {
    flex: 1,
  },
});
