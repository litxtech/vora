import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  ROLE_PERMISSION_PRESET_VALUES,
  STAFF_ROLE_QUICK_OPTIONS,
} from '@/features/admin/constants';
import { fetchRolePermissions } from '@/features/admin/services/phase2Management';
import { summarizeRolePermissions } from '@/features/admin/services/adminPermissions';
import { fetchPrivilegedUsers, searchUsersForStaff } from '@/features/admin/services/staffManagement';
import { updateUserRole } from '@/features/admin/services/userManagement';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { ROLE_LABELS } from '@/constants/roles';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import type { UserRole } from '@/types/database';

const ROLE_ICONS: Record<UserRole, keyof typeof Ionicons.glyphMap> = {
  user: 'person-outline',
  verified_reporter: 'newspaper-outline',
  moderator: 'shield-outline',
  admin: 'shield-checkmark-outline',
  super_admin: 'star',
};

const ROLE_TONES: Record<UserRole, 'primary' | 'success' | 'warning' | 'danger' | 'accent'> = {
  user: 'primary',
  verified_reporter: 'accent',
  moderator: 'warning',
  admin: 'success',
  super_admin: 'danger',
};

type SearchUser = Awaited<ReturnType<typeof searchUsersForStaff>>['data'][number];

function RoleBadge({ role }: { role: UserRole }) {
  const { colors } = useTheme();
  const tone = ROLE_TONES[role];
  const color =
    tone === 'danger'
      ? colors.danger
      : tone === 'warning'
        ? colors.warning
        : tone === 'success'
          ? colors.success
          : tone === 'accent'
            ? colors.accent
            : colors.primary;

  return (
    <View style={[styles.badge, { backgroundColor: `${color}18`, borderColor: `${color}44` }]}>
      <Ionicons name={ROLE_ICONS[role]} size={12} color={color} />
      <Text variant="caption" style={{ color, fontWeight: '600' }}>
        {ROLE_LABELS[role]}
      </Text>
    </View>
  );
}

