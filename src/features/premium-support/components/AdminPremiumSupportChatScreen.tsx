import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { useAdminGuard } from '@/features/admin/hooks/useAdminGuard';
import { SupportMessageBubble } from '@/features/premium-support/components/SupportMessageBubble';
import {
  MAX_PREMIUM_SUPPORT_MESSAGE_LENGTH,
  MIN_PREMIUM_SUPPORT_MESSAGE_LENGTH,
  PREMIUM_SUPPORT_SESSION_HINT,
  PREMIUM_SUPPORT_STATUS_LABELS,
} from '@/features/premium-support/constants';
import { usePremiumSupportRealtime } from '@/features/premium-support/hooks/usePremiumSupportRealtime';
import {
  adminFetchPremiumSupportThread,
  adminUpdatePremiumSupportThread,
  fetchPremiumSupportMessages,
  markPremiumSupportRead,
  sendPremiumSupportMessage,
} from '@/features/premium-support/services/premiumSupportData';
import { uploadPremiumSupportImage } from '@/features/premium-support/services/premiumSupportMedia';
import {
  buildPremiumSupportMessage,
  mergePremiumSupportMessages,
} from '@/features/premium-support/utils/messageList';
import type { PremiumSupportMessage, PremiumSupportThread } from '@/features/premium-support/types';
import { PREMIUM_GOLD } from '@/features/profile/constants/premiumUi';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

