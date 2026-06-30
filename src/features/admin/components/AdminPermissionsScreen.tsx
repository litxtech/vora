import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  ACTION_PERMISSION_KEYS,
  ADMIN_PANEL_PERMISSION_CATALOG,
  PERMISSION_DESCRIPTIONS,
  PERMISSION_GROUP_MAP,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSION_PRESETS,
  ROLE_PERMISSION_PRESET_VALUES,
  type PermissionGroupId,
  type RolePermissionPresetId,
} from '@/features/admin/constants';
import {
  fetchRolePermissions,
  setRolePermission,
  setRolePermissionsBulk,
  type RolePermissionRow,
} from '@/features/admin/services/phase2Management';
import { ROLE_LABELS } from '@/constants/roles';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import type { UserRole } from '@/types/database';

const ROLES: UserRole[] = ['moderator', 'admin', 'super_admin'];

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

const PERMISSION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'users.read': 'eye-outline',
  'users.edit': 'create-outline',
  'users.ban': 'ban-outline',
  'content.moderate': 'document-text-outline',
  'content.pin': 'pin-outline',
  'reports.resolve': 'flag-outline',
  'broadcasts.send': 'megaphone-outline',
  'revenue.read': 'cash-outline',
  'features.toggle': 'toggle-outline',
};

function roleAccent(role: UserRole, colors: ReturnType<typeof useTheme>['colors']) {
  const tone = ROLE_TONES[role];
  if (tone === 'danger') return colors.danger;
  if (tone === 'warning') return colors.warning;
  if (tone === 'success') return colors.success;
  if (tone === 'accent') return colors.accent;
  return colors.primary;
}

function PermissionRow({
  perm,
  onToggle,
  showDivider,
  disabled,
}: {
  perm: RolePermissionRow;
  onToggle: () => void;
  showDivider: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const catalogItem = ADMIN_PANEL_PERMISSION_CATALOG.find((item) => item.key === perm.permission_key);
  const icon =
    PERMISSION_ICONS[perm.permission_key] ?? catalogItem?.icon ?? 'key-outline';
  const label = PERMISSION_LABELS[perm.permission_key] ?? perm.permission_key;
  const description =
    PERMISSION_DESCRIPTIONS[perm.permission_key] ?? 'Bu izin için açıklama tanımlanmamış.';

  return (
    <>
      <View style={[styles.permRow, disabled && { opacity: 0.55 }]}>
        <View style={[styles.permIcon, { backgroundColor: `${colors.primary}14` }]}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <View style={styles.permTexts}>
          <Text variant="label">{label}</Text>
          <Text secondary variant="caption">
            {description}
          </Text>
        </View>
        <View style={styles.permSwitch}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: perm.allowed ? `${colors.success}18` : `${colors.textMuted}18`,
                borderColor: perm.allowed ? `${colors.success}44` : colors.border,
              },
            ]}
          >
            <Text
              variant="caption"
              style={{ color: perm.allowed ? colors.success : colors.textMuted, fontWeight: '600' }}
            >
              {perm.allowed ? 'Açık' : 'Kapalı'}
            </Text>
          </View>
          <Switch
            value={perm.allowed}
            disabled={disabled}
            onValueChange={onToggle}
            trackColor={{ true: colors.primary, false: colors.border }}
            accessibilityLabel={perm.allowed ? `${label} yetkisini kapat` : `${label} yetkisini aç`}
          />
        </View>
      </View>
      {showDivider ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
    </>
  );
}

