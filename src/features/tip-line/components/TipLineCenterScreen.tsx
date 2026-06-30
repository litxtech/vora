import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { CenterShell } from '@/features/centers/components/CenterShell';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import {
  TIP_CATEGORY_LIST,
  TIP_LINE_ACCENT,
  TIP_LINE_CENTER_DEF,
  TIP_LINE_DISPLAY_NAME,
  TIP_MAX_DESCRIPTION_LENGTH,
  TIP_MIN_DESCRIPTION_LENGTH,
  TIP_PROCESS_STEPS,
  type TipCategory,
} from '@/features/tip-line/constants';
import { submitAnonymousTip } from '@/features/tip-line/services/tipData';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

function CategoryCard({
  label,
  hint,
  icon,
  color,
  selected,
  onPress,
}: {
  label: string;
  hint: string;
  icon: string;
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.categoryCell, pressed && styles.pressed]}
    >
      <GlassCard
        style={[
          styles.categoryCard,
          {
            borderColor: selected ? color : colors.border,
            backgroundColor: selected ? `${color}14` : colors.surface,
          },
        ]}
      >
        {selected ? (
          <View style={[styles.checkBadge, { backgroundColor: color }]}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
        ) : null}
        <View style={[styles.categoryIcon, { backgroundColor: `${color}22` }]}>
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={22} color={color} />
        </View>
        <Text variant="label" numberOfLines={2} style={styles.categoryLabel}>
          {label}
        </Text>
        <Text secondary variant="caption" numberOfLines={2} style={styles.categoryHint}>
          {hint}
        </Text>
      </GlassCard>
    </Pressable>
  );
}

export function TipLineCenterScreen() {
  const { profile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const { colors } = useTheme();
  const [category, setCategory] = useState<TipCategory>('irregular_migration');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const trimmed = description.trim();
  const charCount = trimmed.length;
  const canSubmit = charCount >= TIP_MIN_DESCRIPTION_LENGTH;

  const selectedCategory = useMemo(
    () => TIP_CATEGORY_LIST.find((item) => item.id === category),
    [category],
  );

  const handleSubmit = async () => {
    if (!(await requireAuth(`${TIP_LINE_DISPLAY_NAME} gönderme`))) return;
    if (!profile?.region_id) return;

    if (charCount < TIP_MIN_DESCRIPTION_LENGTH) {
      Alert.alert(
        'Eksik açıklama',
        `En az ${TIP_MIN_DESCRIPTION_LENGTH} karakterlik bir açıklama yazın.`,
      );
      return;
    }

    setSubmitting(true);
    const result = await submitAnonymousTip(profile.region_id, category, trimmed);
    setSubmitting(false);

    if (result.ok) {
      Alert.alert(
        `${TIP_LINE_DISPLAY_NAME} Alındı`,
        'Bildiriminiz moderasyon ekibine iletildi. Kişisel suçlama ve iftira içeren bildirimler reddedilir.',
      );
      setDescription('');
    } else {
      Alert.alert('Hata', result.error ?? 'Gönderilemedi');
    }
  };

  return (
    <CenterShell
      title={TIP_LINE_CENTER_DEF.title}
      subtitle="Kimliğiniz gizli kalır — moderasyon sonrası ilgili birime iletilir"
      hasContent
      keyboardAware
      keyboardBottomOffset={88}
    >
      <GlassCard style={[styles.hero, { borderColor: `${TIP_LINE_ACCENT}44` }]}>
        <View style={[styles.heroIcon, { backgroundColor: `${TIP_LINE_ACCENT}22` }]}>
          <Ionicons name="megaphone" size={28} color={TIP_LINE_ACCENT} />
        </View>
        <View style={styles.heroText}>
          <Text variant="label">Anonim {TIP_LINE_DISPLAY_NAME.toLowerCase()}</Text>
          <Text secondary variant="caption">
            Göç, asayiş, uyuşturucu, çevre ve altyapı konularında bildirim yapın. Konum veya tarih
            eklemeniz incelemeyi hızlandırır.
          </Text>
        </View>
      </GlassCard>

      <View style={styles.stepsRow}>
        {TIP_PROCESS_STEPS.map((step) => (
          <View key={step.label} style={styles.stepItem}>
            <View style={[styles.stepIcon, { backgroundColor: `${TIP_LINE_ACCENT}18` }]}>
              <Ionicons
                name={step.icon as keyof typeof Ionicons.glyphMap}
                size={16}
                color={TIP_LINE_ACCENT}
              />
            </View>
            <Text secondary variant="caption" style={styles.stepLabel}>
              {step.label}
            </Text>
          </View>
        ))}
      </View>

      <GlassCard style={[styles.notice, { borderColor: `${colors.warning}44` }]}>
        <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
        <Text secondary variant="caption" style={styles.noticeText}>
          {TIP_LINE_DISPLAY_NAME} kayıtları yalnızca moderasyon sonrası değerlendirilir. İftira, nefret söylemi ve kişisel
          hedef gösterme yasaktır.
        </Text>
      </GlassCard>

      <View style={styles.sectionHeader}>
        <Text variant="label">Konu seçin</Text>
        {selectedCategory ? (
          <Text variant="caption" style={{ color: selectedCategory.color }}>
            {selectedCategory.label}
          </Text>
        ) : null}
      </View>

      <View style={styles.categoryGrid}>
        {TIP_CATEGORY_LIST.map((item) => (
          <CategoryCard
            key={item.id}
            label={item.label}
            hint={item.hint}
            icon={item.icon}
            color={item.color}
            selected={category === item.id}
            onPress={() => setCategory(item.id)}
          />
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text variant="label">Açıklama</Text>
        <Text
          variant="caption"
          style={{
            color:
              charCount >= TIP_MIN_DESCRIPTION_LENGTH ? colors.success : colors.textMuted,
          }}
        >
          {charCount}/{TIP_MAX_DESCRIPTION_LENGTH}
        </Text>
      </View>

      <TextInput
        value={description}
        onChangeText={(text) => setDescription(text.slice(0, TIP_MAX_DESCRIPTION_LENGTH))}
        placeholder="Ne gözlemlediniz? Tarih, saat, mahalle veya adres bilgisi ekleyin..."
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: selectedCategory ? `${selectedCategory.color}55` : colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      />

      <Text secondary variant="caption" style={styles.helper}>
        En az {TIP_MIN_DESCRIPTION_LENGTH} karakter. Mümkünse somut gözlem yazın; isim zikretmek
        zorunlu değildir.
      </Text>

      <Button
        title={`${TIP_LINE_DISPLAY_NAME} Gönder`}
        onPress={handleSubmit}
        loading={submitting}
        disabled={!canSubmit}
      />
    </CenterShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    borderWidth: 1,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1, gap: spacing.xs },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    position: 'relative',
  },
  stepIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: { textAlign: 'center', fontSize: 10, lineHeight: 13 },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    borderWidth: 1,
  },
  noticeText: { flex: 1, lineHeight: 18 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryCell: {
    width: '48%',
    flexGrow: 1,
    minWidth: '47%',
  },
  categoryCard: {
    gap: spacing.xs,
    minHeight: 118,
    borderWidth: 1.5,
    position: 'relative',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: { fontWeight: '700' },
  categoryHint: { lineHeight: 15, flex: 1 },
  checkBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.86 },
  input: {
    borderWidth: 1.5,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 140,
    fontSize: 15,
    lineHeight: 22,
  },
  helper: { lineHeight: 18 },
});
