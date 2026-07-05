import { useCallback } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { MusicCatalogPanel } from '@/features/music/components/MusicCatalogPanel';
import { isMusicTrackPlayable } from '@/features/music/constants';
import { catalogItemToMusicSelection } from '@/features/music/services/audioCatalog';
import type { AudioCatalogItem, MusicSelection } from '@/features/music/types';
import { isPersistableMusicTrackId } from '@/features/music/utils/trackId';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MusicPickerSheetProps = {
  visible: boolean;
  selectedTrackId: string | null;
  onClose: () => void;
  onSelect: (selection: MusicSelection) => void;
  pauseVideo?: () => void;
  selectionMode?: boolean;
  tapToSelect?: boolean;
};

export function MusicPickerSheet({
  visible,
  selectedTrackId,
  onClose,
  onSelect,
  pauseVideo,
  selectionMode = true,
  tapToSelect = true,
}: MusicPickerSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const handleAddTrack = useCallback(
    (track: AudioCatalogItem) => {
      if (!isMusicTrackPlayable(track.audioUrl)) {
        Alert.alert('Ses dosyası yok', 'Bu parçanın sesi henüz yüklenmemiş.');
        return;
      }
      if (track.source === 'music' && !isPersistableMusicTrackId(track.id)) {
        Alert.alert('Demo parça', 'Paylaşım için listeden lisanslı bir parça seçin.');
        return;
      }
      onSelect(catalogItemToMusicSelection(track));
      onClose();
    },
    [onClose, onSelect],
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!visible) return null;

  return (
    <Modal
      visible
      animationType={resolveModalAnimationType('slide')}
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <GradientBackground>
        <View style={[styles.screen, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Pressable onPress={handleClose} hitSlop={12} style={styles.iconBtn}>
              <Ionicons name="chevron-down" size={24} color={colors.text} />
            </Pressable>
            <Text variant="label" style={styles.headerTitle}>
              Müzik ekle
            </Text>
            <View style={styles.iconBtn} />
          </View>

          <MusicCatalogPanel
            active={visible}
            contentBottomInset={insets.bottom}
            selectedTrackId={selectedTrackId}
            selectionMode={selectionMode}
            tapToSelect={tapToSelect}
            heroTitle="Müzik ekle"
            heroSubtitle="Hikâyene parça seç veya önizle"
            previewActionLabel="Kullan"
            onBeforePreview={pauseVideo}
            onPickTrack={handleAddTrack}
          />
        </View>
      </GradientBackground>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  iconBtn: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
