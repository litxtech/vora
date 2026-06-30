import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { BoostCampaignDisplay } from '@/features/profile/components/BoostCampaignDisplay';
import {
  BOOST_CAMPAIGN_MAX_LENGTH,
  BOOST_CAMPAIGN_TEMPLATES,
} from '@/features/profile/constants/boostCampaign';
import {
  activateProfileBoost,
  updateProfileBoostMessage,
} from '@/features/profile/services/profileBoost';
import { glassSurface, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type BoostCampaignSheetProps = {
  visible: boolean;
  mode: 'start' | 'edit';
  initialMessage?: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function BoostCampaignSheet({
  visible,
  mode,
  initialMessage,
  onClose,
  onSuccess,
}: BoostCampaignSheetProps) {
  const { colors, mode: themeMode } = useTheme();
  const surface = glassSurface[themeMode];
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setMessage(initialMessage?.trim() ?? '');
  }, [visible, initialMessage]);

  const remaining = BOOST_CAMPAIGN_MAX_LENGTH - message.length;
  const canSubmit = message.trim().length > 0;

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      Alert.alert('Kampanya metni', 'Vitrinde görünecek kısa bir tanıtım yazın.');
      return;
    }

    setSubmitting(true);
    const { error } =
      mode === 'start'
        ? await activateProfileBoost(trimmed)
        : await updateProfileBoostMessage(trimmed);
    setSubmitting(false);

    if (error) {
      Alert.alert('Hata', error);
      return;
    }

    onSuccess();
    onClose();
    Alert.alert(
      mode === 'start' ? 'Başarılı' : 'Güncellendi',
      mode === 'start'
        ? 'Profiliniz 7 gün boyunca vitrinde — kampanya metniniz yayında.'
        : 'Kampanya metniniz güncellendi.',
    );
  };

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: surface.handle }]} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text variant="h3">
                {mode === 'start' ? 'Profili öne çıkar' : 'Kampanya metni'}
              </Text>
              <Text secondary variant="caption">
                Vitrinde modern bir tanıtım kartı olarak görünür
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
          >
            <Text variant="label" style={styles.sectionLabel}>
              Önizleme
            </Text>
            {message.trim() ? (
              <BoostCampaignDisplay message={message} />
            ) : (
              <View style={[styles.previewPlaceholder, { borderColor: colors.border }]}>
                <Ionicons name="text-outline" size={22} color={colors.textMuted} />
                <Text secondary variant="caption">
                  Metin yazdıkça vitrin kartı burada görünür
                </Text>
              </View>
            )}

            <View style={styles.inputHeader}>
              <Text variant="label">Kampanya metni</Text>
              <Text
                variant="caption"
                style={{ color: remaining < 10 ? colors.danger : colors.textMuted }}
              >
                {remaining}
              </Text>
            </View>
            <TextInput
              value={message}
              onChangeText={(text) => setMessage(text.slice(0, BOOST_CAMPAIGN_MAX_LENGTH))}
              placeholder="Örn: Bu hafta %20 indirim — DM atın ✨"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={BOOST_CAMPAIGN_MAX_LENGTH}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceElevated,
                },
              ]}
            />

            <Text variant="label" style={styles.sectionLabel}>
              Hazır şablonlar
            </Text>
            <View style={styles.templates}>
              {BOOST_CAMPAIGN_TEMPLATES.map((template) => {
                const active = message === template;
                return (
                  <Pressable
                    key={template}
                    onPress={() => setMessage(template)}
                    style={[
                      styles.templateChip,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? `${colors.primary}14` : colors.surfaceElevated,
                      },
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={{
                        color: active ? colors.primary : colors.textSecondary,
                        fontWeight: active ? '700' : '500',
                      }}
                    >
                      {template}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Pressable
            onPress={handleSubmit}
            disabled={submitting || !canSubmit}
            style={({ pressed }) => [
              styles.submit,
              {
                backgroundColor: colors.primary,
                opacity: submitting || !canSubmit ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="rocket" size={18} color="#fff" />
                <Text variant="label" style={{ color: '#fff' }}>
                  {mode === 'start' ? '7 gün vitrine çık' : 'Metni kaydet'}
                </Text>
              </>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '88%',
    paddingBottom: spacing.xl,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  sectionLabel: {
    marginTop: spacing.sm,
  },
  previewPlaceholder: {
    borderWidth: 1,
    borderRadius: radius.md,
    borderStyle: 'dashed',
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 88,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  templates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  templateChip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
});
