import { Alert } from 'react-native';
import { openUrl } from '@/lib/linking/openUrl';
import { openChat } from '@/features/messaging/services/messagingNavigation';
import type { EmployerApplication, JobApplicationStatus } from '@/features/personnel-center/types';

const CONTACT_STATUSES: JobApplicationStatus[] = ['reviewing', 'interview', 'accepted'];

export function applicantDisplayName(application: EmployerApplication): string {
  if (application.applicantName) return application.applicantName;
  const snap = application.applicantProfileSnapshot;
  const fromSnapshot = snap ? `${snap.firstName} ${snap.lastName}`.trim() : '';
  return fromSnapshot || 'Aday';
}

export function applicantPhone(application: EmployerApplication): string | null {
  const phone = application.applicantProfileSnapshot?.phone?.trim();
  return phone || null;
}

export function hasSeekerSummary(application: EmployerApplication): boolean {
  const snap = application.applicantProfileSnapshot;
  if (!snap) return false;
  return Boolean(
    snap.occupation ||
      snap.experienceYears != null ||
      snap.skills.length > 0 ||
      snap.education ||
      snap.intro,
  );
}

export function openApplicantChat(application: EmployerApplication) {
  if (application.conversationId) {
    openChat(application.conversationId);
  } else {
    Alert.alert('Sohbet', 'Bu başvuru için sohbet henüz oluşturulmamış.');
  }
}

export function callApplicant(phone: string) {
  openUrl(`tel:${phone.replace(/\s/g, '')}`);
}

export function showEmployerContactOptions(application: EmployerApplication, status?: JobApplicationStatus) {
  const name = applicantDisplayName(application);
  const phone = applicantPhone(application);
  const statusNote =
    status === 'accepted'
      ? 'Başvuru kabul edildi.'
      : status === 'interview'
        ? 'Görüşme aşamasına geçildi.'
        : status === 'reviewing'
          ? 'Başvuru inceleniyor.'
          : null;

  const buttons: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [];

  if (application.conversationId) {
    buttons.push({
      text: 'Başvuru Sohbeti',
      onPress: () => openApplicantChat(application),
    });
  }

  if (phone) {
    buttons.push({
      text: 'Telefonla Ara',
      onPress: () => callApplicant(phone),
    });
  }

  buttons.push({ text: 'Tamam', style: 'cancel' });

  Alert.alert(
    name,
    [statusNote, 'Adayla mesajlaşabilir veya telefonla görüşebilirsiniz.'].filter(Boolean).join('\n\n'),
    buttons,
  );
}

export function shouldOfferContactAfterStatus(status: JobApplicationStatus): boolean {
  return CONTACT_STATUSES.includes(status);
}