function StaffUserRow({
  username,
  fullName,
  avatarUrl,
  role,
  accountStatus,
  selected,
  onPress,
  trailing,
}: {
  username: string;
  fullName: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  accountStatus?: string;
  selected?: boolean;
  onPress?: () => void;
  trailing?: ReactNode;
}) {
  const { colors } = useTheme();
  const content = (
  <>
      <View style={styles.userRowMain}>
        <View style={styles.avatarWrap}>
          <ProfileAvatar username={username} avatarUrl={avatarUrl ?? null} size={40} />
          {selected ? (
            <View style={[styles.selectedDot, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
              <Ionicons name="checkmark" size={10} color="#fff" />
            </View>
          ) : null}
        </View>
        <View style={styles.userRowTexts}>
          <Text variant="label">@{username}</Text>
          {fullName ? (
            <Text secondary variant="caption">{fullName}</Text>
          ) : null}
          {accountStatus && accountStatus !== 'active' ? (
            <Text variant="caption" style={{ color: colors.warning }}>
              Hesap: {accountStatus}
            </Text>
          ) : null}
        </View>
      </View>
      {trailing ?? <RoleBadge role={role} />}
    </>
  );

  const cardStyle = [
    styles.userCard,
    selected && { borderColor: colors.primary, borderWidth: 2 },
  ];

  if (!onPress) {
    return (
      <GlassCard style={cardStyle}>
        <View style={styles.userRow}>{content}</View>
      </GlassCard>
    );
  }

  return (
    <Pressable onPress={onPress}>
      <GlassCard style={cardStyle}>
        <View style={styles.userRow}>{content}</View>
      </GlassCard>
    </Pressable>
  );
}

function SelectedUserCard({
  user,
  onChangeUser,
}: {
  user: SearchUser;
  onChangeUser: () => void;
}) {
  const { colors } = useTheme();
  const tone = ROLE_TONES[user.role];
  const accent =
    tone === 'danger'
      ? colors.danger
      : tone === 'warning'
        ? colors.warning
        : tone === 'success'
          ? colors.success
          : colors.primary;

  return (
    <GlassCard style={[styles.selectedCard, { borderColor: `${colors.primary}55` }]}>
      <View style={styles.selectedHeader}>
        <View style={[styles.selectedBadge, { backgroundColor: `${colors.primary}18` }]}>
          <Ionicons name="person-circle-outline" size={14} color={colors.primary} />
          <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
            Seçilen kullanıcı
          </Text>
        </View>
        <Pressable
          onPress={onChangeUser}
          style={({ pressed }) => [styles.changeBtn, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityLabel="Başka kullanıcı seç"
        >
          <Ionicons name="swap-horizontal-outline" size={14} color={colors.primary} />
          <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
            Değiştir
          </Text>
        </Pressable>
      </View>

      <View style={styles.selectedBody}>
        <ProfileAvatar username={user.username} avatarUrl={user.avatar_url} size={56} />
        <View style={styles.selectedTexts}>
          <Text variant="label" style={{ fontSize: 17 }}>
            @{user.username}
          </Text>
          {user.full_name ? (
            <Text secondary variant="body">{user.full_name}</Text>
          ) : (
            <Text secondary variant="caption">Ad soyad eklenmemiş</Text>
          )}
          <View style={styles.selectedMeta}>
            <View style={[styles.currentRolePill, { backgroundColor: `${accent}18`, borderColor: `${accent}44` }]}>
              <Ionicons name={ROLE_ICONS[user.role]} size={12} color={accent} />
              <Text variant="caption" style={{ color: accent, fontWeight: '600' }}>
                Mevcut rol: {ROLE_LABELS[user.role]}
              </Text>
            </View>
            {user.account_status && user.account_status !== 'active' ? (
              <Text variant="caption" style={{ color: colors.warning }}>
                Hesap durumu: {user.account_status}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

function QuickRoleCard({
  role,
  highlight,
  permissionSummary,
  selected,
  current,
  onSelect,
}: {
  role: UserRole;
  highlight: string;
  permissionSummary?: string;
  selected: boolean;
  current: boolean;
  onSelect: () => void;
}) {
  const { colors } = useTheme();
  const tone = ROLE_TONES[role];
  const accent =
    tone === 'danger'
      ? colors.danger
      : tone === 'warning'
        ? colors.warning
        : tone === 'success'
          ? colors.success
          : colors.primary;

  return (
    <Pressable onPress={onSelect} style={styles.quickRolePress}>
      <GlassCard
        style={[
          styles.quickRoleCard,
          selected && { borderColor: accent, borderWidth: 2 },
          current && !selected && { borderColor: `${accent}66`, borderWidth: 1 },
        ]}
      >
        <View style={[styles.quickRoleIcon, { backgroundColor: `${accent}18` }]}>
          <Ionicons name={ROLE_ICONS[role]} size={20} color={accent} />
        </View>
        <Text variant="label" style={{ color: selected ? accent : colors.text }}>
          {ROLE_LABELS[role]}
        </Text>
        <Text secondary variant="caption" numberOfLines={2} style={styles.quickRoleHint}>
          {highlight}
        </Text>
        {permissionSummary ? (
          <Text variant="caption" style={{ color: accent, fontWeight: '700', marginTop: 2 }}>
            {permissionSummary}
          </Text>
        ) : null}
        {current ? (
          <View style={[styles.currentPill, { backgroundColor: `${accent}22`, alignSelf: 'center' }]}>
            <Text variant="caption" style={{ color: accent, fontWeight: '600' }}>Mevcut</Text>
          </View>
        ) : null}
        {selected ? (
          <Ionicons name="checkmark-circle" size={18} color={accent} style={styles.quickRoleCheck} />
        ) : null}
      </GlassCard>
    </Pressable>
  );
}

export function AdminStaffScreen() {
  const { colors } = useTheme();
  const [staff, setStaff] = useState<Awaited<ReturnType<typeof fetchPrivilegedUsers>>['data']>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [pickedRole, setPickedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<Awaited<ReturnType<typeof fetchRolePermissions>>>([]);

  const loadStaff = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const [{ data }, perms] = await Promise.all([fetchPrivilegedUsers(), fetchRolePermissions()]);
    setStaff(data);
    setRolePermissions(perms);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void loadStaff();
  }, []);

  const runSearch = useCallback(async (query: string) => {
    setSearching(true);
    const { data } = await searchUsersForStaff(query);
    setSearchResults(data);
    setSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void runSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search, runSearch]);

  const staffByRole = useMemo(() => {
    const groups: Record<string, typeof staff> = {
      super_admin: [],
      admin: [],
      moderator: [],
    };
    for (const member of staff) {
      if (groups[member.role]) groups[member.role].push(member);
    }
    return groups;
  }, [staff]);

  const assignableRoles = STAFF_ROLE_QUICK_OPTIONS;

  const rolePermissionSummary = useMemo(() => {
    const map: Partial<Record<UserRole, string>> = {};
    for (const option of STAFF_ROLE_QUICK_OPTIONS) {
      if (option.role === 'user') {
        map.user = 'Panel erişimi yok';
        continue;
      }
      const preset = option.preset ? ROLE_PERMISSION_PRESET_VALUES[option.preset] : null;
      if (preset) {
        map[option.role] = summarizeRolePermissions(preset, option.role).label;
        continue;
      }
      const rolePerms = Object.fromEntries(
        rolePermissions.filter((p) => p.role === option.role).map((p) => [p.permission_key, p.allowed]),
      );
      map[option.role] = summarizeRolePermissions(rolePerms, option.role).label;
    }
    return map;
  }, [rolePermissions]);

  const clearSelection = () => {
    setSelectedUser(null);
    setPickedRole(null);
  };

  const confirmAssign = () => {
    if (!selectedUser || !pickedRole) return;

    const roleLabel = ROLE_LABELS[pickedRole];
    const isFullAccess = pickedRole === 'super_admin';
    const message = isFullAccess
      ? `@${selectedUser.username} hesabına TAM YETKİ (Süper Admin) verilecek. Bu hesap uygulamayı tamamen yönetebilir.`
      : `@${selectedUser.username} hesabına "${roleLabel}" rolü verilecek.`;

    Alert.alert('Yetki onayı', message, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        style: isFullAccess ? 'destructive' : 'default',
        onPress: async () => {
          setSaving(true);
          const { error } = await updateUserRole(selectedUser.id, pickedRole);
          setSaving(false);
          if (error) {
            Alert.alert('Hata', error);
            return;
          }
          Alert.alert('Tamam', `${roleLabel} rolü atandı.`);
          setSelectedUser(null);
          setPickedRole(null);
          setSearch('');
          void loadStaff(true);
        },
      },
    ]);
  };

  return (
    <AdminShell
      title="Yönetici Atama"
      subtitle="Moderatör ve admin yetkilerini buradan verin"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => loadStaff(true)}
    >
      <GlassCard style={styles.intro}>
        <View style={styles.introHeader}>
          <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
          <Text variant="label">Nasıl çalışır?</Text>
        </View>
        <Text variant="body">
          Bir kullanıcıya yönetim paneli erişimi vermek için aşağıdan hesabı bulun ve rol seçin.
        </Text>
        <Text secondary variant="caption">
          Tam kontrol için <Text style={{ fontWeight: '700' }}>Süper Admin</Text> seçin. Rol izin
          şablonlarını değiştirmek için Analiz → Rol İzin Şablonları sayfasını kullanın.
        </Text>
      </GlassCard>

      <AdminSectionHeader title="Mevcut yönetim ekibi" hint={`${staff.length} kişi`} />
      {loading ? (
        <AdminEmptyState loading />
      ) : staff.length === 0 ? (
        <AdminEmptyState
          title="Henüz yönetici yok"
          message="Aşağıdan bir kullanıcıya moderatör veya admin rolü verebilirsiniz."
          icon="shield-outline"
        />
      ) : (
        <>
          {(['super_admin', 'admin', 'moderator'] as UserRole[]).map((roleKey) => {
            const members = staffByRole[roleKey];
            if (!members?.length) return null;
            return (
              <View key={roleKey}>
                <Text secondary variant="caption" style={styles.groupLabel}>
                  {ROLE_LABELS[roleKey]} ({members.length})
                </Text>
                {members.map((member) => (
                  <StaffUserRow
                    key={member.id}
                    username={member.username}
                    fullName={member.full_name}
                    avatarUrl={member.avatar_url}
                    role={member.role}
                    accountStatus={member.account_status}
                    onPress={() => router.push(`/admin/users/${member.id}` as never)}
                  />
                ))}
              </View>
            );
          })}
        </>
      )}

      <AdminSectionHeader
        title="Yetki ver veya değiştir"
        hint={selectedUser ? 'Seçili kullanıcıya yeni rol atayın' : 'Kullanıcı adı veya ad ile ara'}
      />

      {selectedUser ? (
        <SelectedUserCard
          user={selectedUser}
          onChangeUser={() => {
            clearSelection();
            setSearch('');
          }}
        />
      ) : null}

      <AdminSearchInput
        value={search}
        onChangeText={(text) => {
          setSearch(text);
          if (!text.trim() && !selectedUser) clearSelection();
        }}
        placeholder={selectedUser ? 'Başka kullanıcı ara…' : 'Kullanıcı ara…'}
      />

      {!selectedUser && searching ? (
        <AdminEmptyState loading />
      ) : !selectedUser && search.trim() && searchResults.length === 0 ? (
        <AdminEmptyState title="Sonuç yok" message="Farklı bir arama deneyin." icon="search-outline" />
      ) : !selectedUser ? (
        searchResults.map((user) => (
          <StaffUserRow
            key={user.id}
            username={user.username}
            fullName={user.full_name}
            avatarUrl={user.avatar_url}
            role={user.role}
            accountStatus={user.account_status}
            onPress={() => {
              setSelectedUser(user);
              setPickedRole(user.role);
              setSearch('');
            }}
          />
        ))
      ) : search.trim() ? (
        searching ? (
          <AdminEmptyState loading />
        ) : searchResults.length === 0 ? (
          <AdminEmptyState title="Sonuç yok" message="Farklı bir arama deneyin." icon="search-outline" />
        ) : (
          searchResults.map((user) => (
            <StaffUserRow
              key={user.id}
              username={user.username}
              fullName={user.full_name}
              avatarUrl={user.avatar_url}
              role={user.role}
              accountStatus={user.account_status}
              selected={selectedUser.id === user.id}
              onPress={() => {
                setSelectedUser(user);
                setPickedRole(user.role);
                setSearch('');
              }}
              trailing={
                selectedUser.id === user.id ? (
                  <View style={[styles.selectedChip, { backgroundColor: `${colors.primary}18` }]}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                      Seçili
                    </Text>
                  </View>
                ) : (
                  <RoleBadge role={user.role} />
                )
              }
            />
          ))
        )
      ) : null}

      {selectedUser ? (
        <View style={styles.assignBlock}>
          <AdminSectionHeader
            title="Atanacak rol"
            hint={`@${selectedUser.username} için hızlı seçim yapın`}
          />

          <View style={styles.quickRoleGrid}>
            {assignableRoles.map((option) => (
              <QuickRoleCard
                key={option.role}
                role={option.role}
                highlight={option.highlight}
                permissionSummary={rolePermissionSummary[option.role]}
                selected={pickedRole === option.role}
                current={selectedUser.role === option.role}
                onSelect={() => setPickedRole(option.role)}
              />
            ))}
          </View>

          <Pressable onPress={() => router.push('/admin/permissions' as never)}>
            <Text variant="caption" style={[styles.hintCenter, { color: colors.primary }]}>
              Rol izin şablonlarını özelleştir →
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.assignBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed || saving || pickedRole === selectedUser.role ? 0.55 : 1,
              },
            ]}
            disabled={saving || !pickedRole || pickedRole === selectedUser.role}
            onPress={confirmAssign}
          >
            <Ionicons name="shield-checkmark" size={18} color="#fff" />
            <Text variant="label" style={{ color: '#fff' }}>
              {pickedRole === 'super_admin'
                ? `@${selectedUser.username} — tam yetki ver`
                : `@${selectedUser.username} — rolü kaydet`}
            </Text>
          </Pressable>

          {pickedRole === selectedUser.role ? (
            <Text secondary variant="caption" style={styles.hintCenter}>
              Bu kullanıcı zaten bu rolde.
            </Text>
          ) : null}

          <Pressable onPress={() => router.push(`/admin/users/${selectedUser.id}` as never)}>
            <Text variant="caption" style={[styles.hintCenter, { color: colors.primary }]}>
              Kullanıcı detayına git →
            </Text>
          </Pressable>
        </View>
      ) : null}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.sm, marginBottom: spacing.sm },
  introHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  groupLabel: { marginTop: spacing.xs, marginBottom: spacing.xs, paddingHorizontal: spacing.xs },
  userCard: { marginBottom: spacing.xs },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  userRowMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
  userRowTexts: { flex: 1, minWidth: 0, gap: 2 },
  avatarWrap: { position: 'relative' },
  selectedDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCard: {
    gap: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
  },
  selectedBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  selectedTexts: { flex: 1, minWidth: 0, gap: 2 },
  selectedMeta: { marginTop: spacing.xs, gap: 4 },
  currentRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  assignBlock: { gap: spacing.sm, marginTop: spacing.md },
  quickRoleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickRolePress: { width: '48%', flexGrow: 1 },
  quickRoleCard: {
    gap: spacing.xs,
    alignItems: 'center',
    minHeight: 132,
    justifyContent: 'center',
    position: 'relative',
  },
  quickRoleIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRoleHint: { textAlign: 'center', minHeight: 32 },
  quickRoleCheck: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  currentPill: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.xs,
  },
  hintCenter: { textAlign: 'center', marginTop: spacing.xs },
});
