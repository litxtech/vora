-- Vora Canlar: kurtarma dosyası, gönderi, kampanya, bağış defteri, kanıt ve RLS.
-- Para formülleri src/features/vora-canlar/services/money.ts ile aynı kuralları izler.
-- Ücret oranı burada yoktur. İşlem ücreti yalnızca Stripe olayından yazılır.
-- Stripe Connect bu şemada yoktur. Klinik ödemesi denetimli payout kaydıdır.

create sequence if not exists public.canlar_public_code_seq;

create or replace function public.canlar_guard_write()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('canlar.internal_write', true), '') <> '1' then
    raise exception 'Bu kayıt yalnızca yetkili sunucu işlemiyle değişir.';
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.canlar_block_history_change()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Geçmiş kayıtlar değiştirilemez. Düzeltme yeni bir denetim kaydıdır.';
end;
$$;

create table if not exists public.canlar_clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city_label text not null,
  public_note text,
  verification_status text not null default 'unverified',
  submitted_by uuid references public.profiles (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canlar_clinics_name_len check (char_length(name) between 2 and 160),
  constraint canlar_clinics_status check (verification_status in ('unverified', 'in_review', 'approved', 'rejected'))
);

create table if not exists public.canlar_cases (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique,
  species text not null,
  name text,
  traits text,
  summary text not null,
  city_label text not null,
  region_id text,
  urgency text not null default 'normal',
  status text not null default 'new_report',
  treatment_status text not null default 'unknown',
  reporter_id uuid not null references public.profiles (id) on delete restrict,
  show_reporter_name boolean not null default false,
  assignee_id uuid references public.profiles (id) on delete set null,
  credited_rescuer_id uuid references public.profiles (id) on delete set null,
  rescue_verified_at timestamptz,
  vet_user_id uuid references public.profiles (id) on delete set null,
  clinic_id uuid references public.canlar_clinics (id) on delete set null,
  duplicate_of_id uuid references public.canlar_cases (id) on delete set null,
  duplicate_hint_id uuid references public.canlar_cases (id) on delete set null,
  outcome_note text,
  cover_url text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canlar_cases_species check (species in ('cat', 'dog', 'bird', 'other')),
  constraint canlar_cases_urgency check (urgency in ('normal', 'urgent', 'critical')),
  constraint canlar_cases_status check (status in (
    'new_report', 'awaiting_review', 'verifying', 'rescue_planned', 'team_dispatched',
    'rescued', 'vet_assessment', 'treatment', 'recovery', 'rehomed', 'completed',
    'lost', 'cancelled', 'duplicate'
  )),
  constraint canlar_cases_treatment check (treatment_status in (
    'unknown', 'not_needed', 'assessment', 'ongoing', 'recovery', 'completed', 'lost'
  )),
  constraint canlar_cases_summary_len check (char_length(summary) between 8 and 4000)
);

create table if not exists public.canlar_case_private (
  case_id uuid primary key references public.canlar_cases (id) on delete cascade,
  latitude double precision,
  longitude double precision,
  address_note text,
  contact_note text,
  updated_at timestamptz not null default now()
);

create table if not exists public.canlar_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.canlar_cases (id) on delete restrict,
  from_status text,
  to_status text not null,
  note text,
  is_public boolean not null default true,
  corrects_event_id uuid references public.canlar_case_events (id) on delete restrict,
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.canlar_follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  case_id uuid not null references public.canlar_cases (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, case_id)
);

create table if not exists public.canlar_campaigns (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.canlar_cases (id) on delete restrict,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  title text not null,
  purpose text not null,
  help_kind text not null,
  payout_model text not null default 'beneficiary',
  target_minor bigint not null,
  currency text not null default 'try',
  clinic_id uuid references public.canlar_clinics (id) on delete set null,
  fulfillment_plan text not null,
  proof_plan text not null,
  budget_gap_note text,
  status text not null default 'draft',
  payments_enabled boolean not null default false,
  status_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canlar_campaigns_target check (target_minor > 0),
  constraint canlar_campaigns_currency check (currency ~ '^[a-z]{3}$'),
  constraint canlar_campaigns_help check (help_kind in ('treatment', 'food', 'medicine', 'transport', 'care', 'other')),
  constraint canlar_campaigns_model check (payout_model in ('beneficiary', 'clinic', 'supplier')),
  constraint canlar_campaigns_status check (status in (
    'draft', 'in_review', 'needs_info', 'approved', 'live', 'paused', 'goal_met',
    'expired', 'rejected', 'cancelled', 'report_pending', 'closed'
  ))
);

create table if not exists public.canlar_budget_lines (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.canlar_campaigns (id) on delete cascade,
  category text not null,
  label text not null,
  amount_minor bigint not null,
  constraint canlar_budget_amount check (amount_minor >= 0)
);

create table if not exists public.canlar_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete restrict,
  case_id uuid references public.canlar_cases (id) on delete set null,
  campaign_id uuid references public.canlar_campaigns (id) on delete set null,
  body text not null,
  media jsonb not null default '[]'::jsonb,
  city_label text,
  species text,
  urgency text not null default 'normal',
  publish_mode text not null default 'canlar_only',
  vora_post_id uuid references public.posts (id) on delete set null,
  status text not null default 'published',
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canlar_posts_body check (char_length(body) between 1 and 4000),
  constraint canlar_posts_mode check (publish_mode in ('canlar_only', 'also_vora')),
  constraint canlar_posts_status check (status in ('published', 'hidden', 'removed'))
);

create table if not exists public.canlar_post_likes (
  post_id uuid not null references public.canlar_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.canlar_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.canlar_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  constraint canlar_comments_body check (char_length(body) between 1 and 2000)
);

create table if not exists public.canlar_post_saves (
  post_id uuid not null references public.canlar_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.canlar_donations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.canlar_campaigns (id) on delete restrict,
  case_id uuid references public.canlar_cases (id) on delete restrict,
  donor_id uuid references public.profiles (id) on delete restrict,
  anonymous boolean not null default true,
  gross_minor bigint not null,
  currency text not null,
  processor_fee_minor bigint,
  other_deduction_minor bigint not null default 0,
  refunded_minor bigint not null default 0,
  dispute_minor bigint not null default 0,
  status text not null default 'pending',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  applied_event_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canlar_donations_gross check (gross_minor > 0),
  constraint canlar_donations_fee check (processor_fee_minor is null or processor_fee_minor >= 0),
  constraint canlar_donations_other check (other_deduction_minor >= 0),
  constraint canlar_donations_refund check (refunded_minor >= 0 and refunded_minor <= gross_minor),
  constraint canlar_donations_status check (status in (
    'pending', 'succeeded', 'failed', 'refunded', 'partially_refunded', 'disputed'
  ))
);

create table if not exists public.canlar_ledger (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.canlar_campaigns (id) on delete restrict,
  donation_id uuid references public.canlar_donations (id) on delete restrict,
  kind text not null,
  amount_minor bigint not null,
  currency text not null,
  idempotency_key text not null unique,
  stripe_event_id text,
  note text,
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint canlar_ledger_kind check (kind in (
    'donation_gross', 'processor_fee', 'other_deduction', 'refund',
    'dispute_hold', 'dispute_release', 'payout', 'adjustment'
  ))
);

create table if not exists public.canlar_payouts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.canlar_campaigns (id) on delete restrict,
  case_id uuid references public.canlar_cases (id) on delete restrict,
  destination_type text not null,
  destination_label text not null,
  clinic_id uuid references public.canlar_clinics (id) on delete set null,
  amount_minor bigint not null,
  currency text not null,
  status text not null default 'draft',
  payment_reference text,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canlar_payouts_amount check (amount_minor > 0),
  constraint canlar_payouts_dest check (destination_type in ('beneficiary', 'clinic', 'supplier')),
  constraint canlar_payouts_status check (status in (
    'draft', 'awaiting_verification', 'approved', 'processing', 'paid', 'failed'
  ))
);

create table if not exists public.canlar_expenses (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.canlar_campaigns (id) on delete restrict,
  case_id uuid references public.canlar_cases (id) on delete restrict,
  payout_id uuid references public.canlar_payouts (id) on delete set null,
  category text not null,
  amount_minor bigint not null,
  currency text not null,
  payee_label text not null,
  payment_reference text,
  review_status text not null default 'uploaded',
  review_note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canlar_expenses_amount check (amount_minor > 0),
  constraint canlar_expenses_review check (review_status in (
    'awaiting', 'uploaded', 'in_review', 'approved', 'rejected', 'needs_more'
  ))
);

create table if not exists public.canlar_proofs (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references public.canlar_expenses (id) on delete cascade,
  campaign_id uuid not null references public.canlar_campaigns (id) on delete cascade,
  kind text not null,
  storage_path text not null,
  public_summary text,
  review_status text not null default 'uploaded',
  review_note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint canlar_proofs_kind check (kind in (
    'vet_invoice', 'receipt', 'clinic_note', 'medicine_invoice', 'transport',
    'food_receipt', 'animal_media', 'statement', 'payment_reference'
  )),
  constraint canlar_proofs_review check (review_status in (
    'awaiting', 'uploaded', 'in_review', 'approved', 'rejected', 'needs_more'
  ))
);

