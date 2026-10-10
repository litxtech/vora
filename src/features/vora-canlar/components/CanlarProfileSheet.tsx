import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { CanlarCaseVisual, CanlarEmptyState } from '@/features/vora-canlar/components/canlarUi';
import { CANLAR_ACCENT, formatMinor } from '@/features/vora-canlar/constants';
import { loadContributionStats } from '@/features/vora-canlar/services/api';
import { listMyCases, type OwnCase } from '@/features/vora-canlar/services/plainLanguage';
import { useCloseModalOnRouteChange } from '@/hooks/useCloseModalOnRouteChange';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type Stats = {
  animals_supported: number | null;
  verified_rescues: number | null;
  donation_net_of_refunds_minor: number | null;
  in_kind_count: number | null;
  volunteer_count: number | null;
};

export function CanlarProfileBody({ onNavigate }: { onNavigate?: () => void }) {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [cases, setCases] = useState<OwnCase[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void loadContributionStats(user.id).then((result) => {
      if (result.error) setError(result.error);
      if (result.data) setStats(result.data as unknown as Stats);
    });
    void listMyCases(user.id).then(setCases);
  }, [user]);

  const go = (href: string) => {
    onNavigate?.();
    router.push(href as never);
  };

  if (!user) {
    return (
      <CanlarEmptyState
        title="Giriş gerekli"
        body="Katkılarınızı görmek için hesabınıza girin."
        action="Giriş"
        onAction={() => go('/(auth)/login')}
      />
    );
  }

  const tiles = [
    ['Desteklediğim hayvan', stats?.animals_supported],
    ['Kurtarma', stats?.verified_rescues],
    ['Mama ve malzeme', stats?.in_kind_count],
    ['Gönüllülük', stats?.volunteer_count],
  ] as const;

  return (
    <View style={styles.body}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.identity}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={28} color={CANLAR_ACCENT} />
            </View>
          )}
          <View style={styles.identityCopy}>
            <Text style={styles.name}>{profile?.username ? `@${profile.username}` : 'Hesabınız'}</Text>
            <Text secondary>Verdiğin yardım burada.</Text>
          </View>
        </View>
      </View>
      <Text style={styles.section}>Yardımlarım</Text>
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <View style={styles.tiles}>
        {tiles.map(([label, value]) => (
          <View key={label} style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.tileValue}>{value == null ? 'Gizli' : String(value)}</Text>
            <Text secondary>{label}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text secondary>Verdiğim bağış</Text>
        <Text style={styles.tileValue}>
          {stats?.donation_net_of_refunds_minor == null ? 'Gizli' : formatMinor(stats.donation_net_of_refunds_minor)}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => go('/vora-canlar/privacy')}
        style={({ pressed }) => [styles.settings, { opacity: pressed ? 0.86 : 1 }]}
      >
        <Ionicons name="settings-outline" size={16} color="#fff" />
        <Text style={styles.settingsLabel}>Ayarlar ve gizlilik</Text>
      </Pressable>
      {cases.length > 0 ? <Text style={styles.section}>Kayıtlı dosyalar</Text> : null}
      {cases.map((row) => (
        <CanlarCaseVisual
          key={row.id}
          compact
          row={{ id: row.id, name: row.name, city_label: row.city_label, public_code: row.public_code }}
          onPress={() => go(`/vora-canlar/case/${row.id}`)}
        />
      ))}
    </View>
  );
}

export function CanlarProfileSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  useCloseModalOnRouteChange(visible, onClose);

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Kapat">
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, spacing.md) }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.header}>
            <Text style={styles.title}>Profilim</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Kapat" onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            <CanlarProfileBody onNavigate={onClose} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: radius.full },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  title: { fontSize: 18, fontWeight: '800' },
  scroll: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  body: { gap: spacing.lg },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: spacing.md,
    gap: spacing.sm,
  },
  identity: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 22 },
  avatarFallback: { backgroundColor: `${CANLAR_ACCENT}22`, alignItems: 'center', justifyContent: 'center' },
  identityCopy: { flex: 1, gap: 2 },
  name: { fontSize: 20, fontWeight: '800' },
  section: { fontWeight: '800', fontSize: 18 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    gap: 4,
  },
  tileValue: { fontSize: 22, fontWeight: '800' },
  settings: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: CANLAR_ACCENT,
    borderRadius: radius.lg,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
  },
  settingsLabel: { color: '#fff', fontWeight: '800' },
});
