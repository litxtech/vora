import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useNotifications } from '@/providers/NotificationProvider';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { useFeedStore } from '@/features/feed/store/feedStore';
import { REGIONS } from '@/constants/regions';
import { DISTRICTS } from '@/constants/districts';
import type { RegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function FeedHeader() {
  const { colors } = useTheme();
  const { requireAuth } = useRequireAuth();
  const { unreadCount } = useNotifications();
  const regionId = useFeedStore((s) => s.regionId);
  const district = useFeedStore((s) => s.district);
  const searchQuery = useFeedStore((s) => s.searchQuery);
  const setRegionId = useFeedStore((s) => s.setRegionId);
  const setDistrict = useFeedStore((s) => s.setDistrict);
  const setSearchQuery = useFeedStore((s) => s.setSearchQuery);

  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const regionName = REGIONS.find((r) => r.id === regionId)?.name ?? 'Bölge';
  const districts = DISTRICTS[regionId as RegionId] ?? [];

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Text variant="h2">Canlı Akış</Text>
        <View style={styles.iconRow}>
          <Pressable
            onPress={() => {
              if (requireAuth('Paylaşım')) router.push('/compose' as never);
            }}
            style={[styles.composeBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </Pressable>
          <Pressable onPress={() => setShowSearch((v) => !v)} style={styles.iconBtn}>
            <Ionicons name="search-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/notifications' as never)}>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {unreadCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                <Text variant="caption" style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      {showSearch ? (
        <Input
          placeholder="Akışta ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
      ) : null}

      <View style={styles.selectorRow}>
        <Pressable
          style={[styles.selector, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => setShowRegionPicker(true)}
        >
          <Ionicons name="location-outline" size={16} color={colors.primary} />
          <Text variant="caption">{regionName}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </Pressable>

        <Pressable
          style={[styles.selector, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => setShowDistrictPicker(true)}
        >
          <Text variant="caption">{district ?? 'Tüm ilçeler'}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </Pressable>
      </View>

      <RegionPicker
        visible={showRegionPicker}
        onClose={() => setShowRegionPicker(false)}
        selected={regionId}
        onSelect={(id) => {
          setRegionId(id);
          setShowRegionPicker(false);
        }}
      />

      <DistrictPicker
        visible={showDistrictPicker}
        onClose={() => setShowDistrictPicker(false)}
        districts={districts}
        selected={district}
        onSelect={(value) => {
          setDistrict(value);
          setShowDistrictPicker(false);
        }}
      />
    </View>
  );
}

function RegionPicker({
  visible,
  onClose,
  selected,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  selected: string;
  onSelect: (id: RegionId) => void;
}) {
  const { colors } = useTheme();

  return (
    <PickerModal visible={visible} onClose={onClose} title="Şehir seç">
      {REGIONS.map((region) => (
        <Pressable
          key={region.id}
          style={[styles.option, selected === region.id && { backgroundColor: 'rgba(30,136,229,0.12)' }]}
          onPress={() => onSelect(region.id)}
        >
          <Text>{region.name}</Text>
          {selected === region.id ? (
            <Ionicons name="checkmark" size={18} color={colors.primary} />
          ) : null}
        </Pressable>
      ))}
    </PickerModal>
  );
}

function DistrictPicker({
  visible,
  onClose,
  districts,
  selected,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  districts: string[];
  selected: string | null;
  onSelect: (value: string | null) => void;
}) {
  const { colors } = useTheme();

  return (
    <PickerModal visible={visible} onClose={onClose} title="İlçe seç">
      <Pressable
        style={[styles.option, !selected && { backgroundColor: 'rgba(30,136,229,0.12)' }]}
        onPress={() => onSelect(null)}
      >
        <Text>Tüm ilçeler</Text>
        {!selected ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
      </Pressable>
      {districts.map((name) => (
        <Pressable
          key={name}
          style={[styles.option, selected === name && { backgroundColor: 'rgba(30,136,229,0.12)' }]}
          onPress={() => onSelect(name)}
        >
          <Text>{name}</Text>
          {selected === name ? (
            <Ionicons name="checkmark" size={18} color={colors.primary} />
          ) : null}
        </Pressable>
      ))}
    </PickerModal>
  );
}

function PickerModal({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.sheetHeader}>
            <Text variant="h3">{title}</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView style={styles.sheetList}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, paddingBottom: spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconRow: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: { padding: spacing.xs },
  composeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  selectorRow: { flexDirection: 'row', gap: spacing.sm },
  selector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '60%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sheetList: { maxHeight: 360 },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
});
