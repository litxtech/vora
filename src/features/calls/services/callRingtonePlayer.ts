import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  type AudioPlayer,
} from 'expo-audio';

const INCOMING_RING = require('../../../../assets/sounds/call_incoming_ring.wav');
const OUTGOING_RINGBACK = require('../../../../assets/sounds/call_outgoing_ringback.wav');

export type CallRingtoneMode = 'incoming' | 'outgoing';

let activePlayer: AudioPlayer | null = null;

async function ensureRingtoneAudioMode(): Promise<void> {
  await setIsAudioActiveAsync(true);
  await setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'mixWithOthers',
    // FGS mediaPlayback yok; arama UI açıkken çalar (Play politikası).
    shouldPlayInBackground: false,
  });
}

export async function startCallRingtone(mode: CallRingtoneMode): Promise<void> {
  await stopCallRingtone();
  await ensureRingtoneAudioMode();

  const player = createAudioPlayer(mode === 'incoming' ? INCOMING_RING : OUTGOING_RINGBACK);
  player.loop = true;
  player.play();
  activePlayer = player;
}

export async function stopCallRingtone(): Promise<void> {
  if (!activePlayer) return;

  activePlayer.pause();
  activePlayer.release();
  activePlayer = null;
}
