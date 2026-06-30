import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  getChildFeatures,
  hasHiddenAncestor,
  isDirectlyVisible,
  isEffectivelyVisible,
} from '@/features/feature-flags/services/featureTree';
import type { AppFeatureDef, FeatureKind, FeatureVisibilityMap } from '@/features/feature-flags/types';
import { FEATURE_KIND_LABELS } from '@/features/feature-flags/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const KIND_ICONS: Record<FeatureKind, keyof typeof Ionicons.glyphMap> = {
  root: 'layers-outline',
  tab: 'albums-outline',
  screen: 'document-text-outline',
  control: 'options-outline',
};

type FeatureFlagRowProps = {
  feature: AppFeatureDef;
  visibility: FeatureVisibilityMap;
  savingId: string | null;
  depth?: number;
  breadcrumb?: string;
  onToggle: (featureId: string, label: string, nextVisible: boolean) => void;
  visibleInFilter: (featureId: string) => boolean;
};

export function FeatureFlagRow({
  feature,
  visibility,
  savingId,
  depth = 0,
  breadcrumb,
  onToggle,
  visibleInFilter,
}: FeatureFlagRowProps) {
  const { colors } = useTheme();
  const children = getChildFeatures(feature.id).filter((child) => visibleInFilter(child.id));
  const kind = feature.kind ?? 'control';

  const directVisible = isDirectlyVisible(feature.id, visibility);
  const effectiveVisible = isEffectivelyVisible(feature.id, visibility);
  const ancestorHidden = hasHiddenAncestor(feature.id, visibility);
  const isSaving = savingId === feature.id;

  const statusColor = ancestorHidden
    ? colors.warning
    : effectiveVisible
      ? colors.success
      : colors.danger;
  const statusLabel = ancestorHidden ? 'Üst kapalı' : effectiveVisible ? 'Açık' : 'Kapalı';

  if (!visibleInFilter(feature.id)) return null;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.row,
          {
            marginLeft: depth * spacing.md,
            backgroundColor: colors.surfaceElevated,
            borderColor: `${statusColor}33`,
          },
        ]}
      >
        <View style={[styles.kindIcon, { backgroundColor: `${statusColor}12` }]}>
          <Ionicons name={KIND_ICONS[kind]} size={14} color={statusColor} />
        </View>

        <View style={styles.texts}>
          <Text variant="label" numberOfLines={2}>
            {feature.label}
          </Text>
          {breadcrumb ? (
            <Text secondary variant="caption" numberOfLines={1}>
              {breadcrumb}
            </Text>
          ) : feature.hint ? (
            <Text secondary variant="caption" numberOfLines={2}>
              {feature.hint}
            </Text>
          ) : (
            <Text secondary variant="caption">
              {FEATURE_KIND_LABELS[kind]}
            </Text>
          )}
        </View>

        <View style={styles.trailing}>
          <View style={[styles.statusPill, { backgroundColor: `${statusColor}14` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text variant="caption" style={{ color: statusColor, fontWeight: '700', fontSize: 10 }}>
              {statusLabel}
            </Text>
          </View>
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

      {children.length > 0 ? (
        <View style={styles.nested}>
          {children.map((child) => (
            <FeatureFlagRow
              key={child.id}
              feature={child}
              visibility={visibility}
              savingId={savingId}
              depth={depth + 1}
              onToggle={onToggle}
              visibleInFilter={visibleInFilter}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  kindIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, minWidth: 0, gap: 2 },
  trailing: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  nested: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
