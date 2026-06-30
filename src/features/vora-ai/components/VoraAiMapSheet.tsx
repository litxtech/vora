import { VoraAISheet } from '@/features/vora-ai/components/VoraAISheet';
import { VORA_AI_MAP_CATEGORIES } from '@/features/vora-ai/constants';
import { useVoraAiModule } from '@/providers/VoraAiProvider';

type VoraAiMapSheetHostProps = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  open: boolean;
  onClose: () => void;
};

export function useVoraAiMapSheetProps(latitude: number | null | undefined, longitude: number | null | undefined) {
  const mapEnabled = useVoraAiModule('map');
  const canOpen = mapEnabled && latitude != null && longitude != null;
  return { mapEnabled, canOpen };
}

export function VoraAiMapSheetHost({ latitude, longitude, open, onClose }: VoraAiMapSheetHostProps) {
  const { canOpen } = useVoraAiMapSheetProps(latitude, longitude);

  if (!canOpen || latitude == null || longitude == null) return null;

  return (
    <VoraAISheet
      visible={open}
      onClose={onClose}
      module="map"
      title="Yakınımda ne var?"
      resolveInvoke={() => ({ module: 'map', action: 'nearby' })}
      actions={VORA_AI_MAP_CATEGORIES.map((c) => ({
        id: c.id,
        label: c.label,
        icon: c.icon,
      }))}
      buildPayload={(actionId) => ({
        latitude,
        longitude,
        category: actionId,
      })}
    />
  );
}
