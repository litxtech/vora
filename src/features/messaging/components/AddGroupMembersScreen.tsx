import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { addGroupMembers } from '../services/groupData';
import { GroupMemberPicker } from './GroupMemberPicker';

type AddGroupMembersParams = {
  id: string;
  exclude?: string;
};

export function AddGroupMembersScreen() {
  const { id, exclude } = useLocalSearchParams<AddGroupMembersParams>();
  const { colors } = useTheme();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  const excludeIds = useMemo(() => {
    const ids = new Set<string>();
    if (exclude) {
      exclude.split(',').forEach((entry) => {
        const trimmed = entry.trim();
        if (trimmed) ids.add(trimmed);
      });
    }
    return ids;
  }, [exclude]);

  const toggle = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleAdd = async () => {
    if (!id || selected.size === 0) return;

    setAdding(true);
    const { added, error } = await addGroupMembers(id, [...selected]);
    setAdding(false);

    if (error) {
      Alert.alert('Eklenemedi', error);
      return;
    }

    if (added === 0) {
      Alert.alert('Üye eklenemedi', 'Seçilen kullanıcılar zaten grupta veya engellenmiş olabilir.');
      return;
    }

    Alert.alert('Eklendi', `${added} üye gruba eklendi.`, [
      { text: 'Tamam', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.header}>
          <ScreenBackButton />
          <Text variant="h3">Üye Ekle</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text secondary variant="caption" style={styles.hint}>
          Mesajlaştıklarınızdan seçin veya kullanıcı arayın.
        </Text>

        <GroupMemberPicker excludeIds={excludeIds} selected={selected} onToggle={toggle} />

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button
            title={adding ? 'Ekleniyor...' : selected.size > 0 ? `${selected.size} üye ekle` : 'Üye seçin'}
            onPress={handleAdd}
            loading={adding}
            disabled={selected.size === 0}
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
  hint: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
