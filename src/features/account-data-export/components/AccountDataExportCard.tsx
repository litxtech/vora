import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import {
  exportAccountDataPdf,
  printAccountData,
  type AccountReportInput,
} from '@/features/account-data-export/services/accountDataReport';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function AccountDataExportCard() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const [action, setAction] = useState<'download' | 'print' | null>(null);

  const buildInput = (): AccountReportInput | null => {
    if (!user) return null;
    return {
      userId: user.id,
      email: user.email ?? null,
      profile: profile
        ? {
            username: profile.username,
            full_name: profile.full_name,
            first_name: profile.first_name,
            last_name: profile.last_name,
            bio: profile.bio,
            occupation: profile.occupation,
            gender: profile.gender,
            birth_date: profile.birth_date,
            address: profile.address,
            interests: profile.interests,
            account_type: profile.account_type,
            account_status: profile.account_status,
            region_id: profile.region_id,
            district: profile.district,
            trust_score: profile.trust_score,
            contribution_score: profile.contribution_score,
            reporter_level: profile.reporter_level,
            verified_content_count: profile.verified_content_count,
            is_verified: profile.is_verified,
            is_premium: profile.is_premium,
            created_at: profile.created_at,
            last_seen_at: profile.last_seen_at,
          }
        : null,
    };
  };

  const handleExport = async () => {
    const input = buildInput();
    if (!input) {
      Alert.alert('Oturum gerekli', 'Veri raporu için giriş yapmış olmalısınız.');
      return;
    }

    setAction('download');
    const { error } = await exportAccountDataPdf(input);
    setAction(null);

    if (error) {
      Alert.alert('Veri indirme', error);
    }
  };

  const handlePrint = async () => {
    const input = buildInput();
    if (!input) {
      Alert.alert('Oturum gerekli', 'Veri raporu için giriş yapmış olmalısınız.');
      return;
    }

    setAction('print');
    const { error } = await printAccountData(input);
    setAction(null);

    if (error) {
      Alert.alert('Yazdırma', error);
    }
  };

  const busy = action !== null;

  return (
    <GlassCard style={styles.section}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: `${colors.primary}16` }]}>
          <Ionicons name="document-text-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text variant="h3">Veri İndirme</Text>
          <Text secondary variant="caption">
            Hesabında ne yaptığını, ne zaman yaptığını ve tüm işlemlerini içeren PDF raporu indir.
          </Text>
        </View>
      </View>

      <View style={styles.bullets}>
        <Bullet text="Hesap özeti ve etkinlik istatistikleri" colors={colors} />
        <Bullet text="İşlem geçmişi (ne, ne zaman)" colors={colors} />
        <Bullet text="Gönderiler, yorumlar, reklamlar ve cüzdan hareketleri" colors={colors} />
      </View>

      <Button
        title={action === 'download' ? 'Rapor hazırlanıyor…' : 'Verilerimi PDF indir'}
        loading={action === 'download'}
        disabled={busy}
        onPress={handleExport}
      />
      <Button
        title={action === 'print' ? 'Yazdırılıyor…' : 'Yazdır'}
        variant="outline"
        loading={action === 'print'}
        disabled={busy}
        onPress={handlePrint}
      />
    </GlassCard>
  );
}

function Bullet({ text, colors }: { text: string; colors: { success: string } }) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
      <Text secondary variant="caption" style={styles.bulletText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  bullets: {
    gap: spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  bulletText: {
    flex: 1,
    lineHeight: 18,
  },
});