export function AdminPremiumSupportChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const guard = useAdminGuard();
  const [thread, setThread] = useState<PremiumSupportThread | null>(null);
  const [messages, setMessages] = useState<PremiumSupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<PremiumSupportMessage>>(null);
  const knownIdsRef = useRef(new Set<string>());

  const load = useCallback(async () => {
    if (!id || guard.status !== 'allowed') return;
    setLoading(true);
    const nextThread = await adminFetchPremiumSupportThread(id);
    setThread(nextThread);
    if (nextThread) {
      const rows = await fetchPremiumSupportMessages(nextThread.id);
      setMessages((current) => {
        const merged = mergePremiumSupportMessages(rows, current);
        knownIdsRef.current = new Set(merged.map((row) => row.id));
        return merged;
      });
      await markPremiumSupportRead(nextThread.id);
    }
    setLoading(false);
  }, [guard.status, id]);

  useEffect(() => {
    void load();
  }, [load]);

  usePremiumSupportRealtime({
    threadId: thread?.id ?? null,
    onNewMessage: (message) => {
      if (knownIdsRef.current.has(message.id)) return;
      knownIdsRef.current.add(message.id);
      setMessages((current) => [...current, message]);
      if (thread?.id) void markPremiumSupportRead(thread.id);
      void load();
    },
    onThreadUpdated: () => {
      void load();
    },
  });

  const handleSend = async (options?: { messageType?: 'text' | 'image'; mediaUrl?: string | null }) => {
    if (!thread) return;
    const content = draft.trim();
    if (!options?.mediaUrl && content.length < MIN_PREMIUM_SUPPORT_MESSAGE_LENGTH) return;

    setSending(true);
    const { messageId, error } = await sendPremiumSupportMessage(thread.id, content, options);
    setSending(false);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    if (messageId && user?.id) {
      if (!knownIdsRef.current.has(messageId)) {
        knownIdsRef.current.add(messageId);
        setMessages((current) => [
          ...current,
          buildPremiumSupportMessage({
            id: messageId,
            threadId: thread.id,
            senderId: user.id,
            content,
            messageType: options?.messageType,
            mediaUrl: options?.mediaUrl,
            isStaff: true,
          }),
        ]);
      }
    }

    setDraft('');
    await load();
    listRef.current?.scrollToEnd({ animated: true });
  };

  const pickImage = async () => {
    if (!user?.id) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Görsel göndermek için galeri erişimine izin verin.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    setSending(true);
    const asset = result.assets[0];
    const { url, error } = await uploadPremiumSupportImage(user.id, asset.uri, asset.mimeType ?? undefined);
    if (error || !url) {
      setSending(false);
      Alert.alert('Hata', error ?? 'Görsel yüklenemedi');
      return;
    }

    await handleSend({ messageType: 'image', mediaUrl: url });
    setSending(false);
  };

  const handleReopen = () => {
    if (!thread) return;
    Alert.alert('Desteği aç', 'Kullanıcıya sohbetin yeniden açıldığı bildirilecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Aç',
        onPress: async () => {
          const { error } = await adminUpdatePremiumSupportThread(thread.id, 'waiting_support');
          if (error) Alert.alert('Hata', error);
          else void load();
        },
      },
    ]);
  };

  const handleClose = () => {
    if (!thread) return;
    Alert.alert('Desteği kapat', 'Sohbet kapatılacak. Kullanıcı yeni mesaj yazarsa tekrar açılır.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kapat',
        style: 'destructive',
        onPress: async () => {
          const { error } = await adminUpdatePremiumSupportThread(thread.id, 'closed');
          if (error) Alert.alert('Hata', error);
          else void load();
        },
      },
    ]);
  };

  const handleResolve = () => {
    if (!thread) return;
    Alert.alert('Çözüldü', 'Talep çözüldü olarak işaretlenecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaydet',
        onPress: async () => {
          const { error } = await adminUpdatePremiumSupportThread(thread.id, 'resolved');
          if (error) Alert.alert('Hata', error);
          else void load();
        },
      },
    ]);
  };

  if (guard.status === 'denied') return null;

  if (loading || !thread) {
    return (
      <AdminShell title="Premium Destek" requireAdmin>
        <AdminEmptyState loading={loading} title={loading ? undefined : 'Sohbet bulunamadı'} />
      </AdminShell>
    );
  }

  const snapshot = thread.subscription_snapshot;
  const isClosed = thread.status === 'closed' || thread.status === 'resolved';

  return (
    <AdminShell title="Premium Destek Sohbeti" subtitle={`@${thread.username ?? 'kullanıcı'}`} requireAdmin>
      <GlassCard style={styles.metaCard}>
        <Text variant="label">{thread.full_name ?? thread.username}</Text>
        <Text secondary variant="caption">
          {PREMIUM_SUPPORT_STATUS_LABELS[thread.status]}
          {snapshot?.plan ? ` · ${snapshot.plan} · ${snapshot.payment_provider ?? '—'}` : ' · Premium yok'}
        </Text>
        {thread.session_expires_at && !isClosed ? (
          <Text variant="caption" style={{ color: colors.warning }}>
            Yanıt süresi: {new Date(thread.session_expires_at).toLocaleTimeString('tr-TR')}
          </Text>
        ) : null}
        <Text secondary variant="caption">
          {PREMIUM_SUPPORT_SESSION_HINT}
        </Text>
        <View style={styles.actionRow}>
          {isClosed ? (
            <Button title="Desteği Aç" onPress={handleReopen} style={styles.actionBtn} />
          ) : (
            <>
              <Button title="Desteği Kapat" variant="outline" onPress={handleClose} style={styles.actionBtn} />
              <Button title="Çözüldü" variant="outline" onPress={handleResolve} style={styles.actionBtn} />
            </>
          )}
        </View>
      </GlassCard>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.flex}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <SupportMessageBubble
              message={item}
              isMine={item.sender_id === user?.id}
              senderLabel={
                item.sender_id === user?.id
                  ? 'Destek (siz)'
                  : thread.username ?? 'Kullanıcı'
              }
            />
          )}
        />

        <View style={[styles.composer, { borderTopColor: colors.border }]}>
          <Pressable
            onPress={() => void pickImage()}
            disabled={sending}
            style={[styles.attachBtn, { borderColor: colors.border, opacity: sending ? 0.5 : 1 }]}
          >
            <Ionicons name="image-outline" size={20} color={PREMIUM_GOLD} />
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Yanıt yazın…"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={MAX_PREMIUM_SUPPORT_MESSAGE_LENGTH}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surfaceElevated,
              },
            ]}
          />
          <Pressable
            onPress={() => void handleSend()}
            disabled={sending || draft.trim().length < MIN_PREMIUM_SUPPORT_MESSAGE_LENGTH}
            style={[
              styles.sendBtn,
              { backgroundColor: PREMIUM_GOLD, opacity: sending ? 0.6 : 1 },
            ]}
          >
            {sending ? (
              <ActivityIndicator color="#1A1508" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#1A1508" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  metaCard: { gap: spacing.sm, marginBottom: spacing.sm },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionBtn: { flexGrow: 1, minWidth: 120 },
  messageList: { paddingBottom: spacing.md },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
