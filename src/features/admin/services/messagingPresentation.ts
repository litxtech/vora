import type { ContentReportRow, ReportQueueStatus } from '@/features/admin/types';
import type { ReportReason } from '@/types/database';

export type MessagingReportRow = ContentReportRow & {
  reporter_username: string | null;
};

export type MessagingTargetType = 'message' | 'conversation' | 'call';
export type MessagingStatusFilter = ReportQueueStatus | 'all';
export type MessagingTargetFilter = MessagingTargetType | 'all';

export const MESSAGING_TARGET_TYPES: MessagingTargetType[] = ['message', 'conversation', 'call'];

export const MESSAGING_TARGET_LABELS: Record<MessagingTargetType, string> = {
  message: 'Mesaj',
  conversation: 'Sohbet',
  call: 'Arama',
};

export const MESSAGING_TARGET_ICONS: Record<MessagingTargetType, string> = {
  message: 'chatbubble-outline',
  conversation: 'chatbubbles-outline',
  call: 'call-outline',
};

export const MESSAGING_STATUS_FILTERS: { id: MessagingStatusFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'pending', label: 'Bekliyor' },
  { id: 'reviewing', label: 'İnceleniyor' },
  { id: 'approved', label: 'Onaylandı' },
  { id: 'rejected', label: 'Reddedildi' },
];

export const MESSAGING_TARGET_FILTERS: { id: MessagingTargetFilter; label: string }[] = [
  { id: 'all', label: 'Tüm türler' },
  { id: 'message', label: 'Mesaj' },
  { id: 'conversation', label: 'Sohbet' },
  { id: 'call', label: 'Arama' },
];

export type MessagingSummaryStats = {
  total: number;
  pending: number;
  reviewing: number;
  resolved: number;
  urgent: number;
  byTarget: Record<MessagingTargetType, number>;
};

export type MessagingStatusTone = 'default' | 'primary' | 'success' | 'warning' | 'danger';

export function formatMessagingRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return new Date(iso).toLocaleString('tr-TR');
}

export function formatMessagingDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isUrgentMessagingReport(reason: ReportReason): boolean {
  return reason === 'child_safety' || reason === 'threat' || reason === 'violence';
}

export function messagingStatusTone(status: ReportQueueStatus): MessagingStatusTone {
  if (status === 'pending') return 'warning';
  if (status === 'reviewing') return 'primary';
  if (status === 'approved') return 'success';
  return 'default';
}

export function computeMessagingStats(reports: MessagingReportRow[]): MessagingSummaryStats {
  const byTarget: Record<MessagingTargetType, number> = {
    message: 0,
    conversation: 0,
    call: 0,
  };

  let pending = 0;
  let reviewing = 0;
  let resolved = 0;
  let urgent = 0;

  for (const report of reports) {
    const target = report.target_type as MessagingTargetType;
    if (target in byTarget) byTarget[target] += 1;

    if (report.status === 'pending') pending += 1;
    else if (report.status === 'reviewing') reviewing += 1;
    else resolved += 1;

    if (isUrgentMessagingReport(report.reason) && report.status !== 'approved' && report.status !== 'rejected') {
      urgent += 1;
    }
  }

  return {
    total: reports.length,
    pending,
    reviewing,
    resolved,
    urgent,
    byTarget,
  };
}

export function filterMessagingReports(
  reports: MessagingReportRow[],
  search: string,
  statusFilter: MessagingStatusFilter,
  targetFilter: MessagingTargetFilter,
): MessagingReportRow[] {
  const q = search.trim().toLowerCase();

  return reports.filter((report) => {
    if (statusFilter !== 'all' && report.status !== statusFilter) return false;
    if (targetFilter !== 'all' && report.target_type !== targetFilter) return false;

    if (!q) return true;

    const reporter = report.reporter_username?.toLowerCase() ?? '';
    const details = report.details?.toLowerCase() ?? '';
    const reason = report.reason.toLowerCase();
    const targetId = report.target_id.toLowerCase();

    return (
      reporter.includes(q) ||
      details.includes(q) ||
      reason.includes(q) ||
      targetId.includes(q) ||
      (MESSAGING_TARGET_LABELS[report.target_type as MessagingTargetType]?.toLowerCase().includes(q) ?? false)
    );
  });
}

export function messagingReportHeadline(report: MessagingReportRow): string {
  const target = MESSAGING_TARGET_LABELS[report.target_type as MessagingTargetType] ?? report.target_type;
  const reporter = report.reporter_username ? `@${report.reporter_username}` : 'Anonim';
  return `${target} şikayeti · ${reporter}`;
}
