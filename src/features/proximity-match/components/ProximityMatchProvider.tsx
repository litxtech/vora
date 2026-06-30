import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useOptionalAuth } from '@/providers/authContext';
import { ProximityMatchPrompt } from '@/features/proximity-match/components/ProximityMatchPrompt';
import { useProximityMatch } from '@/features/proximity-match/hooks/useProximityMatch';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';

export function ProximityMatchProvider({ children }: { children: ReactNode }) {
  const enabled = useFeatureVisible('proximity-match');

  return (
    <View style={styles.root}>
      {children}
      {enabled ? <ProximityMatchRuntime /> : null}
    </View>
  );
}

/** Özellik kapalıyken GPS / poll / realtime hiç başlamaz. */
function ProximityMatchRuntime() {
  const auth = useOptionalAuth();
  if (!auth) return null;

  return <ProximityMatchRuntimeInner />;
}

function ProximityMatchRuntimeInner() {
  const { candidate, submitting, respondToCandidate } = useProximityMatch();

  if (!candidate) return null;

  return (
    <ProximityMatchPrompt
      candidate={candidate}
      submitting={submitting}
      onMatch={() => void respondToCandidate('yes')}
      onDecline={() => void respondToCandidate('no')}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
