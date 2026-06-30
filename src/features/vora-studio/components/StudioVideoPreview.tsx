import { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useStudioMusicPlayer } from '@/features/music/hooks/useStudioMusicPlayer';
import { StudioPreviewOverlays, StudioTimeBadge } from '@/features/vora-studio/components/StudioPreviewOverlays';
import { useStudioEditorStore } from '@/features/vora-studio/store/editorStore';

type StudioVideoPreviewProps = {
  username: string;
};

export function StudioVideoPreview({ username }: StudioVideoPreviewProps) {
  const sourceUri = useStudioEditorStore((s) => s.sourceUri);
  const playheadSec = useStudioEditorStore((s) => s.playheadSec);
  const trimStartSec = useStudioEditorStore((s) => s.trimStartSec);
  const trimEndSec = useStudioEditorStore((s) => s.trimEndSec);
  const originalAudioVolume = useStudioEditorStore((s) => s.originalAudioVolume);
  const playbackSpeed = useStudioEditorStore((s) => s.playbackSpeed);
  const isPlaying = useStudioEditorStore((s) => s.isPlaying);
  const activeTool = useStudioEditorStore((s) => s.activeTool);
  const textOverlays = useStudioEditorStore((s) => s.textOverlays);
  const subtitles = useStudioEditorStore((s) => s.subtitles);
  const selectedTextOverlayId = useStudioEditorStore((s) => s.selectedTextOverlayId);
  const selectedMusicAudioUrl = useStudioEditorStore((s) => s.selectedMusicAudioUrl);
  const musicStartSec = useStudioEditorStore((s) => s.musicStartSec);
  const musicEndSec = useStudioEditorStore((s) => s.musicEndSec);
  const musicVolume = useStudioEditorStore((s) => s.musicVolume);
  const setPlayhead = useStudioEditorStore((s) => s.setPlayhead);
  const setPlaying = useStudioEditorStore((s) => s.setPlaying);

  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const textEditing = activeTool === 'text';
  const lastPlayheadRef = useRef(playheadSec);
  const prevPlayingRef = useRef(isPlaying);

  useStudioMusicPlayer({
    audioUrl: selectedMusicAudioUrl,
    musicStartSec,
    musicEndSec,
    musicVolume,
    trimStartSec,
    playheadSec,
    isPlaying,
  });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  };

  const player = useVideoPlayer(sourceUri ?? '', (p) => {
    p.loop = false;
    const muteOriginal = originalAudioVolume <= 0.001;
    p.muted = muteOriginal;
    p.volume = muteOriginal ? 0 : originalAudioVolume;
    p.playbackRate = playbackSpeed;
  });

  useEffect(() => {
    if (!player || !sourceUri) return;
    const muteOriginal = originalAudioVolume <= 0.001;
    player.muted = muteOriginal;
    player.volume = muteOriginal ? 0 : originalAudioVolume;
    player.playbackRate = playbackSpeed;
  }, [player, originalAudioVolume, playbackSpeed, sourceUri, selectedMusicAudioUrl]);

  useEffect(() => {
    if (!player || !sourceUri) return;

    const justStarted = isPlaying && !prevPlayingRef.current;
    const justStopped = !isPlaying && prevPlayingRef.current;
    prevPlayingRef.current = isPlaying;

    if (justStarted) {
      if (playheadSec < trimStartSec || playheadSec >= trimEndSec - 0.05) {
        player.currentTime = trimStartSec;
        lastPlayheadRef.current = trimStartSec;
        setPlayhead(trimStartSec);
      }
      void player.play();
      return;
    }

    if (justStopped) {
      player.pause();
    }
  }, [isPlaying, player, sourceUri, playheadSec, trimStartSec, trimEndSec, setPlayhead]);

  useEffect(() => {
    if (!player || !sourceUri) return;

    if (!isPlaying) {
      player.currentTime = playheadSec;
      lastPlayheadRef.current = playheadSec;
      return;
    }

    const jumped = Math.abs(playheadSec - lastPlayheadRef.current) > 0.35;
    lastPlayheadRef.current = playheadSec;
    if (jumped) {
      player.currentTime = playheadSec;
    }
  }, [playheadSec, player, sourceUri, isPlaying]);

  useEffect(() => {
    if (!player) return;
    player.timeUpdateEventInterval = 0.15;

    const subscription = player.addListener('timeUpdate', ({ currentTime }) => {
      if (!isPlaying) return;

      if (currentTime >= trimEndSec - 0.05) {
        player.pause();
        player.currentTime = trimStartSec;
        lastPlayheadRef.current = trimStartSec;
        setPlayhead(trimStartSec);
        setPlaying(false);
        return;
      }

      lastPlayheadRef.current = currentTime;
      setPlayhead(currentTime);
    });

    return () => subscription.remove();
  }, [player, setPlayhead, setPlaying, trimEndSec, trimStartSec, isPlaying]);

  if (!sourceUri) return null;

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      <VideoView player={player} style={styles.video} contentFit="contain" nativeControls={false} />
      {layout.width > 0 ? (
        <StudioPreviewOverlays
          username={username}
          playheadSec={playheadSec}
          textOverlays={textOverlays}
          subtitles={subtitles}
          showWatermark
          textEditing={textEditing}
          selectedTextId={selectedTextOverlayId}
          containerWidth={layout.width}
          containerHeight={layout.height}
        />
      ) : null}
      <StudioTimeBadge startSec={trimStartSec} endSec={trimEndSec} />

      {selectedMusicAudioUrl ? (
        <Pressable
          style={styles.musicBadge}
          onPress={() => setPlaying(!isPlaying)}
          hitSlop={8}
        >
          <Ionicons name="musical-notes" size={12} color="#fff" />
          <View style={styles.musicBadgeText}>
            <View style={[styles.musicDot, { backgroundColor: isPlaying ? '#4ADE80' : 'rgba(255,255,255,0.5)' }]} />
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={12}
              color="#fff"
            />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 240,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  musicBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  musicBadgeText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  musicDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
