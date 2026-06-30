import {
  RenderModeType,
  VideoMirrorModeType,
  VideoSourceType,
} from 'react-native-agora';
import type { VideoCanvas } from 'react-native-agora';
import { uidFromUserId } from '@/features/calls/utils';

/** Özel uid ile yerel kamera — sourceType olmadan SDK uzak video sanıyor. */
export function buildLocalVideoCanvas(userId: string): VideoCanvas {
  return {
    uid: uidFromUserId(userId),
    sourceType: VideoSourceType.VideoSourceCamera,
    renderMode: RenderModeType.RenderModeHidden,
    mirrorMode: VideoMirrorModeType.VideoMirrorModeAuto,
  };
}

export function buildRemoteVideoCanvas(remoteUid: number): VideoCanvas {
  return {
    uid: remoteUid,
    renderMode: RenderModeType.RenderModeHidden,
    mirrorMode: VideoMirrorModeType.VideoMirrorModeDisabled,
  };
}
