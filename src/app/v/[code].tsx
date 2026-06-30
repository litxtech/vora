import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { buildVerifyUrl } from '@/features/vcts/constants';
import { verifyContentTrust } from '@/features/vcts/services/verification';
import type { VctsVerificationResult } from '@/features/vcts/types';

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ContentVerifyScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VctsVerificationResult | null>(null);

  useEffect(() => {
    if (!code) {
      setLoading(false);
      return;
    }

    verifyContentTrust(code).then((res) => {
      setResult(res);
      setLoading(false);
    });
  }, [code]);

  const trustCode = code ?? '';
  const verifyUrl = buildVerifyUrl(trustCode);

  return (
    <Screen padded={false}>
      <View style={styles.headerPad}>
        <AuthHeader title="İçerik Doğrulama" subtitle="VORA Content Trust System" />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
        ) : !result?.found ? (
          <GlassCard style={styles.card}>
            <Ionicons name="close-circle" size={48} color={colors.danger} style={styles.icon} />
            <Text variant="h3" style={styles.centerText}>
              Kayıt Bulunamadı
            </Text>
            <Text secondary style={styles.centerText}>
              {result?.message ?? 'Bu ID ile eşleşen VORA içerik kaydı yok.'}
            </Text>
          </GlassCard>
        ) : (
          <>
            <GlassCard style={styles.card}>
              <View style={styles.statusRow}>
                <Ionicons
                  name={result.verified ? 'shield-checkmark' : 'shield-outline'}
                  size={32}
                  color={result.verified ? colors.accent : colors.danger}
                />
                <View style={styles.statusText}>
                  <Text variant="h3">{result.verified ? 'ORİJİNAL İÇERİK' : 'DOĞRULANAMADI'}</Text>
                  <Text secondary variant="caption">
                    VORA Content Trust System
                  </Text>
                </View>
              </View>

              <View style={styles.row}>
                <Text secondary>Yayınlayan</Text>
                <Text variant="label">@{result.authorUsername}</Text>
              </View>
              <View style={styles.row}>
                <Text secondary>Tarih</Text>
                <Text variant="label">{formatDate(result.createdAt)}</Text>
              </View>
              <View style={styles.row}>
                <Text secondary>Hash Match</Text>
                <Text variant="label" style={{ color: result.hashMatch ? colors.accent : colors.danger }}>
                  {result.hashMatch ? 'TRUE ✓' : 'FALSE'}
                </Text>
              </View>
              <View style={styles.row}>
                <Text secondary>Durum</Text>
                <Text variant="label">{result.status?.toUpperCase()}</Text>
              </View>
              <View style={styles.row}>
                <Text secondary>İçerik ID</Text>
                <Text variant="caption">{result.trustCode}</Text>
              </View>
              <View style={styles.row}>
                <Text secondary>Yayıncı Anahtarı</Text>
                <Text variant="caption" numberOfLines={1}>
                  {result.publisherKey}
                </Text>
              </View>
            </GlassCard>

            <View style={styles.qrSection}>
              <View style={[styles.qrBox, { borderColor: colors.border }]}>
                <QRCode value={verifyUrl} size={180} />
              </View>
              <Text secondary variant="caption" style={styles.qrHint}>
                Bu QR kodu paylaşılan içeriğin VORA kaynağını doğrular.
              </Text>
            </View>

            {result.postId ? (
              <Button
                variant="secondary"
                title="Gönderiyi Görüntüle"
                onPress={() => router.push(`/detail/posts/${result.postId}` as never)}
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerPad: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  loader: {
    marginTop: spacing.xl * 2,
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  icon: {
    alignSelf: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  statusText: {
    flex: 1,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  qrSection: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  qrBox: {
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  qrHint: {
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