create table if not exists public.canlar_aid (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.canlar_cases (id) on delete set null,
  campaign_id uuid references public.canlar_campaigns (id) on delete set null,
  provider_id uuid not null references public.profiles (id) on delete restrict,
  aid_type text not null,
  need_note text not null,
  quantity_note text,
  delivery_status text not null default 'offered',
  verified_value_minor bigint,
  proof_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canlar_aid_type check (aid_type in (
    'food', 'medicine', 'transport', 'foster', 'volunteer_work', 'care', 'other'
  )),
  constraint canlar_aid_delivery check (delivery_status in ('offered', 'accepted', 'delivered', 'cancelled')),
  constraint canlar_aid_value check (verified_value_minor is null or verified_value_minor >= 0)
);

create table if not exists public.canlar_privacy (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  show_animals boolean not null default false,
  show_rescues boolean not null default false,
  show_donations boolean not null default false,
  show_in_kind boolean not null default false,
  show_volunteer boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.canlar_notification_prefs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  rescue_updates boolean not null default true,
  treatment_updates boolean not null default true,
  campaign_updates boolean not null default true,
  promotional boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.canlar_policy_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  unique (user_id, policy_version)
);

create table if not exists public.canlar_role_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_key text not null,
  status text not null default 'pending',
  note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canlar_roles_key check (role_key in ('volunteer', 'rescuer', 'campaign_owner', 'clinic_contact')),
  constraint canlar_roles_status check (status in ('pending', 'in_review', 'approved', 'rejected', 'needs_more')),
  unique (user_id, role_key)
);

create table if not exists public.canlar_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  reason text,
  from_status text,
  to_status text,
  created_at timestamptz not null default now()
);

