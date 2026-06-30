import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { GlassCard } from '@/components/ui/GlassCard';
import { RegionDistrictPicker } from '@/components/location/RegionDistrictPicker';
import { BUSINESS_ROUTES } from '@/features/business-center/constants';
import { EditProfileSection } from '@/features/profile/components/EditProfileSection';
import { BusinessVerifiedTick } from '@/features/profile/components/BusinessVerifiedTick';
import { BUSINESS_VERIFIED_COLOR } from '@/features/profile/services/businessIdentity';
import {
  updateBusinessBranding,
  uploadBusinessCover,
  uploadBusinessLogo,
} from '@/features/profile/services/businessBranding';
import { fetchBusinessRecordByOwner, type BusinessProfile } from '@/features/profile/services/businessProfile';
import type { RegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type BusinessBrandingDraft = {
  businessId: string;
  businessName: string;
  description: string;
  phone: string;
  website: string;
  address: string;
  district: string | null;
  regionId: RegionId;
  logoUri: string | null;
  coverUri: string | null;
};

type Props = {
  draft: BusinessBrandingDraft | null;
  setDraft: Dispatch<SetStateAction<BusinessBrandingDraft | null>>;
  record: BusinessProfile | null;
  loading: boolean;
  onPickLogo?: () => void;
  onPickCover?: () => void;
};

export function useBusinessBrandingDraft(ownerId: string | undefined) {
  const [draft, setDraft] = useState<BusinessBrandingDraft | null>(null);
  const [record, setRecord] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) {
      setLoading(false);
      return;
    }
    fetchBusinessRecordByOwner(ownerId).then((biz) => {
      setRecord(biz);
      if (!biz) {
        setDraft(null);
        setLoading(false);
        return;
      }
      const next: BusinessBrandingDraft = {
        businessId: biz.id,
        businessName: biz.name,
        description: biz.description ?? '',
        phone: biz.phone ?? '',
        website: biz.website ?? '',
        address: biz.address ?? '',
        district: biz.district,
        regionId: biz.regionId as RegionId,
        logoUri: biz.logoUrl,
        coverUri: biz.coverUrl,
      };
      setDraft(next);
      setLoading(false);
    });
  }, [ownerId]);

  return { draft, setDraft, record, loading };
}

export async function saveBusinessBrandingDraft(
  ownerId: string,
  draft: BusinessBrandingDraft,
  previous: BusinessProfile | null,
): Promise<{ error: string | null }> {
  if (!draft.businessName.trim()) {
    return { error: 'İşletme adı zorunludur.' };
  }

  let logoUrl = previous?.logoUrl ?? null;
  let coverUrl = previous?.coverUrl ?? null;

  if (draft.logoUri !== previous?.logoUrl) {
    if (!draft.logoUri) logoUrl = null;
    else if (!draft.logoUri.startsWith('http')) {
      const uploaded = await uploadBusinessLogo(ownerId, draft.logoUri);
      if (uploaded.error) return { error: uploaded.error };
      logoUrl = uploaded.url;
    } else logoUrl = draft.logoUri;
  }

  if (draft.coverUri !== previous?.coverUrl) {
    if (!draft.coverUri) coverUrl = null;
    else if (!draft.coverUri.startsWith('http')) {
      const uploaded = await uploadBusinessCover(ownerId, draft.coverUri);
      if (uploaded.error) return { error: uploaded.error };
      coverUrl = uploaded.url;
    } else coverUrl = draft.coverUri;
  }

  return updateBusinessBranding(draft.businessId, ownerId, {
    name: draft.businessName,
    description: draft.description.trim() || null,
    phone: draft.phone.trim() || null,
    website: draft.website.trim() || null,
    address: draft.address.trim() || null,
    district: draft.district,
    logoUrl,
    coverUrl,
  });
}

