import type { JobApplicationFormData } from '@/features/personnel-center/types';
import type { JobSeekerProfile } from '@/features/job-seekers/services/seekerData';
import { buildResumeFromSeekerProfile } from '@/features/job-seekers/services/seekerProfileUtils';
import type { Database } from '@/types/database';

export { buildResumeFromSeekerProfile };

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export function ageFromBirthDate(birthDate: string | null | undefined): string {
  if (!birthDate) return '';
  const birth = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return '';

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age > 0 && age < 120 ? String(age) : '';
}

export function buildDefaultApplicationForm(
  profile: ProfileRow | null,
  authEmail: string | null | undefined,
): JobApplicationFormData {
  const firstName =
    profile?.first_name?.trim() ||
    profile?.full_name?.trim().split(/\s+/)[0] ||
    '';
  const lastName =
    profile?.last_name?.trim() ||
    (profile?.full_name?.trim().includes(' ')
      ? profile.full_name.trim().split(/\s+/).slice(1).join(' ')
      : '');

  return {
    firstName,
    lastName,
    age: ageFromBirthDate(profile?.birth_date),
    email: profile?.email?.trim() || authEmail?.trim() || '',
    phone: '',
    resume: '',
  };
}

export function validateApplicationForm(form: JobApplicationFormData): string | null {
  if (!form.firstName.trim()) return 'Ad gerekli.';
  if (!form.lastName.trim()) return 'Soyad gerekli.';

  const age = Number.parseInt(form.age.trim(), 10);
  if (!form.age.trim() || Number.isNaN(age) || age < 16 || age > 80) {
    return 'Geçerli bir yaş girin (16–80).';
  }

  const email = form.email.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Geçerli bir e-posta girin.';
  }

  const phoneDigits = form.phone.replace(/\D/g, '');
  if (phoneDigits.length < 10) return 'Geçerli bir telefon numarası girin.';

  if (form.resume.trim().length < 30) {
    return 'Özgeçmiş en az 30 karakter olmalı.';
  }

  return null;
}

export function formatApplicationMessage(form: JobApplicationFormData): string {
  const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
  return [
    'Başvuru Formu',
    `Ad Soyad: ${fullName}`,
    `Yaş: ${form.age.trim()}`,
    `E-posta: ${form.email.trim()}`,
    `Telefon: ${form.phone.trim()}`,
    '',
    'Özgeçmiş:',
    form.resume.trim(),
  ].join('\n');
}

export function mergeFormWithSeekerProfile(
  form: JobApplicationFormData,
  seeker: JobSeekerProfile,
): JobApplicationFormData {
  const resume = buildResumeFromSeekerProfile(seeker);
  return {
    ...form,
    resume: resume.length >= 30 ? resume : form.resume,
  };
}

export function normalizeApplicationForm(form: JobApplicationFormData): JobApplicationFormData {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    age: form.age.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    resume: form.resume.trim(),
  };
}
