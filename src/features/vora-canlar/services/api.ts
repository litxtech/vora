import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import { CANLAR_POLICY_VERSION } from '@/features/vora-canlar/constants';
import { openUrl } from '@/lib/linking/openUrl';

type RpcError = { message: string } | null;

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const client = supabase as unknown as {
    rpc: (name: string, params?: Record<string, unknown>) => Promise<{ data: T | null; error: RpcError }>;
  };
  const { data, error } = await client.rpc(fn, args);
  return { data, error: error ? supabaseErrorMessage(error) : null };
}

export type CanlarHomeFeed = {
  featured: CanlarCaseCard[];
  urgent: CanlarCaseCard[];
  new_reports: CanlarCaseCard[];
  in_treatment: CanlarCaseCard[];
  campaigns: CanlarCampaignCard[];
  updates: CanlarUpdateCard[];
  resolved: CanlarCaseCard[];
  aid_needs: CanlarCampaignCard[];
  followed: CanlarUpdateCard[];
  posts: CanlarPostCard[];
};

export type CanlarPostCard = {
  id: string;
  body: string;
  city_label?: string | null;
  species?: string | null;
  urgency?: string;
  media?: { url?: string; kind?: string }[];
  like_count?: number;
  comment_count?: number;
  vora_post_id?: string | null;
  case_id?: string | null;
  campaign_id?: string | null;
  created_at?: string;
};

export type CanlarCaseCard = {
  id: string;
  public_code?: string;
  species?: string;
  name?: string | null;
  city_label?: string;
  status?: string;
  treatment_status?: string;
  urgency?: string;
  summary?: string;
  cover_url?: string | null;
  outcome_note?: string | null;
  created_at?: string;
};

export type CanlarCampaignCard = {
  id: string;
  case_id?: string;
  title: string;
  purpose?: string;
  help_kind?: string;
  status?: string;
  payments_enabled?: boolean;
  target_minor?: number;
  currency?: string;
  payout_model?: string;
};

export type CanlarUpdateCard = {
  id?: string;
  case_id?: string;
  public_code?: string;
  name?: string | null;
  city_label?: string;
  to_status?: string | null;
  note?: string | null;
  status?: string;
  created_at?: string;
};

export type CanlarMoney = {
  donor_net_of_refunds_minor: number;
  processor_fee_minor: number;
  other_deduction_minor: number;
  campaign_net_minor: number;
  pending_gross_minor: number;
  disputed_minor: number;
  failed_gross_minor: number;
  fee_unknown_count: number;
  paid_out_minor: number;
  approved_expense_minor: number;
  available_minor: number;
  missing_proof_minor: number;
};

export function loadCanlarHome() {
  return rpc<CanlarHomeFeed>('canlar_home_feed');
}

export function searchCanlarCases(filters: Record<string, string | number | null>) {
  return rpc<CanlarCaseCard[]>('canlar_search', { p_filters: filters });
}

export function loadPostDetail(id: string) {
  return rpc<Record<string, unknown>>('canlar_post_detail', { p_id: id });
}

export function loadCaseDetail(id: string) {
  return rpc<Record<string, unknown>>('canlar_case_detail', { p_id: id });
}

export function createCanlarCase(input: {
  species: string;
  name: string;
  traits: string;
  summary: string;
  city: string;
  region: string | null;
  urgency: string;
  latitude: number | null;
  longitude: number | null;
  addressNote: string;
}) {
  return rpc<string>('canlar_create_case', {
    p_species: input.species,
    p_name: input.name,
    p_traits: input.traits,
    p_summary: input.summary,
    p_city: input.city,
    p_region: input.region,
    p_urgency: input.urgency,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_address_note: input.addressNote,
  });
}

export function appendCaseEvent(input: {
  caseId: string;
  status: string;
  treatment: string | null;
  note: string;
  isPublic: boolean;
}) {
  return rpc<string>('canlar_append_case_event', {
    p_case_id: input.caseId,
    p_status: input.status,
    p_treatment: input.treatment,
    p_note: input.note,
    p_is_public: input.isPublic,
    p_corrects: null,
  });
}

