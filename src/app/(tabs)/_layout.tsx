import { ActivityIndicator, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTabsGuard } from '@/features/auth/hooks/useRouteGuard';
import { useTheme } from '@/providers/ThemeProvider';

export default function TabsLayout() {
  const { colors } = useTheme();
  const guard = useTabsGuard();

  if (guard.status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (guard.status === 'redirect') {
    return <Redirect href={guard.href} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Akış', tabBarIcon: ({ color, size }) => <Ionicons name="newspaper-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="map"
        options={{ title: 'Harita', tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="reels"
        options={{ title: 'Reels', tabBarIcon: ({ color, size }) => <Ionicons name="play-circle-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: 'Mesajlar', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profil', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
