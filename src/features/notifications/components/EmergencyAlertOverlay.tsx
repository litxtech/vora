import { Modal, Pressable, StyleSheet, Vibration, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { emergencyLabel } from '@/constants/notifications';
import { EMERGENCY_ACCENT } from '@/features/notifications/constants';
import type { EmergencyAlertPayload } from '@/lib/notifications/types';
import { navigateFromNotification } from '@/lib/notifications/navigation';
import { spacing } from '@/constants/theme';

type Props = {
  alert: EmergencyAlertPayload | null;
  onDismiss: () => void;
};

export function EmergencyAlertOverlay({ alert, onDismiss }: Props) {
  if (!alert) return null;

  const emergencyType = alert.data.emergency_type as string | undefined;
  const label = emergencyLabel(emergencyType);

  const handleOpen = () => {
    navigateFromNotification(alert.eventType, alert.data);
    onDismiss();
  };

  return (
    <Modal visible animationType={resolveModalAnimationType('slide')} presentationStyle="fullScreen" onShow={() => Vibration.vibrate([0, 400, 200, 400])}>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="warning" size={56} color="#fff" />
        </View>
        <Text style={styles.badge}>ACİL DURUM</Text>
        <Text style={styles.title}>{label}</Text>
        <Text style={styles.alertTitle}>{alert.title}</Text>
        <Text style={styles.body}>{alert.body}</Text>

        <View style={styles.actions}>
          <Button title="Detayları Gör" onPress={handleOpen} />
          <Pressable onPress={onDismiss} style={styles.dismiss}>
            <Text style={styles.dismissText}>Kapat</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: EMERGENCY_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  badge: {
    color: '#FFCDD2',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  alertTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  body: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  dismiss: {
    alignItems: 'center',
    padding: spacing.md,
  },
  dismissText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
  },
});