export function createCanlarPost(input: {
  body: string;
  media: { url: string; kind: string }[];
  caseId: string | null;
  campaignId: string | null;
  city: string;
  species: string | null;
  urgency: string;
}) {
  return rpc<string>('canlar_create_post', {
    p_body: input.body,
    p_media: input.media,
    p_case_id: input.caseId,
    p_campaign_id: input.campaignId,
    p_city: input.city,
    p_species: input.species,
    p_urgency: input.urgency,
  });
}

export function linkCanlarVoraPost(postId: string, voraPostId: string) {
  return rpc<null>('canlar_link_vora_post', { p_post_id: postId, p_vora_post_id: voraPostId });
}

export function toggleCanlarLike(postId: string) {
  return rpc<boolean>('canlar_toggle_like', { p_post_id: postId });
}

export function addCanlarComment(postId: string, body: string) {
  return rpc<string>('canlar_add_comment', { p_post_id: postId, p_body: body });
}

export function toggleCanlarSave(postId: string) {
  return rpc<boolean>('canlar_toggle_save', { p_post_id: postId });
}

export function followCanlarCase(caseId: string) {
  return rpc<boolean>('canlar_follow_case', { p_case_id: caseId });
}

export function acceptCanlarPolicy() {
  return rpc<null>('canlar_accept_policy', { p_version: CANLAR_POLICY_VERSION });
}

export function createCanlarCampaign(input: {
  caseId: string;
  title: string;
  purpose: string;
  helpKind: string;
  model: string;
  targetMinor: number;
  currency: string;
  clinicId: string | null;
  fulfillment: string;
  proofPlan: string;
  gapNote: string;
  lines: { category: string; label: string; amount_minor: number }[];
}) {
  return rpc<string>('canlar_create_campaign', {
    p_case_id: input.caseId,
    p_title: input.title,
    p_purpose: input.purpose,
    p_help_kind: input.helpKind,
    p_model: input.model,
    p_target: input.targetMinor,
    p_currency: input.currency,
    p_clinic_id: input.clinicId,
    p_fulfillment: input.fulfillment,
    p_proof_plan: input.proofPlan,
    p_gap_note: input.gapNote,
    p_lines: input.lines,
    p_policy_version: CANLAR_POLICY_VERSION,
  });
}

export function prepareDonation(campaignId: string, grossMinor: number, anonymous: boolean) {
  return rpc<string>('canlar_prepare_donation', {
    p_campaign_id: campaignId,
    p_gross: grossMinor,
    p_anonymous: anonymous,
    p_policy_version: CANLAR_POLICY_VERSION,
  });
}

export async function startCanlarCheckout(donationId: string): Promise<{ error: string | null }> {
  const successUrl = Linking.createURL(`vora-canlar/donation/${donationId}`);
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    'stripe-create-canlar-donation',
    { body: { donationId, successUrl, cancelUrl: Linking.createURL('vora-canlar') } },
  );
  if (error) return { error: supabaseErrorMessage(error) };
  if (data?.error) return { error: data.error };
  if (!data?.url) return { error: 'Ödeme sayfası oluşturulamadı.' };
  try {
    await WebBrowser.openAuthSessionAsync(data.url, successUrl);
  } catch {
    await openUrl(data.url);
  }
  return { error: null };
}

export function loadDonation(id: string) {
  return rpc<{
    id: string;
    campaign_id: string;
    gross_minor: number;
    processor_fee_minor: number | null;
    other_deduction_minor: number;
    refunded_minor: number;
    currency: string;
    status: string;
    net_minor: number | null;
    anonymous: boolean;
  }>('canlar_my_donation', { p_id: id });
}

export function loadPublicCampaign(id: string) {
  return rpc<Record<string, unknown>>('canlar_public_campaign', { p_id: id });
}

