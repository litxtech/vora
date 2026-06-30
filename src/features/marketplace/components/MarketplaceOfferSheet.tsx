import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import {
  formatCents,
  formatMarketplacePrice,
  MARKETPLACE_ACCENT,
} from '@/features/marketplace/constants';
import { submitMarketplaceOffer } from '@/features/marketplace/services/offerData';
import type { MarketplaceListing } from '@/features/marketplace/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  visible: boolean;
  listing: MarketplaceListing;
  onClose: () => void;
  onSubmitted: () => void;
};

export function MarketplaceOfferSheet({ visible, listing, onClose, onSubmitted }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isTrade = listing.listingType === 'trade';
  const listPriceCents = listing.price != null ? Math.round(listing.price * 100) : null;

  const [amountText, setAmountText] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setAmountText('');
    setMessage('');
    setError(null);
  }, [visible, listing.id]);

  const parsedCents = useMemo(() => {
    const digits = amountText.replace(/[^\d]/g, '');
    if (!digits) return null;
    return parseInt(digits, 10) * 100;
  }, [amountText]);

  const suggestedOffers = useMemo(() => {
    if (!listPriceCents || isTrade) return [];
    return [
      Math.round(listPriceCents * 0.85),
      Math.round(listPriceCents * 0.9),
      Math.round(listPriceCents * 0.95),
    ];
  }, [listPriceCents, isTrade]);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    const result = await submitMarketplaceOffer({
      listingId: listing.id,
      listingType: listing.listingType,
      amountCents: isTrade ? null : parsedCents,
      message: isTrade ? message : message.trim() || null,
    });

    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    onSubmitted();
    onClose();
  };

  const canSubmit = isTrade ? message.trim().length >= 3 : parsedCents != null && parsedCents > 0;

  return (
    <Modal visible={visible} animationType={resolveModalAnimationType('slide')} transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.md }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            <Text variant="label">{isTrade ? 'Takas teklifi' : 'Teklif ver'}</Text>
            <Text secondary variant="caption" numberOfLines={2}>
              {listing.title}
            </Text>
            {!isTrade && listing.price != null ? (
              <Text variant="caption" style={{ color: MARKETPLACE_ACCENT, fontWeight: '700' }}>
                Liste fiyatı: {formatMarketplacePrice(listing.price, listing.listingType, listing.currency)}
              </Text>
            ) : null}

            {isTrade ? (
              <View style={styles.fieldBlock}>
                <Text variant="caption" style={styles.fieldLabel}>
                  Ne teklif ediyorsunuz?
                </Text>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Örn. iPhone 12 + 500₺ fark"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={[
                    styles.textArea,
                    { color: colors.text, borderColor: colors.border, backgroundColor: `${colors.surface}CC` },
                  ]}
                />
              </View>
            ) : (
              <>
                <View style={styles.fieldBlock}>
                  <Text variant="caption" style={styles.fieldLabel}>
                    Teklif tutarı (₺)
                  </Text>
                  <View style={[styles.amountRow, { borderColor: colors.border, backgroundColor: `${colors.surface}CC` }]}>
                    <Text variant="label" style={{ color: colors.textMuted }}>
                      ₺
                    </Text>
                    <TextInput
                      value={amountText}
                      onChangeText={setAmountText}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      style={[styles.amountInput, { color: colors.text }]}
                    />
                  </View>
                  {parsedCents ? (
                    <Text secondary variant="caption">
                      Teklif: {formatCents(parsedCents, listing.currency)}
                    </Text>
                  ) : null}
                </View>

                {suggestedOffers.length ? (
                  <View style={styles.suggestRow}>
                    {suggestedOffers.map((cents) => (
                      <Pressable
                        key={cents}
                        onPress={() => setAmountText(String(Math.round(cents / 100)))}
                        style={[styles.suggestChip, { borderColor: colors.border, backgroundColor: `${MARKETPLACE_ACCENT}12` }]}
                      >
                        <Text variant="caption" style={{ color: MARKETPLACE_ACCENT, fontWeight: '700' }}>
                          {formatCents(cents, listing.currency)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                <View style={styles.fieldBlock}>
                  <Text variant="caption" style={styles.fieldLabel}>
                    Not (isteğe bağlı)
                  </Text>
                  <TextInput
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Teslim, ödeme veya ek detay..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    style={[
                      styles.textArea,
                      styles.textAreaShort,
                      { color: colors.text, borderColor: colors.border, backgroundColor: `${colors.surface}CC` },
                    ]}
                  />
                </View>
              </>
            )}

            {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

            <View style={styles.actions}>
              <Button title="İptal" variant="outline" onPress={onClose} style={{ flex: 1 }} />
              <Button
                title={isTrade ? 'Takas teklif et' : 'Teklif gönder'}
                onPress={handleSubmit}
                loading={submitting}
                disabled={!canSubmit}
                style={{ flex: 1.2 }}
              />
            </View>
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
  keyboardWrap: { width: '100%' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  handleRow: { alignItems: 'center', paddingVertical: spacing.xs },
  handle: { width: 36, height: 4, borderRadius: 2 },
  fieldBlock: { gap: spacing.xs },
  fieldLabel: { fontWeight: '600' },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '800', paddingVertical: 0 },
  textArea: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  textAreaShort: { minHeight: 72 },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  suggestChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});
