import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { INTEREST_OPTIONS } from '@/constants/auth';
import { GENDER_OPTIONS } from '@/constants/registration';
import { regionNameById } from '@/constants/regions';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { AdminFormField } from '@/features/admin/components/shared/AdminFormField';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AdminRolePill } from '@/features/admin/components/shared/AdminRolePill';
import { AdminUserActivityPanel } from '@/features/admin/components/user-detail/AdminUserActivityPanel';
import { AdminUserCollapsibleSection, AdminUserInfoRow } from '@/features/admin/components/user-detail/AdminUserCollapsibleSection';
import { AdminTrustScorePanel } from '@/features/admin/components/user-detail/AdminTrustScorePanel';
import { AdminUserDetailHero } from '@/features/admin/components/user-detail/AdminUserDetailHero';
import { AdminUserDevicesPanel } from '@/features/admin/components/user-detail/AdminUserDevicesPanel';
import { useAdminUserDetailLive } from '@/features/admin/hooks/useAdminUserDetailLive';
import { BAN_DURATION_LABELS } from '@/features/admin/constants';
import {
  emergencyQuarantineUser,
  releaseQuarantineUser,
  removeAllUserContent,
} from '@/features/admin/services/emergencyModeration';
import { adminReactivateAccount } from '@/features/account-lifecycle/services/adminLifecycle';
import {
  banUser,
  deleteUserAccountByPlatform,
  fetchAdminUser,
  fetchUserReportsAgainst,
  liftBan,
  sendAdminMessage,
  setNewsVerificationGranted,
  updateAccountStatus,
  updateUserRole,
} from '@/features/admin/services/userManagement';
import { revokeAllUserSessions } from '@/features/admin/services/phase2Management';
import {
  exportAccountDataPdf,
  printAccountData,
  type AccountReportInput,
} from '@/features/account-data-export';
import {
  fetchAdminUserCloseFriends,
  removeAdminCloseFriend,
  type AdminCloseFriendRow,
} from '@/features/profile/services/adminCloseFriends';
import { REPORTER_ROLES } from '@/features/news-verification/constants';
import type { BanDuration } from '@/features/admin/types';
import { ASSIGNABLE_ROLES } from '@/features/admin/constants';
import { formatIbanInput, isoToDisplayBirthDate } from '@/features/auth/services/validation';
import { TRUST_SCORE_MAX } from '@/features/profile/constants';
import { REPORT_REASONS } from '@/features/moderation/constants';
import { grantPlatformCharm, revokePlatformCharm } from '@/features/platform-charm';
import { grantPioneer, revokePioneer } from '@/features/pioneer';
import { grantIzdivacAccess, revokeIzdivacAccess } from '@/features/izdivac';
import { IzdivacBadgeAdminSheet } from '@/features/izdivac/components/IzdivacBadgeAdminSheet';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { ROLE_LABELS } from '@/constants/roles';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { isAdminGuard, useAdminGuard } from '@/features/admin/hooks/useAdminGuard';
import type { UserRole } from '@/types/database';

const VISIBILITY_LABELS: Record<string, string> = {
  public: 'Herkese Açık',
  members: 'Sadece Üyeler',
  friends: 'Sadece Arkadaşlar',
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  personal: 'Bireysel',
  business: 'İşletme',
};

const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  frozen: 'Donmuş',
  quarantined: 'Acil Durum Kilidi',
  deletion_pending: 'Silme Bekliyor',
  deleted: 'Silinmiş',
};

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function accountStatusColor(status: string, colors: ReturnType<typeof useTheme>['colors']) {
  switch (status) {
    case 'quarantined':
      return colors.danger;
    case 'frozen':
    case 'deletion_pending':
      return colors.warning;
    case 'deleted':
      return colors.textMuted;
    default:
      return colors.success;
  }
}

function reportReasonLabel(reason: string) {
  return REPORT_REASONS.find((item) => item.id === reason)?.label ?? reason;
}

function formatInterestLabels(ids: unknown): string {
  if (!Array.isArray(ids) || ids.length === 0) return '—';
  return ids
    .map((id) => INTEREST_OPTIONS.find((option) => option.id === id)?.label ?? String(id))
    .join(', ');
}