export function loadOwnerDashboard(id: string) {
  return rpc<Record<string, unknown>>('canlar_owner_dashboard', { p_campaign_id: id });
}

export function loadContributionStats(userId: string) {
  return rpc<Record<string, unknown>>('canlar_contribution_stats', { p_user_id: userId });
}

export function saveCanlarPrivacy(flags: {
  animals: boolean;
  rescues: boolean;
  donations: boolean;
  inKind: boolean;
  volunteer: boolean;
}) {
  return rpc<null>('canlar_set_privacy', {
    p_animals: flags.animals,
    p_rescues: flags.rescues,
    p_donations: flags.donations,
    p_in_kind: flags.inKind,
    p_volunteer: flags.volunteer,
  });
}

export function saveCanlarNotificationPrefs(flags: {
  rescue: boolean;
  treatment: boolean;
  campaign: boolean;
  promo: boolean;
}) {
  return rpc<null>('canlar_set_notification_prefs', {
    p_rescue: flags.rescue,
    p_treatment: flags.treatment,
    p_campaign: flags.campaign,
    p_promo: flags.promo,
  });
}

export function applyCanlarRole(role: string, note: string) {
  return rpc<string>('canlar_apply_role', { p_role: role, p_note: note });
}

export function offerCanlarAid(input: {
  caseId: string | null;
  campaignId: string | null;
  type: string;
  note: string;
  quantity: string;
}) {
  return rpc<string>('canlar_offer_aid', {
    p_case_id: input.caseId,
    p_campaign_id: input.campaignId,
    p_type: input.type,
    p_note: input.note,
    p_quantity: input.quantity,
  });
}

export function submitCanlarProof(input: {
  campaignId: string;
  kind: string;
  path: string;
  summary: string;
  category: string;
  amountMinor: number;
  payee: string;
}) {
  return rpc<string>('canlar_submit_proof', {
    p_campaign_id: input.campaignId,
    p_expense_id: null,
    p_kind: input.kind,
    p_path: input.path,
    p_summary: input.summary,
    p_category: input.category,
    p_amount: input.amountMinor,
    p_payee: input.payee,
  });
}

export function loadAdminQueue() {
  return rpc<Record<string, unknown>>('canlar_admin_queue');
}

export function reviewCanlarCampaign(id: string, status: string, payments: boolean, reason: string) {
  return rpc<null>('canlar_review_campaign', {
    p_id: id,
    p_status: status,
    p_payments: payments,
    p_reason: reason,
  });
}

export function reviewCanlarProof(id: string, status: string, reason: string, publicSummary: string) {
  return rpc<null>('canlar_review_proof', {
    p_id: id,
    p_status: status,
    p_reason: reason,
    p_public_summary: publicSummary,
  });
}

export function reviewCanlarRole(id: string, status: string, reason: string) {
  return rpc<null>('canlar_review_role', { p_id: id, p_status: status, p_reason: reason });
}

export function reviewCanlarClinic(id: string, status: string, reason: string) {
  return rpc<null>('canlar_review_clinic', { p_id: id, p_status: status, p_reason: reason });
}

export function verifyCanlarRescue(caseId: string, rescuerId: string, reason: string) {
  return rpc<null>('canlar_verify_rescue', { p_case_id: caseId, p_rescuer: rescuerId, p_reason: reason });
}

export function recordCanlarPayout(input: {
  campaignId: string;
  destination: string;
  label: string;
  clinicId: string | null;
  amountMinor: number;
  status: string;
  reference: string;
  note: string;
}) {
  return rpc<string>('canlar_record_payout', {
    p_campaign_id: input.campaignId,
    p_destination: input.destination,
    p_label: input.label,
    p_clinic_id: input.clinicId,
    p_amount: input.amountMinor,
    p_status: input.status,
    p_reference: input.reference,
    p_note: input.note,
  });
}
