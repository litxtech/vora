export const VORA_NOTIFICATION_SENDER = 'Vora';

export function isVoraOfficialNotification(data: Record<string, unknown>, eventType: string): boolean {
  if (data.sender_label === VORA_NOTIFICATION_SENDER) return true;
  if (data.broadcast === true) return true;
  if (data.template_id != null || data.template_slug != null) return true;
  if (data.is_test === true) return true;
  return ['system', 'emergency', 'feed_activity', 'regional_alert', 'security_alert'].includes(eventType);
}
