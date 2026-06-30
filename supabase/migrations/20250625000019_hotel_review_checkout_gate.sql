-- Otel değerlendirmesi: yalnızca konaklayan misafir, çıkış günü 11:00 (İstanbul) sonrası

create or replace function public.hotel_review_unlock_at(p_check_out date)
returns timestamptz
language sql
immutable
as $$
  select ((p_check_out + time '11:00') at time zone 'Europe/Istanbul');
$$;

create or replace function public.guest_can_review_hotel(
  p_hotel_id uuid,
  p_guest_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hotel_reservations r
    where r.hotel_id = p_hotel_id
      and r.guest_id = p_guest_id
      and r.status in ('confirmed', 'completed')
      and now() >= public.hotel_review_unlock_at(r.check_out)
  );
$$;

create or replace function public.get_hotel_review_eligibility(p_hotel_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_check_out date;
  v_unlock timestamptz;
  v_has_review boolean;
begin
  if v_uid is null then
    return jsonb_build_object('eligible', false, 'has_review', false, 'reason', 'login_required');
  end if;

  if exists (
    select 1 from public.hotel_listings h
    where h.id = p_hotel_id and h.owner_id = v_uid
  ) then
    return jsonb_build_object('eligible', false, 'has_review', false, 'reason', 'owner');
  end if;

  select exists (
    select 1 from public.hotel_reviews
    where hotel_id = p_hotel_id and reviewer_id = v_uid
  ) into v_has_review;

  select r.check_out, public.hotel_review_unlock_at(r.check_out)
  into v_check_out, v_unlock
  from public.hotel_reservations r
  where r.hotel_id = p_hotel_id
    and r.guest_id = v_uid
    and r.status in ('confirmed', 'completed')
  order by r.check_out desc
  limit 1;

  if v_check_out is null then
    return jsonb_build_object(
      'eligible', false,
      'has_review', v_has_review,
      'reason', 'no_stay'
    );
  end if;

  if now() < v_unlock then
    return jsonb_build_object(
      'eligible', false,
      'has_review', v_has_review,
      'check_out', v_check_out,
      'unlocks_at', v_unlock,
      'reason', 'too_early'
    );
  end if;

  return jsonb_build_object(
    'eligible', true,
    'has_review', v_has_review,
    'check_out', v_check_out,
    'unlocks_at', v_unlock,
    'reason', null
  );
end;
$$;

drop policy if exists hotel_reviews_insert on public.hotel_reviews;
create policy hotel_reviews_insert on public.hotel_reviews
  for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and not exists (
      select 1 from public.hotel_listings h
      where h.id = hotel_id and h.owner_id = auth.uid()
    )
    and public.guest_can_review_hotel(hotel_id, auth.uid())
  );

grant execute on function public.hotel_review_unlock_at(date) to authenticated;
grant execute on function public.guest_can_review_hotel(uuid, uuid) to authenticated;
grant execute on function public.get_hotel_review_eligibility(uuid) to authenticated;
