import { memo, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useStableTabBarInset } from '@/hooks/useStableTabBarInset';
import {
  getAndroidInstantPressableProps,
  getAndroidTabLazyOption,
  getAndroidTabScreenOptions,
  isAndroid,
  shouldDetachInactiveTabScreens,
  shouldUseScreenFreeze,
  shouldUseSolidAndroidTabBar,
} from '@/lib/device/androidPerfProfile';
import { isAndroidTablet } from '@/lib/device/isAndroidTablet';
import { useTabsGuard } from '@/features/auth/hooks/useRouteGuard';
import { useMessagingStore } from '@/features/messaging/store/messagingStore';
import { getFloatingTabBarReserve } from '@/constants/tabBar';
import { createFloatingTabBarStyle, TabBarBackgroundView } from '@/components/navigation/floatingTabBar';
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

const MessagesTabIcon = memo(function MessagesTabIcon({ color }: { color: string }) {
  return <Ionicons name="chatbubbles-outline" size={TAB_ICON_SIZE} color={color} />;
});

function useMessagesTabBadge(showMessagesTab: boolean): string | number | undefined {
  const messagingBadge = useMessagingStore((s) => s.totalUnread);
  if (!showMessagesTab || messagingBadge <= 0) return undefined;
  return messagingBadge > 99 ? '99+' : messagingBadge;
}

export default function TabsLayout() {
  const { colors, isDark, mode, tabBar, metrics } = useTheme();
  const { isVisible } = useFeatureFlags();
  const tabBarBottomInset = useStableTabBarInset();
  const guard = useTabsGuard();
  const showFeedTab = isVisible('feed');
  const showDiscoverTab = isVisible('discover');
  const showReelsTab = isVisible('reels');
  const showMessagesTab = isVisible('messages');
  const showProfileTab = isVisible('profile');
  const showComposeTab = isVisible('compose');
  const showRidesTab = isVisible('rides');
  const messagesTabBadge = useMessagesTabBadge(showMessagesTab);

  const tabBarReserve = getFloatingTabBarReserve(tabBarBottomInset);
  const useSolidTabBar = shouldUseSolidAndroidTabBar();
  const freezeInactiveTabs = shouldUseScreenFreeze();

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

  const tabBarButton = useMemo(
    () => (props: BottomTabBarButtonProps) => (
      <Pressable {...props} {...getAndroidInstantPressableProps()} />
    ),
    [],
  );

  const lazyPlaceholder = useMemo(
    () => () => (
      <View style={[styles.bootPlaceholder, { backgroundColor: colors.background }]} />
    ),
    [colors.background],
  );

  const tabBarBackground = useMemo(
    () =>
      useSolidTabBar
        ? undefined
        : () => <TabBarBackgroundView isDark={isDark} mode={mode} />,
    [useSolidTabBar, isDark, mode],
  );

  const screenOptions = useMemo(
    () => ({
      headerShown: false as const,
      // iOS: pasif sekmeleri dondur — JS/GPU yükü düşer. Android: dokunma gecikmesi riski.
      freezeOnBlur: freezeInactiveTabs,
      // Kaydırma animasyonu TabSwipeShell'de; native tab geçişi ekstra takılma yapmasın.
      animation: 'none' as const,
      tabBarStyle: baseTabBarStyle,
      ...(tabBarBackground ? { tabBarBackground } : {}),
      tabBarButton,
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
      // null yerine tema rengi — lazy sekme ilk açılışında boş flash azalır.
      lazyPlaceholder,
    }),
    [
      baseTabBarStyle,
      tabBar.activeTint,
      tabBar.inactiveTint,
      colors.background,
      freezeInactiveTabs,
      tabBarButton,
      tabBarBackground,
      lazyPlaceholder,
    ],
  );

  const messagesScreenOptions = useMemo(
    () => ({
      title: 'Mesaj',
      href: showMessagesTab ? undefined : null,
      tabBarBadge: messagesTabBadge,
      tabBarBadgeStyle: { backgroundColor: colors.danger },
      tabBarIcon: ({ color }: { color: string }) => <MessagesTabIcon color={color} />,
      ...getAndroidTabLazyOption('messages'),
    }),
    [showMessagesTab, messagesTabBadge, colors.danger],
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
      safeAreaInsets={{
        bottom: Platform.OS === 'web' ? 0 : tabBarReserve,
        top: 0,
        left: 0,
        right: 0,
      }}
      screenOptions={screenOptions}
      screenLayout={({ children, route, navigation }) => {
        // Web: kaydırma kabuğu tıklamayı yutup sekmeyi akışa geri atıyor.
        // Tablet: jest yok. Android telefon: yalnızca Akış (menü + sekme kaydırma).
        // iOS: tüm ana sekmeler — en solda sağa çekince hamburger menü.
        if (Platform.OS === 'web' || isAndroidTablet() || (isAndroid() && route.name !== 'index')) {
          return children;
        }
        return (
          <TabSwipeShell routeName={route.name} navigation={navigation}>
            {children}
          </TabSwipeShell>
        );
      }}
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
          sceneStyle: { backgroundColor: colors.background },
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
        name="rides"
        options={{
          title: 'Yolculuk',
          href: showRidesTab ? undefined : null,
          tabBarIcon: ({ color }) => (
            <Ionicons name="car-sport-outline" size={TAB_ICON_SIZE} color={color} />
          ),
          ...getAndroidTabLazyOption('rides'),
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
          tabBarLabel: () => null,
          tabBarButton: (props) => <CreateTabButton {...props} />,
          ...getAndroidTabLazyOption('create'),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={messagesScreenOptions}
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
