import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { ADMIN_MENU_SECTIONS, type AdminMenuAccent } from '@/features/admin/constants';
import {
  getAdminMenuSearchItems,
  groupAdminMenuSearchResults,
  searchAdminMenuItems,
  type AdminMenuSearchItem,
} from '@/features/admin/services/adminMenuSearch';
import type { PermissionMap } from '@/features/admin/services/adminPermissions';
import { AdminSearchInput } from '@/features/admin/components/shared/AdminSearchInput';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import type { UserRole } from '@/types/database';

type Props = {
  isAdmin: boolean;
  permissions?: PermissionMap | null;
  role?: UserRole | null;
  onQueryChange?: (query: string) => void;
  onActiveChange?: (active: boolean) => void;
};

function resolveAccentColor(accent: AdminMenuAccent | undefined, colors: ReturnType<typeof useTheme>['colors']) {
  switch (accent) {
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'danger':
      return colors.danger;
    case 'accent':
      return colors.accent;
    default:
      return colors.primary;
  }
}

function SearchResultRow({
  item,
  onPress,
}: {
  item: AdminMenuSearchItem;
  onPress: (item: AdminMenuSearchItem) => void;
}) {
  const { colors } = useTheme();
  const accent = resolveAccentColor(item.accent, colors);

  return (
    <Pressable
      style={({ pressed }) => [styles.resultRow, pressed && styles.resultPressed]}
      onPress={() => onPress(item)}
    >
      <View style={[styles.resultIcon, { backgroundColor: `${accent}22` }]}>
        <Ionicons name={item.icon} size={18} color={accent} />
      </View>
      <View style={styles.resultTexts}>
        <Text variant="body" style={styles.resultLabel}>
          {item.label}
        </Text>
        <Text secondary variant="caption">
          {item.section}
          {item.adminOnly ? ' · Admin' : ''}
        </Text>
      </View>
      <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

function SearchResultsCard({
  hasQuery,
  query,
  results,
  onNavigate,
  onSectionPress,
  activeSection,
}: {
  hasQuery: boolean;
  query: string;
  results: AdminMenuSearchItem[];
  onNavigate: (item: AdminMenuSearchItem) => void;
  onSectionPress: (sectionTitle: string) => void;
  activeSection: string | null;
}) {
  const { colors } = useTheme();
  const groupedResults = useMemo(() => groupAdminMenuSearchResults(results), [results]);
  const resultTitle = hasQuery
    ? activeSection
      ? `${activeSection} (${results.length})`
      : `Sonuçlar (${results.length})`
    : 'Önerilen sayfalar';

  return (
    <GlassCard style={styles.resultsCard}>
      <Text secondary variant="caption" style={styles.resultsTitle}>
        {resultTitle}
      </Text>

      <ScrollView
        style={styles.resultsScroll}
        contentContainerStyle={styles.resultsScrollContent}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {results.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={22} color={colors.textMuted} />
            <Text secondary variant="caption">
              {hasQuery ? `"${query}" için sayfa bulunamadı.` : 'Öneri bulunamadı.'}
            </Text>
          </View>
        ) : (
          groupedResults.map((group) => (
            <View key={group.section} style={styles.resultGroup}>
              <Text variant="caption" style={[styles.groupTitle, { color: colors.textSecondary }]}>
                {group.section}
              </Text>
              {group.items.map((item) => (
                <SearchResultRow key={item.id} item={item} onPress={onNavigate} />
              ))}
            </View>
          ))
        )}

        <View style={styles.hintRow}>
          <Text variant="caption" secondary style={styles.hintLabel}>
            Sekmeler
          </Text>
          <View style={styles.hintChipRow}>
            {ADMIN_MENU_SECTIONS.map((section) => {
              const active = activeSection === section.title;
              return (
                <Pressable
                  key={section.title}
                  style={[
                    styles.hintChip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? `${colors.primary}18` : `${colors.surface}AA`,
                    },
                  ]}
                  onPress={() => onSectionPress(section.title)}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: active ? colors.primary : colors.textSecondary,
                      fontWeight: '700',
                    }}
                  >
                    {section.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </GlassCard>
  );
}

export function AdminPanelSearch({
  isAdmin,
  permissions = null,
  role = null,
  onQueryChange,
  onActiveChange,
}: Props) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allItems = useMemo(() => getAdminMenuSearchItems(), []);
  const effectiveQuery = activeSection ?? query;
  const results = useMemo(
    () => searchAdminMenuItems(allItems, effectiveQuery, isAdmin, permissions, role),
    [allItems, effectiveQuery, isAdmin, permissions, role],
  );

  const setActive = (nextQuery: string, nextExpanded: boolean, nextFocused: boolean) => {
    onQueryChange?.(nextQuery);
    onActiveChange?.(nextExpanded || nextQuery.length > 0 || nextFocused);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setActiveSection(null);
    setExpanded(true);
    setActive(value, true, focused);
  };

  const handleSectionPress = (sectionTitle: string) => {
    setActiveSection(sectionTitle);
    setQuery(sectionTitle);
    setExpanded(true);
    setActive(sectionTitle, true, focused);
  };

  const handleNavigate = (item: AdminMenuSearchItem) => {
    setQuery('');
    setActiveSection(null);
    setExpanded(false);
    setFocused(false);
    setActive('', false, false);
    router.push(item.href as never);
  };

  const syncQuery = activeSection ?? query;

  const handleFocus = () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setFocused(true);
    setExpanded(true);
    setActive(syncQuery, true, true);
  };

  const handleBlur = () => {
    blurTimerRef.current = setTimeout(() => {
      setFocused(false);
      setActive(syncQuery, expanded, false);
      blurTimerRef.current = null;
    }, 150);
  };

  const handleToggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    if (!next) {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
      setQuery('');
      setActiveSection(null);
      setFocused(false);
      setActive('', false, false);
    } else {
      setActive(syncQuery, true, focused);
    }
  };

  const showResults = expanded || query.length > 0 || activeSection != null;
  const hasQuery = query.trim().length > 0 && activeSection == null;

  return (
    <View style={styles.wrap}>
      {showResults && focused ? (
        <SearchResultsCard
          hasQuery={hasQuery}
          query={effectiveQuery}
          results={results}
          onNavigate={handleNavigate}
          onSectionPress={handleSectionPress}
          activeSection={activeSection}
        />
      ) : null}

      <View style={styles.inputRow}>
        <View style={styles.inputGrow}>
          <AdminSearchInput
            value={query}
            onChangeText={handleQueryChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Modül ara… (ör. arama, şikayet, kullanıcı)"
          />
        </View>
        <Pressable
          style={[
            styles.searchBtn,
            {
              borderColor: `${colors.primary}55`,
              backgroundColor: expanded ? `${colors.primary}22` : `${colors.primary}14`,
            },
          ]}
          onPress={handleToggleExpanded}
          accessibilityRole="button"
          accessibilityLabel="Sayfa ara"
        >
          <Ionicons name={expanded ? 'close' : 'search'} size={18} color={colors.primary} />
        </Pressable>
      </View>

      {showResults && !focused ? (
        <SearchResultsCard
          hasQuery={hasQuery}
          query={effectiveQuery}
          results={results}
          onNavigate={handleNavigate}
          onSectionPress={handleSectionPress}
          activeSection={activeSection}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputGrow: { flex: 1 },
  searchBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  resultsCard: { gap: spacing.xs },
  resultsTitle: { fontWeight: '700', marginBottom: spacing.xs },
  resultsScroll: { maxHeight: 360 },
  resultsScrollContent: { gap: spacing.sm },
  resultGroup: { gap: spacing.xs },
  groupTitle: {
    fontWeight: '800',
    letterSpacing: 0.2,
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  resultPressed: { opacity: 0.75 },
  resultIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTexts: { flex: 1, gap: 2 },
  resultLabel: { fontWeight: '600' },
  empty: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  hintRow: {
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  hintLabel: {
    fontWeight: '700',
    marginBottom: 2,
  },
  hintChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  hintChip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
});