function formatGender(value: unknown): string {
  if (typeof value !== 'string') return '—';
  return GENDER_OPTIONS.find((option) => option.id === value)?.label ?? value;
}

type UserDetailTab = 'profile' | 'devices' | 'activity';

const USER_DETAIL_TABS: { id: UserDetailTab; label: string }[] = [
  { id: 'profile', label: 'Profil' },
  { id: 'devices', label: 'Cihazlar' },
  { id: 'activity', label: 'Aktivite' },
];

export function AdminUserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const guard = useAdminGuard();
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [closeFriends, setCloseFriends] = useState<AdminCloseFriendRow[]>([]);
  const [reportsAgainst, setReportsAgainst] = useState<
    { id: string; reason: string; status: string; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<UserDetailTab>('profile');
  const [izdivacBadgeSheet, setIzdivacBadgeSheet] = useState(false);
  const [exportingData, setExportingData] = useState<'download' | 'print' | null>(null);
  const { presence, sessions, sessionsLoading, refreshLive } = useAdminUserDetailLive(id, Boolean(id));

  const load = async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const [{ data }, friends, reportsResult] = await Promise.all([
      fetchAdminUser(id),
      fetchAdminUserCloseFriends(id),
      fetchUserReportsAgainst(id),
    ]);
    setUser(data);
    setCloseFriends(friends);
    setReportsAgainst(reportsResult.data);
    if (isRefresh) void refreshLive();
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (!isAdminGuard(guard) && tab === 'activity') {
      setTab('profile');
    }
  }, [guard, tab]);

  const handleLiftBan = () => {
    if (!id) return;
    Alert.alert('Ban kaldır', `@${user?.username} banı kaldırılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        onPress: async () => {
          const { error } = await liftBan(id);
          if (error) Alert.alert('Hata', error);
          else {
            Alert.alert('Tamam', 'Ban kaldırıldı.');
            load(true);
          }
        },
      },
    ]);
  };

  const handleBan = (duration: BanDuration) => {
    if (!id) return;
    Alert.alert(BAN_DURATION_LABELS[duration], 'Bu kullanıcı banlansın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Banla',
        style: 'destructive',
        onPress: async () => {
          const { error } = await banUser(id, `Admin ban: ${BAN_DURATION_LABELS[duration]}`, duration);
          if (error) Alert.alert('Hata', error);
          else {
            Alert.alert('Banlandı');
            load(true);
          }
        },
      },
    ]);
  };

  const handleSuspend = () => {
    if (!id) return;
    Alert.alert('Askıya al', 'Hesap dondurulsun mu?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Askıya al',
        onPress: async () => {
          const { error } = await updateAccountStatus(id, 'frozen');
          if (error) Alert.alert('Hata', error);
          else load(true);
        },
      },
    ]);
  };

  const handleActivate = () => {
    if (!id) return;
    Alert.alert(
      'Hesabı aktif et',
      'Hesap yeniden etkinleştirilecek ve kullanıcıya "Hesabınız aktif edildi" bildirimi gönderilecek.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Aktif Et',
          onPress: async () => {
            const { error } = await adminReactivateAccount(id);
            if (error) Alert.alert('Hata', error);
            else load(true);
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    if (!id) return;
    Alert.alert(
      'Hesabı Kalıcı Sil',
      'Bu işlem geri alınamaz. Kullanıcı profili anonimleştirilir, içerikleri kaldırılır ve hesap platform tarafında silinmiş olarak işaretlenir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kalıcı Sil',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteUserAccountByPlatform(id);
            if (error) Alert.alert('Hata', error);
            else {
              Alert.alert('Silindi', 'Hesap platform tarafında kalıcı olarak silindi.');
              load(true);
            }
          },
        },
      ],
    );
  };

  const handleRemoveAllContent = () => {
    if (!id) return;
    Alert.alert(
      'Tüm içerikleri kaldır',
      'Bu kullanıcının tüm gönderi ve reelleri kaldırılacak. Devam edilsin mi?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            const { error, postsRemoved, reelsRemoved } = await removeAllUserContent(
              id,
              'Admin panelinden toplu içerik kaldırma',
            );
            if (error) Alert.alert('Hata', error);
            else {
              Alert.alert('Tamam', `${postsRemoved ?? 0} gönderi, ${reelsRemoved ?? 0} reel kaldırıldı.`);
              load(true);
            }
          },
        },
      ],
    );
  };

  const handleEmergencyQuarantine = () => {
    if (!id) return;
    const reason = emergencyReason.trim();
    if (!reason) {
      Alert.alert('Gerekçe gerekli', 'Acil durum kilidi için gerekçe yazın.');
      return;
    }
    Alert.alert(
      'ACİL DURUM KİLİDİ',
      'Tüm içerikler kaldırılacak, hesap kilitlenecek ve oturumlar sonlandırılacak. Onaylıyor musunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Acil Kilitle',
          style: 'destructive',
          onPress: async () => {
            const { error } = await emergencyQuarantineUser(id, reason);
            if (error) Alert.alert('Hata', error);
            else {
              setEmergencyReason('');
              Alert.alert('Kilitlendi', 'Hesap acil durum kilidine alındı.');
              load(true);
            }
          },
        },
      ],
    );
  };

  const handleReleaseQuarantine = () => {
    if (!id) return;
    Alert.alert(
      'Hesabı tekrar aktif et',
      'İnceleme tamamlandıysa hesap ve karantina sırasında kaldırılan içerikler geri yüklenecek.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Tekrar Aktif Et',
          onPress: async () => {
            const { error } = await releaseQuarantineUser(id, 'Admin inceleme sonrası aktifleştirme');
            if (error) Alert.alert('Hata', error);
            else load(true);
          },
        },
      ],
    );
  };

  const handleNewsVerification = (granted: boolean) => {
    if (!id || !isAdminGuard(guard)) return;
    Alert.alert(
      granted ? 'Haber doğrulama yetkisi ver' : 'Haber doğrulama yetkisini kaldır',
      granted
        ? 'Bu kullanıcı haber doğrulama yapabilecek.'
        : 'Bu kullanıcının haber doğrulama yetkisi kaldırılacak.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: granted ? 'Yetki Ver' : 'Kaldır',
          onPress: async () => {
            const { error } = await setNewsVerificationGranted(id, granted);
            if (error) Alert.alert('Hata', error);
            else load(true);
          },
        },
      ],
    );
  };

  const handleRole = (role: UserRole) => {
    if (!id || !isAdminGuard(guard)) return;
    Alert.alert('Rol değiştir', `${ROLE_LABELS[role]} rolü verilsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Onayla',
        onPress: async () => {
          const { error } = await updateUserRole(id, role);
          if (error) Alert.alert('Hata', error);
          else load(true);
        },
      },
    ]);
  };

  const handleMessage = () => {
    if (!id) return;
    Alert.prompt('Mesaj gönder', 'Kullanıcıya sistem mesajı', async (body) => {
      if (!body?.trim()) return;
      const { error } = await sendAdminMessage(id, 'Yönetim mesajı', body.trim());
      if (error) Alert.alert('Hata', error);
      else Alert.alert('Gönderildi');
    });
  };

  const handleRevokeAllSessions = () => {
    if (!id) return;
    Alert.alert('Tüm oturumları kapat', `@${user?.username} tüm cihazlardan çıkış yapsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kapat',
        style: 'destructive',
        onPress: async () => {
          const { error } = await revokeAllUserSessions(id);
          if (error) Alert.alert('Hata', error);
          else {
            Alert.alert('Tamam', 'Tüm oturumlar sonlandırıldı.');
            void refreshLive();
          }
        },
      },
    ]);
  };

  const handleGrantPlatformCharm = () => {
    if (!id) return;
    Alert.alert(
      'Vora İkonu ver',
      `@${user?.username} kullanıcısına platform ikon rozeti verilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Ver',
          onPress: async () => {
            const { error } = await grantPlatformCharm(id);
            if (error) Alert.alert('Hata', error);
            else {
              Alert.alert('Tamam', 'Vora İkonu rozeti verildi.');
              load(true);
            }
          },
        },
      ],
    );
  };

  const handleRevokePlatformCharm = () => {
    if (!id) return;
    Alert.alert(
      'Vora İkonu kaldır',
      `@${user?.username} kullanıcısından platform ikon rozeti kaldırılsın mı?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            const { error } = await revokePlatformCharm(id);
            if (error) Alert.alert('Hata', error);
            else {
              Alert.alert('Tamam', 'Vora İkonu rozeti kaldırıldı.');
              load(true);
            }
          },
        },
      ],
    );
  };

  const handleGrantPioneer = () => {
    if (!id) return;
    Alert.alert(
      'Öncü rozeti ver',
      `@${user?.username} kullanıcısına öncü rozeti verilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Ver',
          onPress: async () => {
            const { error } = await grantPioneer(id);
            if (error) Alert.alert('Hata', error);
            else {
              Alert.alert('Tamam', 'Öncü rozeti verildi.');
              load(true);
            }
          },
        },
      ],
    );
  };

  const handleRevokePioneer = () => {
    if (!id) return;
    Alert.alert(
      'Öncü rozeti kaldır',
      `@${user?.username} kullanıcısından öncü rozeti kaldırılsın mı?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            const { error } = await revokePioneer(id);
            if (error) Alert.alert('Hata', error);
            else {
              Alert.alert('Tamam', 'Öncü rozeti kaldırıldı.');
              load(true);
            }
          },
        },
      ],
    );
  };

  const handleGrantIzdivac = () => {
    if (!id) return;
    Alert.alert(
      'İzdivaç erişimi ver',
      `@${user?.username} kullanıcısına İzdivaç merkezi erişimi verilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Ver',
          onPress: async () => {
            const { error } = await grantIzdivacAccess(id);
            if (error) Alert.alert('Hata', error);
            else {
              Alert.alert('Tamam', 'İzdivaç erişimi açıldı.');
              load(true);
            }
          },
        },
      ],
    );
  };

  const handleRevokeIzdivac = () => {
    if (!id) return;
    Alert.alert(
      'İzdivaç erişimini kaldır',
      `@${user?.username} kullanıcısının İzdivaç erişimi kapatılsın mı?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            const { error } = await revokeIzdivacAccess(id);
            if (error) Alert.alert('Hata', error);
            else {
              Alert.alert('Tamam', 'İzdivaç erişimi kapatıldı.');
              load(true);
            }
          },
        },
      ],
    );
  };

  const handleExportUserData = async (mode: 'download' | 'print') => {
    if (!id || !user) return;
    const input: AccountReportInput = {
      userId: id,
      email: (user.email as string | null) ?? null,
      profile: {
        username: user.username as string | null,
        full_name: user.full_name as string | null,
        first_name: user.first_name as string | null,
        last_name: user.last_name as string | null,
        bio: user.bio as string | null,
        occupation: user.occupation as string | null,
        gender: user.gender as string | null,
        birth_date: user.birth_date as string | null,
        address: user.address as string | null,
        interests: Array.isArray(user.interests) ? (user.interests as string[]) : null,
        account_type: user.account_type as string | null,
        account_status: user.account_status as string | null,
        region_id: user.region_id as string | null,
        district: user.district as string | null,
        trust_score: user.trust_score as number | null,
        contribution_score: user.contribution_score as number | null,
        reporter_level: user.reporter_level as number | null,
        verified_content_count: user.verified_content_count as number | null,
        is_verified: user.is_verified as boolean | null,
        is_premium: user.is_premium as boolean | null,
        created_at: user.created_at as string | null,
        last_seen_at: user.last_seen_at as string | null,
      },
    };

    setExportingData(mode);
    const { error } =
      mode === 'download' ? await exportAccountDataPdf(input) : await printAccountData(input);
    setExportingData(null);
    if (error) Alert.alert('Hesap verisi', error);
  };

  const handleRemoveCloseFriend = (friend: AdminCloseFriendRow) => {
    if (!id) return;
    Alert.alert('Yakın arkadaşı kaldır', `@${friend.username} listeden çıkarılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          const { error } = await removeAdminCloseFriend(id, friend.friend_id);
          if (error) Alert.alert('Hata', error);
          else void load(true);
        },
      },
    ]);
  };

  if (loading || !user) {
    return (
      <AdminShell title="Kullanıcı" refreshing={refreshing} onRefresh={() => load(true)}>
        <AdminEmptyState loading={loading} />
      </AdminShell>
    );
  }

  const regionLabel = regionNameById(user.region_id as string) ?? '—';
  const locationLabel = [user.district, regionLabel !== '—' ? regionLabel : null].filter(Boolean).join(', ') || '—';
  const ibanDisplay =
    typeof user.iban === 'string' && user.iban ? formatIbanInput(user.iban) : '—';
  const trustScore = Number(user.trust_score ?? 0);
  const hasReporterRole = REPORTER_ROLES.includes(user.role as (typeof REPORTER_ROLES)[number]);
  const newsVerificationGranted = Boolean(user.news_verification_granted);
  const isQuarantined = user.account_status === 'quarantined';
  const canVerifyNews = hasReporterRole || newsVerificationGranted;
  const verificationStatusLabel = hasReporterRole
    ? 'Aktif (muhabir / moderatör rolü)'
    : newsVerificationGranted
      ? trustScore >= 70
        ? 'Aktif (70+ güven puanı)'
        : 'Aktif (admin yetkisi)'
      : trustScore >= 70
        ? 'Bekliyor (70 puan — senkron gerekli)'
        : 'Pasif';

  const accountStatus = String(user.account_status);
  const statusAccent = accountStatusColor(accountStatus, colors);
  const statusLabel = ACCOUNT_STATUS_LABELS[accountStatus] ?? accountStatus;
  const isDeleted = accountStatus === 'deleted';
  const isPlatformCharm = Boolean(user.is_platform_charm);
  const isPioneer = Boolean(user.is_pioneer);
  const isIzdivacGranted = Boolean(user.izdivac_access_granted);
  const isAdmin = isAdminGuard(guard);
  const visibleTabs = isAdmin ? USER_DETAIL_TABS : USER_DETAIL_TABS.filter((item) => item.id !== 'activity');

  return (
    <AdminShell
      title={`@${user.username as string}`}
      subtitle="Canlı profil, cihazlar ve yönetim"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <AdminUserDetailHero
        user={user}
        presence={presence}
        reportsAgainstCount={reportsAgainst.length}
        regionLabel={regionLabel}
        statusLabel={statusLabel}
        statusAccent={statusAccent}
        isDeleted={isDeleted}
        isPlatformCharm={isPlatformCharm}
        isPioneer={isPioneer}
        showAdminActions={isAdmin}
        onViewProfile={() => router.push(`/u/${user.username as string}` as never)}
        onEditProfile={isAdmin ? () => router.push(`/admin/users/edit/${id}` as never) : undefined}
        onMessage={handleMessage}
        onLifecycle={isAdmin ? () => router.push('/admin/account-lifecycle' as never) : undefined}
      />

      <AdminFilterChip options={visibleTabs} value={tab} onChange={setTab} />

      {tab === 'devices' ? (
        <AdminUserDevicesPanel
          embedded
          sessions={sessions}
          loading={sessionsLoading}
          canRevoke={isAdmin}
          onSessionsChange={() => void refreshLive()}
        />
      ) : null}

      {tab === 'activity' && id ? <AdminUserActivityPanel userId={id} /> : null}

      {tab === 'profile' ? (
        <>
          <AdminUserCollapsibleSection title="Kişisel bilgiler" icon="person-outline" defaultOpen>
            <AdminUserInfoRow label="Ad" value={user.first_name} />
            <AdminUserInfoRow label="Soyad" value={user.last_name} />
            <AdminUserInfoRow label="Tam ad" value={user.full_name} />
            <AdminUserInfoRow label="Kullanıcı adı" value={`@${user.username as string}`} />
            <AdminUserInfoRow label="Hesap tipi" value={ACCOUNT_TYPE_LABELS[user.account_type as string]} />
            <AdminUserInfoRow label="Cinsiyet" value={formatGender(user.gender)} />
            <AdminUserInfoRow
              label="Doğum tarihi"
              value={isoToDisplayBirthDate(user.birth_date as string | null)}
            />
            <AdminUserInfoRow label="Misafir hesap" value={user.is_guest} />
            <AdminUserInfoRow label="Premium" value={user.is_premium} />
            <AdminUserInfoRow label="Doğrulanmış" value={user.is_verified} />
            <AdminUserInfoRow label="Vora İkonu" value={isPlatformCharm} />
            <AdminUserInfoRow label="Öncü" value={isPioneer} />
          </AdminUserCollapsibleSection>

          <AdminUserCollapsibleSection title="İletişim ve ödeme" icon="card-outline">
            <AdminUserInfoRow label="E-posta" value={user.email} />
            <AdminUserInfoRow label="Adres" value={user.address} />
            <AdminUserInfoRow label="IBAN" value={ibanDisplay} />
            <AdminUserInfoRow label="Banka adı" value={user.bank_name} />
            <AdminUserInfoRow label="Hesap sahibi" value={user.bank_account_name} />
          </AdminUserCollapsibleSection>

          <AdminUserCollapsibleSection title="Konum" icon="location-outline">
            <AdminUserInfoRow label="Şehir" value={regionLabel} />
            <AdminUserInfoRow label="İlçe" value={user.district} />
            <AdminUserInfoRow label="Konum özeti" value={locationLabel} />
          </AdminUserCollapsibleSection>

          <AdminUserCollapsibleSection title="Profil içeriği" icon="document-text-outline">
            <AdminUserInfoRow label="Biyografi" value={user.bio} />
            <AdminUserInfoRow label="Meslek / ilgi alanı" value={user.occupation} />
            <AdminUserInfoRow label="İlgi alanları" value={formatInterestLabels(user.interests)} />
          </AdminUserCollapsibleSection>

          <AdminUserCollapsibleSection title="Gizlilik" icon="lock-closed-outline">
            <AdminUserInfoRow
              label="Profil görünürlüğü"
              value={VISIBILITY_LABELS[user.profile_visibility as string]}
            />
            <AdminUserInfoRow label="Profil görüntülenmeleri" value={user.show_profile_views} />
            <AdminUserInfoRow label="Beğenilenler görünür" value={user.show_liked_posts} />
          </AdminUserCollapsibleSection>

          <AdminUserCollapsibleSection title="Hesap özeti" icon="stats-chart-outline">
            <AdminUserInfoRow label="Rapor sayısı (gönderdiği)" value={user.report_count} />
            <AdminUserInfoRow label="Güven puanı" value={`${trustScore}/${TRUST_SCORE_MAX}`} />
            {user.deletion_requested_at ? (
              <AdminUserInfoRow label="Silme talebi" value={formatDateTime(user.deletion_requested_at as string)} />
            ) : null}
            {isQuarantined && user.quarantine_reason ? (
              <AdminUserInfoRow label="Karantina gerekçesi" value={user.quarantine_reason} />
            ) : null}
          </AdminUserCollapsibleSection>

          {reportsAgainst.length > 0 ? (
            <>
              <AdminSectionHeader title="Kullanıcıya yapılan şikayetler" hint={`${reportsAgainst.length} kayıt`} />
              {reportsAgainst.slice(0, 10).map((report) => (
                <GlassCard key={report.id} style={styles.reportCard}>
                  <View style={styles.reportTop}>
                    <Text variant="label">{reportReasonLabel(report.reason)}</Text>
                    <Text variant="caption" muted>
                      {report.status}
                    </Text>
                  </View>
                  <Text secondary variant="caption">
                    {formatDateTime(report.created_at)}
                  </Text>
                </GlassCard>
              ))}
            </>
          ) : null}

          {isAdmin ? (
            <>
              <AdminSectionHeader title="Yakın arkadaşlar" />
          {closeFriends.length === 0 ? (
            <GlassCard>
              <Text secondary variant="caption">Yakın arkadaş listesi boş.</Text>
            </GlassCard>
          ) : (
            closeFriends.map((friend) => (
              <GlassCard key={friend.friend_id} style={styles.friendCard}>
                <View style={styles.avatarWrap}>
                  <ProfileAvatar username={friend.username} avatarUrl={null} size={36} />
                </View>
                <View style={styles.friendCopy}>
                  <Text variant="label" numberOfLines={1}>
                    @{friend.username}
                  </Text>
                  <Text secondary variant="caption" numberOfLines={1}>
                    {friend.full_name ?? '—'} · {new Date(friend.created_at).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
                <AdminActionChip
                  compact
                  label="Kaldır"
                  icon="close-outline"
                  tone="danger"
                  onPress={() => handleRemoveCloseFriend(friend)}
                />
              </GlassCard>
            ))
          )}

          <AdminSectionHeader title="Yönetim işlemleri" hint="Ban, rol ve acil müdahale" />

          <AdminTrustScorePanel
            userId={id!}
            trustScore={trustScore}
            contributionScore={Number(user.contribution_score ?? 0)}
            onUpdated={() => load(true)}
          />

          <GlassCard style={styles.card}>
            <Text variant="label">Hesap verisi (PDF)</Text>
            <Text secondary variant="caption">
              Kullanıcının profilini, etkinlik özetini ve tüm işlem geçmişini PDF olarak çıkar.
            </Text>
            <View style={styles.actions}>
              <AdminActionChip
                compact
                label={exportingData === 'download' ? 'Hazırlanıyor…' : 'Veri PDF indir'}
                icon="download-outline"
                tone="primary"
                onPress={() => handleExportUserData('download')}
                disabled={exportingData !== null}
              />
              <AdminActionChip
                compact
                label={exportingData === 'print' ? 'Yazdırılıyor…' : 'Yazdır'}
                icon="print-outline"
                tone="default"
                onPress={() => handleExportUserData('print')}
                disabled={exportingData !== null}
              />
            </View>
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text variant="label">Hesap durumu</Text>
            <View style={styles.actions}>
              <AdminActionChip compact label="Askıya al" icon="pause-circle-outline" tone="warning" onPress={handleSuspend} />
              <AdminActionChip compact label="Aktifleştir" icon="checkmark-circle-outline" tone="success" onPress={handleActivate} />
              <AdminActionChip
                compact
                label="Oturum kapat"
                icon="log-out-outline"
                tone="warning"
                onPress={handleRevokeAllSessions}
              />
              {user.account_status !== 'deleted' ? (
                <AdminActionChip
                  compact
                  label="Hesabı sil"
                  icon="trash-outline"
                  tone="danger"
                  onPress={handleDeleteAccount}
                />
              ) : null}
            </View>
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text variant="label">Ban işlemleri</Text>
            <View style={styles.actions}>
              {(Object.keys(BAN_DURATION_LABELS) as BanDuration[]).map((d) => (
                <AdminActionChip
                  key={d}
                  compact
                  label={BAN_DURATION_LABELS[d]}
                  icon="ban-outline"
                  tone="danger"
                  onPress={() => handleBan(d)}
                />
              ))}
              <AdminActionChip
                compact
                label="Ban kaldır"
                icon="checkmark-circle-outline"
                tone="success"
                onPress={handleLiftBan}
              />
            </View>
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text variant="label">Acil durum müdahalesi</Text>
            <Text secondary variant="caption">
              {isQuarantined ? 'Acil durum kilidi aktif' : 'Hesap normal durumda'}
            </Text>
            {isQuarantined && user.quarantine_reason ? (
              <Text secondary variant="caption">
                Gerekçe: {String(user.quarantine_reason)}
              </Text>
            ) : null}
            <AdminFormField
              label="Acil durum gerekçesi"
              placeholder="Yanlış haber / topluluk güvenliği / acil inceleme..."
              value={emergencyReason}
              onChangeText={setEmergencyReason}
            />
            <View style={styles.actions}>
              <AdminActionChip
                compact
                label="Acil kilitle"
                icon="lock-closed"
                tone="danger"
                onPress={handleEmergencyQuarantine}
                disabled={isQuarantined}
              />
              <AdminActionChip
                compact
                label="Tekrar aktif"
                icon="lock-open-outline"
                tone="success"
                onPress={handleReleaseQuarantine}
                disabled={!isQuarantined}
              />
              <AdminActionChip
                compact
                label="İçerik kaldır"
                icon="trash-outline"
                tone="warning"
                onPress={handleRemoveAllContent}
              />
            </View>
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text variant="label">Vora İkonu</Text>
            <Text secondary variant="caption">
              {isPlatformCharm
                ? 'Kullanıcıda platform ikon rozeti aktif.'
                : 'Kullanıcıda platform ikon rozeti yok.'}
            </Text>
            <View style={styles.actions}>
              <AdminActionChip
                compact
                label="Rozet ver"
                icon="sparkles-outline"
                tone="primary"
                onPress={handleGrantPlatformCharm}
                disabled={isPlatformCharm || isDeleted}
              />
              <AdminActionChip
                compact
                label="Rozeti kaldır"
                icon="close-circle-outline"
                tone="danger"
                onPress={handleRevokePlatformCharm}
                disabled={!isPlatformCharm || isDeleted}
              />
            </View>
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text variant="label">Öncü</Text>
            <Text secondary variant="caption">
              {isPioneer
                ? 'Kullanıcıda öncü rozeti aktif. Topluluk rehberliği ve bilgilendirme görevini temsil eder.'
                : 'Kullanıcıda öncü rozeti yok.'}
            </Text>
            <View style={styles.actions}>
              <AdminActionChip
                compact
                label="Rozet ver"
                icon="compass-outline"
                tone="primary"
                onPress={handleGrantPioneer}
                disabled={isPioneer || isDeleted}
              />
              <AdminActionChip
                compact
                label="Rozeti kaldır"
                icon="close-circle-outline"
                tone="danger"
                onPress={handleRevokePioneer}
                disabled={!isPioneer || isDeleted}
              />
            </View>
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text variant="label">İzdivaç</Text>
            <Text secondary variant="caption">
              {isIzdivacGranted
                ? 'Kullanıcı İzdivaç merkezine girebilir. Merkezler sekmesinde buton görünür.'
                : 'Kullanıcının İzdivaç merkezi erişimi yok.'}
            </Text>
            <View style={styles.actions}>
              <AdminActionChip
                compact
                label="Erişim ver"
                icon="heart-half-outline"
                tone="primary"
                onPress={handleGrantIzdivac}
                disabled={isIzdivacGranted || isDeleted}
              />
              <AdminActionChip
                compact
                label="Erişimi kaldır"
                icon="close-circle-outline"
                tone="danger"
                onPress={handleRevokeIzdivac}
                disabled={!isIzdivacGranted || isDeleted}
              />
            </View>
            <Text secondary variant="caption" style={{ marginTop: spacing.xs }}>
              Jigolo, Tilki ve Finansman tiklerini yönetin. Bu tikler normal tiktir; İzdivaç
              erişiminden bağımsız olarak her zaman görünür.
            </Text>
            <View style={styles.actions}>
              <AdminActionChip
                compact
                label="Tikler (Jigolo / Tilki / Finansman)"
                icon="ribbon-outline"
                tone="default"
                onPress={() => setIzdivacBadgeSheet(true)}
                disabled={isDeleted}
              />
            </View>
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text variant="label">Haber doğrulama</Text>
            <Text secondary variant="caption">{verificationStatusLabel}</Text>
            {!hasReporterRole ? (
              <View style={styles.actions}>
                <AdminActionChip
                  compact
                  label="Yetki ver"
                  icon="shield-checkmark-outline"
                  tone="success"
                  onPress={() => handleNewsVerification(true)}
                />
                <AdminActionChip
                  compact
                  label="Yetkiyi kaldır"
                  icon="shield-outline"
                  tone="danger"
                  onPress={() => handleNewsVerification(false)}
                  disabled={!canVerifyNews}
                />
              </View>
            ) : (
              <Text secondary variant="caption">
                Muhabir veya moderatör rolü haber doğrulama yetkisini kapsar.
              </Text>
            )}
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text variant="label">Rol atama</Text>
            <View style={styles.roleRow}>
              {ASSIGNABLE_ROLES.map((role) => (
                <AdminRolePill
                  key={role}
                  role={role}
                  selected={user.role === role}
                  onPress={() => handleRole(role)}
                />
              ))}
            </View>
          </GlassCard>
            </>
          ) : null}
        </>
      ) : null}

      <IzdivacBadgeAdminSheet
        visible={izdivacBadgeSheet}
        userId={id ?? null}
        username={(user.username as string) ?? null}
        onClose={() => setIzdivacBadgeSheet(false)}
      />
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  avatarWrap: {
    flexShrink: 0,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  friendCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  reportCard: { gap: spacing.xs },
  reportTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  card: { gap: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
