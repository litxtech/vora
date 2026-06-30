import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { IzdivacAccessGate } from '@/features/izdivac/components/IzdivacAccessGate';
import { IzdivacMainTabBar } from '@/features/izdivac/components/IzdivacMainTabBar';
import { IzdivacMembersTab } from '@/features/izdivac/components/IzdivacMembersTab';
import { IzdivacMessagesTab } from '@/features/izdivac/components/IzdivacMessagesTab';
import { IzdivacSpacesTab } from '@/features/izdivac/components/IzdivacSpacesTab';
import { IzdivacWallTab } from '@/features/izdivac/components/IzdivacWallTab';
import { IZDIVAC_ACCENT, parseIzdivacMainTab } from '@/features/izdivac/constants';
import { useIzdivacLobby } from '@/features/izdivac/hooks/useIzdivacLobby';
import type { IzdivacMainTab } from '@/features/izdivac/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function IzdivacScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [mainTab, setMainTab] = useState<IzdivacMainTab>(() => parseIzdivacMainTab(params.tab));
  const lobby = useIzdivacLobby();

  useEffect(() => {
    if (params.tab) {
      setMainTab(parseIzdivacMainTab(params.tab));
    }
  }, [params.tab]);

  return (
    <IzdivacAccessGate>
      <GradientBackground>
        <View
          style={[
            styles.page,
            { paddingTop: insets.top + spacing.xs, paddingBottom: insets.bottom + spacing.sm },
          ]}
        >
          <View style={styles.topBar}>
            <ScreenBackButton />
            <View style={styles.titleBlock}>
              <View style={styles.titleRow}>
                <Ionicons name="heart-half" size={16} color={IZDIVAC_ACCENT} />
                <Text variant="label" style={styles.title}>
                  İzdivaç
                </Text>
              </View>
              <Text secondary variant="caption" style={styles.subtitle} numberOfLines={1}>
                Özel tanışma alanı
              </Text>
            </View>
            <Pressable onPress={() => void lobby.refresh()} hitSlop={8} style={styles.refreshBtn}>
              <Ionicons name="refresh-outline" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <IzdivacMainTabBar value={mainTab} onChange={setMainTab} />

          <View style={styles.content}>
            {mainTab === 'members' ? <IzdivacMembersTab lobby={lobby} /> : null}
            {mainTab === 'wall' ? <IzdivacWallTab /> : null}
            {mainTab === 'spaces' ? <IzdivacSpacesTab /> : null}
            {mainTab === 'messages' ? <IzdivacMessagesTab /> : null}
          </View>
        </View>
      </GradientBackground>
    </IzdivacAccessGate>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
  },
  titleBlock: { flex: 1, gap: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  title: { fontSize: 16, fontWeight: '800' },
  subtitle: { fontSize: 11, marginLeft: 21 },
  refreshBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, minHeight: 0 },
});
