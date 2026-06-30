import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { IncidentMediaPicker } from '@/features/incidents/components/IncidentMediaPicker';
import { createIncidentReport } from '@/features/incidents/services/incidentData';
import {
  type IncidentPendingMedia,
  uploadIncidentMediaBatch,
} from '@/features/incidents/services/incidentMediaUpload';
import { INCIDENT_ACCENT, INCIDENT_SEVERITY } from '@/features/incidents/constants';
import { DEFAULT_REGION_ID, REGIONS, type RegionId } from '@/constants/regions';
import { regionMapCenter } from '@/features/map/constants';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const SEVERITY_ORDER = ['low', 'medium', 'high', 'critical'] as const;

type Props = {
  visible: boolean;
  defaultRegionId: RegionId | null;
  onClose: () => void;
  onSubmitted: () => void;
};

/** Kullanıcının yeni olay bildirmesi — kayıt Canlı Nabız haritasında ve listesinde görünür. */
export function IncidentReportSheet({ visible, defaultRegionId, onClose, onSubmitted }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<string>('medium');
  const [regionId, setRegionId] = useState<RegionId>(defaultRegionId ?? DEFAULT_REGION_ID);
  const [usePreciseLocation, setUsePreciseLocation] = useState(true);
  const [media, setMedia] = useState<IncidentPendingMedia[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setTitle('');
      setDescription('');
      setSeverity('medium');
      setUsePreciseLocation(true);
      setMedia([]);
      setStage(null);
      setError(null);
      return;
    }
    setRegionId(defaultRegionId ?? DEFAULT_REGION_ID);
  }, [visible, defaultRegionId]);

  const resolveLocation = async (): Promise<{ latitude: number; longitude: number }> => {
    if (usePreciseLocation) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        }
      } catch {
        // konum alınamazsa bölge merkezine düşeriz
      }
    }
    return regionMapCenter(regionId);
  };

  const handleSubmit = async () => {
    if (!(await requireAuth('Olay bildirme'))) return;
    if (!user || !title.trim() || !description.trim()) return;

    setSubmitting(true);
    setError(null);

    let mediaUrls: string[] = [];
    if (media.length > 0) {
      setStage('Medyalar yükleniyor…');
      const upload = await uploadIncidentMediaBatch(user.id, media);
      if (upload.error) {
        setSubmitting(false);
        setStage(null);
        setError(upload.error);
        return;
      }
      mediaUrls = upload.urls;
    }

    setStage('Olay paylaşılıyor…');
    const { latitude, longitude } = await resolveLocation();
    const { error: submitError } = await createIncidentReport({
      title: title.trim(),
      description: description.trim(),
      regionId,
      severity,
      latitude,
      longitude,
      mediaUrls,
    });

    setSubmitting(false);
    setStage(null);

    if (submitError) {
      setError(submitError);
      return;
    }

    onSubmitted();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType={resolveModalAnimationType('slide')}
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, spacing.lg) },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.header}>
              <View style={styles.headerTitle}>
                <Ionicons name="add-circle" size={20} color={INCIDENT_ACCENT} />
                <Text variant="h3">Olay Bildir</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.form}
            >
              <Text variant="caption" secondary>
                Başlık
              </Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                placeholder="Kısa başlık (örn. Sahil yolunda kaza)"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />

              <Text variant="caption" secondary>
                Açıklama
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                placeholder="Ne oldu? Nerede? Detayları yaz..."
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <Text variant="caption" secondary>
                Önem derecesi
              </Text>
              <View style={styles.chipWrap}>
                {SEVERITY_ORDER.map((key) => {
                  const meta = INCIDENT_SEVERITY[key];
                  const active = severity === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setSeverity(key)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? `${meta.color}1F` : colors.surfaceElevated,
                          borderColor: active ? meta.color : colors.border,
                        },
                      ]}
                    >
                      <Ionicons name={meta.icon} size={13} color={meta.color} />
                      <Text variant="caption" style={{ color: active ? meta.color : colors.text, fontWeight: '700' }}>
                        {meta.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text variant="caption" secondary>
                Bölge
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {REGIONS.map((region) => {
                  const active = regionId === region.id;
                  return (
                    <Pressable
                      key={region.id}
                      onPress={() => setRegionId(region.id)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? `${colors.danger}1A` : colors.surfaceElevated,
                          borderColor: active ? colors.danger : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="location-outline"
                        size={13}
                        color={active ? colors.danger : colors.textMuted}
                      />
                      <Text variant="caption" style={{ color: active ? colors.danger : colors.text, fontWeight: '700' }}>
                        {region.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={[styles.locationRow, { borderColor: colors.border }]}>
                <View style={styles.locationCopy}>
                  <View style={styles.locationTitleRow}>
                    <Ionicons name="navigate" size={15} color={colors.primary} />
                    <Text variant="label">Tam konumumu kullan</Text>
                  </View>
                  <Text variant="caption" secondary>
                    Kapalıyken olay seçili bölgenin merkezine işaretlenir.
                  </Text>
                </View>
                <Switch value={usePreciseLocation} onValueChange={setUsePreciseLocation} />
              </View>

              <Text variant="caption" secondary>
                Fotoğraf / Video (isteğe bağlı)
              </Text>
              <IncidentMediaPicker media={media} onChange={setMedia} disabled={submitting} />

              {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
              {stage ? (
                <Text variant="caption" secondary style={{ textAlign: 'center' }}>
                  {stage}
                </Text>
              ) : null}

              <Button
                title="Olayı Paylaş"
                onPress={handleSubmit}
                loading={submitting}
                disabled={!title.trim() || !description.trim()}
              />
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  keyboardWrap: {
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: '90%',
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  form: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chipRow: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  locationCopy: {
    flex: 1,
    gap: 2,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