create table if not exists public.canlar_stripe_events (
  event_id text primary key,
  kind text not null,
  donation_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists canlar_cases_status_idx on public.canlar_cases (status, created_at desc);
create index if not exists canlar_cases_city_idx on public.canlar_cases (city_label, species, status);
create index if not exists canlar_cases_reporter_idx on public.canlar_cases (reporter_id, status);
create index if not exists canlar_posts_created_idx on public.canlar_posts (created_at desc) where status = 'published';
create index if not exists canlar_campaigns_status_idx on public.canlar_campaigns (status, created_at desc);
create index if not exists canlar_donations_campaign_idx on public.canlar_donations (campaign_id, status);
create index if not exists canlar_donations_donor_idx on public.canlar_donations (donor_id, created_at desc);
create index if not exists canlar_donations_pi_idx on public.canlar_donations (stripe_payment_intent_id);
create index if not exists canlar_ledger_campaign_idx on public.canlar_ledger (campaign_id, created_at);
create index if not exists canlar_proofs_campaign_idx on public.canlar_proofs (campaign_id, review_status);

drop trigger if exists canlar_cases_updated on public.canlar_cases;
create trigger canlar_cases_updated before update on public.canlar_cases
  for each row execute function public.set_updated_at();
drop trigger if exists canlar_campaigns_updated on public.canlar_campaigns;
create trigger canlar_campaigns_updated before update on public.canlar_campaigns
  for each row execute function public.set_updated_at();
drop trigger if exists canlar_donations_updated on public.canlar_donations;
create trigger canlar_donations_updated before update on public.canlar_donations
  for each row execute function public.set_updated_at();

drop trigger if exists canlar_donations_guard on public.canlar_donations;
create trigger canlar_donations_guard before insert or update or delete on public.canlar_donations
  for each row execute function public.canlar_guard_write();
drop trigger if exists canlar_ledger_guard on public.canlar_ledger;
create trigger canlar_ledger_guard before insert or update or delete on public.canlar_ledger
  for each row execute function public.canlar_guard_write();
drop trigger if exists canlar_events_no_update on public.canlar_case_events;
create trigger canlar_events_no_update before update or delete on public.canlar_case_events
  for each row execute function public.canlar_block_history_change();
drop trigger if exists canlar_events_guard on public.canlar_case_events;
create trigger canlar_events_guard before insert on public.canlar_case_events
  for each row execute function public.canlar_guard_write();
drop trigger if exists canlar_audit_guard on public.canlar_audit;
create trigger canlar_audit_guard before insert or update or delete on public.canlar_audit
  for each row execute function public.canlar_guard_write();
drop trigger if exists canlar_stripe_guard on public.canlar_stripe_events;
create trigger canlar_stripe_guard before insert or update or delete on public.canlar_stripe_events
  for each row execute function public.canlar_guard_write();
drop trigger if exists canlar_payouts_guard on public.canlar_payouts;
create trigger canlar_payouts_guard before insert or update or delete on public.canlar_payouts
  for each row execute function public.canlar_guard_write();

create or replace function public.canlar_require_member(p_need_identity boolean default false)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_guest boolean;
  v_confirmed timestamptz;
begin
  if v_uid is null then
    raise exception 'Bu işlem için giriş yapmanız gerekir.';
  end if;
  select coalesce(is_guest, false) into v_guest from public.profiles where id = v_uid;
  if coalesce(v_guest, true) then
    raise exception 'Misafir hesaplar bu işlemi yapamaz.';
  end if;
  select email_confirmed_at into v_confirmed from auth.users where id = v_uid;
  if v_confirmed is null then
    raise exception 'E-posta doğrulaması tamamlanmadan bu işlem yapılamaz.';
  end if;
  if p_need_identity and not exists (
    select 1 from public.identity_verification_requests
    where user_id = v_uid and status = 'approved'
  ) then
    raise exception 'Bu işlem için kimlik doğrulamasının onaylanmış olması gerekir.';
  end if;
  return v_uid;
end;
$$;

create or replace function public.canlar_open_internal()
returns void
language plpgsql
as $$
begin
  perform set_config('canlar.internal_write', '1', true);
end;
$$;

create or replace function public.canlar_audit(
  p_actor uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_reason text,
  p_from text,
  p_to text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.canlar_open_internal();
  insert into public.canlar_audit (actor_id, action, entity_type, entity_id, reason, from_status, to_status)
  values (p_actor, p_action, p_entity_type, p_entity_id, p_reason, p_from, p_to);
end;
$$;

create or replace function public.canlar_notify(
  p_user uuid,
  p_body text,
  p_data jsonb,
  p_optional text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allow boolean := true;
begin
  if p_user is null then
    return;
  end if;
  if p_optional is not null then
    select case p_optional
      when 'rescue_updates' then rescue_updates
      when 'treatment_updates' then treatment_updates
      when 'campaign_updates' then campaign_updates
      when 'promotional' then promotional
      else true
    end into v_allow
    from public.canlar_notification_prefs
    where user_id = p_user;
    if not found then
      v_allow := p_optional <> 'promotional';
    end if;
    if coalesce(v_allow, false) = false then
      return;
    end if;
  end if;
  insert into public.notifications (user_id, event_type, title, body, data, category, priority)
  values (p_user, 'system', 'Vora Canlar', p_body, coalesce(p_data, '{}'::jsonb), 'system', 'high');
  insert into public.notification_outbox (recipient_id, event_type, title, body, data)
  values (p_user, 'system', 'Vora Canlar', p_body, coalesce(p_data, '{}'::jsonb));
end;
$$;

create or replace function public.canlar_accept_policy(p_version text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  v_uid := public.canlar_require_member(false);
  insert into public.canlar_policy_consents (user_id, policy_version)
  values (v_uid, p_version)
  on conflict (user_id, policy_version) do nothing;
end;
$$;

create or replace function public.canlar_has_policy(p_user uuid, p_version text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.canlar_policy_consents
    where user_id = p_user and policy_version = p_version
  );
$$;

create or replace function public.canlar_create_case(
  p_species text,
  p_name text,
  p_traits text,
  p_summary text,
  p_city text,
  p_region text,
  p_urgency text,
  p_latitude double precision,
  p_longitude double precision,
  p_address_note text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_id uuid;
  v_name text := nullif(lower(trim(coalesce(p_name, ''))), '');
  v_city text := trim(p_city);
  v_hint uuid;
  v_status text := 'new_report';
begin
  v_uid := public.canlar_require_member(false);
  if v_name is not null and exists (
    select 1 from public.canlar_cases
    where reporter_id = v_uid
      and species = p_species
      and lower(coalesce(name, '')) = v_name
      and lower(city_label) = lower(v_city)
      and status not in ('completed', 'lost', 'cancelled', 'duplicate')
  ) then
    raise exception 'Bu hayvan için açık bir kurtarma dosyanız zaten var.';
  end if;
  select id into v_hint
  from public.canlar_cases
  where species = p_species
    and lower(city_label) = lower(v_city)
    and status not in ('completed', 'lost', 'cancelled', 'duplicate')
    and created_at > now() - interval '14 days'
  order by created_at desc
  limit 1;
  if v_hint is not null then
    v_status := 'awaiting_review';
  end if;
  perform public.canlar_open_internal();
  insert into public.canlar_cases (
    public_code, species, name, traits, summary, city_label, region_id, urgency, status, reporter_id, duplicate_hint_id
  ) values (
    'VC-' || lpad(nextval('public.canlar_public_code_seq')::text, 6, '0'),
    p_species, nullif(trim(coalesce(p_name, '')), ''), nullif(trim(coalesce(p_traits, '')), ''),
    trim(p_summary), v_city, nullif(p_region, ''), coalesce(p_urgency, 'normal'), v_status, v_uid, v_hint
  ) returning id into v_id;
  insert into public.canlar_case_private (case_id, latitude, longitude, address_note)
  values (v_id, p_latitude, p_longitude, nullif(trim(coalesce(p_address_note, '')), ''));
  insert into public.canlar_case_events (case_id, from_status, to_status, note, is_public, actor_id)
  values (v_id, null, v_status, 'İhbar kaydı açıldı.', true, v_uid);
  perform public.canlar_audit(v_uid, 'case.create', 'case', v_id, null, null, v_status);
  return v_id;
end;
$$;

create or replace function public.canlar_append_case_event(
  p_case_id uuid,
  p_status text,
  p_treatment text,
  p_note text,
  p_is_public boolean,
  p_corrects uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_case public.canlar_cases%rowtype;
  v_event uuid;
begin
  v_uid := public.canlar_require_member(false);
  select * into v_case from public.canlar_cases where id = p_case_id;
  if not found then
    raise exception 'Kurtarma dosyası bulunamadı.';
  end if;
  if v_uid <> v_case.assignee_id and v_uid <> v_case.vet_user_id and not public.is_moderator() then
    raise exception 'Bu dosyanın durumunu değiştirme yetkiniz yok.';
  end if;
  perform public.canlar_open_internal();
  insert into public.canlar_case_events (case_id, from_status, to_status, note, is_public, corrects_event_id, actor_id)
  values (p_case_id, v_case.status, p_status, nullif(trim(coalesce(p_note, '')), ''), coalesce(p_is_public, true), p_corrects, v_uid)
  returning id into v_event;
  update public.canlar_cases
    set status = p_status,
        treatment_status = coalesce(p_treatment, treatment_status),
        closed_at = case when p_status in ('completed', 'lost', 'cancelled', 'duplicate') then now() else closed_at end
    where id = p_case_id;
  perform public.canlar_audit(v_uid, 'case.status', 'case', p_case_id, p_note, v_case.status, p_status);
  perform public.canlar_notify(
    v_case.reporter_id,
    'Vora Canlar: Kurtarma dosyasının durumu güncellendi.',
    jsonb_build_object('kind', 'canlar_case', 'case_id', p_case_id, 'status', p_status),
    'rescue_updates'
  );
  return v_event;
end;
$$;

create or replace function public.canlar_create_post(
  p_body text,
  p_media jsonb,
  p_case_id uuid,
  p_campaign_id uuid,
  p_city text,
  p_species text,
  p_urgency text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_id uuid;
begin
  v_uid := public.canlar_require_member(false);
  insert into public.canlar_posts (author_id, case_id, campaign_id, body, media, city_label, species, urgency, publish_mode)
  values (v_uid, p_case_id, p_campaign_id, trim(p_body), coalesce(p_media, '[]'::jsonb), nullif(trim(coalesce(p_city, '')), ''), p_species, coalesce(p_urgency, 'normal'), 'canlar_only')
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.canlar_link_vora_post(p_post_id uuid, p_vora_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_author uuid;
begin
  v_uid := public.canlar_require_member(false);
  select author_id into v_author from public.posts where id = p_vora_post_id;
  if v_author is distinct from v_uid then
    raise exception 'Paylaşım kaydı size ait değil.';
  end if;
  update public.canlar_posts
    set vora_post_id = p_vora_post_id, publish_mode = 'also_vora'
    where id = p_post_id and author_id = v_uid and vora_post_id is null;
  if not found then
    raise exception 'Gönderi bağlanamadı.';
  end if;
end;
$$;

create or replace function public.canlar_toggle_like(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_vora uuid;
begin
  v_uid := public.canlar_require_member(false);
  select vora_post_id into v_vora from public.canlar_posts where id = p_post_id and status = 'published';
  if v_vora is not null then
    raise exception 'Bu gönderinin etkileşimi bağlı Vora gönderisindedir.';
  end if;
  if exists (select 1 from public.canlar_post_likes where post_id = p_post_id and user_id = v_uid) then
    delete from public.canlar_post_likes where post_id = p_post_id and user_id = v_uid;
    update public.canlar_posts set like_count = greatest(like_count - 1, 0) where id = p_post_id;
    return false;
  end if;
  insert into public.canlar_post_likes (post_id, user_id) values (p_post_id, v_uid);
  update public.canlar_posts set like_count = like_count + 1 where id = p_post_id;
  return true;
end;
$$;

create or replace function public.canlar_add_comment(p_post_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_id uuid;
  v_vora uuid;
begin
  v_uid := public.canlar_require_member(false);
  select vora_post_id into v_vora from public.canlar_posts where id = p_post_id and status = 'published';
  if v_vora is not null then
    raise exception 'Bu gönderinin yorumları bağlı Vora gönderisindedir.';
  end if;
  insert into public.canlar_post_comments (post_id, author_id, body)
  values (p_post_id, v_uid, trim(p_body))
  returning id into v_id;
  update public.canlar_posts set comment_count = comment_count + 1 where id = p_post_id;
  return v_id;
end;
$$;

create or replace function public.canlar_toggle_save(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  v_uid := public.canlar_require_member(false);
  if exists (select 1 from public.canlar_post_saves where post_id = p_post_id and user_id = v_uid) then
    delete from public.canlar_post_saves where post_id = p_post_id and user_id = v_uid;
    return false;
  end if;
  insert into public.canlar_post_saves (post_id, user_id) values (p_post_id, v_uid);
  return true;
end;
$$;

create or replace function public.canlar_follow_case(p_case_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  v_uid := public.canlar_require_member(false);
  if exists (select 1 from public.canlar_follows where user_id = v_uid and case_id = p_case_id) then
    delete from public.canlar_follows where user_id = v_uid and case_id = p_case_id;
    return false;
  end if;
  insert into public.canlar_follows (user_id, case_id) values (v_uid, p_case_id);
  return true;
end;
$$;

create or replace function public.canlar_create_campaign(
  p_case_id uuid,
  p_title text,
  p_purpose text,
  p_help_kind text,
  p_model text,
  p_target bigint,
  p_currency text,
  p_clinic_id uuid,
  p_fulfillment text,
  p_proof_plan text,
  p_gap_note text,
  p_lines jsonb,
  p_policy_version text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_id uuid;
  v_sum bigint;
begin
  v_uid := public.canlar_require_member(true);
  if not public.canlar_has_policy(v_uid, p_policy_version) then
    raise exception 'Bağış ve yardım politikasının bu sürümü onaylanmadan kampanya açılamaz.';
  end if;
  if not exists (
    select 1 from public.canlar_role_applications
    where user_id = v_uid and role_key = 'campaign_owner' and status = 'approved'
  ) then
    raise exception 'Kampanya açmak için kampanya sahibi rolünün onaylanmış olması gerekir.';
  end if;
  select coalesce(sum((line->>'amount_minor')::bigint), 0) into v_sum
  from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) line;
  if v_sum <> p_target and nullif(trim(coalesce(p_gap_note, '')), '') is null then
    raise exception 'Gider kalemleri hedef tutarla aynı değilse fark açıklanmalıdır.';
  end if;
  insert into public.canlar_campaigns (
    case_id, owner_id, title, purpose, help_kind, payout_model, target_minor, currency,
    clinic_id, fulfillment_plan, proof_plan, budget_gap_note, status, payments_enabled
  ) values (
    p_case_id, v_uid, trim(p_title), trim(p_purpose), p_help_kind, coalesce(p_model, 'beneficiary'),
    p_target, coalesce(p_currency, 'try'), p_clinic_id, trim(p_fulfillment), trim(p_proof_plan),
    nullif(trim(coalesce(p_gap_note, '')), ''), 'in_review', false
  ) returning id into v_id;
  insert into public.canlar_budget_lines (campaign_id, category, label, amount_minor)
  select v_id, line->>'category', line->>'label', (line->>'amount_minor')::bigint
  from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) line;
  perform public.canlar_audit(v_uid, 'campaign.submit', 'campaign', v_id, null, 'draft', 'in_review');
  return v_id;
end;
$$;

create or replace function public.canlar_prepare_donation(
  p_campaign_id uuid,
  p_gross bigint,
  p_anonymous boolean,
  p_policy_version text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_campaign public.canlar_campaigns%rowtype;
  v_id uuid;
begin
  v_uid := public.canlar_require_member(false);
  if not public.canlar_has_policy(v_uid, p_policy_version) then
    raise exception 'Bağış politikası onaylanmadan ödeme başlatılamaz.';
  end if;
  if p_gross < 1000 or p_gross > 50000000 then
    raise exception 'Bağış tutarı izin verilen aralığın dışında.';
  end if;
  select * into v_campaign from public.canlar_campaigns where id = p_campaign_id;
  if not found or v_campaign.status <> 'live' or v_campaign.payments_enabled is not true then
    raise exception 'Bu kampanya için bağış şu anda açık değil.';
  end if;
  perform public.canlar_open_internal();
  insert into public.canlar_donations (
    campaign_id, case_id, donor_id, anonymous, gross_minor, currency, status
  ) values (
    v_campaign.id, v_campaign.case_id, v_uid, coalesce(p_anonymous, true), p_gross, v_campaign.currency, 'pending'
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.canlar_attach_checkout(
  p_donation_id uuid,
  p_session_id text,
  p_payment_intent_id text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.canlar_open_internal();
  update public.canlar_donations
    set stripe_checkout_session_id = p_session_id,
        stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id)
    where id = p_donation_id and status = 'pending';
end;
$$;

create or replace function public.canlar_apply_payment_event(
  p_event_id text,
  p_kind text,
  p_donation_id uuid,
  p_session_id text,
  p_payment_intent_id text,
  p_charge_id text,
  p_gross_minor bigint,
  p_fee_minor bigint,
  p_refunded_total_minor bigint,
  p_dispute_minor bigint
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.canlar_donations%rowtype;
  v_owner uuid;
  v_delta bigint;
  v_became_paid boolean := false;
begin
  if p_event_id is null or length(p_event_id) < 3 then
    raise exception 'Olay kimliği gerekli.';
  end if;
  if exists (select 1 from public.canlar_stripe_events where event_id = p_event_id) then
    return jsonb_build_object('duplicate', true);
  end if;
  perform public.canlar_open_internal();
  select * into d from public.canlar_donations where id = p_donation_id for update;
  if not found and p_payment_intent_id is not null then
    select * into d from public.canlar_donations where stripe_payment_intent_id = p_payment_intent_id for update;
  end if;
  if not found and p_session_id is not null then
    select * into d from public.canlar_donations where stripe_checkout_session_id = p_session_id for update;
  end if;
  if not found then
    raise exception 'donation_not_found';
  end if;
  if p_kind in ('succeeded', 'fee_finalized') and p_gross_minor is not null and p_gross_minor <> d.gross_minor then
    insert into public.canlar_stripe_events (event_id, kind, donation_id) values (p_event_id, 'amount_mismatch', d.id);
    perform public.canlar_audit(null, 'donation.amount_mismatch', 'donation', d.id, p_event_id, d.status, d.status);
    return jsonb_build_object('ok', false, 'reason', 'amount_mismatch');
  end if;

  if p_kind = 'failed' and d.status = 'pending' then
    update public.canlar_donations set status = 'failed', stripe_charge_id = coalesce(p_charge_id, stripe_charge_id) where id = d.id;
  elsif p_kind = 'succeeded' and d.status in ('pending', 'failed')
        and not exists (
          select 1 from public.canlar_ledger
          where donation_id = d.id and kind = 'donation_gross'
        ) then
    update public.canlar_donations
      set status = 'succeeded',
          processor_fee_minor = case when p_fee_minor is not null and processor_fee_minor is null then p_fee_minor else processor_fee_minor end,
          stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
          stripe_charge_id = coalesce(p_charge_id, stripe_charge_id),
          applied_event_ids = applied_event_ids || p_event_id
      where id = d.id;
    insert into public.canlar_ledger (campaign_id, donation_id, kind, amount_minor, currency, idempotency_key, stripe_event_id)
    values (d.campaign_id, d.id, 'donation_gross', d.gross_minor, d.currency, p_event_id || ':donation_gross', p_event_id);
    if d.other_deduction_minor > 0 then
      insert into public.canlar_ledger (campaign_id, donation_id, kind, amount_minor, currency, idempotency_key, stripe_event_id)
      values (d.campaign_id, d.id, 'other_deduction', -d.other_deduction_minor, d.currency, p_event_id || ':other_deduction', p_event_id);
    end if;
    if p_fee_minor is not null then
      insert into public.canlar_ledger (campaign_id, donation_id, kind, amount_minor, currency, idempotency_key, stripe_event_id)
      values (d.campaign_id, d.id, 'processor_fee', -p_fee_minor, d.currency, p_event_id || ':processor_fee', p_event_id);
    end if;
    v_became_paid := true;
  elsif p_kind = 'succeeded' and p_fee_minor is not null then
    update public.canlar_donations
      set processor_fee_minor = p_fee_minor,
          stripe_charge_id = coalesce(p_charge_id, stripe_charge_id)
      where id = d.id and processor_fee_minor is null;
    if found then
      insert into public.canlar_ledger (campaign_id, donation_id, kind, amount_minor, currency, idempotency_key, stripe_event_id)
      values (d.campaign_id, d.id, 'processor_fee', -p_fee_minor, d.currency, p_event_id || ':processor_fee', p_event_id)
      on conflict (idempotency_key) do nothing;
    end if;
  elsif p_kind = 'fee_finalized' and p_fee_minor is not null then
    update public.canlar_donations
      set processor_fee_minor = coalesce(processor_fee_minor, p_fee_minor)
      where id = d.id and processor_fee_minor is null;
    if found then
      insert into public.canlar_ledger (campaign_id, donation_id, kind, amount_minor, currency, idempotency_key, stripe_event_id)
      values (d.campaign_id, d.id, 'processor_fee', -p_fee_minor, d.currency, p_event_id || ':processor_fee', p_event_id)
      on conflict (idempotency_key) do nothing;
    end if;
  elsif p_kind = 'refund' then
    if p_refunded_total_minor is null or p_refunded_total_minor < d.refunded_minor or p_refunded_total_minor > d.gross_minor then
      raise exception 'İade tutarı geçersiz.';
    end if;
    v_delta := p_refunded_total_minor - d.refunded_minor;
    update public.canlar_donations
      set refunded_minor = p_refunded_total_minor,
          status = case
            when p_refunded_total_minor = 0 then status
            when p_refunded_total_minor >= gross_minor then 'refunded'
            else 'partially_refunded'
          end
      where id = d.id;
    if v_delta > 0 then
      insert into public.canlar_ledger (campaign_id, donation_id, kind, amount_minor, currency, idempotency_key, stripe_event_id)
      values (d.campaign_id, d.id, 'refund', -v_delta, d.currency, p_event_id || ':refund', p_event_id);
    end if;
  elsif p_kind = 'dispute' and d.status <> 'disputed' then
    update public.canlar_donations
      set status = 'disputed',
          dispute_minor = coalesce(p_dispute_minor, greatest(d.gross_minor - d.refunded_minor, 0))
      where id = d.id;
    insert into public.canlar_ledger (campaign_id, donation_id, kind, amount_minor, currency, idempotency_key, stripe_event_id)
    values (d.campaign_id, d.id, 'dispute_hold', -coalesce(p_dispute_minor, greatest(d.gross_minor - d.refunded_minor, 0)), d.currency, p_event_id || ':dispute_hold', p_event_id);
  elsif p_kind = 'dispute_won' and d.status = 'disputed' then
    update public.canlar_donations
      set status = case when refunded_minor > 0 then 'partially_refunded' else 'succeeded' end,
          dispute_minor = 0
      where id = d.id;
    insert into public.canlar_ledger (campaign_id, donation_id, kind, amount_minor, currency, idempotency_key, stripe_event_id)
    values (d.campaign_id, d.id, 'dispute_release', d.dispute_minor, d.currency, p_event_id || ':dispute_release', p_event_id);
  end if;

  insert into public.canlar_stripe_events (event_id, kind, donation_id) values (p_event_id, p_kind, d.id);

  if v_became_paid then
    select owner_id into v_owner from public.canlar_campaigns where id = d.campaign_id;
    perform public.canlar_notify(
      v_owner,
      'Vora Canlar: Kampanyanıza yeni bir bağış ulaştı. Brüt tutar, ödeme kuruluşu ücreti ve kampanyanıza ayrılan net tutar ayrıntılarda görüntülenebilir.',
      jsonb_build_object(
        'kind', 'canlar_donation',
        'donation_id', d.id,
        'campaign_id', d.campaign_id,
        'gross_minor', d.gross_minor,
        'fee_minor', p_fee_minor,
        'fee_known', p_fee_minor is not null,
        'status', 'succeeded',
        'href', '/vora-canlar/donation/' || d.id::text
      ),
      null
    );
  end if;
  return jsonb_build_object('ok', true, 'duplicate', false, 'donation_id', d.id);
end;
$$;

create or replace function public.canlar_campaign_money(p_campaign_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with d as (
    select * from public.canlar_donations where campaign_id = p_campaign_id
  ),
  fee_ids as (
    select distinct donation_id from public.canlar_ledger
    where campaign_id = p_campaign_id and kind = 'processor_fee' and donation_id is not null
  ),
  paid as (
    select coalesce(sum(amount_minor), 0) as amount
    from public.canlar_payouts
    where campaign_id = p_campaign_id and status = 'paid'
  ),
  approved as (
    select coalesce(sum(amount_minor), 0) as amount
    from public.canlar_expenses
    where campaign_id = p_campaign_id and review_status = 'approved'
  )
  select jsonb_build_object(
    'donor_net_of_refunds_minor', coalesce(sum(gross_minor - refunded_minor) filter (where status in ('succeeded', 'partially_refunded')), 0),
    'processor_fee_minor', coalesce(sum(processor_fee_minor) filter (where processor_fee_minor is not null), 0),
    'other_deduction_minor', coalesce(sum(other_deduction_minor) filter (where status in ('succeeded', 'partially_refunded')), 0),
    'campaign_net_minor', coalesce(sum(gross_minor - refunded_minor - processor_fee_minor - other_deduction_minor) filter (
      where status in ('succeeded', 'partially_refunded') and processor_fee_minor is not null and id in (select donation_id from fee_ids)
    ), 0),
    'pending_gross_minor', coalesce(sum(gross_minor) filter (where status = 'pending'), 0),
    'disputed_minor', coalesce(sum(dispute_minor) filter (where status = 'disputed'), 0),
    'failed_gross_minor', coalesce(sum(gross_minor) filter (where status = 'failed'), 0),
    'fee_unknown_count', count(*) filter (where status in ('succeeded', 'partially_refunded') and processor_fee_minor is null),
    'paid_out_minor', (select amount from paid),
    'approved_expense_minor', (select amount from approved),
    'available_minor', coalesce(sum(gross_minor - refunded_minor - processor_fee_minor - other_deduction_minor) filter (
      where status in ('succeeded', 'partially_refunded') and processor_fee_minor is not null and id in (select donation_id from fee_ids)
    ), 0) - (select amount from paid),
    'missing_proof_minor', greatest((select amount from paid) - (select amount from approved), 0)
  )
  from d;
$$;

create or replace function public.canlar_home_feed()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  return jsonb_build_object(
    'featured', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select id, public_code, species, name, city_label, status, treatment_status, urgency, summary, cover_url, created_at
        from public.canlar_cases
        where status not in ('cancelled', 'duplicate', 'lost')
        order by case urgency when 'critical' then 0 when 'urgent' then 1 else 2 end, created_at desc
        limit 8
      ) x
    ), '[]'::jsonb),
    'urgent', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select id, public_code, species, name, city_label, status, urgency, summary, created_at
        from public.canlar_cases
        where urgency in ('urgent', 'critical') and status not in ('completed', 'lost', 'cancelled', 'duplicate')
        order by created_at desc limit 8
      ) x
    ), '[]'::jsonb),
    'new_reports', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select id, public_code, species, name, city_label, status, summary, created_at
        from public.canlar_cases where status in ('new_report', 'awaiting_review')
        order by created_at desc limit 8
      ) x
    ), '[]'::jsonb),
    'in_treatment', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select id, public_code, species, name, city_label, treatment_status, summary, created_at
        from public.canlar_cases where treatment_status in ('assessment', 'ongoing', 'recovery')
        order by updated_at desc limit 8
      ) x
    ), '[]'::jsonb),
    'campaigns', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select id, case_id, title, purpose, help_kind, status, payments_enabled, target_minor, currency, payout_model, created_at
        from public.canlar_campaigns where status = 'live'
        order by created_at desc limit 8
      ) x
    ), '[]'::jsonb),
    'updates', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select e.id, e.case_id, e.to_status, e.note, e.created_at, c.public_code, c.name, c.city_label
        from public.canlar_case_events e
        join public.canlar_cases c on c.id = e.case_id
        where e.is_public
        order by e.created_at desc limit 8
      ) x
    ), '[]'::jsonb),
    'resolved', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select id, public_code, species, name, city_label, status, outcome_note, created_at
        from public.canlar_cases where status in ('completed', 'rehomed')
        order by closed_at desc nulls last limit 8
      ) x
    ), '[]'::jsonb),
    'aid_needs', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select id, title, help_kind, purpose, status, target_minor, currency
        from public.canlar_campaigns
        where status = 'live' and help_kind in ('food', 'medicine', 'transport', 'care')
        order by created_at desc limit 8
      ) x
    ), '[]'::jsonb),
    'posts', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select p.id, p.body, p.city_label, p.species, p.urgency, p.cover_url, p.like_count, p.comment_count,
               p.vora_post_id, p.case_id, p.campaign_id, p.created_at, p.media
        from (
          select id, body, city_label, species, urgency, like_count, comment_count, vora_post_id, case_id, campaign_id, created_at, media,
                 null::text as cover_url
          from public.canlar_posts
          where status = 'published'
          order by created_at desc
          limit 12
        ) p
      ) x
    ), '[]'::jsonb),
    'followed', case when v_uid is null then '[]'::jsonb else coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select c.id, c.public_code, c.name, c.city_label, c.status, e.to_status, e.created_at
        from public.canlar_follows f
        join public.canlar_cases c on c.id = f.case_id
        left join lateral (
          select to_status, created_at from public.canlar_case_events
          where case_id = c.id and is_public order by created_at desc limit 1
        ) e on true
        where f.user_id = v_uid
        order by e.created_at desc nulls last limit 8
      ) x
    ), '[]'::jsonb) end
  );
