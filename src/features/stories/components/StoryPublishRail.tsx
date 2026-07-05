import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';

export type StoryPublishToolId = 'music' | 'location' | 'link' | 'audio' | 'text';

type ToolDef = {
  id: StoryPublishToolId;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  videoOnly?: boolean;
};

/** Instagram tarzı — fotoğraf ve videoda ortak + türe özel araçlar */
const TOOLS: ToolDef[] = [
  { id: 'text', icon: 'text-outline', label: 'Metin' },
  { id: 'audio', icon: 'volume-high-outline', label: 'Ses', videoOnly: true },
  { id: 'music', icon: 'musical-notes-outline', label: 'Müzik' },
  { id: 'link', icon: 'link-outline', label: 'Link' },
  { id: 'location', icon: 'location-outline', label: 'Konum' },
];

type StoryPublishRailProps = {
  isVideo: boolean;
  activeTool: StoryPublishToolId | null;
  hasMusic: boolean;
  hasLocation: boolean;
  hasLinks: boolean;
  hasText: boolean;
  videoAudioMuted: boolean;
  onPress: (tool: StoryPublishToolId) => void;
};

export function StoryPublishRail({
  isVideo,
  activeTool,
  hasMusic,
  hasLocation,
  hasLinks,
  hasText,
  videoAudioMuted,
  onPress,
}: StoryPublishRailProps) {
  const insets = useSafeAreaInsets();

  const tools = TOOLS.filter((tool) => !tool.videoOnly || isVideo);

  return (
    <View
      style={[styles.railWrap, { top: insets.top + 52, bottom: insets.bottom + 120 }]}
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
            (tool.id === 'music' && hasMusic) ||
            (tool.id === 'link' && hasLinks) ||
            (tool.id === 'location' && hasLocation) ||
            (tool.id === 'text' && hasText) ||
            (tool.id === 'audio' && videoAudioMuted);

          const iconName =
            tool.id === 'audio' && videoAudioMuted ? 'volume-mute-outline' : tool.icon;

          return (
            <Pressable
              key={tool.id}
              style={[
                styles.item,
                (active || (tool.id === 'audio' && videoAudioMuted)) && styles.itemActive,
              ]}
              onPress={() => onPress(tool.id)}
              hitSlop={4}
            >
              <View
                style={[
                  styles.iconWrap,
                  (active || (tool.id === 'audio' && videoAudioMuted)) && styles.iconWrapActive,
                ]}
              >
                <Ionicons name={iconName} size={20} color="#fff" />
                {badge && tool.id !== 'audio' ? <View style={styles.badge} /> : null}
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
