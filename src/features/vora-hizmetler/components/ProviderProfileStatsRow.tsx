import {
  HizmetStatTile,
  HizmetStatsGrid,
} from '@/features/vora-hizmetler/components/HizmetStatCard';

type ProviderProfileStatsRowProps = {
  completedJobs: number;
  completionRate: number;
  responseMinutes: number | null;
  membershipYears: number;
};

export function ProviderProfileStatsRow({
  completedJobs,
  completionRate,
  responseMinutes,
  membershipYears,
}: ProviderProfileStatsRowProps) {
  return (
    <HizmetStatsGrid>
      <HizmetStatTile
        index={0}
        label="Tamamlanan İş"
        value={String(completedJobs)}
        icon="checkmark-done-outline"
        color="#0EA5E9"
      />
      <HizmetStatTile
        index={1}
        label="Tamamlama Oranı"
        value={`%${Math.round(completionRate)}`}
        icon="trophy-outline"
        color="#10B981"
      />
      <HizmetStatTile
        index={2}
        label="Yanıt Süresi"
        value={responseMinutes != null ? `${responseMinutes} dk` : '—'}
        icon="flash-outline"
        color="#06B6D4"
      />
      <HizmetStatTile
        index={3}
        label="Deneyim"
        value={`${membershipYears} yıl`}
        icon="calendar-outline"
        color="#8B5CF6"
      />
    </HizmetStatsGrid>
  );
}