end;
$$;

create or replace function public.canlar_search(p_filters jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := least(coalesce((p_filters->>'limit')::integer, 20), 40);
  v_offset integer := greatest(coalesce((p_filters->>'offset')::integer, 0), 0);
begin
  return coalesce((
    select jsonb_agg(row_to_json(x)) from (
      select id, public_code, species, name, city_label, status, treatment_status, urgency, summary, cover_url, created_at
      from public.canlar_cases c
      where (p_filters->>'city' is null or lower(c.city_label) = lower(p_filters->>'city'))
        and (p_filters->>'species' is null or c.species = p_filters->>'species')
        and (p_filters->>'urgency' is null or c.urgency = p_filters->>'urgency')
        and (p_filters->>'status' is null or c.status = p_filters->>'status')
        and (p_filters->>'treatment' is null or c.treatment_status = p_filters->>'treatment')
        and (p_filters->>'query' is null or c.summary ilike '%' || (p_filters->>'query') || '%' or coalesce(c.name, '') ilike '%' || (p_filters->>'query') || '%')
        and c.status <> 'duplicate'
      order by c.created_at desc
      limit v_limit offset v_offset
    ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public.canlar_case_detail(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_case public.canlar_cases%rowtype;
  v_private boolean := false;
begin
  select * into v_case from public.canlar_cases where id = p_id;
  if not found then
    return null;
  end if;
  v_private := public.is_moderator() or v_uid = v_case.reporter_id or v_uid = v_case.assignee_id or v_uid = v_case.vet_user_id;
  return jsonb_build_object(
    'case', jsonb_build_object(
      'id', v_case.id,
      'public_code', v_case.public_code,
      'species', v_case.species,
      'name', v_case.name,
      'traits', v_case.traits,
      'summary', v_case.summary,
      'city_label', v_case.city_label,
      'urgency', v_case.urgency,
      'status', v_case.status,
      'treatment_status', v_case.treatment_status,
      'outcome_note', v_case.outcome_note,
      'cover_url', v_case.cover_url,
      'duplicate_hint_id', case when v_private then v_case.duplicate_hint_id else null end,
      'reporter_label', case when v_case.show_reporter_name or v_private then (select username from public.profiles where id = v_case.reporter_id) else null end,
      'created_at', v_case.created_at
    ),
    'location', case when v_private then (
      select jsonb_build_object('latitude', latitude, 'longitude', longitude, 'address_note', address_note)
      from public.canlar_case_private where case_id = p_id
    ) else null end,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'from_status', e.from_status, 'to_status', e.to_status,
        'note', e.note, 'created_at', e.created_at, 'corrects_event_id', e.corrects_event_id
      ) order by e.created_at)
      from public.canlar_case_events e
      where e.case_id = p_id and (e.is_public or v_private)
    ), '[]'::jsonb),
    'progress_percent', null
  );
end;
$$;

create or replace function public.canlar_contribution_stats(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_viewer uuid := auth.uid();
  v_own boolean := v_viewer = p_user_id;
  v_privacy public.canlar_privacy%rowtype;
  v_animals integer;
  v_rescues integer;
  v_donations bigint;
  v_in_kind integer;
  v_in_kind_value bigint;
  v_volunteer integer;
begin
  select * into v_privacy from public.canlar_privacy where user_id = p_user_id;
  if not found then
    v_privacy.show_animals := false;
    v_privacy.show_rescues := false;
    v_privacy.show_donations := false;
    v_privacy.show_in_kind := false;
    v_privacy.show_volunteer := false;
  end if;
  select count(distinct case_id) into v_animals from (
    select case_id from public.canlar_donations
    where donor_id = p_user_id and case_id is not null and status in ('succeeded', 'partially_refunded') and gross_minor > refunded_minor
    union
    select case_id from public.canlar_aid
    where provider_id = p_user_id and case_id is not null and delivery_status = 'delivered'
  ) s;
  select count(*) into v_rescues from public.canlar_cases
  where credited_rescuer_id = p_user_id and rescue_verified_at is not null
    and status in ('rescued', 'rehomed', 'completed');
  select coalesce(sum(gross_minor - refunded_minor), 0) into v_donations from public.canlar_donations
  where donor_id = p_user_id and status in ('succeeded', 'partially_refunded');
  select count(*) into v_in_kind from public.canlar_aid
  where provider_id = p_user_id and aid_type <> 'volunteer_work' and delivery_status = 'delivered';
  select sum(verified_value_minor) into v_in_kind_value from public.canlar_aid
  where provider_id = p_user_id and aid_type <> 'volunteer_work' and delivery_status = 'delivered' and verified_value_minor is not null;
  select count(*) into v_volunteer from public.canlar_aid
  where provider_id = p_user_id and aid_type = 'volunteer_work' and delivery_status in ('accepted', 'delivered');
  return jsonb_build_object(
    'animals_supported', case when v_own or v_privacy.show_animals then v_animals else null end,
    'verified_rescues', case when v_own or v_privacy.show_rescues then v_rescues else null end,
    'donation_net_of_refunds_minor', case when v_own or v_privacy.show_donations then v_donations else null end,
    'donation_definition', 'İadeler düşülmüş gerçekleşen bağış tutarı. İşlem ücreti bu alanda değildir.',
    'in_kind_count', case when v_own or v_privacy.show_in_kind then v_in_kind else null end,
    'verified_in_kind_value_minor', case when v_own or v_privacy.show_in_kind then v_in_kind_value else null end,
    'volunteer_count', case when v_own or v_privacy.show_volunteer then v_volunteer else null end,
    'privacy', case when v_own then jsonb_build_object(
      'show_animals', coalesce(v_privacy.show_animals, false),
      'show_rescues', coalesce(v_privacy.show_rescues, false),
      'show_donations', coalesce(v_privacy.show_donations, false),
      'show_in_kind', coalesce(v_privacy.show_in_kind, false),
      'show_volunteer', coalesce(v_privacy.show_volunteer, false)
    ) else null end
  );
end;
$$;

create or replace function public.canlar_set_privacy(
  p_animals boolean,
  p_rescues boolean,
  p_donations boolean,
  p_in_kind boolean,
  p_volunteer boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  v_uid := public.canlar_require_member(false);
  insert into public.canlar_privacy (user_id, show_animals, show_rescues, show_donations, show_in_kind, show_volunteer)
  values (v_uid, p_animals, p_rescues, p_donations, p_in_kind, p_volunteer)
  on conflict (user_id) do update set
    show_animals = excluded.show_animals,
    show_rescues = excluded.show_rescues,
    show_donations = excluded.show_donations,
    show_in_kind = excluded.show_in_kind,
    show_volunteer = excluded.show_volunteer,
    updated_at = now();
end;
$$;

create or replace function public.canlar_set_notification_prefs(
  p_rescue boolean,
  p_treatment boolean,
  p_campaign boolean,
  p_promo boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  v_uid := public.canlar_require_member(false);
  insert into public.canlar_notification_prefs (user_id, rescue_updates, treatment_updates, campaign_updates, promotional)
  values (v_uid, p_rescue, p_treatment, p_campaign, p_promo)
  on conflict (user_id) do update set
    rescue_updates = excluded.rescue_updates,
    treatment_updates = excluded.treatment_updates,
    campaign_updates = excluded.campaign_updates,
    promotional = excluded.promotional,
    updated_at = now();
end;
$$;

create or replace function public.canlar_apply_role(p_role text, p_note text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_id uuid;
begin
  v_uid := public.canlar_require_member(true);
  insert into public.canlar_role_applications (user_id, role_key, status, note)
  values (v_uid, p_role, 'pending', nullif(trim(coalesce(p_note, '')), ''))
  on conflict (user_id, role_key) do update set
    status = case when canlar_role_applications.status = 'approved' then 'approved' else 'pending' end,
    note = excluded.note,
    updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.canlar_offer_aid(
  p_case_id uuid,
  p_campaign_id uuid,
  p_type text,
  p_note text,
  p_quantity text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_id uuid;
begin
  v_uid := public.canlar_require_member(false);
  if p_type in ('volunteer_work', 'foster', 'transport') and not exists (
    select 1 from public.canlar_role_applications
    where user_id = v_uid and role_key = 'volunteer' and status = 'approved'
  ) then
    raise exception 'Bu yardım türü için gönüllü rolünün onaylanmış olması gerekir.';
  end if;
  insert into public.canlar_aid (case_id, campaign_id, provider_id, aid_type, need_note, quantity_note)
  values (p_case_id, p_campaign_id, v_uid, p_type, trim(p_note), nullif(trim(coalesce(p_quantity, '')), ''))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.canlar_submit_proof(
  p_campaign_id uuid,
  p_expense_id uuid,
  p_kind text,
  p_path text,
  p_summary text,
  p_category text,
  p_amount bigint,
  p_payee text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_owner uuid;
  v_expense uuid;
  v_proof uuid;
  v_case uuid;
begin
  v_uid := public.canlar_require_member(false);
  select owner_id, case_id into v_owner, v_case from public.canlar_campaigns where id = p_campaign_id;
  if v_owner is distinct from v_uid then
    raise exception 'Bu kampanyaya kanıt yükleme yetkiniz yok.';
  end if;
  if split_part(p_path, '/', 1) <> v_uid::text then
    raise exception 'Kanıt dosyası yolu geçersiz.';
  end if;
  v_expense := p_expense_id;
  if v_expense is null then
    insert into public.canlar_expenses (
      campaign_id, case_id, category, amount_minor, currency, payee_label, review_status, created_by
    ) values (
      p_campaign_id, v_case, coalesce(p_category, 'other'), p_amount, 'try', coalesce(p_payee, 'Belirtilmedi'), 'uploaded', v_uid
    ) returning id into v_expense;
  end if;
  insert into public.canlar_proofs (expense_id, campaign_id, kind, storage_path, public_summary, review_status, created_by)
  values (v_expense, p_campaign_id, p_kind, p_path, nullif(trim(coalesce(p_summary, '')), ''), 'uploaded', v_uid)
  returning id into v_proof;
  return v_proof;
end;
$$;

create or replace function public.canlar_review_campaign(p_id uuid, p_status text, p_payments boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_from text;
  v_owner uuid;
begin
  if not public.is_admin() then
    raise exception 'Kampanya kararı için yönetici yetkisi gerekir.';
  end if;
  v_uid := auth.uid();
  select status, owner_id into v_from, v_owner from public.canlar_campaigns where id = p_id;
  update public.canlar_campaigns
    set status = p_status,
        payments_enabled = case when p_status = 'live' then coalesce(p_payments, false) else false end,
        status_note = nullif(trim(coalesce(p_reason, '')), '')
    where id = p_id;
  perform public.canlar_audit(v_uid, 'campaign.review', 'campaign', p_id, p_reason, v_from, p_status);
  perform public.canlar_notify(
    v_owner,
    'Vora Canlar: Kampanya başvurunuzun durumu güncellendi.',
    jsonb_build_object('kind', 'canlar_campaign', 'campaign_id', p_id, 'status', p_status),
    'campaign_updates'
  );
end;
$$;

create or replace function public.canlar_review_proof(p_id uuid, p_status text, p_reason text, p_public_summary text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_from text;
  v_expense uuid;
begin
  if not public.is_moderator() then
    raise exception 'Kanıt incelemesi için yetki gerekir.';
  end if;
  if p_status = 'approved' and nullif(trim(coalesce(p_public_summary, '')), '') is null then
    raise exception 'Onay için kişisel verilerden arındırılmış özet zorunludur. Ham dosya kamuya açılmaz.';
  end if;
  select review_status, expense_id into v_from, v_expense from public.canlar_proofs where id = p_id;
  update public.canlar_proofs
    set review_status = p_status,
        review_note = nullif(trim(coalesce(p_reason, '')), ''),
        public_summary = coalesce(nullif(trim(coalesce(p_public_summary, '')), ''), public_summary),
        reviewed_by = v_uid
    where id = p_id;
  if v_expense is not null then
    update public.canlar_expenses
      set review_status = p_status, review_note = nullif(trim(coalesce(p_reason, '')), ''), reviewed_by = v_uid
      where id = v_expense;
  end if;
  perform public.canlar_audit(v_uid, 'proof.review', 'proof', p_id, p_reason, v_from, p_status);
end;
$$;

create or replace function public.canlar_record_payout(
  p_campaign_id uuid,
  p_destination text,
  p_label text,
  p_clinic_id uuid,
  p_amount bigint,
  p_status text,
  p_reference text,
  p_note text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_currency text;
  v_case uuid;
begin
  if not public.is_admin() then
    raise exception 'Ödeme kaydı için yönetici yetkisi gerekir.';
  end if;
  if p_status = 'paid' and nullif(trim(coalesce(p_reference, '')), '') is null then
    raise exception 'Ödendi durumu ödeme referansı olmadan kaydedilemez.';
  end if;
  select currency, case_id into v_currency, v_case from public.canlar_campaigns where id = p_campaign_id;
  perform public.canlar_open_internal();
  insert into public.canlar_payouts (
    campaign_id, case_id, destination_type, destination_label, clinic_id, amount_minor, currency, status, payment_reference, note, created_by
  ) values (
    p_campaign_id, v_case, p_destination, trim(p_label), p_clinic_id, p_amount, v_currency, p_status,
    nullif(trim(coalesce(p_reference, '')), ''), nullif(trim(coalesce(p_note, '')), ''), v_uid
  ) returning id into v_id;
  if p_status = 'paid' then
    insert into public.canlar_ledger (campaign_id, kind, amount_minor, currency, idempotency_key, note, actor_id)
    values (p_campaign_id, 'payout', -p_amount, v_currency, 'payout:' || v_id::text, p_note, v_uid);
  end if;
  perform public.canlar_audit(v_uid, 'payout.record', 'payout', v_id, p_note, null, p_status);
  return v_id;
end;
$$;

create or replace function public.canlar_verify_rescue(p_case_id uuid, p_rescuer uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.is_moderator() then
    raise exception 'Kurtarma doğrulaması için yetki gerekir.';
  end if;
  if not exists (
    select 1 from public.canlar_role_applications
    where user_id = p_rescuer and role_key = 'rescuer' and status = 'approved'
  ) then
    raise exception 'Kurtarma sayısı yalnızca onaylı kurtarma rolü olan kişiye yazılır.';
  end if;
  update public.canlar_cases
    set credited_rescuer_id = p_rescuer, rescue_verified_at = now()
    where id = p_case_id;
  perform public.canlar_audit(v_uid, 'rescue.verify', 'case', p_case_id, p_reason, null, 'verified');
end;
$$;

create or replace function public.canlar_review_role(p_id uuid, p_status text, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from text;
begin
  if not public.is_admin() then
    raise exception 'Rol kararı için yönetici yetkisi gerekir.';
  end if;
  select status into v_from from public.canlar_role_applications where id = p_id;
  update public.canlar_role_applications
    set status = p_status, review_note = nullif(trim(coalesce(p_reason, '')), ''), reviewed_by = auth.uid(), updated_at = now()
    where id = p_id;
  perform public.canlar_audit(auth.uid(), 'role.review', 'role', p_id, p_reason, v_from, p_status);
end;
$$;

create or replace function public.canlar_review_clinic(p_id uuid, p_status text, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Klinik doğrulaması için yönetici yetkisi gerekir.';
  end if;
  update public.canlar_clinics
    set verification_status = p_status, reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_id;
  perform public.canlar_audit(auth.uid(), 'clinic.review', 'clinic', p_id, p_reason, null, p_status);
end;
$$;

create or replace function public.canlar_owner_dashboard(p_campaign_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
begin
  select owner_id into v_owner from public.canlar_campaigns where id = p_campaign_id;
  if v_uid is distinct from v_owner and not public.is_admin() then
    raise exception 'Bu kampanyanın finansal kayıtlarını görme yetkiniz yok.';
  end if;
  return jsonb_build_object(
    'money', public.canlar_campaign_money(p_campaign_id),
    'donations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'gross_minor', gross_minor, 'processor_fee_minor', processor_fee_minor,
        'other_deduction_minor', other_deduction_minor, 'refunded_minor', refunded_minor,
        'status', status, 'currency', currency, 'created_at', created_at,
        'anonymous', anonymous
      ) order by created_at desc)
      from public.canlar_donations where campaign_id = p_campaign_id
    ), '[]'::jsonb),
    'proofs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'kind', kind, 'review_status', review_status, 'review_note', review_note,
        'public_summary', public_summary, 'created_at', created_at
      ) order by created_at desc)
      from public.canlar_proofs where campaign_id = p_campaign_id
    ), '[]'::jsonb),
    'payouts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'destination_type', destination_type, 'destination_label', destination_label,
        'amount_minor', amount_minor, 'status', status, 'created_at', created_at
      ) order by created_at desc)
      from public.canlar_payouts where campaign_id = p_campaign_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.canlar_public_campaign(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.canlar_campaigns%rowtype;
  v_money jsonb;
begin
  select * into v_row from public.canlar_campaigns where id = p_id;
  if not found then
    return null;
  end if;
  if v_row.status not in ('live', 'paused', 'goal_met', 'report_pending', 'closed', 'approved')
     and auth.uid() is distinct from v_row.owner_id and not public.is_moderator() then
    return null;
  end if;
  v_money := public.canlar_campaign_money(p_id);
  return jsonb_build_object(
    'campaign', jsonb_build_object(
      'id', v_row.id, 'case_id', v_row.case_id, 'title', v_row.title, 'purpose', v_row.purpose,
      'help_kind', v_row.help_kind, 'payout_model', v_row.payout_model, 'target_minor', v_row.target_minor,
      'currency', v_row.currency, 'status', v_row.status, 'payments_enabled', v_row.payments_enabled,
      'fulfillment_plan', v_row.fulfillment_plan, 'proof_plan', v_row.proof_plan,
      'budget_gap_note', v_row.budget_gap_note, 'owner_id', v_row.owner_id
    ),
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object('category', category, 'label', label, 'amount_minor', amount_minor))
      from public.canlar_budget_lines where campaign_id = p_id
    ), '[]'::jsonb),
    'money', v_money,
    'public_proofs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'kind', kind, 'review_status', review_status, 'public_summary', public_summary, 'created_at', created_at
      ))
      from public.canlar_proofs
      where campaign_id = p_id and review_status = 'approved' and public_summary is not null
    ), '[]'::jsonb),
    'proof_gap', (
      select count(*) from public.canlar_payouts p
      where p.campaign_id = p_id and p.status = 'paid'
        and not exists (
          select 1 from public.canlar_expenses e
          where e.payout_id = p.id and e.review_status = 'approved'
        )
    )
  );
