import { Alert, Linking } from 'react-native';
import { openUrl } from '@/lib/linking/openUrl';
import { toTelUri, toWhatsAppPhone } from '../utils/phoneInText';

async function openWhatsApp(raw: string): Promise<void> {
  const phone = toWhatsAppPhone(raw);
  const appUrl = `whatsapp://send?phone=${phone}`;
  const webUrl = `https://wa.me/${phone}`;

  try {
    const canOpen = await Linking.canOpenURL(appUrl);
    await openUrl(canOpen ? appUrl : webUrl);
  } catch {
    try {
      await openUrl(webUrl);
    } catch {
      Alert.alert('WhatsApp', 'WhatsApp açılamadı.');
    }
  }
}

export function showPhoneContactOptions(displayNumber: string, rawNumber: string): void {
  Alert.alert(displayNumber, 'Ne yapmak istersiniz?', [
    {
      text: 'Ara',
      onPress: () => {
        void openUrl(toTelUri(rawNumber)).catch(() => {
          Alert.alert('Arama', 'Telefon uygulaması açılamadı.');
        });
      },
    },
    {
      text: 'WhatsApp',
      onPress: () => {
        void openWhatsApp(rawNumber);
      },
    },
    { text: 'İptal', style: 'cancel' },
  ]);
}
