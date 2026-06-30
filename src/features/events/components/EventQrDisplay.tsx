import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { EventQrShareSheet } from '@/features/events/components/EventQrShareSheet';
import { buildEventCheckInDeepLink } from '@/features/events/constants';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type EventQrDisplayProps = {
  token: string;
  title: string;
  eventId: string;
  startsAt?: string | null;
  locationName?: string | null;
};

export function EventQrDisplay({
  token,
  title,
  eventId,
  startsAt,
  locationName,
}: EventQrDisplayProps) {
  const { colors } = useTheme();
  const [shareOpen, setShareOpen] = useState(false);
  const payload = buildEventCheckInDeepLink(token);

  return (
    <>
      <View style={styles.wrap}>
        <View style={[styles.qrBox, { backgroundColor: '#fff', borderColor: colors.border }]}>
          <QRCode value={payload} size={160} />
        </View>
        <Text secondary variant="caption" style={styles.hint}>
          Katılımcılar bu kodu okutarak giriş yapabilir.
        </Text>
        <Button title="Vora kartı paylaş" onPress={() => setShareOpen(true)} />
      </View>

      <EventQrShareSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        token={token}
        title={title}
        eventId={eventId}
        startsAt={startsAt}
        locationName={locationName}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.md,
  },
  qrBox: {
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  hint: {
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
