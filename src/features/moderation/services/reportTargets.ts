import type { MapDetailType } from '@/features/map/types';

export function mapDetailToReportTarget(type: MapDetailType): string | null {
  switch (type) {
    case 'businesses':
      return 'business';
    case 'jobs':
      return 'job_listing';
    case 'staff':
      return 'staff_request';
    case 'events':
      return 'event';
    case 'lost_found':
      return 'lost_item';
    default:
      return null;
  }
}
