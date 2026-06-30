import type { PushAutomationTemplate } from '@/features/push-automation/types';
import { toUserFacingError } from '@/lib/errors';

const SLUG_MAX_LEN = 50;

export function slugifyPushTemplate(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LEN);
}

export function isValidPushTemplateSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{1,48}[a-z0-9]$/.test(slug);
}

export function isPushTemplateSlugTaken(
  slug: string,
  templates: PushAutomationTemplate[],
  excludeId?: string,
): boolean {
  return templates.some((template) => template.slug === slug && template.id !== excludeId);
}

export function ensureUniquePushTemplateSlug(
  baseSlug: string,
  templates: PushAutomationTemplate[],
  excludeId?: string,
): string {
  if (!isPushTemplateSlugTaken(baseSlug, templates, excludeId)) {
    return baseSlug;
  }

  let suffix = 2;
  while (suffix < 10_000) {
    const tail = `-${suffix}`;
    const trimmed = baseSlug.slice(0, SLUG_MAX_LEN - tail.length).replace(/-+$/, '');
    const candidate = `${trimmed}${tail}`;
    if (isValidPushTemplateSlug(candidate) && !isPushTemplateSlugTaken(candidate, templates, excludeId)) {
      return candidate;
    }
    suffix += 1;
  }

  return `${baseSlug.slice(0, 40)}-${Date.now().toString(36)}`;
}

export function formatPushAutomationError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes('push_automation_templates_slug_key') ||
    (lower.includes('duplicate key value violates unique constraint') && lower.includes('slug')) ||
    lower.includes('bu slug zaten kullanılıyor')
  ) {
    return 'Bu slug zaten kullanılıyor. Slug alanına benzersiz bir değer girin.';
  }
  if (lower.includes('geçersiz slug')) {
    return message;
  }
  return toUserFacingError(message, { fallback: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.' });
}
