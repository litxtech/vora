import { JOB_TYPE_OPTIONS, MILITARY_STATUS_OPTIONS } from '@/features/personnel-center/constants';
import type { JobSeekerProfile } from '@/features/job-seekers/services/seekerData';

export function computeProfileCompletion(input: {
  occupation: string;
  intro: string;
  experienceYears: string;
  skills: string[];
  jobTypes: string[];
  education: string;
  languages: string;
}): number {
  const checks = [
    input.occupation.trim().length > 0,
    input.intro.trim().length >= 20,
    Number.parseInt(input.experienceYears, 10) >= 0,
    input.skills.length > 0,
    input.jobTypes.length > 0,
    input.education.trim().length > 0,
    input.languages.trim().length > 0,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export function hasUsableSeekerProfileContent(seeker: JobSeekerProfile | null): boolean {
  if (!seeker) return false;
  const resume = buildResumeFromSeekerProfile(seeker);
  return resume.trim().length >= 30;
}

export function buildResumeFromSeekerProfile(seeker: JobSeekerProfile): string {
  const parts: string[] = [];

  if (seeker.intro?.trim()) parts.push(seeker.intro.trim());

  const experience =
    seeker.experienceYears > 0 ? `${seeker.experienceYears} yıl ${seeker.occupation} deneyimi` : seeker.occupation;
  if (experience) parts.push(`Deneyim: ${experience}`);

  if (seeker.education?.trim()) parts.push(`Eğitim: ${seeker.education.trim()}`);

  if (seeker.skills.length > 0) parts.push(`Yetenekler: ${seeker.skills.join(', ')}`);

  if (seeker.jobTypes.length > 0) {
    const labels = seeker.jobTypes
      .map((t) => JOB_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t)
      .join(', ');
    parts.push(`Çalışma tercihi: ${labels}`);
  }

  if (seeker.languages.length > 0) parts.push(`Diller: ${seeker.languages.join(', ')}`);

  if (seeker.salaryExpectation?.trim()) parts.push(`Maaş beklentisi: ${seeker.salaryExpectation.trim()}`);

  if (seeker.drivingLicense) parts.push('Ehliyet: Var');

  if (seeker.militaryStatus) {
    const label = MILITARY_STATUS_OPTIONS.find((o) => o.value === seeker.militaryStatus)?.label;
    if (label) parts.push(`Askerlik: ${label}`);
  }

  if (seeker.isReady) parts.push('Hemen çalışmaya hazırım.');

  return parts.join('\n\n');
}
