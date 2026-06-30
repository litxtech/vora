export type CallType = 'audio' | 'video';

export type CallStatus =
  | 'ringing'
  | 'accepted'
  | 'declined'
  | 'ended'
  | 'missed'
  | 'cancelled';

export const TERMINAL_CALL_STATUSES: CallStatus[] = [
  'declined',
  'ended',
  'cancelled',
  'missed',
];

export type CallParticipant = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  account_status?: 'active' | 'frozen' | 'deletion_pending' | 'deleted';
};

export type CallSession = {
  id: string;
  channel_name: string;
  caller_id: string;
  callee_id: string;
  call_type: CallType;
  status: CallStatus;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  caller?: CallParticipant;
  callee?: CallParticipant;
};

export type CallScreenMode = 'incoming' | 'outgoing' | 'active';

export type CallMediaState = {
  isMuted: boolean;
  isSpeakerOn: boolean;
  isCameraOn: boolean;
  isFrontCamera: boolean;
  remoteUid: number | null;
  remoteCameraOff: boolean;
};
