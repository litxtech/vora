-- Otel Merkezi: harita canlı katmanı + sahip bildirimi (yeni yorum)

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'hotel_listings'
  ) then
    alter publication supabase_realtime add table public.hotel_listings;
  end if;
end $$;

alter table public.hotel_listings replica identity full;

alter type public.notification_event_type add value if not exists 'hotel_review';

create or replace function public.notify_hotel_owner_on_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hotel record;
  v_reviewer_name text;
  v_title text;
  v_body text;
  v_data jsonb;
begin
  select h.id, h.name, h.owner_id
  into v_hotel
  from public.hotel_listings h
  where h.id = new.hotel_id;

  if v_hotel.owner_id is null or v_hotel.owner_id = new.reviewer_id then
    return new;
  end if;

  select coalesce(p.username, p.full_name, 'Bir misafir')
  into v_reviewer_name
  from public.profiles p
  where p.id = new.reviewer_id;

  v_title := v_hotel.name || ' — yeni değerlendirme';
  v_body := v_reviewer_name || ' · ' || new.rating::text || '/5 yıldız';
  if new.comment is not null and char_length(trim(new.comment)) > 0 then
    v_body := v_body || ' — ' || left(trim(new.comment), 80);
  end if;

  v_data := jsonb_build_object(
    'hotel_id', v_hotel.id,
    'review_id', new.id,
    'rating', new.rating,
    'deep_link', '/detail/hotels/' || v_hotel.id::text
  );

  if coalesce(
    (select (notification_prefs->>'hotels')::boolean from public.profiles where id = v_hotel.owner_id),
    true
  ) then
    insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
    values (v_hotel.owner_id, 'hotel_review'::public.notification_event_type, v_title, v_body, v_data, new.reviewer_id);

    insert into public.notifications (user_id, event_type, title, body, data, actor_id, category, priority)
    values (
      v_hotel.owner_id,
      'hotel_review'::public.notification_event_type,
      v_title,
      v_body,
      v_data,
      new.reviewer_id,
      'businesses'::public.notification_category,
      'normal'::public.notification_priority
    );
  end if;

  return new;
end;
$$;

drop trigger if exists hotel_review_notify_owner on public.hotel_reviews;
create trigger hotel_review_notify_owner
  after insert on public.hotel_reviews
  for each row execute function public.notify_hotel_owner_on_review();
