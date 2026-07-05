import { MusicPickerSheet } from '@/features/music/components/MusicPickerSheet';
import type { MusicSelection } from '@/features/music/types';

type AudioPickerSheetProps = {
  visible: boolean;
  selectedTrackId?: string | null;
  onClose: () => void;
  onSelect: (selection: MusicSelection) => void;
  pauseVideo?: () => void;
  /** Geriye dönük uyumluluk — tek birleşik liste kullanılır */
  initialMode?: 'music' | 'sound';
  /** true: satıra tıklayınca detay sayfasına gitme, yalnızca seçim/önizleme */
  selectionMode?: boolean;
  /** Satıra dokununca hemen seç (hikâye ve gönderi aynı) */
  tapToSelect?: boolean;
};

/** Hikâye ve gönderi paylaşımında ortak müzik seçici. */
export function AudioPickerSheet({
  visible,
  selectedTrackId,
  onClose,
  onSelect,
  pauseVideo,
  selectionMode = true,
  tapToSelect = true,
}: AudioPickerSheetProps) {
  if (!visible) return null;

  return (
    <MusicPickerSheet
      visible
      selectedTrackId={selectedTrackId ?? null}
      onClose={onClose}
      onSelect={onSelect}
      pauseVideo={pauseVideo}
      selectionMode={selectionMode}
      tapToSelect={tapToSelect}
    />
  );
}
