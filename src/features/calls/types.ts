export type CallType = 'audio' | 'video';

export type CallStatus =
  | 'ringing'
  | 'accepted'
  | 'declined'
  | 'ended'
  | 'missed'
  | 'cancelled';

export type CallParticipant = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
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
  remoteUid: number | null;
};
