import { Linking, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { PhoneBookList } from '@/features/contact-discovery/components/PhoneBookList';
import { usePhoneBook } from '@/features/contact-discovery/hooks/usePhoneBook';
import type { PhoneBookContact } from '@/features/contact-discovery/services/phoneBookSections';

export function FindFriendsScreen() {
  const insets = useSafeAreaInsets();
  const book = usePhoneBook();

  const openContact = (contact: PhoneBookContact) => {
    if (!contact.match) return;
    router.push(`/user/${contact.match.userId}` as never);
  };

  return (
    <GradientBackground>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <AuthHeader title="Rehber" showBack compact />
        <View style={styles.body}>
          <PhoneBookList
            phase={book.phase}
            contacts={book.contacts}
            notice={book.notice}
            refreshing={book.refreshing}
            onRequestAccess={() => void book.requestAccess()}
            onOpenSettings={book.openSettings}
            onRefresh={() => void book.refresh()}
            onOpenContact={openContact}
            onCallContact={(contact) => {
              const phone = contact.phones[0];
              if (phone) void Linking.openURL(`tel:${phone}`);
            }}
          />
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, minHeight: 0 },
});
