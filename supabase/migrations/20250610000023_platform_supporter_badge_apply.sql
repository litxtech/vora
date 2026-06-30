-- Platform destekçisi: otomatik rozet atama + mevcut destekçileri backfill

create or replace function public.fulfill_platform_contribution(
  p_user_id uuid,
  p_tier text,
  p_session_id text,
  p_payment_intent_id text,
  p_amount_cents integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completed_at timestamptz := now();
begin
  update public.platform_contributions
  set
    status = 'completed',
    stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
    amount_cents = coalesce(nullif(p_amount_cents, 0), amount_cents),
    completed_at = v_completed_at
  where stripe_checkout_session_id = p_session_id
    and user_id = p_user_id;

  if not found then
    insert into public.platform_contributions (
      user_id,
      tier,
      amount_cents,
      stripe_checkout_session_id,
      stripe_payment_intent_id,
      status,
      completed_at
    )
    values (
      p_user_id,
      p_tier,
      p_amount_cents,
      p_session_id,
      p_payment_intent_id,
      'completed',
      v_completed_at
    );
  end if;

  insert into public.user_badges (user_id, badge_type, earned_at)
  values (p_user_id, 'platform_supporter', v_completed_at)
  on conflict (user_id, badge_type) do nothing;
end;
$$;

insert into public.user_badges (user_id, badge_type, earned_at)
select user_id, 'platform_supporter', min(completed_at)
from public.platform_contributions
where status = 'completed'
  and completed_at is not null
group by user_id
on conflict (user_id, badge_type) do nothing;
