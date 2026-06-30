import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import {
  fetchMessagingPrefs,
  updateMessagingPrefs,
  type MessagingPrivacyLevel,
} from '../services/messagingPrefs';
import { CONVERSATION_PIN_LIMIT } from '../services/messagingLimits';

const LEVELS: { id: MessagingPrivacyLevel; label: string }[] = [
  { id: 'everyone', label: 'Herkes' },
  { id: 'friends', label: 'Arkadaşlar' },
  { id: 'nobody', label: 'Kimse' },
];

type PickerField = 'who_can_message' | 'who_can_call';

export function MessagingPrivacyScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [whoCanMessage, setWhoCanMessage] = useState<MessagingPrivacyLevel>('everyone');
  const [whoCanCall, setWhoCanCall] = useState<MessagingPrivacyLevel>('everyone');
  const [hidePreview, setHidePreview] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    fetchMessagingPrefs(user.id).then((prefs) => {
      setWhoCanMessage(prefs.who_can_message);
      setWhoCanCall(prefs.who_can_call);
      setHidePreview(prefs.hide_notification_preview);
    });
  }, [user?.id]);

  const save = async (updates: Parameters<typeof updateMessagingPrefs>[1]) => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await updateMessagingPrefs(user.id, updates);
    setSaving(false);
    if (error) Alert.alert('Kaydedilemedi', error);
  };

  const renderPicker = (field: PickerField, value: MessagingPrivacyLevel, title: string) => (
    <View style={styles.section}>
      <Text variant="label">{title}</Text>
      <View style={styles.options}>
        {LEVELS.map((level) => {
          const active = value === level.id;
          return (
            <Pressable
              key={level.id}
              style={[
                styles.option,
                {
                  backgroundColor: active ? colors.primary : colors.surfaceElevated,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                if (field === 'who_can_message') setWhoCanMessage(level.id);
                else setWhoCanCall(level.id);
                save({ [field]: level.id });
              }}
            >
              <Text variant="caption" style={{ color: active ? '#fff' : colors.text }}>
                {level.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.headerWrap}>
        <AuthHeader title="Mesajlaşma Gizliliği" showBack compact />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {renderPicker('who_can_message', whoCanMessage, 'Kim mesaj atabilir?')}
        {renderPicker('who_can_call', whoCanCall, 'Kim arayabilir?')}

        <Pressable
          style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            const next = !hidePreview;
            setHidePreview(next);
            save({ hide_notification_preview: next });
          }}
        >
          <View style={styles.toggleInfo}>
            <Text variant="label">Bildirim içeriğini gizle</Text>
            <Text variant="caption" secondary>
              Push bildirimlerinde yalnızca "Yeni mesaj" gösterilir
            </Text>
          </View>
          <Ionicons
            name={hidePreview ? 'checkbox' : 'square-outline'}
            size={22}
            color={hidePreview ? colors.primary : colors.textSecondary}
          />
        </Pressable>

        <View style={[styles.infoCard, { backgroundColor: colors.surfaceElevated }]}>
          <Text variant="label">Mesajlaşma</Text>
          <Text variant="caption" secondary style={styles.infoText}>
            Mesaj göndermek herkes için ücretsiz ve sınırsızdır. En fazla {CONVERSATION_PIN_LIMIT} sohbeti
            sabitleyebilirsiniz.
          </Text>
        </View>

        {saving ? <Text variant="caption" secondary>Kaydediliyor...</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  spacer: { width: 24 },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  section: { gap: spacing.sm },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  toggleInfo: { flex: 1, gap: 4 },
  infoCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  infoText: { lineHeight: 18 },
});
