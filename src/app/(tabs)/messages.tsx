import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useGuestMode } from '@/features/auth/hooks/useGuestMode';
import { useAuth } from '@/providers/AuthProvider';
import { useCallNavigation } from '@/providers/CallProvider';
import { CallAvatar } from '@/features/calls/components/CallAvatar';
import { initiateCall, fetchCallableProfiles } from '@/features/calls/services/callService';
import type { CallParticipant } from '@/features/calls/types';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, spacing } from '@/constants/theme';

export default function MessagesScreen() {
  const { user } = useAuth();
  const { canInteract } = useGuestMode();
  const { startOutgoingCall } = useCallNavigation();
  const { colors } = useTheme();
  const [contacts, setContacts] = useState<CallParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [callingId, setCallingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    fetchCallableProfiles(user.id)
      .then(setContacts)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleCall = async (contact: CallParticipant, callType: 'audio' | 'video') => {
    if (!user?.id) return;

    setCallingId(contact.id);
    try {
      const session = await initiateCall(contact.id, callType, user.id);
      startOutgoingCall(session);
    } catch (error) {
      Alert.alert('Arama başlatılamadı', String(error));
    } finally {
      setCallingId(null);
    }
  };

  if (!canInteract) {
    return (
      <Screen>
        <Text variant="h2">Mesajlar</Text>
        <GlassCard style={styles.guestCard}>
          <Text secondary>
            Mesaj göndermek ve arama yapmak için giriş yapmanız veya kayıt olmanız gerekiyor.
          </Text>
          <Button title="Giriş Yap" onPress={() => router.push('/(auth)/login')} />
          <Button title="Kayıt Ol" variant="outline" onPress={() => router.push('/(auth)/register')} />
        </GlassCard>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="h2">Mesajlar</Text>
      <Text secondary style={styles.subtitle}>
        Kişileri arayın — Apple tarzı arama ekranı açılır
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <View style={styles.list}>
          {contacts.map((contact) => (
            <View
              key={contact.id}
              style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.contactInfo}>
                <CallAvatar participant={contact} size={52} showName={false} />
                <View>
                  <Text variant="label">
                    {contact.full_name?.trim() || contact.username}
                  </Text>
                  <Text muted>@{contact.username}</Text>
                </View>
              </View>

              <View style={styles.actions}>
                <Pressable
                  style={[styles.iconButton, { backgroundColor: colors.surfaceElevated }]}
                  onPress={() => handleCall(contact, 'audio')}
                  disabled={callingId === contact.id}
                >
                  <Ionicons name="call" size={20} color={colors.primary} />
                </Pressable>
                <Pressable
                  style={[styles.iconButton, { backgroundColor: colors.surfaceElevated }]}
                  onPress={() => handleCall(contact, 'video')}
                  disabled={callingId === contact.id}
                >
                  <Ionicons name="videocam" size={20} color={colors.accent} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  guestCard: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  loader: {
    marginTop: spacing.xl,
  },
  list: {
    gap: spacing.sm,
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
    gap: spacing.sm,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
