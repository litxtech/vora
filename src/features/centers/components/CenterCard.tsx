import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { navigateToCenter } from '@/features/centers/services/navigation';
import { getCenterGradient } from '@/features/centers/services/centerGradients';
import type { CenterDef } from '@/features/centers/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  center: CenterDef;
  variant?: 'featured' | 'list' | 'grid';
  width?: number;
  onNavigate?: () => void;
};

function centerGradient(center: CenterDef): readonly [string, string] {
  return getCenterGradient(center);
}

function FeaturedCenterCard({
  center,
  width,
  onNavigate,
}: {
  center: CenterDef;
  width?: number;
  onNavigate?: () => void;
}) {
  const gradient = centerGradient(center);

  return (
    <Pressable
      onPress={() => {
        navigateToCenter(center.route);
        onNavigate?.();
      }}
      style={({ pressed }) => [
        styles.featuredOuter,
        width != null && { width },
        pressed && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={[gradient[0], gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.featuredCard}
      >
        <View style={styles.featuredGlow} />
        <View style={[styles.featuredIcon]}>
          <Ionicons
            name={center.icon as keyof typeof Ionicons.glyphMap}
            size={24}
            color="#fff"
          />
        </View>

        <View style={styles.featuredCopy}>
          <Text variant="label" style={styles.featuredTitle} numberOfLines={2}>
            {center.title}
          </Text>
          <Text variant="caption" style={styles.featuredSubtitle} numberOfLines={2}>
            {center.subtitle}
          </Text>
        </View>

        <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.85)" style={styles.featuredArrow} />
      </LinearGradient>
    </Pressable>
  );
}

function GridCenterCard({ center, onNavigate }: { center: CenterDef; onNavigate?: () => void }) {
  const { colors } = useTheme();
  const gradient = centerGradient(center);

  return (
    <Pressable
      onPress={() => {
        navigateToCenter(center.route);
        onNavigate?.();
      }}
      style={({ pressed }) => [styles.gridOuter, pressed && styles.pressed]}
    >
      <View style={[styles.gridCard, { borderColor: `${center.accent}30` }]}>
        <LinearGradient
          colors={[`${gradient[0]}28`, `${gradient[1]}06`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.gridIcon, { backgroundColor: `${center.accent}22` }]}>
          <Ionicons name={center.icon as keyof typeof Ionicons.glyphMap} size={22} color={center.accent} />
        </View>
        <Text variant="label" style={styles.gridTitle} numberOfLines={2}>
          {center.title}
        </Text>
        <Text secondary variant="caption" numberOfLines={2} style={styles.gridSubtitle}>
          {center.subtitle}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={styles.gridChevron} />
      </View>
    </Pressable>
  );
}

function ListCenterCard({ center, onNavigate }: { center: CenterDef; onNavigate?: () => void }) {
  const { colors } = useTheme();
  const gradient = centerGradient(center);

  return (
    <Pressable
      onPress={() => {
        navigateToCenter(center.route);
        onNavigate?.();
      }}
      style={({ pressed }) => [styles.listOuter, pressed && styles.pressed]}
    >
      <GlassCard style={[styles.listCard, { borderColor: `${center.accent}28` }]} padded={false}>
        <LinearGradient
          colors={[`${gradient[0]}22`, `${gradient[1]}08`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.listGradient}
        >
          <View style={[styles.listAccent, { backgroundColor: center.accent }]} />
          <View style={[styles.listIcon, { backgroundColor: `${center.accent}20` }]}>
            <Ionicons name={center.icon as keyof typeof Ionicons.glyphMap} size={22} color={center.accent} />
          </View>
          <View style={styles.listBody}>
            <Text variant="label" style={styles.listTitle} numberOfLines={1}>
              {center.title}
            </Text>
            <Text secondary variant="caption" numberOfLines={2} style={styles.listSubtitle}>
              {center.subtitle}
            </Text>
          </View>
          <View style={[styles.listChevron, { backgroundColor: `${center.accent}14` }]}>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </LinearGradient>
      </GlassCard>
    </Pressable>
  );
}

export function CenterCard({ center, variant = 'grid', width, onNavigate }: Props) {
  if (variant === 'featured') {
    return <FeaturedCenterCard center={center} width={width} onNavigate={onNavigate} />;
  }
  if (variant === 'list') {
    return <ListCenterCard center={center} onNavigate={onNavigate} />;
  }
  return <GridCenterCard center={center} onNavigate={onNavigate} />;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  featuredOuter: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  featuredCard: {
    minHeight: 148,
    padding: spacing.md,
    gap: spacing.sm,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  featuredGlow: {
    position: 'absolute',
    top: -24,
    right: -24,
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  featuredIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredCopy: { gap: 4, flex: 1 },
  featuredTitle: { color: '#fff', fontWeight: '800', letterSpacing: -0.2, fontSize: 15 },
  featuredSubtitle: { color: 'rgba(255,255,255,0.88)', lineHeight: 16, fontSize: 12 },
  featuredArrow: { alignSelf: 'flex-end' },
  gridOuter: {
    width: '48.5%',
    flexGrow: 1,
  },
  gridCard: {
    minHeight: 132,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  gridIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  gridTitle: { fontWeight: '700', letterSpacing: -0.1, lineHeight: 18 },
  gridSubtitle: { lineHeight: 16, flex: 1 },
  gridChevron: { alignSelf: 'flex-end', marginTop: 2 },
  listOuter: { width: '100%' },
  listCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  listGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    paddingLeft: spacing.sm,
    minHeight: 88,
  },
  listAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: radius.full,
    marginVertical: 2,
  },
  listIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  listBody: { flex: 1, gap: 3, minWidth: 0 },
  listTitle: { fontWeight: '700', letterSpacing: -0.1 },
  listSubtitle: { lineHeight: 16 },
  listChevron: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
