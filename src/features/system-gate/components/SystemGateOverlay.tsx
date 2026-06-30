import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ForceUpdateScreen } from '@/features/system-gate/components/ForceUpdateScreen';
import { MaintenanceScreen } from '@/features/system-gate/components/MaintenanceScreen';
import { useSystemGate } from '@/features/system-gate/hooks/useSystemGate';
import { useTheme } from '@/providers/ThemeProvider';

export function SystemGateOverlay() {
  const gate = useSystemGate();
  const { colors } = useTheme();
  const [retrying, setRetrying] = useState(false);

  if (gate.status === 'loading' || gate.status === 'ok') return null;

  const handleRetry = async () => {
    setRetrying(true);
    await gate.refresh();
    setRetrying(false);
  };

  return (
    <View style={styles.overlay} pointerEvents="auto">
      {gate.status === 'maintenance' ? (
        <MaintenanceScreen config={gate.config} onRetry={handleRetry} retrying={retrying} />
      ) : (
        <ForceUpdateScreen
          config={gate.config}
          currentVersion={gate.currentVersion}
          minVersion={gate.minVersion}
        />
      )}
      {retrying ? (
        <View style={[styles.retrying, { backgroundColor: `${colors.background}CC` }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100000,
    elevation: 100000,
  },
  retrying: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
