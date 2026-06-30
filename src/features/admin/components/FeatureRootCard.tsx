import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { FeatureFlagRow } from '@/features/admin/components/FeatureFlagRow';
import {
  countSubFeatures,
  groupChildrenByKind,
  hasHiddenAncestor,
  isDirectlyVisible,
  isEffectivelyVisible,
  kindSectionLabel,
} from '@/features/feature-flags/services/featureTree';
import type { AppFeatureDef, FeatureVisibilityMap } from '@/features/feature-flags/types';
import { FEATURE_KIND_LABELS } from '@/features/feature-flags/types';
import { CENTER_BY_ID } from '@/constants/centers';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const SECTION_ORDER = ['tab', 'screen', 'control'] as const;

type FeatureRootCardProps = {
  feature: AppFeatureDef;
  visibility: FeatureVisibilityMap;
  savingId: string | null;
  expandAll?: boolean;
  onToggle: (featureId: string, label: string, nextVisible: boolean) => void;
  visibleInFilter: (featureId: string) => boolean;
};

export function FeatureRootCard({
  feature,
  visibility,
  savingId,
  expandAll = false,
  onToggle,
  visibleInFilter,
}: FeatureRootCardProps) {
  const { colors } = useTheme();
  const childCount = countSubFeatures(feature.id);
  const hasChildren = childCount > 0;
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expandAll && hasChildren) setExpanded(true);
  }, [expandAll, hasChildren]);

  const directVisible = isDirectlyVisible(feature.id, visibility);
  const effectiveVisible = isEffectivelyVisible(feature.id, visibility);
  const ancestorHidden = hasHiddenAncestor(feature.id, visibility);
  const isSaving = savingId === feature.id;
  const kind = feature.kind ?? 'root';

  const statusColor = ancestorHidden
    ? colors.warning
    : effectiveVisible
      ? colors.success
      : colors.danger;
  const statusLabel = ancestorHidden
    ? 'Üst özellik kapalı'
    : effectiveVisible
      ? 'Kullanıcılarda görünür'
      : 'Kullanıcılarda gizli';

  const grouped = groupChildrenByKind(feature.id);
  const visibleSections = SECTION_ORDER.filter((sectionKind) =>
    grouped[sectionKind].some((child) => visibleInFilter(child.id)),
  );

  const centerMeta = CENTER_BY_ID[feature.id as keyof typeof CENTER_BY_ID];
  const headerIcon = (centerMeta?.icon ?? 'cube-outline') as keyof typeof Ionicons.glyphMap;

  if (!visibleInFilter(feature.id)) return null;

  return (
    <GlassCard style={[styles.card, { borderColor: `${statusColor}44` }]} padded={false}>
      <View style={[styles.header, { borderBottomColor: expanded ? colors.border : 'transparent' }]}>
        <View style={[styles.headerIcon, { backgroundColor: `${statusColor}16` }]}>
          <Ionicons name={headerIcon} size={22} color={statusColor} />
        </View>

        <View style={styles.headerTexts}>
          <Text variant="label" style={styles.title}>
            {feature.label}
          </Text>
          <Text secondary variant="caption">
            {FEATURE_KIND_LABELS[kind]}
            {hasChildren ? ` · ${childCount} alt ayar` : ''}
          </Text>
          <View style={[styles.statusRow, { backgroundColor: `${statusColor}12` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text variant="caption" style={{ color: statusColor, fontWeight: '700' }}>
              {statusLabel}
            </Text>
          </View>
        </View>

        <View style={styles.headerSwitch}>
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Switch
              value={directVisible}
              disabled={ancestorHidden}
              onValueChange={(value) => onToggle(feature.id, feature.label, value)}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          )}
        </View>
      </View>

      {hasChildren ? (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={({ pressed }) => [
            styles.expandBar,
            { backgroundColor: pressed ? `${colors.primary}08` : 'transparent' },
          ]}
        >
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.primary}
          />
          <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
            {expanded ? 'Alt ayarları gizle' : 'Alt ayarları göster'}
          </Text>
          <View style={[styles.countBadge, { backgroundColor: `${colors.primary}14` }]}>
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
              {childCount}
            </Text>
          </View>
        </Pressable>
      ) : null}

      {expanded && hasChildren ? (
        <View style={styles.body}>
          {visibleSections.map((sectionKind) => {
            const items = grouped[sectionKind].filter((child) => visibleInFilter(child.id));
            if (items.length === 0) return null;

            return (
              <View key={sectionKind} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text variant="caption" style={[styles.sectionTitle, { color: colors.textMuted }]}>
                    {kindSectionLabel(sectionKind).toUpperCase()}
                  </Text>
                  <Text variant="caption" secondary>
                    {items.length}
                  </Text>
                </View>
                <View style={styles.sectionItems}>
                  {items.map((child) => (
                    <FeatureFlagRow
                      key={child.id}
                      feature={child}
                      visibility={visibility}
                      savingId={savingId}
                      onToggle={onToggle}
                      visibleInFilter={visibleInFilter}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontSize: 16, fontWeight: '800' },
  statusRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerSwitch: {
    paddingTop: 4,
  },
  expandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  body: {
    gap: spacing.md,
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  section: { gap: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontWeight: '800',
    letterSpacing: 0.6,
    fontSize: 11,
  },
  sectionItems: { gap: spacing.xs },
});
