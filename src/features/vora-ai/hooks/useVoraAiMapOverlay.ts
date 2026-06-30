import { useCallback, useEffect, useState } from 'react';
import { fetchVoraAiMapOverlay } from '@/features/vora-ai/services/voraAiSettings';
import { invokeVoraAi } from '@/features/vora-ai/services/voraAiClient';
import type { VoraAiMapOverlayPoint } from '@/features/vora-ai/types';
import { useVoraAiModule } from '@/providers/VoraAiProvider';

type UseVoraAiMapOverlayOptions = {
  regionId: string;
  enabled?: boolean;
};

export function useVoraAiMapOverlay({ regionId, enabled = true }: UseVoraAiMapOverlayOptions) {
  const animationEnabled = useVoraAiModule('map_animation');
  const [points, setPoints] = useState<VoraAiMapOverlayPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !animationEnabled) {
      setPoints([]);
      return;
    }
    setLoading(true);
    try {
      await invokeVoraAi({
        action: 'refresh',
        module: 'map_animation',
        context: { regionId },
      });
      const overlay = await fetchVoraAiMapOverlay(regionId);
      setPoints(overlay);
    } catch {
      const overlay = await fetchVoraAiMapOverlay(regionId);
      setPoints(overlay);
    } finally {
      setLoading(false);
    }
  }, [animationEnabled, enabled, regionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { points, loading, refresh, animationEnabled };
}

export { useVoraAiMapSheetProps } from '@/features/vora-ai/components/VoraAiMapSheet';
