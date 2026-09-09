import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { InstantPressable } from '@/components/ui/InstantPressable';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { DateUserSearchPicker } from '@/features/date/components/DateUserSearchPicker';
import type { DateUserSnippet } from '@/features/date/services/dateProfiles';
import { DATE_ACCENT, DATE_MESSAGE_MAX } from '@/features/date/constants';
import type { DateOuting } from '@/features/date/types';
import { sendDateJoinRequest } from '@/features/date/services/dateJoinData';
import { fetchFriendsList, type FriendUser } from '@/features/profile/services/friendship';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type DateJoinRequestSheetProps = {
  visible: boolean;
  outing: DateOuting | null;
  onClose: () => void;
  onSuccess: () => void;
};

type JoinMode = 'solo' | 'with_friend';

export function DateJoinRequestSheet({ visible, outing, onClose, onSuccess }: DateJoinRequestSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [mode, setMode] = useState<JoinMode>('solo');
  const [message, setMessage] = useState('');
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [companion, setCompanion] = useState<DateUserSnippet | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible || !user) return;
    setMode('solo');
    setMessage('');
    setCompanion(null);
    setLoadingFriends(true);
    void fetchFriendsList(user.id, user.id).then((list) => {
      setFriends(list);
      setLoadingFriends(false);
    });
  }, [visible, user]);

  const handleSubmit = useCallback(async () => {
    if (!outing || !user) return;
    if (mode === 'with_friend' && !companion) {
      Alert.alert('Arkadaş seçin', 'Birlikte katılmak için arkadaşınızı seçin veya yalnız başınıza istek gönderin.');
      return;
    }

    setSubmitting(true);
    const { error } = await sendDateJoinRequest(
      outing.id,
      message.trim() || null,
      mode === 'with_friend' ? companion?.id ?? null : null,
    );
    setSubmitting(false);

    if (error) {
      Alert.alert('İstek gönderilemedi', error);
      return;
    }

    Alert.alert('İstek gönderildi', 'Organizatör onaylarsa trip sohbete ekleneceksiniz.');
    onSuccess();
    onClose();
  }, [companion, message, mode, onClose, onSuccess, outing, user]);

  if (!outing) return null;

  const friendSnippets: DateUserSnippet[] = friends.map((friend) => ({
    id: friend.id,
    username: friend.username,
    fullName: friend.fullName,
    avatarUrl: friend.avatarUrl,
    gender: null,
  }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior="padding">
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + spacing.md,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <Text variant="h2" style={styles.sheetTitle}>
            Katılım isteği
          </Text>
          <Text secondary variant="caption" style={styles.sheetSubtitle}>
            {outing.title}
          </Text>

          <View style={styles.modeRow}>
            {(['solo', 'with_friend'] as JoinMode[]).map((item) => {
              const active = mode === item;
              return (
                <InstantPressable
                  key={item}
                  onPress={() => setMode(item)}
                  style={[
                    styles.modeChip,
                    {
                      borderColor: active ? DATE_ACCENT : colors.border,
                      backgroundColor: active ? `${DATE_ACCENT}14` : colors.surface,
                    },
                  ]}
                >
                  <Text variant="caption" style={{ fontWeight: '700', color: active ? DATE_ACCENT : colors.text }}>
                    {item === 'solo' ? 'Sadece ben' : 'Ben + arkadaşım'}
                  </Text>
                </InstantPressable>
              );
            })}
          </View>

          {mode === 'with_friend' ? (
            <View style={styles.friendsSection}>
              {loadingFriends ? (
                <ActivityIndicator color={DATE_ACCENT} style={{ marginVertical: spacing.md }} />
              ) : (
                <DateUserSearchPicker
                  label="Arkadaş seç"
                  hint="Kullanıcı adı veya ad soyad ile ara; arkadaşın kendi hesabıyla da ayrı istek gönderebilir."
                  selected={companion ? [companion] : []}
                  onChangeSelected={(users) => setCompanion(users[0] ?? null)}
                  excludeUserIds={user ? [user.id] : []}
                  maxSelected={1}
                  quickPicks={friendSnippets}
                  quickPicksLabel="Arkadaşlarından hızlı seç"
                />
              )}
            </View>
          ) : (
            <Text secondary variant="caption" style={styles.hint}>
              Arkadaşınız isterse kendi hesabıyla ayrı bir katılım isteği gönderebilir.
            </Text>
          )}

          <Text variant="label" style={styles.fieldLabel}>
            Kısa mesaj (opsiyonel)
          </Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Kendinizi kısaca tanıtın..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={DATE_MESSAGE_MAX}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          />

          <View style={styles.actions}>
            <Button title="Vazgeç" variant="ghost" onPress={onClose} style={styles.actionBtn} />
            <Button
              title={submitting ? 'Gönderiliyor...' : 'İsteği gönder'}
              onPress={() => void handleSubmit()}
              disabled={submitting}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    marginBottom: spacing.md,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  friendsSection: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  hint: {
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  fieldLabel: {
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: 88,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    textAlignVertical: 'top',
    fontSize: 16,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
