import { useMemo, useRef, useState } from 'react';
import { Image, Pressable, RefreshControl, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import type { PhoneBookPhase } from '@/features/contact-discovery/hooks/usePhoneBook';
import { invitePhoneBookContact } from '@/features/contact-discovery/services/inviteShare';
import {
  buildPhoneBookGroups,
  contactMonogram,
  contactSectionLetter,
  contactSubtitle,
  phoneBookIndexLetters,
  type PhoneBookContact,
  type PhoneBookSection,
} from '@/features/contact-discovery/services/phoneBookSections';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type PhoneBookListProps = {
  phase: PhoneBookPhase;
  contacts: PhoneBookContact[];
  notice: string | null;
  refreshing: boolean;
  showTitle?: boolean;
  onRequestAccess: () => void;
  onOpenSettings: () => void;
  onRefresh: () => void;
  onOpenContact: (contact: PhoneBookContact) => void;
  onCallContact: (contact: PhoneBookContact) => void;
};

export function PhoneBookList({
  phase,
  contacts,
  notice,
  refreshing,
  showTitle = false,
  onRequestAccess,
  onOpenSettings,
  onRefresh,
  onOpenContact,
  onCallContact,
}: PhoneBookListProps) {
  const { colors } = useTheme();
  const listRef = useRef<SectionList<PhoneBookContact, PhoneBookSection>>(null);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr');
    if (!needle) return contacts;
    return contacts.filter((contact) => {
      const haystack = `${contact.name} ${contact.phones.join(' ')} ${contact.match?.username ?? ''}`.toLocaleLowerCase(
        'tr',
      );
      return haystack.includes(needle);
    });
  }, [contacts, query]);

  const sections = useMemo(() => buildPhoneBookGroups(visible), [visible]);
  const indexLetters = useMemo(() => (query ? [] : phoneBookIndexLetters(contacts)), [contacts, query]);

  if (phase === 'checking') {
    return <PhoneBookSkeleton />;
  }

  if (phase !== 'ready') {
    const denied = phase === 'denied';
    return (
      <View style={styles.gate}>
        <View style={[styles.gateIcon, { backgroundColor: `${colors.primary}14` }]}>
          <Ionicons name="people-outline" size={32} color={colors.primary} />
        </View>
        <Text variant="h3" style={styles.gateTitle}>
          {denied ? 'Rehber izni kapalı' : 'Rehber'}
        </Text>
        <Text secondary style={styles.gateBody}>
          {notice ?? 'İzin verince telefonundaki kişiler burada listelenir.'}
        </Text>
        {phase === 'needs-permission' ? <Button title="Rehbere izin ver" onPress={onRequestAccess} /> : null}
        {denied ? <Button title="Ayarları aç" variant="secondary" onPress={onOpenSettings} /> : null}
        {phase === 'unavailable' ? <Button title="Tekrar dene" variant="secondary" onPress={onRequestAccess} /> : null}
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.toolbar}>
        {showTitle ? <Text style={[styles.largeTitle, { color: colors.text }]}>Rehber</Text> : null}
        <View style={[styles.search, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Ara"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            accessibilityLabel="Rehberde ara"
          />
        </View>
      </View>

      <View style={styles.flex}>
        <SectionList
          ref={listRef}
          style={styles.flex}
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={sections.length === 0 ? styles.emptyContent : styles.listContent}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
              <View style={[styles.countPill, { backgroundColor: `${colors.primary}16` }]}>
                <Text style={[styles.countText, { color: colors.primary }]}>{section.data.length}</Text>
              </View>
            </View>
          )}
          renderItem={({ item, index, section }) => {
            const previous = index > 0 ? section.data[index - 1] : null;
            const showLetter = !previous || contactSectionLetter(previous.name) !== contactSectionLetter(item.name);
            const onApp = Boolean(item.match);
            return (
              <View style={{ backgroundColor: colors.background }}>
                {showLetter ? (
                  <Text style={[styles.letter, { color: colors.primary }]}>{contactSectionLetter(item.name)}</Text>
                ) : null}
                <Pressable
                  accessibilityRole={onApp ? 'button' : 'text'}
                  accessibilityLabel={item.name}
                  onPress={() => {
                    if (onApp) onOpenContact(item);
                  }}
                  style={styles.row}
                >
                  {item.match?.avatarUrl ? (
                    <Image source={{ uri: item.match.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View
                      style={[
                        styles.avatar,
                        styles.monogram,
                        { backgroundColor: onApp ? colors.primary : colors.surfaceElevated },
                      ]}
                    >
                      <Text style={{ color: onApp ? '#fff' : colors.text, fontSize: 17, fontWeight: '700' }}>
                        {contactMonogram(item.name)}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.copy, { borderBottomColor: colors.border }]}>
                    <View style={styles.copyText}>
                      <Text numberOfLines={1} style={styles.name}>
                        {item.name}
                      </Text>
                      <Text secondary numberOfLines={1} style={styles.subtitle}>
                        {onApp && item.match ? `@${item.match.username}` : contactSubtitle(item)}
                      </Text>
                    </View>
                    {onApp ? (
                      <Pressable
                        hitSlop={8}
                        accessibilityLabel={`${item.name} kişisini ara`}
                        onPress={() => onCallContact(item)}
                        style={[styles.iconButton, { backgroundColor: `${colors.primary}14` }]}
                      >
                        <Ionicons name="call" size={18} color={colors.primary} />
                      </Pressable>
                    ) : (
                      <Pressable
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.name} kişisini Vora'ya davet et`}
                        onPress={() => void invitePhoneBookContact(item.phones[0])}
                        style={[styles.inviteButton, { backgroundColor: colors.primary }]}
                      >
                        <Text style={styles.inviteLabel}>Davet et</Text>
                      </Pressable>
                    )}
                  </View>
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text variant="label">{query ? 'Sonuç yok' : 'Rehber boş'}</Text>
            </View>
          }
        />

        {indexLetters.length > 1 ? (
          <View style={[styles.index, { backgroundColor: `${colors.surface}E6` }]} pointerEvents="box-none">
            {indexLetters.map((letter) => (
              <Pressable
                key={letter}
                hitSlop={3}
                accessibilityLabel={`${letter} harfi`}
                onPress={() => {
                  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
                    const itemIndex = sections[sectionIndex]?.data.findIndex(
                      (contact) => contactSectionLetter(contact.name) === letter,
                    );
                    if (itemIndex == null || itemIndex < 0) continue;
                    listRef.current?.scrollToLocation({
                      sectionIndex,
                      itemIndex,
                      animated: false,
                      viewOffset: 36,
                    });
                    return;
                  }
                }}
              >
                <Text style={[styles.indexLetter, { color: colors.primary }]}>{letter}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function PhoneBookSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={styles.skeleton}>
      {Array.from({ length: 8 }, (_, index) => (
        <View key={index} style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated }]} />
          <View style={styles.copy}>
            <View style={[styles.skeletonLine, { backgroundColor: colors.surfaceElevated, width: '46%' }]} />
            <View style={[styles.skeletonLine, { backgroundColor: colors.surfaceElevated, width: '28%' }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 6,
    gap: 6,
  },
  largeTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 46,
  },
  searchInput: { flex: 1, fontSize: 17, paddingVertical: 10 },
  listContent: { paddingBottom: spacing.xxl },
  emptyContent: { flexGrow: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    paddingRight: 28,
  },
  sectionTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  countPill: {
    minWidth: 28,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 13, fontWeight: '700' },
  letter: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
  },
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  monogram: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingRight: 28,
  },
  copyText: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: '600' },
  subtitle: { fontSize: 14 },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteButton: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },
  index: {
    position: 'absolute',
    right: 4,
    top: 8,
    bottom: spacing.md,
    width: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexLetter: { fontSize: 10, fontWeight: '700', lineHeight: 13 },
  gate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  gateIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  gateTitle: { textAlign: 'center' },
  gateBody: { textAlign: 'center', lineHeight: 22 },
  empty: { alignItems: 'center', paddingTop: spacing.xl },
  skeleton: { gap: 2, paddingTop: spacing.sm },
  skeletonLine: { height: 10, borderRadius: 5 },
});
