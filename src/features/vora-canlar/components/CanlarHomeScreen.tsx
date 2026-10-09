import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import {
  CanlarCard,
  CanlarEmpty,
  CanlarScaffold,
  CanlarSectionTitle,
  CanlarStatusPill,
} from '@/features/vora-canlar/components/CanlarScaffold';
import { CANLAR_ACCENT, RESCUE_STATUS_LABELS, formatMinor } from '@/features/vora-canlar/constants';
import {
  loadCanlarHome,
  type CanlarCampaignCard,
  type CanlarCaseCard,
  type CanlarHomeFeed,
  type CanlarPostCard,
  type CanlarUpdateCard,
} from '@/features/vora-canlar/services/api';
import { radius, spacing } from '@/constants/theme';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useTheme } from '@/providers/ThemeProvider';

const EMPTY_FEED: CanlarHomeFeed = {
  featured: [],
  urgent: [],
  new_reports: [],
  in_treatment: [],
  campaigns: [],
  updates: [],
  resolved: [],
  aid_needs: [],
  followed: [],
  posts: [],
};

const ACTIONS: {
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  auth: string | null;
}[] = [
  { label: 'İhbar', hint: 'Yeni dosya', icon: 'megaphone-outline', href: '/vora-canlar/case/create', auth: 'İhbar' },
  { label: 'Gönderi', hint: 'Hikâye paylaş', icon: 'create-outline', href: '/vora-canlar/post/create', auth: 'Gönderi' },
  { label: 'Ara', hint: 'Şehir ve durum', icon: 'search-outline', href: '/vora-canlar/search', auth: null },
  { label: 'Ayni yardım', hint: 'Mama, nakil', icon: 'gift-outline', href: '/vora-canlar/aid', auth: 'Ayni yardım' },
  { label: 'Kampanya', hint: 'Bağış çağrısı', icon: 'heart-outline', href: '/vora-canlar/campaign/create', auth: 'Kampanya' },
  { label: 'Gizlilik', hint: 'Göstergeler', icon: 'eye-outline', href: '/vora-canlar/privacy', auth: 'Gizlilik' },
  { label: 'Rol', hint: 'Başvuru', icon: 'ribbon-outline', href: '/vora-canlar/role', auth: 'Rol başvurusu' },
];

export function CanlarHomeScreen() {
  const { colors } = useTheme();
  const { requireAuth } = useRequireAuth();
  const [feed, setFeed] = useState<CanlarHomeFeed>(EMPTY_FEED);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const result = await loadCanlarHome();
    if (result.error) setError(result.error);
    setFeed({ ...EMPTY_FEED, ...(result.data ?? {}) });
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const go = async (action: (typeof ACTIONS)[number]) => {
    if (action.auth) {
      const allowed = await requireAuth(action.auth);
      if (!allowed) return;
    }
    router.push(action.href as never);
  };

  return (
    <CanlarScaffold title="Dayanışma" refreshing={loading} onRefresh={() => void load()}>
      <LinearGradient colors={[`${CANLAR_ACCENT}33`, `${CANLAR_ACCENT}08`]} style={styles.hero}>
        <Text style={styles.heroTitle}>Kurtarma, tedavi ve bağış ayrı kayıtlarda.</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
          Konum yalnızca şehir düzeyinde görünür. Ölüm, başarı veya iptal bir ilerleme çubuğuna çevrilmez.
        </Text>
      </LinearGradient>
      <View style={styles.actions}>
        {ACTIONS.map((action) => (
          <Pressable
            key={action.href}
            accessibilityRole="button"
            onPress={() => void go(action)}
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <View style={styles.actionIcon}>
              <Ionicons name={action.icon} size={18} color={CANLAR_ACCENT} />
            </View>
            <Text style={{ fontWeight: '800', fontSize: 13 }} numberOfLines={1}>
              {action.label}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 11 }} numberOfLines={1}>
              {action.hint}
            </Text>
          </Pressable>
        ))}
      </View>
      {loading ? <ActivityIndicator color={CANLAR_ACCENT} /> : null}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Section title="Öne çıkan kurtarmalar" count={feed.featured.length}>
        <CaseList rows={feed.featured} empty="Henüz öne çıkan kurtarma yok." />
      </Section>
      <Section title="Acil yardım çağrıları" count={feed.urgent.length}>
        <CaseList rows={feed.urgent} empty="Açık acil çağrı yok." />
      </Section>
      <Section title="Yeni ihbarlar" count={feed.new_reports.length}>
        <CaseList rows={feed.new_reports} empty="Yeni ihbar yok." />
      </Section>
      <Section title="Tedavisi sürenler" count={feed.in_treatment.length}>
        <CaseList rows={feed.in_treatment} empty="Tedavisi süren kayıt yok." />
      </Section>
      <Section title="Bağış kampanyaları" count={feed.campaigns.length}>
        <CampaignList rows={feed.campaigns} empty="Yayında kampanya yok." />
      </Section>
      <Section title="Gelişmeler" count={feed.updates.length}>
        <UpdateList rows={feed.updates} empty="Yeni gelişme yok." />
      </Section>
      <Section title="Sonuçlanan hikâyeler" count={feed.resolved.length}>
        <CaseList rows={feed.resolved} empty="Sonuçlanmış hikâye yok." />
      </Section>
      <Section title="Mama, ilaç, nakil ve bakım" count={feed.aid_needs.length}>
        <CampaignList rows={feed.aid_needs} empty="Bu türde açık ihtiyaç yok." />
      </Section>
      <Section title="Desteklediğim hayvanlar" count={feed.followed.length}>
        <UpdateList rows={feed.followed} empty="Takip ettiğiniz hayvan güncellemesi yok." />
      </Section>
      <Section title="Hayvan gönderileri" count={feed.posts.length}>
        {(feed.posts ?? []).length === 0 ? <CanlarEmpty label="Henüz gönderi yok." /> : feed.posts.map((post) => (
          <PostRow key={post.id} post={post} />
        ))}
      </Section>
    </CanlarScaffold>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <CanlarSectionTitle title={title} hint={count > 0 ? String(count) : undefined} />
      {children}
    </View>
  );
}

