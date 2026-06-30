import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import {
  PUSH_DEEP_LINK_NONE,
  QUICK_PUSH_DEFAULTS,
} from '@/features/push-automation/constants';
import type {
  PushAutomationRun,
  PushAutomationTemplate,
  PushAutomationTemplateInput,
} from '@/features/push-automation/types';
import {
  ensureUniquePushTemplateSlug,
  formatPushAutomationError,
  slugifyPushTemplate,
} from '@/features/push-automation/utils/slug';

function mapTemplate(row: Record<string, unknown>): PushAutomationTemplate {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    enabled: row.enabled as boolean,
    triggerType: row.trigger_type as PushAutomationTemplate['triggerType'],
    eventType: row.event_type as string,
    title: row.title as string,
    body: row.body as string,
    imageUrl: (row.image_url as string | null) ?? null,
    deepLink: (row.deep_link as string | null) ?? null,
    regionIds: (row.region_ids as string[] | null) ?? null,
    minPostsInWindow: row.min_posts_in_window as number,
    activityWindowMinutes: row.activity_window_minutes as number,
    userCooldownHours: row.user_cooldown_hours as number,
    regionCooldownMinutes: row.region_cooldown_minutes as number,
    intervalHours: row.interval_hours != null ? Number(row.interval_hours) : null,
    intervalDays: row.interval_days != null ? Number(row.interval_days) : null,
    nextRunAt: (row.next_run_at as string | null) ?? null,
    lastRunAt: (row.last_run_at as string | null) ?? null,
    lastRunRecipients: (row.last_run_recipients as number) ?? 0,
    sortOrder: (row.sort_order as number) ?? 0,
    prefKey: (row.pref_key as string) ?? 'feed',
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapRun(row: Record<string, unknown>): PushAutomationRun {
  return {
    id: row.id as string,
    templateId: (row.template_id as string | null) ?? null,
    status: row.status as PushAutomationRun['status'],
    recipientsCount: (row.recipients_count as number) ?? 0,
    regionId: (row.region_id as string | null) ?? null,
    details: (row.details as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
  };
}

function toPayload(input: PushAutomationTemplateInput): Record<string, unknown> {
  return {
    id: input.id ?? null,
    name: input.name,
    slug: input.slug,
    enabled: input.enabled,
    trigger_type: input.triggerType,
    event_type: input.eventType,
    title: input.title,
    body: input.body,
    image_url: input.imageUrl ?? null,
    deep_link: input.deepLink ?? null,
    region_ids: input.regionIds ?? [],
    min_posts_in_window: input.minPostsInWindow,
    activity_window_minutes: input.activityWindowMinutes,
    user_cooldown_hours: input.userCooldownHours,
    region_cooldown_minutes: input.regionCooldownMinutes,
    interval_hours: input.intervalHours ?? null,
    interval_days: input.intervalDays ?? null,
    next_run_at: input.nextRunAt ?? null,
    sort_order: input.sortOrder,
    pref_key: input.prefKey,
  };
}

export async function fetchPushAutomationTemplates(): Promise<{
  data: PushAutomationTemplate[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('admin_list_push_automation_templates', {
    p_limit: 100,
  });
  if (error) return { data: [], error: formatPushAutomationError(error.message) };
  return { data: (data ?? []).map((row) => mapTemplate(row as Record<string, unknown>)), error: null };
}

export async function fetchPushAutomationRuns(templateId?: string): Promise<{
  data: PushAutomationRun[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('admin_list_push_automation_runs', {
    p_template_id: templateId ?? null,
    p_limit: 30,
  });
  if (error) return { data: [], error: supabaseErrorMessage(error)! };
  return { data: (data ?? []).map((row) => mapRun(row as Record<string, unknown>)), error: null };
}

export async function upsertPushAutomationTemplate(
  input: PushAutomationTemplateInput,
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_upsert_push_automation_template', {
    p_payload: toPayload(input),
  });
  return {
    id: (data as string | null) ?? null,
    error: error ? formatPushAutomationError(error.message) : null,
  };
}

export async function deletePushAutomationTemplate(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_delete_push_automation_template', { p_id: id });
  return { error: supabaseErrorMessage(error) };
}

export async function previewQuickPushRecipients(
  regionId?: string,
): Promise<{ count: number; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_preview_broadcast_recipients', {
    p_audience: {
      segment: 'all',
      region_id: regionId ?? null,
      require_push_token: true,
    },
  });
  return { count: (data as number | null) ?? 0, error: supabaseErrorMessage(error) };
}

export type QuickPushInput = {
  title: string;
  body: string;
  regionScope: string;
  sendWhen: 'now' | 'scheduled';
  scheduleIso?: string | null;
  imageUri?: string | null;
  deepLink?: string | null;
  saveAsCampaign?: boolean;
  campaignName?: string;
  existingTemplates: PushAutomationTemplate[];
};

