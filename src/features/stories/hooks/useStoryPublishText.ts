import { useCallback, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import type { StudioTextOverlay } from '@/features/vora-studio/types';
import {
  createStoryTextOverlay,
  serializeStoryTextOverlays,
} from '@/features/stories/utils/storyTextOverlays';

export function useStoryPublishText() {
  const [textOverlays, setTextOverlays] = useState<StudioTextOverlay[]>([]);
  const [textEditing, setTextEditing] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  const activeOverlay = useMemo(
    () =>
      textOverlays.find((item) => item.id === selectedTextId) ??
      textOverlays[textOverlays.length - 1] ??
      null,
    [selectedTextId, textOverlays],
  );

  const hasText = textOverlays.some((item) => item.text.trim());

  const updateOverlay = useCallback((id: string, patch: Partial<StudioTextOverlay>) => {
    setTextOverlays((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const startEditing = useCallback(() => {
    setTextOverlays((prev) => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1]!;
        setSelectedTextId(last.id);
        return prev;
      }
      const overlay = createStoryTextOverlay(undefined, 0);
      setSelectedTextId(overlay.id);
      return [overlay];
    });
    setTextEditing(true);
  }, []);

  const finishEditing = useCallback(() => {
    setTextOverlays((prev) => prev.filter((item) => item.text.trim()));
    setTextEditing(false);
    setSelectedTextId(null);
  }, []);

  const addOverlay = useCallback(() => {
    const overlay = createStoryTextOverlay(undefined, textOverlays.length);
    setTextOverlays((prev) => [...prev, overlay]);
    setSelectedTextId(overlay.id);
    setTextEditing(true);
  }, [textOverlays.length]);

  const removeOverlay = useCallback((id: string) => {
    setTextOverlays((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (next.length === 0) {
        setTextEditing(false);
        setSelectedTextId(null);
      }
      return next;
    });
    setSelectedTextId((current) => (current === id ? null : current));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const selectOverlay = useCallback(
    (id: string) => {
      if (!textEditing && selectedTextId === id) {
        setTextEditing(true);
        return;
      }
      setSelectedTextId(id);
    },
    [selectedTextId, textEditing],
  );

  const commitForPublish = useCallback(() => {
    const next = textOverlays.filter((item) => item.text.trim());
    setTextOverlays(next);
    setTextEditing(false);
    setSelectedTextId(null);
    return serializeStoryTextOverlays(next) ?? [];
  }, [textOverlays]);

  const closeEditing = useCallback(() => {
    setTextEditing(false);
    setSelectedTextId(null);
  }, []);

  return {
    textOverlays,
    textEditing,
    selectedTextId,
    activeOverlay,
    hasText,
    setTextEditing,
    setSelectedTextId,
    updateOverlay,
    startEditing,
    finishEditing,
    addOverlay,
    removeOverlay,
    selectOverlay,
    commitForPublish,
    closeEditing,
  };
}