export function AdminPermissionsScreen() {
  const { colors } = useTheme();
  const [perms, setPerms] = useState<RolePermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('moderator');
  const [filter, setFilter] = useState('');

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setPerms(await fetchRolePermissions());
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggle = async (perm: RolePermissionRow) => {
    if (selectedRole === 'super_admin') return;
    setSaving(true);
    await setRolePermission(perm.role, perm.permission_key, !perm.allowed);
    setSaving(false);
    void load(true);
  };

  const rolePerms = useMemo(() => {
    const fetched = new Map(
      perms.filter((p) => p.role === selectedRole).map((p) => [p.permission_key, p.allowed]),
    );
    const allKeys = [
      ...ACTION_PERMISSION_KEYS,
      ...ADMIN_PANEL_PERMISSION_CATALOG.map((item) => item.key),
    ];
    return allKeys.map((key) => ({
      role: selectedRole,
      permission_key: key,
      allowed: selectedRole === 'super_admin' ? true : (fetched.get(key) ?? false),
    }));
  }, [perms, selectedRole]);

  const filteredPerms = useMemo(() => {
    const q = filter.trim().toLocaleLowerCase('tr-TR');
    if (!q) return rolePerms;
    return rolePerms.filter((perm) => {
      const label = PERMISSION_LABELS[perm.permission_key] ?? perm.permission_key;
      return label.toLocaleLowerCase('tr-TR').includes(q) || perm.permission_key.includes(q);
    });
  }, [rolePerms, filter]);

  const enabledCount = rolePerms.filter((p) => p.allowed).length;
  const accent = roleAccent(selectedRole, colors);
  const isSuperAdminRole = selectedRole === 'super_admin';

  const groupedPerms = useMemo(() => {
    const buckets = new Map<PermissionGroupId, RolePermissionRow[]>();
    for (const group of PERMISSION_GROUPS) {
      buckets.set(group.id, []);
    }
    for (const perm of filteredPerms) {
      const groupId = PERMISSION_GROUP_MAP[perm.permission_key] ?? 'management';
      buckets.get(groupId)?.push(perm);
    }
    return PERMISSION_GROUPS.map((group) => ({
      ...group,
      items: buckets.get(group.id) ?? [],
    })).filter((group) => group.items.length > 0);
  }, [filteredPerms]);

  const progress = rolePerms.length > 0 ? enabledCount / rolePerms.length : 0;

  const applyPreset = (preset: RolePermissionPresetId) => {
    if (isSuperAdminRole) return;
    const presetMeta = ROLE_PERMISSION_PRESETS[preset];
    Alert.alert(
      'Şablon uygula',
      `${ROLE_LABELS[selectedRole]} rolüne "${presetMeta.label}" uygulanacak. Mevcut ayarlar değişir.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Uygula',
          onPress: async () => {
            setSaving(true);
            const { error } = await setRolePermissionsBulk(selectedRole, ROLE_PERMISSION_PRESET_VALUES[preset]);
            setSaving(false);
            if (error) Alert.alert('Hata', error);
            else void load(true);
          },
        },
      ],
    );
  };

  const toggleGroup = (groupId: PermissionGroupId, allowed: boolean) => {
    if (isSuperAdminRole) return;
    const keys = rolePerms
      .filter((perm) => PERMISSION_GROUP_MAP[perm.permission_key] === groupId)
      .map((perm) => perm.permission_key);
    if (keys.length === 0) return;

    Alert.alert(
      allowed ? 'Grubu aç' : 'Grubu kapat',
      `${keys.length} izin ${allowed ? 'açılacak' : 'kapatılacak'}.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: async () => {
            setSaving(true);
            const bulk = Object.fromEntries(keys.map((key) => [key, allowed]));
            const { error } = await setRolePermissionsBulk(selectedRole, bulk);
            setSaving(false);
            if (error) Alert.alert('Hata', error);
            else void load(true);
          },
        },
      ],
    );
  };

  return (
    <AdminShell
      title="Rol İzin Şablonları"
      subtitle="Tüm modül ve işlem yetkilerini düzenleyin"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <AdminFilterChip
        options={ROLES.map((role) => ({ id: role, label: ROLE_LABELS[role] ?? role }))}
        value={selectedRole}
        onChange={setSelectedRole}
      />

      <GlassCard style={[styles.heroCard, { borderColor: `${accent}44` }]}>
        <View style={styles.heroHeader}>
          <View style={[styles.heroIcon, { backgroundColor: `${accent}18` }]}>
            <Ionicons name={ROLE_ICONS[selectedRole]} size={24} color={accent} />
          </View>
          <View style={styles.heroTexts}>
            <Text variant="label">{ROLE_LABELS[selectedRole]} şablonu</Text>
            <Text secondary variant="caption">
              {ROLE_DESCRIPTIONS[selectedRole]}
            </Text>
          </View>
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressMeta}>
            <Text variant="caption" style={{ color: accent, fontWeight: '700' }}>
              {enabledCount}/{rolePerms.length} yetki aktif
            </Text>
            <Text secondary variant="caption">
              Bu role atanan kullanıcılar bu yetkileri kullanır
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: `${accent}18` }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: accent, width: `${Math.round(progress * 100)}%` },
              ]}
            />
          </View>
        </View>
      </GlassCard>

      {isSuperAdminRole ? (
        <GlassCard style={[styles.infoCard, { borderColor: `${colors.warning}44` }]}>
          <View style={styles.infoRow}>
            <Ionicons name="star-outline" size={20} color={colors.warning} />
            <Text variant="caption">
              Tam yetki rolü her zaman tüm izinlere sahiptir. Buradaki ayarlar süper admin için
              uygulanmaz; şablon yalnızca moderatör ve admin rolleri içindir.
            </Text>
          </View>
        </GlassCard>
      ) : (
        <>
          <AdminSectionHeader title="Hızlı şablonlar" hint="Tek dokunuşla paket uygula" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
            {(Object.keys(ROLE_PERMISSION_PRESETS) as RolePermissionPresetId[]).map((preset) => {
              const meta = ROLE_PERMISSION_PRESETS[preset];
              return (
                <AdminActionChip
                  key={preset}
                  label={meta.label}
                  icon={meta.icon}
                  tone={preset === 'full' ? 'danger' : preset === 'admin' ? 'success' : 'primary'}
                  onPress={() => applyPreset(preset)}
                />
              );
            })}
          </ScrollView>
        </>
      )}

      <GlassCard style={[styles.infoCard, { borderColor: `${colors.primary}33` }]}>
        <View style={styles.infoRow}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <View style={styles.infoTexts}>
            <Text variant="caption">
              Modül izinleri (<Text style={{ fontWeight: '700' }}>panel.*</Text>) hangi admin sayfalarının
              görüneceğini belirler. Temel işlemler ban, bildirim ve gelir gibi kritik aksiyonları kontrol eder.
            </Text>
            <Text secondary variant="caption">
              Kullanıcıya rol atadığınızda bu şablon otomatik uygulanır.
            </Text>
          </View>
        </View>
      </GlassCard>

      <Pressable onPress={() => router.push('/admin/staff' as never)}>
        <GlassCard style={styles.linkCard}>
          <View style={[styles.linkIcon, { backgroundColor: `${colors.primary}14` }]}>
            <Ionicons name="person-add-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.linkTexts}>
            <Text variant="label">Kullanıcıya rol atamak için</Text>
            <Text secondary variant="caption">
              Yönetici Atama sayfasına git
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </GlassCard>
      </Pressable>

      <AdminSearchInput
        value={filter}
        onChangeText={setFilter}
        placeholder="İzin veya modül ara…"
      />

      {loading ? (
        <AdminEmptyState loading />
      ) : groupedPerms.length === 0 ? (
        <AdminEmptyState title="Eşleşme yok" message="Farklı bir arama deneyin." icon="search-outline" />
      ) : (
        groupedPerms.map((group) => {
          const groupEnabled = group.items.filter((p) => p.allowed).length;
          return (
            <View key={group.id} style={styles.groupSection}>
              <View style={styles.groupHeader}>
                <AdminSectionHeader
                  title={group.label}
                  hint={`${groupEnabled}/${group.items.length} açık`}
                />
                {!isSuperAdminRole ? (
                  <View style={styles.groupActions}>
                    <Pressable onPress={() => toggleGroup(group.id, true)} disabled={saving}>
                      <Text variant="caption" style={{ color: colors.success, fontWeight: '700' }}>
                        Tümünü aç
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => toggleGroup(group.id, false)} disabled={saving}>
                      <Text variant="caption" style={{ color: colors.textMuted, fontWeight: '700' }}>
                        Tümünü kapat
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
              <GlassCard style={styles.groupCard} padded={false}>
                {group.items.map((perm, index) => (
                  <PermissionRow
                    key={`${perm.role}-${perm.permission_key}`}
                    perm={perm}
                    onToggle={() => toggle(perm)}
                    showDivider={index < group.items.length - 1}
                    disabled={isSuperAdminRole || saving}
                  />
                ))}
              </GlassCard>
            </View>
          );
        })
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTexts: { flex: 1, minWidth: 0, gap: 2 },
  progressBlock: { gap: spacing.xs },
  progressMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    minWidth: 6,
  },
  presetRow: { gap: spacing.sm, paddingBottom: spacing.sm },
  infoCard: {
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoTexts: { flex: 1, minWidth: 0, gap: 2 },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTexts: { flex: 1, minWidth: 0, gap: 2 },
  groupSection: { gap: spacing.xs, marginBottom: spacing.sm },
  groupHeader: { gap: spacing.xs },
  groupActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  groupCard: { overflow: 'hidden' },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  permIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permTexts: { flex: 1, minWidth: 0, gap: 2 },
  permSwitch: { alignItems: 'flex-end', gap: spacing.xs },
  statusPill: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: spacing.md + 36 + spacing.sm },
});