export async function sendQuickPush(
  input: QuickPushInput,
): Promise<{
  recipients: number;
  pushProcessed: number;
  error: string | null;
  scheduled: boolean;
}> {
  const name =
    input.campaignName?.trim() ||
    input.title.trim().slice(0, 48) ||
    `Push ${new Date().toLocaleDateString('tr-TR')}`;
  const baseSlug = slugifyPushTemplate(name);
  const slug = ensureUniquePushTemplateSlug(
    `${baseSlug}-${Date.now().toString(36).slice(-4)}`,
    input.existingTemplates,
  );

  const triggerType = input.sendWhen === 'scheduled' ? 'scheduled' : 'manual';
  const payload: PushAutomationTemplateInput = {
    name,
    slug,
    title: input.title.trim(),
    body: input.body.trim(),
    ...QUICK_PUSH_DEFAULTS,
    enabled: true,
    triggerType,
    deepLink: input.deepLink ?? PUSH_DEEP_LINK_NONE,
    regionIds: input.regionScope === 'all' ? null : [input.regionScope],
    nextRunAt: input.sendWhen === 'scheduled' ? (input.scheduleIso ?? null) : null,
    imageUrl: input.imageUri ?? null,
  };

  const { id, error: saveError } = await upsertPushAutomationTemplate(payload);
  if (saveError || !id) {
    return { recipients: 0, pushProcessed: 0, error: saveError ?? 'Kayıt başarısız', scheduled: false };
  }

  if (input.imageUri?.startsWith('file://')) {
    const up = await uploadPushTemplateImage(id, input.imageUri);
    if (up.url) {
      await upsertPushAutomationTemplate({ ...payload, id, imageUrl: up.url });
    }
  }

  if (input.sendWhen === 'scheduled') {
    return { recipients: 0, pushProcessed: 0, error: null, scheduled: true };
  }

  const region = input.regionScope === 'all' ? undefined : input.regionScope;
  const run = await runPushAutomationTemplate(id, region);

  if (!input.saveAsCampaign) {
    // Tek seferlik hızlı gönderim — kampanya listesini şişirmemek için sil
    await deletePushAutomationTemplate(id);
  }

  return {
    recipients: run.recipients,
    pushProcessed: run.pushProcessed,
    error: run.error,
    scheduled: false,
  };
}

export async function previewPushAutomationTemplate(
  templateId: string,
  regionId?: string,
): Promise<{ count: number; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_preview_push_automation_template', {
    p_template_id: templateId,
    p_region_id: regionId ?? null,
  });
  return { count: (data as number | null) ?? 0, error: supabaseErrorMessage(error) };
}

export async function runPushAutomationTemplate(
  templateId: string,
  regionId?: string,
): Promise<{ recipients: number; error: string | null; pushProcessed: number }> {
  const { data, error } = await supabase.rpc('admin_run_push_automation_template', {
    p_template_id: templateId,
    p_region_id: regionId ?? null,
    p_force: true,
  });
  if (error) {
    return { recipients: 0, error: supabaseErrorMessage(error)!, pushProcessed: 0 };
  }

  const recipients = (data as number | null) ?? 0;
  return {
    recipients,
    error: null,
    pushProcessed: recipients,
  };
}

export async function testPushAutomationTemplate(
  templateId: string,
): Promise<{ error: string | null; pushProcessed: number }> {
  const { error } = await supabase.rpc('admin_test_push_automation_template', {
    p_template_id: templateId,
  });
  if (error) {
    return { error: supabaseErrorMessage(error)!, pushProcessed: 0 };
  }

  return { error: null, pushProcessed: 1 };
}

export async function uploadPushTemplateImage(
  templateId: string,
  localUri: string,
): Promise<{ url: string | null; error: string | null }> {
  const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
  const storagePath = `templates/${templateId}.${safeExt}`;

  const buffer = await readLocalFileBytes(localUri);
  const mime =
    safeExt === 'png'
      ? 'image/png'
      : safeExt === 'webp'
        ? 'image/webp'
        : safeExt === 'gif'
          ? 'image/gif'
          : 'image/jpeg';

  const { error: uploadError } = await supabase.storage
    .from('push-template-images')
    .upload(storagePath, buffer, { contentType: mime, upsert: true });

  if (uploadError) return { url: null, error: uploadError.message };

  const { data: urlData } = supabase.storage.from('push-template-images').getPublicUrl(storagePath);
  return { url: urlData.publicUrl, error: null };
}

const PUSH_TEMPLATE_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const;

export async function removePushTemplateImage(
  templateId: string,
): Promise<{ error: string | null }> {
  const paths = PUSH_TEMPLATE_IMAGE_EXTENSIONS.map((ext) => `templates/${templateId}.${ext}`);
  const { error: storageError } = await supabase.storage.from('push-template-images').remove(paths);
  if (storageError) return { error: storageError.message };
  return { error: null };
}
