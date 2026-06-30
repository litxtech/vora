import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { HEYET_SUBJECT_LABELS } from '@/features/heyet/constants';
import {
  adminOpenHeyet,
  fetchHeyetCaseBySubject,
} from '@/features/heyet/services/heyetData';
import type { HeyetSubjectType } from '@/features/heyet/types';

type Props = {
  subjectType: HeyetSubjectType;
  subjectId: string;
  partyALabel?: string;
  partyBLabel?: string;
  compact?: boolean;
};

export function AdminHeyetChip({
  subjectType,
  subjectId,
  partyALabel,
  partyBLabel,
  compact = true,
}: Props) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const refresh = useCallback(async () => {
    setChecking(true);
    const { heyetCase: existing } = await fetchHeyetCaseBySubject(subjectType, subjectId);
    setConversationId(existing?.conversationId ?? null);
    setChecking(false);
  }, [subjectId, subjectType]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openChat = (id: string) => {
    router.push(`/chat/${id}` as never);
  };

  const handlePress = () => {
    if (conversationId) {
      openChat(conversationId);
      return;
    }

    const moduleLabel = HEYET_SUBJECT_LABELS[subjectType];
    const parties =
      partyALabel && partyBLabel
        ? `\n\n${partyALabel} ↔ ${partyBLabel}`
        : '';

    Alert.alert(
      'Heyet aç',
      `${moduleLabel} uyuşmazlığı için her iki tarafı «Heyet» sohbet odasına almak istiyor musunuz?${parties}\n\nTaraflar burada sorunlarını yazacak; siz kararı sohbette açıklayabileceksiniz.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Heyet aç',
          onPress: async () => {
            setLoading(true);
            const { conversationId: nextId, error } = await adminOpenHeyet(subjectType, subjectId);
            setLoading(false);
            if (error) {
              Alert.alert('Hata', error);
              return;
            }
            if (nextId) {
              setConversationId(nextId);
              openChat(nextId);
            }
          },
        },
      ],
    );
  };

  const label = checking ? 'Heyet…' : conversationId ? 'Heyete git' : 'Heyet aç';
  const icon = conversationId ? ('chatbubbles' as const) : ('people' as const);

  return (
    <AdminActionChip
      label={label}
      icon={icon}
      tone="primary"
      compact={compact}
      loading={loading || checking}
      onPress={handlePress}
    />
  );
}