function toneFor(status?: string | null, urgency?: string | null) {
  if (urgency === 'critical' || urgency === 'urgent') return '#E53935';
  if (status === 'lost' || status === 'cancelled') return '#E53935';
  if (status === 'completed' || status === 'rehomed') return '#2E7D32';
  if (status === 'treatment' || status === 'recovery') return '#F9A825';
  return CANLAR_ACCENT;
}

function CaseList({ rows, empty }: { rows: CanlarCaseCard[]; empty: string }) {
  if (!rows?.length) return <CanlarEmpty label={empty} />;
  return rows.map((row) => {
    const status = RESCUE_STATUS_LABELS[row.status ?? ''] ?? row.status ?? 'Kayıt';
    return (
      <Pressable key={row.id} onPress={() => router.push(`/vora-canlar/case/${row.id}` as never)}>
        <CanlarCard>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {row.name || row.public_code || 'Hayvan'}
            </Text>
            <CanlarStatusPill label={status} tone={toneFor(row.status, row.urgency)} />
          </View>
          <Text secondary numberOfLines={1}>
            {row.city_label || 'Şehir paylaşılmadı'}
          </Text>
          {row.summary ? <Text numberOfLines={2}>{row.summary}</Text> : null}
        </CanlarCard>
      </Pressable>
    );
  });
}

function CampaignList({ rows, empty }: { rows: CanlarCampaignCard[]; empty: string }) {
  if (!rows?.length) return <CanlarEmpty label={empty} />;
  return rows.map((row) => (
    <Pressable key={row.id} onPress={() => router.push(`/vora-canlar/campaign/${row.id}` as never)}>
      <CanlarCard>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {row.title}
          </Text>
          <CanlarStatusPill
            label={row.payments_enabled ? 'Bağış açık' : 'Ödeme kapalı'}
            tone={row.payments_enabled ? '#2E7D32' : CANLAR_ACCENT}
          />
        </View>
        <Text secondary>Hedef {formatMinor(row.target_minor, row.currency)}</Text>
      </CanlarCard>
    </Pressable>
  ));
}

function UpdateList({ rows, empty }: { rows: CanlarUpdateCard[]; empty: string }) {
  if (!rows?.length) return <CanlarEmpty label={empty} />;
  return rows.map((row) => (
    <Pressable key={`${row.id ?? row.case_id}-${row.created_at}`} onPress={() => row.case_id && router.push(`/vora-canlar/case/${row.case_id}` as never)}>
      <CanlarCard>
        <Text style={styles.cardTitle}>{row.name || row.public_code || 'Güncelleme'}</Text>
        <CanlarStatusPill label={RESCUE_STATUS_LABELS[row.to_status ?? row.status ?? ''] ?? row.note ?? 'Gelişme'} />
      </CanlarCard>
    </Pressable>
  ));
}

function PostRow({ post }: { post: CanlarPostCard }) {
  return (
    <Pressable onPress={() => router.push(`/vora-canlar/post/${post.id}` as never)}>
      <CanlarCard>
        <Text numberOfLines={3}>{post.body}</Text>
        <Text secondary>{post.city_label || 'Konum paylaşılmadı'}</Text>
      </CanlarCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  heroTitle: { fontSize: 18, fontWeight: '800', lineHeight: 24 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: {
    width: '31%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: 2,
    minWidth: 96,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${CANLAR_ACCENT}18`,
    marginBottom: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  cardTitle: { flex: 1, fontWeight: '800', fontSize: 16 },
});