end;
$$;

create or replace function public.canlar_admin_queue()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_moderator() then
    raise exception 'Yönetim kuyruğu için yetki gerekir.';
  end if;
  return jsonb_build_object(
    'cases', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select id, public_code, species, name, city_label, status, duplicate_hint_id, created_at
        from public.canlar_cases
        where status in ('new_report', 'awaiting_review', 'verifying')
        order by created_at desc limit 40
      ) x
    ), '[]'::jsonb),
    'campaigns', case when public.is_admin() then coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select id, title, status, payments_enabled, target_minor, currency, created_at
        from public.canlar_campaigns
        where status in ('in_review', 'needs_info', 'live', 'paused')
        order by created_at desc limit 40
      ) x
    ), '[]'::jsonb) else '[]'::jsonb end,
    'proofs', coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select id, campaign_id, kind, review_status, created_at
        from public.canlar_proofs
        where review_status in ('uploaded', 'in_review', 'needs_more')
        order by created_at desc limit 40
      ) x
    ), '[]'::jsonb),
    'roles', case when public.is_admin() then coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select id, user_id, role_key, status, created_at
        from public.canlar_role_applications where status in ('pending', 'in_review', 'needs_more')
        order by created_at desc limit 40
      ) x
    ), '[]'::jsonb) else '[]'::jsonb end,
    'clinics', case when public.is_admin() then coalesce((
      select jsonb_agg(row_to_json(x)) from (
        select id, name, city_label, verification_status, created_at
        from public.canlar_clinics where verification_status in ('unverified', 'in_review')
        order by created_at desc limit 40
      ) x
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

create or replace function public.canlar_my_donation(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d public.canlar_donations%rowtype;
begin
  select * into d from public.canlar_donations where id = p_id;
  if not found then
    return null;
  end if;
  if auth.uid() is distinct from d.donor_id and not public.is_admin() then
    raise exception 'Bu bağış kaydını görme yetkiniz yok.';
  end if;
  return jsonb_build_object(
    'id', d.id,
    'campaign_id', d.campaign_id,
    'gross_minor', d.gross_minor,
    'processor_fee_minor', d.processor_fee_minor,
    'other_deduction_minor', d.other_deduction_minor,
    'refunded_minor', d.refunded_minor,
    'dispute_minor', d.dispute_minor,
    'currency', d.currency,
    'status', d.status,
    'anonymous', d.anonymous,
    'net_minor', case
      when d.processor_fee_minor is null then null
      else d.gross_minor - d.processor_fee_minor - d.other_deduction_minor - d.refunded_minor
    end,
    'created_at', d.created_at
  );
end;
$$;

create or replace function public.canlar_post_detail(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_post public.canlar_posts%rowtype;
  v_uid uuid := auth.uid();
  v_likes integer;
  v_comments integer;
begin
  select * into v_post from public.canlar_posts where id = p_id and (status = 'published' or author_id = v_uid or public.is_moderator());
  if not found then
    return null;
  end if;
  if v_post.vora_post_id is not null then
    select like_count, comment_count into v_likes, v_comments from public.posts where id = v_post.vora_post_id;
  else
    v_likes := v_post.like_count;
    v_comments := v_post.comment_count;
  end if;
  return jsonb_build_object(
    'post', jsonb_build_object(
      'id', v_post.id,
      'body', v_post.body,
      'media', v_post.media,
      'city_label', v_post.city_label,
      'species', v_post.species,
      'urgency', v_post.urgency,
      'case_id', v_post.case_id,
      'campaign_id', v_post.campaign_id,
      'vora_post_id', v_post.vora_post_id,
      'publish_mode', v_post.publish_mode,
      'like_count', coalesce(v_likes, 0),
      'comment_count', coalesce(v_comments, 0),
      'created_at', v_post.created_at,
      'author_id', v_post.author_id
    ),
    'liked', v_uid is not null and (
      (v_post.vora_post_id is not null and exists (
        select 1 from public.post_likes where post_id = v_post.vora_post_id and user_id = v_uid
      ))
      or exists (select 1 from public.canlar_post_likes where post_id = p_id and user_id = v_uid)
    ),
    'saved', v_uid is not null and (
      (v_post.vora_post_id is not null and exists (
        select 1 from public.post_saves where post_id = v_post.vora_post_id and user_id = v_uid
      ))
      or exists (select 1 from public.canlar_post_saves where post_id = p_id and user_id = v_uid)
    ),
    'comments', case when v_post.vora_post_id is null then coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'body', body, 'created_at', created_at) order by created_at)
      from public.canlar_post_comments where post_id = p_id
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

alter table public.canlar_clinics enable row level security;
alter table public.canlar_cases enable row level security;
alter table public.canlar_case_private enable row level security;
alter table public.canlar_case_events enable row level security;
alter table public.canlar_follows enable row level security;
alter table public.canlar_campaigns enable row level security;
alter table public.canlar_budget_lines enable row level security;
alter table public.canlar_posts enable row level security;
alter table public.canlar_post_likes enable row level security;
alter table public.canlar_post_comments enable row level security;
alter table public.canlar_post_saves enable row level security;
alter table public.canlar_donations enable row level security;
alter table public.canlar_ledger enable row level security;
alter table public.canlar_payouts enable row level security;
alter table public.canlar_expenses enable row level security;
alter table public.canlar_proofs enable row level security;
alter table public.canlar_aid enable row level security;
alter table public.canlar_privacy enable row level security;
alter table public.canlar_notification_prefs enable row level security;
alter table public.canlar_policy_consents enable row level security;
alter table public.canlar_role_applications enable row level security;
alter table public.canlar_audit enable row level security;
alter table public.canlar_stripe_events enable row level security;

create policy canlar_cases_read on public.canlar_cases for select
  using (status <> 'duplicate' or public.is_moderator() or reporter_id = auth.uid());
create policy canlar_private_read on public.canlar_case_private for select
  using (
    public.is_moderator()
    or exists (
      select 1 from public.canlar_cases c
      where c.id = case_id and (c.reporter_id = auth.uid() or c.assignee_id = auth.uid() or c.vet_user_id = auth.uid())
    )
  );
create policy canlar_events_read on public.canlar_case_events for select
  using (
    is_public or public.is_moderator() or exists (
      select 1 from public.canlar_cases c
      where c.id = case_id and (c.reporter_id = auth.uid() or c.assignee_id = auth.uid())
    )
  );
create policy canlar_posts_read on public.canlar_posts for select
  using (status = 'published' or author_id = auth.uid() or public.is_moderator());
create policy canlar_comments_read on public.canlar_post_comments for select using (true);
create policy canlar_campaigns_read on public.canlar_campaigns for select
  using (
    status in ('live', 'paused', 'goal_met', 'report_pending', 'closed', 'approved')
    or owner_id = auth.uid() or public.is_moderator()
  );
create policy canlar_lines_read on public.canlar_budget_lines for select using (true);
create policy canlar_clinics_read on public.canlar_clinics for select using (true);
create policy canlar_donations_own on public.canlar_donations for select
  using (donor_id = auth.uid() or public.is_admin());
create policy canlar_ledger_admin on public.canlar_ledger for select using (public.is_admin());
create policy canlar_payouts_admin on public.canlar_payouts for select
  using (
    public.is_admin() or exists (
      select 1 from public.canlar_campaigns c where c.id = campaign_id and c.owner_id = auth.uid()
    )
  );
create policy canlar_expenses_owner on public.canlar_expenses for select
  using (
    created_by = auth.uid() or public.is_moderator() or exists (
      select 1 from public.canlar_campaigns c where c.id = campaign_id and c.owner_id = auth.uid()
    )
  );
create policy canlar_proofs_owner on public.canlar_proofs for select
  using (
    created_by = auth.uid() or public.is_moderator() or exists (
      select 1 from public.canlar_campaigns c where c.id = campaign_id and c.owner_id = auth.uid()
    )
  );
create policy canlar_aid_read on public.canlar_aid for select
  using (provider_id = auth.uid() or public.is_moderator());
create policy canlar_privacy_self on public.canlar_privacy for select using (user_id = auth.uid());
create policy canlar_prefs_self on public.canlar_notification_prefs for select using (user_id = auth.uid());
create policy canlar_consent_self on public.canlar_policy_consents for select using (user_id = auth.uid());
create policy canlar_roles_self on public.canlar_role_applications for select
  using (user_id = auth.uid() or public.is_admin());
create policy canlar_follows_self on public.canlar_follows for select using (user_id = auth.uid());
create policy canlar_saves_self on public.canlar_post_saves for select using (user_id = auth.uid());
create policy canlar_likes_self on public.canlar_post_likes for select using (user_id = auth.uid());
create policy canlar_audit_admin on public.canlar_audit for select using (public.is_admin());

revoke all on public.canlar_donations from anon, authenticated;
grant select on public.canlar_donations to authenticated;
revoke all on public.canlar_ledger from anon, authenticated;
grant select on public.canlar_ledger to authenticated;
revoke all on public.canlar_payouts from anon, authenticated;
grant select on public.canlar_payouts to authenticated;
revoke all on public.canlar_stripe_events from anon, authenticated;
revoke all on public.canlar_audit from anon, authenticated;
grant select on public.canlar_audit to authenticated;
revoke all on public.canlar_case_events from anon, authenticated;
grant select on public.canlar_case_events to anon, authenticated;
revoke all on public.canlar_case_private from anon, authenticated;
grant select on public.canlar_case_private to authenticated;

revoke insert, update, delete on
  public.canlar_clinics,
  public.canlar_cases,
  public.canlar_case_private,
  public.canlar_case_events,
  public.canlar_follows,
  public.canlar_campaigns,
  public.canlar_budget_lines,
  public.canlar_posts,
  public.canlar_post_likes,
  public.canlar_post_comments,
  public.canlar_post_saves,
  public.canlar_donations,
  public.canlar_ledger,
  public.canlar_payouts,
  public.canlar_expenses,
  public.canlar_proofs,
  public.canlar_aid,
  public.canlar_privacy,
  public.canlar_notification_prefs,
  public.canlar_policy_consents,
  public.canlar_role_applications,
  public.canlar_audit,
  public.canlar_stripe_events
from anon, authenticated;

revoke all on function public.canlar_apply_payment_event(text, text, uuid, text, text, text, bigint, bigint, bigint, bigint) from public, anon, authenticated;
revoke all on function public.canlar_attach_checkout(uuid, text, text) from public, anon, authenticated;
revoke all on function public.canlar_require_member(boolean) from public, anon, authenticated;
revoke all on function public.canlar_open_internal() from public, anon, authenticated;
revoke all on function public.canlar_audit(uuid, text, text, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.canlar_notify(uuid, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.canlar_has_policy(uuid, text) from public, anon, authenticated;
revoke all on function public.canlar_campaign_money(uuid) from public, anon, authenticated;
grant execute on function public.canlar_apply_payment_event(text, text, uuid, text, text, text, bigint, bigint, bigint, bigint) to service_role;
grant execute on function public.canlar_attach_checkout(uuid, text, text) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'canlar-proofs',
  'canlar-proofs',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

drop policy if exists canlar_proofs_insert on storage.objects;
create policy canlar_proofs_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'canlar-proofs'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists canlar_proofs_select on storage.objects;
create policy canlar_proofs_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'canlar-proofs'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.is_moderator()
    )
  );
