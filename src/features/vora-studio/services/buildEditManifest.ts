import { VCTS_WATERMARK_VERSION } from '@/features/vcts/constants';
import { VORA_STUDIO_VERSION } from '@/features/vora-studio/constants';
import { getMusicTrackByIdSync } from '@/features/vora-studio/services/musicLibrary';
import type { StudioEditManifest, StudioEditorState } from '@/features/vora-studio/types';
import { formatStudioTime } from '@/features/vora-studio/utils/time';

function buildFfmpegCommands(state: StudioEditorState, username: string): string[] {
  const commands: string[] = [];
  const input = 'input.mp4';
  const output = 'output.mp4';

  const trimStart = formatStudioTime(state.trimStartSec);
  const trimEnd = formatStudioTime(state.trimEndSec);
  commands.push(`ffmpeg -i ${input} -ss ${trimStart} -to ${trimEnd} trimmed.mp4`);

  if (state.originalAudioVolume === 0) {
    commands.push('ffmpeg -i trimmed.mp4 -an muted.mp4');
  } else if (state.originalAudioVolume < 1) {
    commands.push(
      `ffmpeg -i trimmed.mp4 -filter:a "volume=${state.originalAudioVolume.toFixed(2)}" vol.mp4`,
    );
  }

  if (state.selectedMusicId) {
    const track = getMusicTrackByIdSync(state.selectedMusicId);
    if (track) {
      const clipDuration = (state.musicEndSec - state.musicStartSec).toFixed(2);
      const musicStart = formatStudioTime(state.musicStartSec);
      commands.push(
        `ffmpeg -i trimmed.mp4 -ss ${musicStart} -i music.mp3 -t ${clipDuration} -filter_complex "[1:a]volume=${state.musicVolume.toFixed(2)}[m];[0:a][m]amix=inputs=2:duration=first" mixed.mp4`,
      );
    }
  }

  if (state.voiceOver) {
    commands.push(
      `ffmpeg -i mixed.mp4 -i voiceover.m4a -filter_complex "amix=inputs=2" voiced.mp4`,
    );
  }

  if (state.playbackSpeed !== 1) {
    commands.push(`ffmpeg -i output.mp4 -filter:v "setpts=${(1 / state.playbackSpeed).toFixed(3)}*PTS" speed.mp4`);
  }

  if (state.textOverlays.length > 0) {
    const drawtext = state.textOverlays
      .map(
        (t) =>
          `drawtext=text='${t.text.replace(/'/g, "\\'")}':fontsize=${t.fontSize}:fontcolor=${t.color}:x=${Math.round(t.x * 100)}:y=${Math.round(t.y * 100)}:enable='between(t,${t.startSec},${t.endSec})'`,
      )
      .join(',');
    commands.push(`ffmpeg -i output.mp4 -vf "${drawtext}" texted.mp4`);
  }

  commands.push(
    `ffmpeg -i output.mp4 -vf "drawtext=text='VORA @${username}':x=10:y=10:fontsize=14:fontcolor=white@0.8" watermarked.mp4`,
  );

  commands.push(`ffmpeg -i watermarked.mp4 -metadata comment="vora:v${VORA_STUDIO_VERSION}" ${output}`);

  return commands;
}

export function buildEditManifest(
  state: StudioEditorState,
  username: string,
  publisherKeyHash?: string | null,
): StudioEditManifest | null {
  if (!state.sourceUri) return null;

  return {
    version: 1,
    sourceUri: state.sourceUri,
    durationSec: state.durationSec,
    trimStartSec: state.trimStartSec,
    trimEndSec: state.trimEndSec,
    clips: state.clips,
    originalAudioVolume: state.originalAudioVolume,
    playbackSpeed: state.playbackSpeed,
    musicTrackId: state.selectedMusicId,
    musicStartSec: state.musicStartSec,
    musicEndSec: state.musicEndSec,
    musicVolume: state.musicVolume,
    voiceOver: state.voiceOver,
    textOverlays: state.textOverlays,
    subtitles: state.subtitles,
    thumbnailTimeSec: state.thumbnailTimeSec,
    watermark: {
      username,
      publisherKeyHash: publisherKeyHash ?? null,
      contentHash: null,
      version: VCTS_WATERMARK_VERSION,
    },
    ffmpegCommands: buildFfmpegCommands(state, username),
  };
}
