import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Text } from '@/components/ui/Text';
import { VoraAIButton } from '@/features/vora-ai/components/VoraAIButton';
import { EXPLORER_ACCENT_COLOR } from '@/features/explorer/constants';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { MAP_FEATURE } from '@/features/map/featureFlags';
import { glassSurface, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MapControlsProps = {
  onRecenter: () => void;
  onRefresh: () => void;
  onToggleNearby: () => void;
  onToggleExplorer: () => void;
  refreshing?: boolean;
  nearbyEnabled?: boolean;
  explorerEnabled?: boolean;
  onOpenVoraAi?: () => void;
  voraAiEnabled?: boolean;
  onOpenIncidentGraph?: () => void;
  incidentGraphEnabled?: boolean;
  incidentCount?: number;
};

export function MapControls({
  onRecenter,
  onRefresh,
  onToggleNearby,
  onToggleExplorer,
  refreshing,
  nearbyEnabled,
  explorerEnabled,
  onOpenVoraAi,
  voraAiEnabled,
  onOpenIncidentGraph,
  incidentGraphEnabled,
  incidentCount = 0,
}: MapControlsProps) {
  const { colors, isDark, mode } = useTheme();
  const surface = glassSurface[mode];
  const showRecenter = useFeatureVisible(MAP_FEATURE.recenter);
  const showNearby = useFeatureVisible(MAP_FEATURE.nearby);
  const showExplorer = useFeatureVisible(MAP_FEATURE.explorer);
  const showRefresh = useFeatureVisible(MAP_FEATURE.refresh);
  const showVoraAi = useFeatureVisible(MAP_FEATURE.voraAi);
  const showIncidentGraph = useFeatureVisible(MAP_FEATURE.incidentGraph);

  const clusterItems: ReactNode[] = [];
  const pushDivider = () => {
    if (clusterItems.length > 0) {
      clusterItems.push(
        <View key={`div-${clusterItems.length}`} style={[styles.divider, { backgroundColor: colors.border }]} />,
      );
    }
  };

  if (showRecenter) {
    clusterItems.push(
      <Pressable
        key="recenter"
        style={[styles.btn, { backgroundColor: surface.background }]}
        onPress={onRecenter}
        accessibilityLabel="Konumuma git"
      >
        <Ionicons name="locate" size={22} color={colors.primary} />
      </Pressable>,
    );
  }
  if (showNearby) {
    pushDivider();
    clusterItems.push(
      <Pressable
        key="nearby"
        style={[styles.btn, { backgroundColor: surface.background }, nearbyEnabled && styles.btnActive]}
        onPress={onToggleNearby}
        accessibilityLabel="Yakınımda"
      >
        <Ionicons name="radio-outline" size={22} color={nearbyEnabled ? colors.accent : colors.primary} />
      </Pressable>,
    );
  }
  if (showExplorer) {
    pushDivider();
    clusterItems.push(
      <Pressable
        key="explorer"
        style={[styles.btn, { backgroundColor: surface.background }, explorerEnabled && styles.explorerActive]}
        onPress={onToggleExplorer}
        accessibilityLabel="Kaşif modu"
      >
        <Ionicons
          name={explorerEnabled ? 'walk' : 'walk-outline'}
          size={22}
          color={explorerEnabled ? EXPLORER_ACCENT_COLOR : colors.primary}
        />
      </Pressable>,
    );
  }
  if (showRefresh) {
    pushDivider();
    clusterItems.push(
      <Pressable
        key="refresh"
        style={[styles.btn, { backgroundColor: surface.background }]}
        onPress={onRefresh}
        disabled={refreshing}
        accessibilityLabel="Yenile"
      >
        {refreshing ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="refresh" size={22} color={colors.primary} />
        )}
      </Pressable>,
    );
  }

  const cluster = <>{clusterItems}</>;

  const clusterShellStyle = [
    styles.cluster,
    { borderColor: isDark ? surface.border : colors.border },
    isDark && Platform.OS !== 'ios' ? { backgroundColor: surface.background } : null,
    !isDark ? { backgroundColor: colors.surface } : null,
  ];

  return (
    <View style={styles.wrap}>
      {showIncidentGraph && incidentGraphEnabled && onOpenIncidentGraph ? (
        <Pressable
          style={[
            styles.incidentBtn,
            {
              backgroundColor: incidentCount > 0 ? 'rgba(229, 57, 53, 0.16)' : surface.background,
              borderColor: incidentCount > 0 ? '#E53935' : colors.border,
            },
          ]}
          onPress={onOpenIncidentGraph}
          accessibilityLabel="Canlı olay grafiği"
        >
          <Ionicons name="pulse" size={22} color={incidentCount > 0 ? '#E53935' : colors.primary} />
          {incidentCount > 0 ? (
            <View style={[styles.incidentBadge, { backgroundColor: colors.danger }]}>
              <Text style={styles.incidentBadgeText}>{incidentCount > 99 ? '99+' : incidentCount}</Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}

      {clusterItems.length > 0 ? (
        isDark && Platform.OS === 'ios' ? (
          <BlurView intensity={24} tint="dark" style={clusterShellStyle}>
            {cluster}
          </BlurView>
        ) : (
          <View style={clusterShellStyle}>{cluster}</View>
        )
      ) : null}

      {showVoraAi && voraAiEnabled && onOpenVoraAi ? (
        <VoraAIButton onPress={onOpenVoraAi} compact />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-end',
    gap: spacing.sm,
    flexShrink: 0,
  },
  cluster: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  btn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: {
    backgroundColor: 'rgba(0, 191, 165, 0.12)',
  },
  explorerActive: {
    backgroundColor: 'rgba(0, 191, 165, 0.18)',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  incidentBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  incidentBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  incidentBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
});
