import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { VoraAIBadge } from '@/features/vora-ai/components/VoraAIBadge';
import { VORA_AI_ACCENT } from '@/features/vora-ai/constants';
import { invokeVoraAi } from '@/features/vora-ai/services/voraAiClient';
import { navigateVoraAiResultItem } from '@/features/vora-ai/services/voraAiNavigation';
import type { VoraAiModuleId, VoraAiResponse, VoraAiResultItem } from '@/features/vora-ai/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { toUserFacingError } from '@/lib/errors';

type ActionItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type VoraAISheetProps = {
  visible: boolean;
  onClose: () => void;
  module: VoraAiModuleId;
  title: string;
  actions: ActionItem[];
  buildPayload: (actionId: string) => Record<string, unknown>;
  resolveInvoke?: (actionId: string) => { module: VoraAiModuleId; action: string };
};

export function VoraAISheet({
  visible,
  onClose,
  module,
  title,
  actions,
  buildPayload,
  resolveInvoke,
}: VoraAISheetProps) {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VoraAiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAction = async (actionId: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const resolved = resolveInvoke?.(actionId) ?? { module, action: actionId };
      const response = await invokeVoraAi({
        action: resolved.action,
        module: resolved.module,
        context: buildPayload(actionId),
      });
      setResult(response);
    } catch (e) {
      setError(toUserFacingError(e instanceof Error ? e.message : null, { fallback: 'Bir hata oluştu.' }));
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (item: VoraAiResultItem) => {
    if (navigateVoraAiResultItem(item)) {
      onClose();
    }
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType={resolveModalAnimationType('slide')} transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
            isDark ? styles.sheetDark : styles.sheetLight,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text variant="label">{title}</Text>
              <VoraAIBadge />
            </View>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {!result && !loading && !error ? (
            <ScrollView style={styles.actions} contentContainerStyle={styles.actionsContent}>
              {actions.map((action) => (
                <Pressable
                  key={action.id}
                  style={[styles.actionRow, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={() => runAction(action.id)}
                >
                  <Ionicons name={action.icon} size={20} color={VORA_AI_ACCENT} />
                  <Text variant="label" style={styles.actionLabel}>
                    {action.label}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={VORA_AI_ACCENT} />
              <Text secondary variant="caption">Vora AI düşünüyor…</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.center}>
              <Text style={{ color: colors.danger }}>{error}</Text>
            </View>
          ) : null}

          {result ? (
            <ScrollView style={styles.result} contentContainerStyle={styles.resultContent}>
              <Text>{result.text}</Text>
              {result.commentPosted ? (
                <Text variant="caption" style={{ color: VORA_AI_ACCENT, fontWeight: '600' }}>
                  ✓ Vora AI yorumu paylaşıldı
                </Text>
              ) : null}
              {result.cached ? (
                <Text secondary variant="caption">Önbellekten</Text>
              ) : null}
              {result.items?.map((item) => (
                <Pressable
                  key={item.id}
                  style={[
                    styles.resultItem,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => handleItemPress(item)}
                >
                  <Text variant="label">{item.title}</Text>
                  {item.subtitle ? (
                    <Text secondary variant="caption">
                      {item.subtitle}
                      {item.distanceKm != null ? ` · ${item.distanceKm.toFixed(1)} km` : ''}
                    </Text>
                  ) : item.distanceKm != null ? (
                    <Text secondary variant="caption">{item.distanceKm.toFixed(1)} km</Text>
                  ) : null}
                </Pressable>
              ))}
              <Pressable style={styles.backBtn} onPress={() => setResult(null)}>
                <Text style={{ color: VORA_AI_ACCENT }}>Başka bir soru sor</Text>
              </Pressable>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sheetDark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 16,
  },
  sheetLight: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginVertical: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { maxHeight: 360 },
  actionsContent: { gap: spacing.xs, paddingBottom: spacing.md },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xs,
  },
  actionLabel: { flex: 1 },
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  result: { maxHeight: 400 },
  resultContent: { gap: spacing.sm, paddingBottom: spacing.md },
  resultItem: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  backBtn: { alignItems: 'center', paddingVertical: spacing.md },
});
