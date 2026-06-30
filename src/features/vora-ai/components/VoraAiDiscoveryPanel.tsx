import { useMemo, useState } from 'react';
import { VoraAIButton } from '@/features/vora-ai/components/VoraAIButton';
import { VoraAISheet } from '@/features/vora-ai/components/VoraAISheet';
import { VORA_AI_DISCOVERY_ACTIONS } from '@/features/vora-ai/constants';
import { recordAiMemory } from '@/features/vora-ai/services/voraAiSettings';
import { useVoraAiModule } from '@/providers/VoraAiProvider';
import { useAuth } from '@/providers/AuthProvider';

type VoraAiDiscoveryButtonProps = {
  regionId: string;
};

export function VoraAiDiscoveryButton({ regionId }: VoraAiDiscoveryButtonProps) {
  const { user, profile } = useAuth();
  const eventsEnabled = useVoraAiModule('events');
  const newsEnabled = useVoraAiModule('news');
  const recsEnabled = useVoraAiModule('recommendations');
  const [open, setOpen] = useState(false);

  const actions = useMemo(
    () =>
      VORA_AI_DISCOVERY_ACTIONS.filter((item) => {
        if (item.module === 'events') return eventsEnabled;
        if (item.module === 'news') return newsEnabled;
        if (item.module === 'recommendations') return recsEnabled && !!user;
        return false;
      }).map(({ id, label, icon }) => ({ id, label, icon })),
    [eventsEnabled, newsEnabled, recsEnabled, user],
  );

  if (actions.length === 0) return null;

  const handleOpen = () => {
    if (recsEnabled && user && profile?.region_id) {
      void recordAiMemory(user.id, 'favorite_cities', [profile.region_id, regionId]);
    }
    setOpen(true);
  };

  return (
    <>
      <VoraAIButton compact onPress={handleOpen} />
      <VoraAISheet
        visible={open}
        onClose={() => setOpen(false)}
        module="events"
        title="Keşfet Asistanı"
        actions={actions}
        resolveInvoke={(actionId) => {
          const item = VORA_AI_DISCOVERY_ACTIONS.find((entry) => entry.id === actionId);
          return item
            ? { module: item.module, action: item.action }
            : { module: 'events', action: actionId };
        }}
        buildPayload={(actionId) => {
          const item = VORA_AI_DISCOVERY_ACTIONS.find((entry) => entry.id === actionId);
          if (item?.module === 'events') {
            return { regionId, prompt: actionId };
          }
          return { regionId };
        }}
      />
    </>
  );
}

/** @deprecated VoraAiDiscoveryButton kullanın */
export const VoraAiDiscoveryPanel = VoraAiDiscoveryButton;
