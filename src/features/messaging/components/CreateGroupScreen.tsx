import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { createGroupConversation } from '../services/groupData';
import { openChat } from '../services/messagingNavigation';
import { GroupMemberPicker } from './GroupMemberPicker';

export function CreateGroupScreen() {
  const { colors } = useTheme();
  const { requireAuth } = useRequireAuth();
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!(await requireAuth('Grup oluşturma'))) return;
    if (!title.trim()) {
      Alert.alert('Grup adı gerekli');
      return;
    }

    setCreating(true);
    const { conversationId, error } = await createGroupConversation(
      title.trim(),
      [...selected],
    );
    setCreating(false);

    if (error || !conversationId) {
      Alert.alert('Grup oluşturulamadı', error ?? 'Bilinmeyen hata');
      return;
    }

    openChat(conversationId, { replace: true });
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text variant="h3">Yeni Grup</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.form}>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
            ]}
            placeholder="Grup adı"
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />
          <Text secondary variant="caption">
            {selected.size > 0
              ? `${selected.size} kişi seçildi`
              : 'Üye eklemek isteğe bağlı — gruptan sonra da ekleyebilirsiniz'}
          </Text>
        </View>

        <GroupMemberPicker selected={selected} onToggle={toggle} />

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button
            title={creating ? 'Oluşturuluyor...' : 'Grubu Oluştur'}
            onPress={handleCreate}
            loading={creating}
            disabled={!title.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerSpacer: { width: 24 },
  form: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
