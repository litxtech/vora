import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import {
  SITEMAP_FILES,
  loadAdminSitemapCatalog,
  probeLiveSitemap,
  setAdminSitemapExclusion,
  type LiveSitemapProbe,
  type SitemapCatalog,
  type SitemapFileName,
} from '@/features/admin/services/sitemapAdmin';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const FILE_META: Record<SitemapFileName, { label: string; hint: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pages: { label: 'Sayfalar', hint: 'Sabit sayfalar', icon: 'document-text-outline' },
  cities: { label: 'Şehirler', hint: 'İl ve konu', icon: 'business-outline' },
  blog: { label: 'Blog', hint: 'Yayımlı yazılar', icon: 'newspaper-outline' },
  posts: { label: 'Paylaşımlar', hint: 'Dizine uygun', icon: 'images-outline' },
  profiles: { label: 'Profiller', hint: 'Açık hesaplar', icon: 'person-outline' },
  events: { label: 'Etkinlikler', hint: 'Açıklaması olan', icon: 'calendar-outline' },
};

const STATUS_COPY = {
  flowing: { title: 'Veri akıyor', icon: 'pulse-outline' as const },
  empty: { title: 'Canlı XML boş', icon: 'remove-circle-outline' as const },
  unreachable: { title: 'Canlı adres kapalı', icon: 'cloud-offline-outline' as const },
};

