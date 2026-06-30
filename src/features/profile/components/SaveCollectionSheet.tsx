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
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  createCollection,
  fetchSaveCollections,
  type SaveCollection,
} from '@/features/profile/services/savedPosts';
import { glassSurface, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type SaveCollectionSheetProps = {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onSelect: (collectionId: string | null) => void;
};

export function SaveCollectionSheet({ visible, userId, onClose, onSelect }: SaveCollectionSheetProps) {
  const { colors, mode } = useTheme();
  const surface = glassSurface[mode];
  const [collections, setCollections] = useState<SaveCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const cols = await fetchSaveCollections(userId);
    setCollections(cols);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!visible) return;
    setShowCreate(false);
    setNewName('');
    load();
  }, [visible, load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const { id, error } = await createCollection(userId, newName.trim());
    setCreating(false);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }
    setNewName('');
    setShowCreate(false);
    if (id) onSelect(id);
    else await load();
  };

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: surface.handle }]} />
          <View style={styles.header}>
            <Text variant="h3">Koleksiyona Kaydet</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <>
              <Pressable
                style={[styles.option, { borderColor: colors.border }]}
                onPress={() => onSelect(null)}
              >
                <Ionicons name="bookmark-outline" size={20} color={colors.primary} />
                <View style={styles.optionText}>
                  <Text variant="label">Genel Kayıtlar</Text>
                  <Text secondary variant="caption">
                    Koleksiyonsuz kaydet
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>

              {collections.map((c) => (
                <Pressable
                  key={c.id}
                  style={[styles.option, { borderColor: colors.border }]}
                  onPress={() => onSelect(c.id)}
                >
                  <Ionicons name="folder-outline" size={20} color={colors.warning} />
                  <View style={styles.optionText}>
                    <Text variant="label">{c.name}</Text>
                    <Text secondary variant="caption">
                      {c.postCount} gönderi
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ))}

              {showCreate ? (
                <View style={styles.createRow}>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    placeholder="Yeni koleksiyon adı"
                    placeholderTextColor={colors.textMuted}
                    value={newName}
                    onChangeText={setNewName}
                    autoFocus
                  />
                  <Pressable
                    onPress={handleCreate}
                    disabled={creating}
                    style={[styles.createBtn, { backgroundColor: colors.primary }]}
                  >
                    {creating ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text variant="caption" style={{ color: '#fff', fontWeight: '600' }}>
                        Oluştur
                      </Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={[styles.addBtn, { borderColor: colors.border }]}
                  onPress={() => setShowCreate(true)}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  <Text style={{ color: colors.primary }}>Yeni Koleksiyon</Text>
                </Pressable>
              )}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  loader: { marginVertical: spacing.xl },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: { flex: 1, gap: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  createRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.sm },
  input: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  createBtn: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
});
