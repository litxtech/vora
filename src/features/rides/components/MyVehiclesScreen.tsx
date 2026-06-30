import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import {
  registerVehicleAddPath,
  registerVehicleEditPath,
  RIDES_ACCENT,
  RIDES_GRADIENT,
  VEHICLE_TYPE_OPTIONS,
  VEHICLE_VERIFICATION_LABELS,
} from '@/features/rides/constants';
import { deactivateVehicle, fetchUserVehicles } from '@/features/rides/services/vehicleData';
import type { RideVehicle, RideVehicleVerificationStatus } from '@/features/rides/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const STATUS_COLORS: Record<RideVehicleVerificationStatus, string> = {
  pending: '#FFB300',
  approved: '#43A047',
  rejected: '#EF5350',
};

function StatChip({ label, value, accent }: { label: string; value: number; accent?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: `${colors.surface}CC`, borderColor: colors.border }]}>
      <Text variant="h3" style={{ color: accent ?? RIDES_ACCENT, fontWeight: '800' }}>
        {value}
      </Text>
      <Text secondary variant="caption">
        {label}
      </Text>
    </View>
  );
}

function VehicleCard({
  vehicle,
  onEdit,
  onDelete,
  deleting,
}: {
  vehicle: RideVehicle;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const { colors } = useTheme();
  const typeLabel = VEHICLE_TYPE_OPTIONS.find((o) => o.id === vehicle.vehicleType)?.label ?? vehicle.vehicleType;
  const statusColor = STATUS_COLORS[vehicle.verificationStatus];

  return (
    <GlassCard style={[styles.card, { borderColor: `${RIDES_ACCENT}28` }]}>
      <View style={styles.cardMedia}>
        {vehicle.coverUrl ? (
          <Image source={{ uri: vehicle.coverUrl }} style={styles.cover} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[`${RIDES_GRADIENT[0]}33`, `${RIDES_GRADIENT[1]}22`]}
            style={[styles.cover, styles.coverEmpty]}
          >
            <Ionicons name="car-sport" size={40} color={RIDES_ACCENT} />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.72)']}
          style={styles.coverOverlay}
        >
          <View style={styles.coverMeta}>
            <Text style={styles.coverTitle} numberOfLines={1}>
              {vehicle.brand} {vehicle.model}
            </Text>
            <Text style={styles.coverSub} numberOfLines={1}>
              {vehicle.year ? `${vehicle.year} · ` : ''}
              {typeLabel}
            </Text>
          </View>
        </LinearGradient>
        <View style={[styles.statusPill, { backgroundColor: `${statusColor}EE` }]}>
          <Text style={styles.statusPillText}>{VEHICLE_VERIFICATION_LABELS[vehicle.verificationStatus]}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.detailRow}>
          <View style={[styles.plate, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
            <Text style={styles.plateText}>{vehicle.plate}</Text>
          </View>
          <View style={styles.detailMeta}>
            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={14} color={colors.textMuted} />
              <Text secondary variant="caption">
                {vehicle.seatsTotal} koltuk
              </Text>
            </View>
            {vehicle.color ? (
              <View style={styles.detailItem}>
                <Ionicons name="color-palette-outline" size={14} color={colors.textMuted} />
                <Text secondary variant="caption">
                  {vehicle.color}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onEdit}
            style={[styles.actionBtn, styles.editBtn, { borderColor: `${RIDES_ACCENT}55`, backgroundColor: `${RIDES_ACCENT}12` }]}
          >
            <Ionicons name="create-outline" size={16} color={RIDES_ACCENT} />
            <Text variant="caption" style={{ color: RIDES_ACCENT, fontWeight: '700' }}>
              Düzenle
            </Text>
          </Pressable>
          <Pressable
            onPress={onDelete}
            disabled={deleting}
            style={[styles.actionBtn, styles.deleteBtn, { borderColor: `${colors.danger}44`, backgroundColor: `${colors.danger}10` }]}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text variant="caption" style={{ color: colors.danger, fontWeight: '700' }}>
                  Sil
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </GlassCard>
  );
}

export function MyVehiclesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<RideVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const rows = await fetchUserVehicles(user.id);
    setVehicles(rows);
    setLoading(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleDelete = (vehicle: RideVehicle) => {
    Alert.alert(
      'Aracı sil',
      `${vehicle.brand} ${vehicle.model} (${vehicle.plate}) listeden kaldırılacak.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            setDeletingId(vehicle.id);
            const { error } = await deactivateVehicle(vehicle.id, user.id);
            setDeletingId(null);
            if (error) {
              Alert.alert('Hata', error);
              return;
            }
            setVehicles((prev) => prev.filter((v) => v.id !== vehicle.id));
          },
        },
      ],
    );
  };

  const approvedCount = vehicles.filter((v) => v.verificationStatus === 'approved').length;
  const pendingCount = vehicles.filter((v) => v.verificationStatus === 'pending').length;

  return (
    <GradientBackground>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={RIDES_ACCENT} />
        }
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.push(registerVehicleAddPath() as never)}
            style={[styles.addBtn, { backgroundColor: RIDES_ACCENT }]}
            hitSlop={8}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
          <ScreenBackButton style={styles.backBtn} />
          <View style={styles.topTitles}>
            <Text variant="h2" style={styles.pageTitle}>
              Araçlarım
            </Text>
            <Text secondary variant="caption">
              Yolculuk paylaşımı için kayıtlı araçlarınız
            </Text>
          </View>
        </View>

        <LinearGradient
          colors={[`${RIDES_GRADIENT[0]}28`, `${RIDES_GRADIENT[1]}14`, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { borderColor: `${RIDES_ACCENT}33` }]}
        >
          <View style={styles.heroIcon}>
            <Ionicons name="car-sport" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label" style={{ fontWeight: '800' }}>
              Garajınız
            </Text>
            <Text secondary variant="caption">
              Onaylı araçlarla yolculuk paylaşabilirsiniz
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.chips}>
          <StatChip label="Toplam" value={vehicles.length} />
          <StatChip label="Onaylı" value={approvedCount} accent="#43A047" />
          <StatChip label="Bekleyen" value={pendingCount} accent="#FFB300" />
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator color={RIDES_ACCENT} style={{ marginTop: spacing.xl }} />
        ) : vehicles.length === 0 ? (
          <GlassCard style={styles.empty}>
            <LinearGradient colors={[RIDES_GRADIENT[0], RIDES_GRADIENT[1]]} style={styles.emptyIcon}>
              <Ionicons name="car-outline" size={28} color="#fff" />
            </LinearGradient>
            <Text variant="label" style={{ fontWeight: '800' }}>
              Garajınız boş
            </Text>
            <Text secondary variant="caption" style={styles.emptyHint}>
              Sol üstteki + ile araç ekleyin. Admin onayından sonra yolculuk paylaşabilirsiniz.
            </Text>
            <Pressable
              onPress={() => router.push(registerVehicleAddPath() as never)}
              style={[styles.emptyCta, { backgroundColor: RIDES_ACCENT }]}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text variant="label" style={{ color: '#fff' }}>
                İlk aracı ekle
              </Text>
            </Pressable>
          </GlassCard>
        ) : (
          <View style={styles.list}>
            <Text variant="label" style={styles.listTitle}>
              Kayıtlı araçlar
            </Text>
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onEdit={() => router.push(registerVehicleEditPath(vehicle.id) as never)}
                onDelete={() => handleDelete(vehicle)}
                deleting={deletingId === vehicle.id}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing.lg, gap: spacing.md },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: RIDES_ACCENT,
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  backBtn: { marginTop: 9 },
  topTitles: { flex: 1, gap: 2, paddingTop: 2 },
  pageTitle: { letterSpacing: -0.3, fontWeight: '800' },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: RIDES_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyHint: { textAlign: 'center', lineHeight: 18 },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  list: { gap: spacing.md },
  listTitle: { marginLeft: spacing.xs, letterSpacing: 0.2 },
  card: { overflow: 'hidden', padding: 0, gap: 0 },
  cardMedia: { position: 'relative' },
  cover: { width: '100%', height: 176 },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },
  coverOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 88,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  coverMeta: { gap: 2 },
  coverTitle: { color: '#fff', fontWeight: '800', fontSize: 17, letterSpacing: -0.2 },
  coverSub: { color: 'rgba(255,255,255,0.88)', fontSize: 12 },
  statusPill: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  statusPillText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  cardBody: { padding: spacing.md, gap: spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  plate: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  plateText: { fontWeight: '900', letterSpacing: 1, fontSize: 13 },
  detailMeta: { flex: 1, gap: spacing.xs },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  editBtn: {},
  deleteBtn: {},
});
