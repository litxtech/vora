import { useCallback, useEffect, useRef } from 'react';
import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  type IRtcEngine,
  type IRtcEngineEventHandler,
} from 'react-native-agora';
import { fetchAgoraToken, getAgoraAppId } from '@/lib/agora/client';
import { useCallStore } from '../store/callStore';
import type { CallType } from '../types';
import { uidFromUserId } from '../utils';

type JoinParams = {
  channelName: string;
  userId: string;
  callType: CallType;
};

export function useAgoraCall() {
  const engineRef = useRef<IRtcEngine | null>(null);
  const { setMedia, setJoined, media } = useCallStore();

  const ensureEngine = useCallback(() => {
    if (engineRef.current) return engineRef.current;

    const engine = createAgoraRtcEngine();
    engine.initialize({
      appId: getAgoraAppId(),
      channelProfile: ChannelProfileType.ChannelProfileCommunication,
    });
    engine.enableAudio();
    engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
    engine.setDefaultAudioRouteToSpeakerphone(false);

    engineRef.current = engine;
    return engine;
  }, []);

  const registerHandlers = useCallback(
    (engine: IRtcEngine) => {
      const handler: IRtcEngineEventHandler = {
        onUserJoined: (_connection, remoteUid) => {
          setMedia({ remoteUid });
        },
        onUserOffline: () => {
          setMedia({ remoteUid: null });
        },
      };

      engine.registerEventHandler(handler);
      return () => engine.unregisterEventHandler(handler);
    },
    [setMedia],
  );

  const joinChannel = useCallback(
    async ({ channelName, userId, callType }: JoinParams) => {
      const engine = ensureEngine();
      const uid = uidFromUserId(userId);
      const tokenResponse = await fetchAgoraToken(channelName, callType, uid);

      registerHandlers(engine);

      if (callType === 'video') {
        engine.enableVideo();
        engine.startPreview();
        setMedia({ isCameraOn: true });
      } else {
        engine.disableVideo();
        setMedia({ isCameraOn: false });
      }

      engine.joinChannel(tokenResponse.token, channelName, uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        publishCameraTrack: callType === 'video',
        autoSubscribeAudio: true,
        autoSubscribeVideo: callType === 'video',
      });

      setJoined(true);
    },
    [ensureEngine, registerHandlers, setJoined, setMedia],
  );

  const leaveChannel = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.leaveChannel();
    engine.stopPreview();
    engine.disableVideo();
    engine.release();
    engineRef.current = null;
    setJoined(false);
    setMedia({ remoteUid: null, isMuted: false, isSpeakerOn: false, isCameraOn: true });
  }, [setJoined, setMedia]);

  const toggleMute = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const next = !media.isMuted;
    engine.muteLocalAudioStream(next);
    setMedia({ isMuted: next });
  }, [media.isMuted, setMedia]);

  const toggleSpeaker = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const next = !media.isSpeakerOn;
    engine.setEnableSpeakerphone(next);
    setMedia({ isSpeakerOn: next });
  }, [media.isSpeakerOn, setMedia]);

  const toggleCamera = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const next = !media.isCameraOn;
    engine.muteLocalVideoStream(!next);
    if (next) {
      engine.enableVideo();
      engine.startPreview();
    } else {
      engine.stopPreview();
    }
    setMedia({ isCameraOn: next });
  }, [media.isCameraOn, setMedia]);

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.leaveChannel();
        engineRef.current.release();
        engineRef.current = null;
      }
    };
  }, []);

  return {
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleSpeaker,
    toggleCamera,
    remoteUid: media.remoteUid,
    isJoined: useCallStore.getState().isJoined,
  };
}
