import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { CHAT_VIDEO_UPLOAD_LABELS } from '@/services/video/progressMessages';
import type { MediaUploadStage } from '../types';

type ChatVideoUploadOverlayProps = {
  stage?: MediaUploadStage;
  progress?: number;
  etaSec?: number;
};

const STAGE_LABELS = CHAT_VIDEO_UPLOAD_LABELS;

export function ChatVideoUploadOverlay({ stage, progress = 0, etaSec }: ChatVideoUploadOverlayProps) {
  const pct = Math.round(Math.min(Math.max(progress, 0), 1) * 100);
  const radius = 22;
  const stroke = 3;
  const normalized = radius - stroke / 2;
  const circumference = normalized * 2 * Math.PI;
  const offset = circumference - (pct / 100) * circumference;
  const label = stage ? STAGE_LABELS[stage] : CHAT_VIDEO_UPLOAD_LABELS.uploading;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.ringWrap}>
        <Svg width={radius * 2} height={radius * 2}>
          <Circle
            cx={radius}
            cy={radius}
            r={normalized}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={stroke}
            fill="rgba(0,0,0,0.45)"
          />
          <Circle
            cx={radius}
            cy={radius}
            r={normalized}
            stroke="#fff"
            strokeWidth={stroke}
            fill="transparent"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${radius}, ${radius}`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          {stage === 'sending' ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="arrow-up" size={16} color="#fff" />
          )}
        </View>
      </View>

      <Text variant="caption" style={styles.label}>
        {label}
      </Text>
      {etaSec != null && etaSec > 0 && stage !== 'sending' ? (
        <Text variant="caption" style={styles.eta}>
          ~{etaSec} sn
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  ringWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  eta: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    fontSize: 10,
  },
});
