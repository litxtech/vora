import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import {
  BUSINESS_ACCENT,
  BUSINESS_ROUTES,
  COMMERCE_MODE_OPTIONS,
  shopAccentColor,
  suggestCommerceModeForSector,
} from '@/features/business-center/constants';
import { BusinessSectorPicker } from '@/features/business-center/components/BusinessSectorPicker';
import { BusinessShopPersonalToggle } from '@/features/business-center/components/BusinessShopPersonalToggle';
import {
  linkHotelsToBusiness,
  updateBusinessShopSettings,
} from '@/features/business-center/services/businessAccountData';
import { fetchBusinessAccountByOwner } from '@/features/business-center/services/businessShopData';
import type { BusinessCommerceMode } from '@/features/business-center/types';
import type { BusinessCategoryId } from '@/constants/registration';
import { fetchLinkedSiblingProfile } from '@/features/account-switch/services/linkedAccounts';
import type { LinkedSiblingProfile } from '@/features/account-switch/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function BusinessSetupScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [commerceMode, setCommerceMode] = useState<BusinessCommerceMode>('showcase');
  const [category, setCategory] = useState<BusinessCategoryId | null>(null);
  const [shopTagline, setShopTagline] = useState('');
  const [shopPublished, setShopPublished] = useState(true);
  const [shopShowOnPersonal, setShopShowOnPersonal] = useState(false);
  const [linkedSibling, setLinkedSibling] = useState<LinkedSiblingProfile | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    void Promise.all([fetchBusinessAccountByOwner(user.id), fetchLinkedSiblingProfile()]).then(
      ([biz, sibling]) => {
        setLinkedSibling(sibling);
        if (!biz) return;
        if (biz.registrationStatus !== 'approved') {
          router.replace(BUSINESS_ROUTES.pending as never);
          return;
        }
        setBusinessId(biz.id);
        if (biz.category) setCategory(biz.category as BusinessCategoryId);
        if (biz.commerceMode !== 'none') setCommerceMode(biz.commerceMode);
        setShopTagline(biz.shopTagline ?? '');
        setShopPublished(biz.shopPublished);
        setShopShowOnPersonal(biz.shopShowOnPersonal);
      },
    );
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id || !businessId) return;
    if (commerceMode === 'none') {
      Alert.alert('Mod seçin', 'Kurumsal vitrin veya ticaret modlarından birini seçmelisiniz.');
      return;
    }
    if (!category) {
      Alert.alert('Sektör seçin', 'İşletmenizin sektörünü listeden seçin.');
      return;
    }
    setSaving(true);
    const { error } = await updateBusinessShopSettings(businessId, user.id, {
      category,
      commerceMode,
      shopTagline: shopTagline.trim() || null,
      shopAccent: BUSINESS_ACCENT,
      shopPublished,
      shopShowOnPersonal: shopPublished ? shopShowOnPersonal : false,
    });
    if (!error && (commerceMode === 'hotel' || commerceMode === 'both')) {
      await linkHotelsToBusiness(businessId, user.id);
    }
    setSaving(false);
    if (error) {
      Alert.alert('Hata', error);
      return;
    }
    Alert.alert('Mağaza hazır', 'Kurumsal vitrininiz yayına alındı.', [
      { text: 'Panele git', onPress: () => router.replace(BUSINESS_ROUTES.account as never) },
    ]);
  };

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <AuthHeader
          title="Mağaza Kurulumu"
          subtitle="Sektörünüzü seçin · vitrin modunu açın"
        />

        <GlassCard style={styles.section}>
          <BusinessSectorPicker
            value={category}
            onChange={(id) => {
              setCategory(id);
              setCommerceMode(suggestCommerceModeForSector(id));
            }}
            accent={BUSINESS_ACCENT}
            hint="Tüm sektörler listelenir — arama kutusundan filtreleyebilirsiniz"
          />
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text variant="label">Mağaza modu</Text>
          <Text secondary variant="caption">
            Sektörünüze göre önerilen modu seçin veya değiştirin
          </Text>
          <View style={styles.modeList}>
            {COMMERCE_MODE_OPTIONS.filter((o) => o.id !== 'none').map((option) => {
              const selected = commerceMode === option.id;
              const tone = shopAccentColor(BUSINESS_ACCENT);
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setCommerceMode(option.id)}
                  style={[
                    styles.modeCard,
                    {
                      borderColor: selected ? tone : colors.border,
                      backgroundColor: selected ? `${tone}12` : colors.surface,
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={selected ? tone : colors.textSecondary}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="label">{option.label}</Text>
                    <Text secondary variant="caption">
                      {option.subtitle}
                    </Text>
                  </View>
                  {selected ? <Ionicons name="checkmark-circle" size={20} color={tone} /> : null}
                </Pressable>
              );
            })}
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text variant="label">Vitrin sloganı</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            placeholder="Örn: Karadeniz'in en seçkin butik oteli"
            placeholderTextColor={colors.textMuted}
            value={shopTagline}
            onChangeText={setShopTagline}
            maxLength={120}
          />
        </GlassCard>

        <GlassCard style={styles.section}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="label">Mağazayı yayınla</Text>
              <Text secondary variant="caption">
                Açıkken mağaza kurumsal profil ziyaretlerinde ve keşifte görünür
              </Text>
            </View>
            <Switch
              value={shopPublished}
              onValueChange={(v) => {
                setShopPublished(v);
                if (!v) setShopShowOnPersonal(false);
              }}
              trackColor={{ true: BUSINESS_ACCENT }}
            />
          </View>
          <BusinessShopPersonalToggle
            linkedSibling={linkedSibling}
            shopPublished={shopPublished}
            value={shopShowOnPersonal}
            onValueChange={setShopShowOnPersonal}
          />
        </GlassCard>

        <Button title={saving ? 'Kaydediliyor...' : 'Mağazayı aç'} onPress={handleSave} disabled={saving} />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing.lg, gap: spacing.md },
  section: { gap: spacing.sm },
  modeList: { gap: spacing.sm, marginTop: spacing.xs },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
