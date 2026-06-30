import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { openChat as navigateToChat } from '../services/messagingNavigation';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { CallAvatar } from '@/features/calls/components/CallAvatar';
import { PremiumCallGateSheet } from '@/features/calls/components/PremiumCallGateSheet';
import { fetchCallableProfiles } from '@/features/calls/services/callService';
import { usePremiumOutgoingCall } from '@/features/calls/hooks/usePremiumOutgoingCall';
import type { CallParticipant } from '@/features/calls/types';
import { useAuth } from '@/providers/AuthProvider';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { getAndroidFlatListPerfProps } from '@/lib/device/androidPerfProfile';
import { getOrCreateDirectConversation } from '../services/conversationData';

export function ContactsList() {
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const { colors } = useTheme();
  const { initiateOutgoingCall, calling, gateVisible, gateCallType, closeGate } = usePremiumOutgoingCall();
  const [contacts, setContacts] = useState<CallParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchCallableProfiles(user.id)
      .then(setContacts)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const openChat = async (contact: CallParticipant) => {
    if (!(await requireAuth('Mesaj'))) return;
    setBusyId(contact.id);
    const { conversationId, error } = await getOrCreateDirectConversation(contact.id);
    setBusyId(null);
    if (error) {
      Alert.alert('Sohbet başlatılamadı', error);
      return;
    }
    if (conversationId) navigateToChat(conversationId);
  };

  const handleCall = async (contact: CallParticipant, callType: 'audio' | 'video') => {
    setBusyId(contact.id);
    await initiateOutgoingCall(contact.id, callType);
    setBusyId(null);
  };

  const renderItem = useCallback(
    ({ item: contact }: { item: CallParticipant }) => (
      <View
        style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Pressable style={styles.contactInfo} onPress={() => openChat(contact)}>
          <CallAvatar participant={contact} size={48} showName={false} />
          <View>
            <Text variant="label">{contact.full_name?.trim() || contact.username}</Text>
            <Text muted>@{contact.username}</Text>
          </View>
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            style={[styles.iconButton, { backgroundColor: colors.surfaceElevated }]}
            onPress={() => openChat(contact)}
            disabled={busyId === contact.id || calling}
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            style={[styles.iconButton, { backgroundColor: colors.surfaceElevated }]}
            onPress={() => void handleCall(contact, 'audio')}
            disabled={busyId === contact.id || calling}
          >
            <Ionicons name="call" size={20} color={colors.primary} />
          </Pressable>
          <Pressable
            style={[styles.iconButton, { backgroundColor: colors.surfaceElevated }]}
            onPress={() => void handleCall(contact, 'video')}
            disabled={busyId === contact.id || calling}
          >
            <Ionicons name="videocam" size={20} color={colors.accent} />
          </Pressable>
        </View>
      </View>
    ),
    [busyId, calling, colors.accent, colors.border, colors.primary, colors.surface, colors.surfaceElevated, colors.textSecondary],
  );

  const keyExtractor = useCallback((item: CallParticipant) => item.id, []);

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={styles.loader} />;
  }

  return (
    <>
      <FlatList
        style={styles.listFlex}
        data={contacts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        {...getAndroidFlatListPerfProps()}
      />
      <PremiumCallGateSheet visible={gateVisible} callType={gateCallType} onClose={closeGate} />
    </>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: spacing.xl,
  },
  listFlex: {
    flex: 1,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  row: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
