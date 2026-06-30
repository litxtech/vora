import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { SupportMessageBubble } from '@/features/premium-support/components/SupportMessageBubble';
import {
  MAX_PREMIUM_SUPPORT_MESSAGE_LENGTH,
  MIN_PREMIUM_SUPPORT_MESSAGE_LENGTH,
  PREMIUM_SUPPORT_SESSION_HINT,
  PREMIUM_SUPPORT_STATUS_LABELS,
  PREMIUM_SUPPORT_TOPICS,
} from '@/features/premium-support/constants';
import { usePremiumSupportChat } from '@/features/premium-support/hooks/usePremiumSupportChat';
import type { PremiumSupportMessage, PremiumSupportTopic } from '@/features/premium-support/types';
import { PREMIUM_GOLD } from '@/features/profile/constants/premiumUi';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

function formatSessionCountdown(expiresAt: string): string {
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return 'Süre doldu';
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  if (minutes > 0) return `${minutes} dk ${seconds} sn kaldı`;
  return `${seconds} sn kaldı`;
}

export function PremiumSupportScreen() {
  const { colors } = useTheme();
  const { user, thread, messages, loading, sending, sendMessage, sendImage } = usePremiumSupportChat();
  const [draft, setDraft] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<PremiumSupportTopic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const listRef = useRef<FlatList<PremiumSupportMessage>>(null);

  const canSendText =
    draft.trim().length >= MIN_PREMIUM_SUPPORT_MESSAGE_LENGTH && !sending;

  const sessionCountdown = useMemo(() => {
    if (!thread?.session_expires_at || thread.status === 'closed') return null;
    void tick;
    return formatSessionCountdown(thread.session_expires_at);
  }, [thread?.session_expires_at, thread?.status, tick]);

  useEffect(() => {
    if (!thread?.session_expires_at || thread.status === 'closed') return;
    const timer = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [thread?.session_expires_at, thread?.status]);

  const handleSend = useCallback(async () => {
    const content = draft.trim();
    if (content.length < MIN_PREMIUM_SUPPORT_MESSAGE_LENGTH) return;

    setError(null);
    const { error: sendError } = await sendMessage(content, selectedTopic);
    if (sendError) {
      setError(sendError);
      return;
    }

    setDraft('');
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [draft, selectedTopic, sendMessage]);

  const pickImage = useCallback(async () => {
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

    setError(null);
    const asset = result.assets[0];
    const { error: sendError } = await sendImage(
      asset.uri,
      draft.trim(),
      selectedTopic,
      asset.mimeType ?? undefined,
    );
    if (sendError) {
      setError(sendError);
      return;
    }

    setDraft('');
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [draft, selectedTopic, sendImage]);

  const applyTopic = (topic: (typeof PREMIUM_SUPPORT_TOPICS)[number]) => {
    setSelectedTopic(topic.id);
    if (!draft.trim()) {
      setDraft(topic.prompt);
    }
  };

  if (!user) {
    return (
      <GradientBackground>
        <View style={styles.centered}>
          <GlassCard style={styles.authCard}>
            <Text variant="h3">Oturum gerekli</Text>
            <Text secondary>Abonelik desteği için giriş yapmalısınız.</Text>
            <Button title="Giriş Yap" onPress={() => router.push('/(auth)/login')} />
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.flex}>
          <View style={styles.headerWrap}>
            <AuthHeader
              title="Premium Destek"
              subtitle="Abonelik, ödeme ve yenileme sorularınız için canlı destek"
              showBack
            />
            {thread ? (
              <GlassCard style={styles.statusCard}>
                <View style={styles.statusRow}>
                  <Ionicons name="headset-outline" size={18} color={PREMIUM_GOLD} />
                  <Text variant="caption" style={{ color: PREMIUM_GOLD, fontWeight: '700' }}>
                    {PREMIUM_SUPPORT_STATUS_LABELS[thread.status]}
                  </Text>
                  {sessionCountdown ? (
                    <Text variant="caption" muted>
                      · {sessionCountdown}
                    </Text>
                  ) : null}
                  {thread.user_unread_count > 0 ? (
                    <View style={[styles.unreadBadge, { backgroundColor: colors.danger }]}>
                      <Text variant="caption" style={styles.unreadText}>
                        {thread.user_unread_count}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text secondary variant="caption" style={styles.sessionHint}>
                  {PREMIUM_SUPPORT_SESSION_HINT}
                </Text>
              </GlassCard>
            ) : (
              <GlassCard style={styles.statusCard}>
                <Text secondary variant="caption" style={styles.sessionHint}>
                  {PREMIUM_SUPPORT_SESSION_HINT}
                </Text>
              </GlassCard>
            )}
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={PREMIUM_GOLD} />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messageList}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <GlassCard style={styles.introCard}>
                  <Ionicons name="chatbubbles-outline" size={32} color={PREMIUM_GOLD} />
                  <Text variant="label">Abonelik desteğine hoş geldiniz</Text>
                  <Text secondary variant="caption" style={styles.introText}>
                    Satın alma, yenileme, iptal, geri yükleme ve Premium özellikler hakkında sorularınızı
                    buradan iletebilirsiniz. Destek ekibi yanıt verdiğinde bildirim alırsınız; görsel de
                    gönderebilirsiniz.
                  </Text>
                  <Text variant="caption" style={{ color: PREMIUM_GOLD }}>
                    Hızlı konu seçin
                  </Text>
                  <View style={styles.topicWrap}>
                    {PREMIUM_SUPPORT_TOPICS.map((topic) => {
                      const active = selectedTopic === topic.id;
                      return (
                        <Pressable
                          key={topic.id}
                          onPress={() => applyTopic(topic)}
                          style={[
                            styles.topicChip,
                            {
                              borderColor: active ? PREMIUM_GOLD : colors.border,
                              backgroundColor: active ? `${PREMIUM_GOLD}22` : colors.surfaceElevated,
                            },
                          ]}
                        >
                          <Text variant="caption">{topic.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </GlassCard>
              }
              renderItem={({ item }) => (
                <SupportMessageBubble message={item} isMine={item.sender_id === user.id} />
              )}
            />
          )}

          <View style={[styles.composerWrap, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            {error ? (
              <Text variant="caption" style={{ color: colors.danger, paddingHorizontal: spacing.md }}>
                {error}
              </Text>
            ) : null}
            {thread?.status === 'closed' ? (
              <Text secondary variant="caption" style={styles.closedNote}>
                Bu sohbet kapatıldı. Yeni mesaj veya görsel gönderirseniz destek ekibine yeniden iletilir.
              </Text>
            ) : null}
            <View style={styles.composerRow}>
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
                placeholder="Abonelik sorunuzu yazın…"
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
                disabled={!canSendText}
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor: canSendText ? PREMIUM_GOLD : colors.border,
                    opacity: sending ? 0.6 : 1,
                  },
                ]}
              >
                {sending ? (
                  <ActivityIndicator color="#1A1508" size="small" />
                ) : (
                  <Ionicons name="send" size={18} color="#1A1508" />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  authCard: { gap: spacing.md, width: '100%', maxWidth: 420 },
  headerWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
  statusCard: { gap: spacing.xs },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sessionHint: { lineHeight: 18 },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  messageList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    flexGrow: 1,
  },
  introCard: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  introText: { textAlign: 'center', lineHeight: 18 },
  topicWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  topicChip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  composerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  closedNote: {
    paddingHorizontal: spacing.md,
    lineHeight: 18,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
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
    fontSize: 16,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
