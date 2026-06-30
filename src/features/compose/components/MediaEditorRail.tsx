import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';

export type MediaEditorToolId =
  | 'text'
  | 'music'
  | 'location'
  | 'filter'
  | 'rotate'
  | 'crop'
  | 'download'
  | 'audio'
  | 'trim';

type ToolDef = {
  id: MediaEditorToolId;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  videoOnly?: boolean;
  photoOnly?: boolean;
};

/** Instagram tarzı — fotoğraf ve videoda ortak + türe özel araçlar */
const TOOLS: ToolDef[] = [
  { id: 'text', icon: 'text', label: 'Metin' },
  { id: 'music', icon: 'musical-notes-outline', label: 'Müzik' },
  { id: 'location', icon: 'location-outline', label: 'Konum' },
  { id: 'filter', icon: 'color-filter-outline', label: 'Filtre' },
  { id: 'rotate', icon: 'refresh-outline', label: 'Döndür', photoOnly: true },
  { id: 'crop', icon: 'crop-outline', label: 'Kırp', photoOnly: true },
  { id: 'download', icon: 'download-outline', label: 'İndir' },
  { id: 'audio', icon: 'volume-high-outline', label: 'Ses', videoOnly: true },
  { id: 'trim', icon: 'cut-outline', label: 'Düzenle', videoOnly: true },
];

type Props = {
  visible?: boolean;
  isVideo: boolean;
  activeTool: MediaEditorToolId | null;
  hasLocation: boolean;
  hasMusic: boolean;
  hasFilter: boolean;
  audioMuted: boolean;
  onPress: (tool: MediaEditorToolId) => void;
};

export function MediaEditorRail({
  visible = true,
  isVideo,
  activeTool,
  hasLocation,
  hasMusic,
  hasFilter,
  audioMuted,
  onPress,
}: Props) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const tools = TOOLS.filter((tool) => {
    if (tool.photoOnly && isVideo) return false;
    if (tool.videoOnly && !isVideo) return false;
    return true;
  });

  return (
    <View
      style={[
        styles.railWrap,
        {
          top: insets.top + 56,
          bottom: insets.bottom + spacing.md,
        },
      ]}
      pointerEvents="box-none"
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.rail}
        showsVerticalScrollIndicator
        indicatorStyle="white"
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {tools.map((tool) => {
          const active = activeTool === tool.id;
          const badge =
            (tool.id === 'location' && hasLocation) ||
            (tool.id === 'music' && hasMusic) ||
            (tool.id === 'filter' && hasFilter) ||
            (tool.id === 'audio' && audioMuted);

          const iconName =
            tool.id === 'audio' && audioMuted ? 'volume-mute-outline' : tool.icon;

          return (
            <Pressable
              key={tool.id}
              style={[styles.item, active && styles.itemActive]}
              onPress={() => onPress(tool.id)}
              hitSlop={4}
            >
              <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                <Ionicons name={iconName} size={20} color="#fff" />
                {badge ? <View style={styles.badge} /> : null}
              </View>
              <Text style={styles.label} numberOfLines={1}>
                {tool.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  railWrap: {
    position: 'absolute',
    right: 0,
    width: 68,
    zIndex: 30,
  },
  scroll: {
    flex: 1,
  },
  rail: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingBottom: spacing.lg,
  },
  item: {
    alignItems: 'center',
    gap: 2,
    width: 60,
    paddingVertical: 2,
    borderRadius: radius.md,
  },
  itemActive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderColor: 'rgba(255,255,255,0.5)',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: '#4cd964',
    borderWidth: 1,
    borderColor: '#000',
  },
  label: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 58,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
