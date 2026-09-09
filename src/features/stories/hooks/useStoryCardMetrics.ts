import { useCallback, useRef, useState } from 'react';
import { fitStoryCardInStage } from '@/features/stories/utils/storyCardChrome';

export type StoryCardMetrics = {
  stageWidth: number;
  stageHeight: number;
  cardWidth: number;
  cardHeight: number;
};

function buildMetrics(stageWidth: number, stageHeight: number): StoryCardMetrics | null {
  if (stageWidth <= 8 || stageHeight <= 8) return null;
  const card = fitStoryCardInStage(stageWidth, stageHeight);
  if (card.width <= 8 || card.height <= 8) return null;
  return {
    stageWidth,
    stageHeight,
    cardWidth: card.width,
    cardHeight: card.height,
  };
}

/** Hikâye kartı boyutları — önizleme ve görsel bake için. */
export function useStoryCardMetrics() {
  const [liveMetrics, setLiveMetrics] = useState<StoryCardMetrics | null>(null);
  const lastValidRef = useRef<StoryCardMetrics | null>(null);

  const onStageLayout = useCallback((stageWidth: number, stageHeight: number) => {
    const next = buildMetrics(stageWidth, stageHeight);
    if (next) {
      lastValidRef.current = next;
      setLiveMetrics(next);
    }
  }, []);

  const metrics = liveMetrics ?? lastValidRef.current;
  const isReady = metrics != null;

  return {
    metrics,
    isReady,
    onStageLayout,
  };
}