export function AdminSitemapScreen() {
  const { colors } = useTheme();
  const [catalog, setCatalog] = useState<SitemapCatalog | null>(null);
  const [live, setLive] = useState<LiveSitemapProbe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [file, setFile] = useState<SitemapFileName>('pages');
  const [query, setQuery] = useState('');
  const [busyPath, setBusyPath] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const [result, probe] = await Promise.all([loadAdminSitemapCatalog(), probeLiveSitemap()]);
    setCatalog(result.catalog);
    setError(result.error);
    setLive(probe);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const current = catalog?.files.find((item) => item.name === file);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = current?.entries ?? [];
    if (!needle) return rows;
    return rows.filter((row) => row.path.toLowerCase().includes(needle));
  }, [current, query]);

  const toggle = useCallback(
    async (path: string, excluded: boolean) => {
      setBusyPath(path);
      const message = await setAdminSitemapExclusion(path, excluded);
      setBusyPath(null);
      if (message) Alert.alert('Sitemap', message);
      else await load(true);
    },
    [load],
  );

  const total = catalog?.files.reduce((sum, item) => sum + item.entries.length, 0) ?? 0;
  const status = live?.status ?? 'unreachable';
  const tone = status === 'flowing' ? colors.success : status === 'empty' ? colors.warning : colors.danger;
  const fileUrl = live?.files.find((item) => item.name === file)?.url ?? null;
  const fileLiveCount = live?.files.find((item) => item.name === file)?.count ?? 0;

  const copyUrl = useCallback(async (url: string) => {
    await Clipboard.setStringAsync(url);
    Alert.alert('Kopyalandı', url);
  }, []);

  return (
    <AdminShell
      title="Sitemap"
      subtitle="Canlı XML ve paneldeki adresler"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <GlassCard style={[styles.hero, { borderColor: `${tone}66` }]}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: tone }]} />
          <View style={{ flex: 1 }}>
            <Text variant="label">{STATUS_COPY[status].title}</Text>
            <Text variant="caption" secondary>
              {live?.detail ?? 'Canlı dosya kontrol ediliyor.'}
            </Text>
          </View>
          <Ionicons name={STATUS_COPY[status].icon} size={22} color={tone} />
        </View>

        <Pressable
          onPress={() => live ? void copyUrl(live.indexUrl) : undefined}
          onLongPress={() => live ? void Linking.openURL(live.indexUrl) : undefined}
          style={[styles.urlBox, { backgroundColor: `${colors.text}08`, borderColor: colors.border }]}
        >
          <Text variant="caption" muted>Canlı URL</Text>
          <Text variant="label" numberOfLines={2}>{live?.indexUrl ?? 'https://www.vorakaradeniz.com/sitemap.xml'}</Text>
          {live?.publicIndexUrl ? (
            <Text variant="caption" muted numberOfLines={2}>Dosyada yazan: {live.publicIndexUrl}</Text>
          ) : null}
        </Pressable>

        <View style={styles.urlActions}>
          <AdminActionChip
            label="Kopyala"
            icon="copy-outline"
            compact
            onPress={() => live ? void copyUrl(live.indexUrl) : undefined}
          />
          <AdminActionChip
            label="Tarayıcıda aç"
            icon="open-outline"
            compact
            tone="primary"
            onPress={() => live ? void Linking.openURL(live.indexUrl) : undefined}
          />
        </View>

        <View style={styles.metrics}>
          <Metric label="Canlıda" value={live?.liveCount ?? 0} color={tone} />
          <Metric label="Panelde" value={total} color={colors.primary} />
          <Metric label="Çıkarılan" value={catalog?.excluded.length ?? 0} color={colors.warning} />
        </View>
      </GlassCard>

      <View style={styles.grid}>
        {SITEMAP_FILES.map((name) => {
          const meta = FILE_META[name];
          const count = catalog?.files.find((item) => item.name === name)?.entries.length ?? 0;
              const matched = live?.files.find((item) => item.name === name);
              const liveCount = matched?.count ?? 0;
              const liveLabel = !live
                ? 'Kontrol ediliyor'
                : live.status === 'unreachable'
                  ? 'Ulaşılamadı'
                  : liveCount > 0
                    ? `Canlıda ${liveCount}`
                    : 'Canlıda yok';
              const selected = file === name;
          return (
            <Pressable
              key={name}
              onPress={() => setFile(name)}
              style={[
                styles.tile,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? `${colors.primary}18` : `${colors.surface}CC`,
                },
              ]}
            >
              <Ionicons name={meta.icon} size={18} color={selected ? colors.primary : colors.textSecondary} />
              <Text variant="label">{meta.label}</Text>
              <Text variant="caption" muted>{meta.hint}</Text>
              <Text variant="h3">{count}</Text>
              <Text variant="caption" style={{ color: liveCount > 0 ? colors.success : colors.textMuted }}>
                {liveLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <GlassCard style={styles.sectionHead}>
        <Text variant="label">{FILE_META[file].label}</Text>
        <Text variant="caption" secondary>
          {fileUrl ?? 'Bu dosya canlı indekste yok.'}
          {fileUrl ? ` · canlı ${fileLiveCount}` : ''}
        </Text>
        {fileUrl ? (
          <View style={styles.urlActions}>
            <AdminActionChip label="Dosya URL’sini kopyala" icon="copy-outline" compact onPress={() => void copyUrl(fileUrl)} />
            <AdminActionChip label="Aç" icon="open-outline" compact tone="primary" onPress={() => void Linking.openURL(fileUrl)} />
          </View>
        ) : null}
      </GlassCard>

      <AdminSearchInput value={query} onChangeText={setQuery} placeholder="Adres ara, örneğin /blog" />

      {loading ? (
        <AdminEmptyState loading />
      ) : error ? (
        <AdminEmptyState title="Liste alınamadı" message={error} icon="alert-circle-outline" />
      ) : visible.length === 0 ? (
        <AdminEmptyState title="Adres yok" message="Bu dosyada gösterilecek adres kalmadı." icon="document-outline" />
      ) : (
        visible.map((row) => (
          <View key={row.path} style={[styles.row, { borderColor: colors.border, backgroundColor: `${colors.surface}CC` }]}>
            <View style={{ flex: 1 }}>
              <Text variant="label" numberOfLines={1}>{row.path}</Text>
              <Text variant="caption" muted>{row.lastmod ? `Güncelleme ${row.lastmod.slice(0, 10)}` : 'Güncelleme tarihi yok'}</Text>
            </View>
            <AdminActionChip
              label="Çıkar"
              icon="remove-circle-outline"
              tone="warning"
              compact
              loading={busyPath === row.path}
              onPress={() => toggle(row.path, true)}
            />
          </View>
        ))
      )}

      <Text variant="label">XML’den çıkarılanlar</Text>
      <Text variant="caption" secondary>Sayfa durur. Yalnızca sitemap dosyasından düşer.</Text>
      {(catalog?.excluded.length ?? 0) === 0 ? (
        <Text variant="caption" muted>Çıkarılan adres yok.</Text>
      ) : (
        catalog?.excluded.map((path) => (
          <View key={path} style={[styles.row, { borderColor: colors.border, backgroundColor: `${colors.surface}CC` }]}>
            <Text variant="label" style={{ flex: 1 }} numberOfLines={1}>{path}</Text>
            <AdminActionChip
              label="Geri al"
              icon="add-circle-outline"
              tone="success"
              compact
              loading={busyPath === path}
              onPress={() => toggle(path, false)}
            />
          </View>
        ))
      )}

      {(catalog?.unpublishedCms.length ?? 0) > 0 ? (
        <GlassCard style={styles.sectionHead}>
          <Text variant="label">XML’e yazılmayan sayfalar</Text>
          {catalog?.unpublishedCms.map((page) => (
            <Text key={page.slug} variant="caption" secondary>
              /{page.slug} — {page.reason}
            </Text>
          ))}
        </GlassCard>
      ) : null}
    </AdminShell>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.metric}>
      <Text variant="h3" style={{ color }}>{value}</Text>
      <Text variant="caption" muted>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  urlBox: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, gap: 2 },
  urlActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  metrics: { flexDirection: 'row', gap: spacing.sm },
  metric: { flex: 1, gap: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: 2,
  },
  sectionHead: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
