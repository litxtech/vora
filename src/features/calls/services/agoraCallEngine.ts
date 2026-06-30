import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  OrientationMode,
  type IRtcEngine,
  type IRtcEngineEventHandler,
  VideoMirrorModeType,
} from 'react-native-agora';
import { fetchAgoraToken, getAgoraAppId } from '@/lib/agora/client';
import { activateCallAudioMode, deactivateCallAudioMode } from '@/features/calls/services/callAudioMode';
import { useCallStore } from '@/features/calls/store/callStore';
import type { CallType } from '@/features/calls/types';
import { uidFromUserId } from '@/features/calls/utils';

type JoinParams = {
  channelName: string;
  sessionId: string;
  userId: string;
  callType: CallType;
};

let engine: IRtcEngine | null = null;

function getStore() {
  return useCallStore.getState();
}

function ensureEngine(): IRtcEngine {
  if (engine) return engine;

  const next = createAgoraRtcEngine();
  next.initialize({
    appId: getAgoraAppId(),
    channelProfile: ChannelProfileType.ChannelProfileCommunication,
  });
  next.enableAudio();
  next.setClientRole(ClientRoleType.ClientRoleBroadcaster);
  next.setDefaultAudioRouteToSpeakerphone(false);

  const handler: IRtcEngineEventHandler = {
    onUserJoined: (_connection, remoteUid) => {
      getStore().setMedia({ remoteUid, remoteCameraOff: false });
    },
    onUserOffline: () => {
      getStore().setMedia({ remoteUid: null, remoteCameraOff: false });
    },
    onUserMuteVideo: (_connection, _remoteUid, muted) => {
      getStore().setMedia({ remoteCameraOff: muted });
    },
  };

  next.registerEventHandler(handler);
  engine = next;
  return next;
}

export async function joinAgoraChannel({
  channelName,
  sessionId,
  userId,
  callType,
}: JoinParams): Promise<void> {
  const rtc = ensureEngine();
  const uid = uidFromUserId(userId);
  const tokenResponse = await fetchAgoraToken(channelName, callType, sessionId);

  if (callType === 'video') {
    rtc.enableVideo();
    // Mobil 1-1 görüntülü arama: 480p/15fps encoder yükünü ciddi düşürür (ısı/pil),
    // telefon ekranında algılanan kalite korunur.
    rtc.setVideoEncoderConfiguration({
      dimensions: { width: 640, height: 480 },
      frameRate: 15,
      bitrate: 800,
      orientationMode: OrientationMode.OrientationModeAdaptive,
      mirrorMode: VideoMirrorModeType.VideoMirrorModeAuto,
    });
    rtc.startPreview();
    getStore().setMedia({ isCameraOn: true });
  } else {
    rtc.disableVideo();
    getStore().setMedia({ isCameraOn: false });
  }

  rtc.joinChannel(tokenResponse.token, channelName, uid, {
    clientRoleType: ClientRoleType.ClientRoleBroadcaster,
    publishMicrophoneTrack: true,
    publishCameraTrack: callType === 'video',
    autoSubscribeAudio: true,
    autoSubscribeVideo: callType === 'video',
  });

  getStore().setJoined(true);
  await activateCallAudioMode();
}

export async function leaveAgoraChannel(): Promise<void> {
  if (!engine) return;

  engine.leaveChannel();
  engine.stopPreview();
  engine.disableVideo();
  engine.release();
  engine = null;

  getStore().setJoined(false);
  getStore().setMedia({
    remoteUid: null,
    isMuted: false,
    isSpeakerOn: false,
    isCameraOn: true,
    isFrontCamera: true,
    remoteCameraOff: false,
  });
  await deactivateCallAudioMode();
}

export function toggleAgoraMute(): void {
  if (!engine) return;
  const { media, setMedia } = getStore();
  const next = !media.isMuted;
  engine.muteLocalAudioStream(next);
  setMedia({ isMuted: next });
}

export function toggleAgoraSpeaker(): void {
  if (!engine) return;
  const { media, setMedia } = getStore();
  const next = !media.isSpeakerOn;
  engine.setEnableSpeakerphone(next);
  setMedia({ isSpeakerOn: next });
}

export function toggleAgoraCamera(): void {
  if (!engine) return;
  const { media, setMedia } = getStore();
  const next = !media.isCameraOn;
  engine.muteLocalVideoStream(!next);
  if (next) {
    engine.enableVideo();
    engine.startPreview();
  } else {
    engine.stopPreview();
  }
  setMedia({ isCameraOn: next });
}

export function switchAgoraCamera(): void {
  if (!engine) return;
  const { media, setMedia } = getStore();
  if (!media.isCameraOn) return;
  engine.switchCamera();
  setMedia({ isFrontCamera: !media.isFrontCamera });
}

export function hasActiveAgoraEngine(): boolean {
  return engine != null;
}
