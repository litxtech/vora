import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { CANLAR_ACCENT } from '@/features/vora-canlar/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function CanlarComposeCards({
  body,
  city,
  onBody,
  onCity,
}: {
  body: string;
  city: string;
  onBody: (value: string) => void;
  onCity: (value: string) => void;
}) {
  const { colors } = useTheme();
  const [locating, setLocating] = useState(false);
  const [locNote, setLocNote] = useState<string | null>(null);

  const useLocation = async () => {
    setLocating(true);
    setLocNote(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocNote('Konum izni yok. Şehri elle yazabilirsiniz.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const next = geo?.city || geo?.subregion || geo?.region || '';
      if (next.trim().length < 2) {
        setLocNote('Şehir okunamadı. İl adını yazın.');
        return;
      }
      onCity(next);
      setLocNote(`Konumdan alındı: ${next}`);
    } catch {
      setLocNote('Konum alınamadı. Şehri elle yazın.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={styles.stack}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.head}>
          <Ionicons name="create-outline" size={18} color={CANLAR_ACCENT} />
          <Text style={styles.headLabel}>Ne paylaşmak istiyorsun?</Text>
        </View>
        <TextInput
          value={body}
          onChangeText={onBody}
          placeholder="Ne olduğunu kısaca yazın"
          placeholderTextColor={colors.textMuted}
          multiline
          style={[styles.input, { color: colors.text }]}
        />
        <Pressable accessibilityRole="button" onPress={() => { if (!locating) void useLocation(); }} style={[styles.loc, { borderColor: colors.border }]}>
          <Ionicons name="navigate" size={16} color={CANLAR_ACCENT} />
          <Text style={styles.locLabel}>{locating ? 'Konum alınıyor' : 'Konumum'}</Text>
        </Pressable>
        {locNote ? <Text secondary variant="caption">{locNote}</Text> : null}
      </View>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.head}>
          <Ionicons name="location-outline" size={18} color={CANLAR_ACCENT} />
          <Text style={styles.headLabel}>Şehir</Text>
        </View>
        <TextInput
          value={city}
          onChangeText={onCity}
          placeholder="İl adı"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }]}
        />
      </View>
    </View>
  );
}

export function CanlarDonateToggle({
  enabled,
  note,
  locked,
  onToggle,
  onNote,
}: {
  enabled: boolean;
  note: string;
  locked?: boolean;
  onToggle: () => void;
  onNote: (value: string) => void;
}) {
  const { colors } = useTheme();
  if (locked) {
    return <Text secondary>Bu ilanın bağışı kapanmış. Metin ve görseller düzenlenebilir.</Text>;
  }
  return (
    <View style={[styles.slim, { backgroundColor: colors.surface, borderColor: enabled ? CANLAR_ACCENT : colors.border }]}>
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: enabled }} onPress={onToggle} style={styles.choice}>
        <View style={[styles.icon, { backgroundColor: enabled ? CANLAR_ACCENT : `${CANLAR_ACCENT}22` }]}>
          <Ionicons name="heart" size={16} color={enabled ? '#fff' : CANLAR_ACCENT} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.headLabel}>{enabled ? 'Bağış butonu açık' : 'Bağış butonu ekle'}</Text>
          <Text secondary variant="caption">Açıkken ilanda bağış toplanır ve tutar görünür.</Text>
        </View>
        <Ionicons name={enabled ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={enabled ? CANLAR_ACCENT : colors.textMuted} />
      </Pressable>
      {enabled ? (
        <TextInput
          value={note}
          onChangeText={onNote}
          placeholder="Bağış açıklaması. Neye ihtiyaç var?"
          placeholderTextColor={colors.textMuted}
          multiline
          style={[styles.input, { color: colors.text }]}
        />
      ) : null}
    </View>
  );
}

export function CanlarPublishMode({
  shareToVora,
  onChange,
}: {
  shareToVora: boolean;
  onChange: (shareToVora: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.stack}>
      <Text style={styles.headLabel}>Nerede yayınlansın?</Text>
      <View style={[styles.segment, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: !shareToVora }}
          onPress={() => onChange(false)}
          style={[styles.segmentItem, !shareToVora ? { backgroundColor: CANLAR_ACCENT } : null]}
        >
          <Text style={{ fontWeight: '800', fontSize: 13, color: !shareToVora ? '#fff' : colors.text }}>Yalnızca Canlar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: shareToVora }}
          onPress={() => onChange(true)}
          style={[styles.segmentItem, shareToVora ? { backgroundColor: CANLAR_ACCENT } : null]}
        >
          <Text style={{ fontWeight: '800', fontSize: 13, color: shareToVora ? '#fff' : colors.text }}>Canlar ve Vora</Text>
        </Pressable>
      </View>
      <Text secondary variant="caption">
        {shareToVora ? 'İlan Canlar’da ve ana akışta birlikte görünür.' : 'İlan yalnızca Canlar topluluğunda görünür.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  slim: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headLabel: { fontWeight: '800', fontSize: 14 },
  input: { fontSize: 15, lineHeight: 20, minHeight: 36, padding: 0, textAlignVertical: 'top' },
  loc: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.full,
    minHeight: 32,
    paddingHorizontal: 10,
  },
  locLabel: { fontWeight: '800', fontSize: 13, color: CANLAR_ACCENT },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 1 },
  segment: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 3, gap: 3 },
  segmentItem: { flex: 1, minHeight: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
