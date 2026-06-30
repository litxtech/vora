import { useCallback } from 'react';
import {
  joinAgoraChannel,
  leaveAgoraChannel,
  switchAgoraCamera,
  toggleAgoraCamera,
  toggleAgoraMute,
  toggleAgoraSpeaker,
} from '@/features/calls/services/agoraCallEngine';
import { useCallStore } from '../store/callStore';
import type { CallType } from '../types';

type JoinParams = {
  channelName: string;
  sessionId: string;
  userId: string;
  callType: CallType;
};

export function useAgoraCall() {
  const media = useCallStore((s) => s.media);
  const isJoined = useCallStore((s) => s.isJoined);

  const joinChannel = useCallback(async (params: JoinParams) => {
    await joinAgoraChannel(params);
  }, []);

  const leaveChannel = useCallback(async () => {
    await leaveAgoraChannel();
  }, []);

  const toggleMute = useCallback(() => {
    toggleAgoraMute();
  }, []);

  const toggleSpeaker = useCallback(() => {
    toggleAgoraSpeaker();
  }, []);

  const toggleCamera = useCallback(() => {
    toggleAgoraCamera();
  }, []);

  const switchCamera = useCallback(() => {
    switchAgoraCamera();
  }, []);

  return {
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleSpeaker,
    toggleCamera,
    switchCamera,
    remoteUid: media.remoteUid,
    isJoined,
  };
}