export function EditBusinessProfileSection({
  draft,
  setDraft,
  record,
  loading,
  onPickLogo,
  onPickCover,
}: Props) {
  const { colors } = useTheme();

  const patch = (partial: Partial<BusinessBrandingDraft>) => {
    setDraft((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  if (loading) return null;

  if (!draft || !record) {
    return (
      <GlassCard style={styles.pendingCard}>
        <Ionicons name="hourglass-outline" size={22} color={BUSINESS_VERIFIED_COLOR} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="label">Kurumsal onay bekleniyor</Text>
          <Text secondary variant="caption">
            Onay sonrası işletme adınız ve sarı tik profilinizde görünecek.
          </Text>
        </View>
        <Pressable onPress={() => router.push('/business-center/pending' as never)}>
          <Text variant="caption" style={{ color: BUSINESS_VERIFIED_COLOR, fontWeight: '700' }}>
            Durumu gör
          </Text>
        </Pressable>
      </GlassCard>
    );
  }

  const statusLabel =
    record.registrationStatus === 'approved'
      ? 'Onaylı kurumsal hesap'
      : record.registrationStatus === 'rejected'
        ? 'Başvuru reddedildi'
        : 'Onay bekleniyor';

  return (
    <>
      <LinearGradient
        colors={[`${BUSINESS_VERIFIED_COLOR}33`, `${colors.surface}00`]}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Ionicons name="storefront" size={14} color={BUSINESS_VERIFIED_COLOR} />
            <Text variant="caption" style={{ color: BUSINESS_VERIFIED_COLOR, fontWeight: '800' }}>
              Kurumsal kimlik
            </Text>
          </View>
          {record.registrationStatus === 'approved' ? <BusinessVerifiedTick showLabel /> : null}
        </View>
        <Text variant="h3">{draft.businessName}</Text>
        <Text secondary variant="caption">
          {statusLabel} · Kullanıcılara görünen ad işletme ünvanıdır
        </Text>
      </LinearGradient>

      <EditProfileSection icon="storefront-outline" title="Herkese açık işletme bilgileri">
        <Text secondary variant="caption" style={styles.hint}>
          Bu bilgiler profilinizde, akışta ve mağazada işletme adı olarak görünür.
        </Text>
        <Input
          label="İşletme adı (görünen ad)"
          value={draft.businessName}
          onChangeText={(v) => patch({ businessName: v })}
          placeholder="Örn: Karadeniz Butik Otel"
          autoCapitalize="words"
        />
        <Input
          label="Kısa tanıtım"
          value={draft.description}
          onChangeText={(v) => patch({ description: v })}
          placeholder="Müşterilerin göreceği işletme açıklaması"
          multiline
          numberOfLines={4}
          style={styles.textArea}
        />
        <Input
          label="İşletme telefonu"
          value={draft.phone}
          onChangeText={(v) => patch({ phone: v })}
          keyboardType="phone-pad"
        />
        <Input
          label="Web sitesi"
          value={draft.website}
          onChangeText={(v) => patch({ website: v })}
          autoCapitalize="none"
        />
        <Input
          label="İşletme adresi"
          value={draft.address}
          onChangeText={(v) => patch({ address: v })}
          multiline
          numberOfLines={2}
          style={styles.textArea}
        />
        <RegionDistrictPicker
          regionId={draft.regionId}
          district={draft.district}
          onRegionChange={(id) => patch({ regionId: id })}
          onDistrictChange={(d) => patch({ district: d })}
        />
        <View style={styles.mediaBlock}>
          <Text variant="label">Logo & kapak</Text>
          <Text secondary variant="caption">
            Galeriden seçip kırpabilirsiniz. Üstteki önizleme ile aynı akıştır.
          </Text>
          <View style={styles.mediaRow}>
            <Pressable
              style={[styles.mediaBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
              onPress={() => {
                onPickLogo?.();
              }}
            >
              {draft.logoUri ? (
                <Image source={{ uri: draft.logoUri }} style={styles.mediaPreview} resizeMode="contain" />
              ) : (
                <Ionicons name="image-outline" size={22} color={BUSINESS_VERIFIED_COLOR} />
              )}
              <Text variant="caption" style={{ fontWeight: '700' }}>
                Logo kırp
              </Text>
            </Pressable>
            <Pressable
              style={[styles.mediaBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
              onPress={() => {
                onPickCover?.();
              }}
            >
              {draft.coverUri ? (
                <Image source={{ uri: draft.coverUri }} style={styles.mediaPreviewWide} resizeMode="cover" />
              ) : (
                <Ionicons name="images-outline" size={22} color={BUSINESS_VERIFIED_COLOR} />
              )}
              <Text variant="caption" style={{ fontWeight: '700' }}>
                Kapak kırp
              </Text>
            </Pressable>
          </View>
        </View>
        <Pressable onPress={() => router.push(BUSINESS_ROUTES.account as never)}>
          <Text variant="caption" style={{ color: BUSINESS_VERIFIED_COLOR, fontWeight: '700' }}>
            Mağaza & satış paneline git →
          </Text>
        </Pressable>
      </EditProfileSection>
    </>
  );
}

export function EditBusinessLegalNotice() {
  return (
    <GlassCard style={styles.legalCard}>
      <Ionicons name="document-text-outline" size={18} color="#8D6E63" />
      <Text secondary variant="caption" style={{ flex: 1, lineHeight: 18 }}>
        Aşağıdaki ad-soyad bilgileri yalnızca evrak, sözleşme ve dahili doğrulama içindir;
        diğer kullanıcılara gösterilmez.
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hint: { marginBottom: spacing.xs },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  mediaBlock: { gap: spacing.sm },
  mediaRow: { flexDirection: 'row', gap: spacing.sm },
  mediaBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 100,
    justifyContent: 'center',
  },
  mediaPreview: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  mediaPreviewWide: {
    width: '100%',
    height: 56,
    borderRadius: radius.md,
  },
  pendingCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  legalCard: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, alignItems: 'flex-start' },
});
