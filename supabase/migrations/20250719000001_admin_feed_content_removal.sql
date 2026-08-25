-- Admin: feed içeriği kaldırma / geri yükleme / kalıcı silme + sahip bildirimi

alter type public.notification_event_type add value if not exists 'content_removed';
alter type public.notification_event_type add value if not exists 'content_restored';

alter table public.post_comments
  add column if not exists is_removed boolean not null default false;

create index if not exists post_comments_removed_idx
  on public.post_comments (is_removed, created_at desc)
  where is_removed = true;

-- Rapor / moderasyon hedefinden sahip çözümü
create or replace function public.resolve_report_target_user(p_target_type text, p_target_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  case p_target_type
    when 'profile' then return p_target_id;
    when 'post' then
      select author_id into v_user_id from public.posts where id = p_target_id;
      return v_user_id;
    when 'reel' then
      select author_id into v_user_id from public.reels where id = p_target_id;
      return v_user_id;
    when 'comment' then
      select author_id into v_user_id from public.post_comments where id = p_target_id;
      return v_user_id;
    when 'business_ad' then
      select owner_id into v_user_id from public.business_ads where id = p_target_id;
      return v_user_id;
    when 'marketplace_listing' then
      select author_id into v_user_id from public.marketplace_listings where id = p_target_id;
      return v_user_id;
    when 'business_shop', 'business' then
      select owner_id into v_user_id from public.businesses where id = p_target_id;
      return v_user_id;
    when 'event' then
      select organizer_id into v_user_id from public.events where id = p_target_id;
      return v_user_id;
    when 'lost_item' then
      select author_id into v_user_id from public.lost_items where id = p_target_id;
      return v_user_id;
    else return null;
  end case;
end;
$$;

create or replace function public.resolve_moderation_target_user(p_target_type text, p_target_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return public.resolve_report_target_user(p_target_type, p_target_id);
end;
$$;

create or replace function public.admin_content_type_label(p_target_type text)
returns text
language sql
immutable
as $$
  select case p_target_type
    when 'post' then 'Gönderiniz'
    when 'reel' then 'Reel''iniz'
    when 'comment' then 'Yorumunuz'
    when 'business_ad' then 'Reklamınız'
    when 'marketplace_listing' then 'Pazar ilanınız'
    when 'business_shop' then 'Mağazanız'
    when 'business' then 'İşletme profiliniz'
    else 'İçeriğiniz'
  end;
$$;

create or replace function public.admin_notify_content_moderation(
  p_owner_id uuid,
  p_event_type public.notification_event_type,
  p_target_type text,
  p_target_id uuid,
  p_action text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
  v_title text;
  v_body text;
  v_reason text;
begin
  if p_owner_id is null or p_owner_id = auth.uid() then
    return;
  end if;

  v_label := public.admin_content_type_label(p_target_type);
  v_reason := coalesce(nullif(trim(p_reason), ''), 'Topluluk kuralları ve moderasyon politikası.');

  if p_event_type = 'content_removed'::public.notification_event_type then
    v_title := format('%s kaldırıldı', v_label);
    v_body := format(
      '%s platform kurallarına aykırı bulunduğu için yayından kaldırıldı. Gerekçe: %s Sorularınız için destek ekibimize yazabilirsiniz.',
      v_label,
      v_reason
    );
  else
    v_title := format('%s yeniden yayında', v_label);
    v_body := format('%s moderasyon incelemesi sonrası tekrar yayına alındı.', v_label);
  end if;

  insert into public.notification_outbox (recipient_id, event_type, title, body, data, actor_id)
  values (
    p_owner_id,
    p_event_type,
    v_title,
    v_body,
    jsonb_build_object(
      'target_type', p_target_type,
      'target_id', p_target_id,
      'action', p_action,
      'forced', true
    ),
    auth.uid()
  );

  insert into public.notifications (user_id, event_type, title, body, data, actor_id)
  values (
    p_owner_id,
    p_event_type,
    v_title,
    v_body,
    jsonb_build_object(
      'target_type', p_target_type,
      'target_id', p_target_id,
      'action', p_action
    ),
    auth.uid()
  );
end;
$$;

create or replace function public.admin_moderate_feed_content(
  p_target_type text,
  p_target_id uuid,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_reason text;
  v_notify_event public.notification_event_type;
  v_label text;
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  if p_action not in ('hide', 'remove', 'restore', 'delete_permanent') then
    raise exception 'Geçersiz işlem';
  end if;

  v_reason := coalesce(nullif(trim(p_reason), ''), 'Admin moderasyon');
  v_owner_id := public.resolve_moderation_target_user(p_target_type, p_target_id);

  case p_target_type
    when 'post' then
      if p_action = 'hide' then
        update public.posts set status = 'hidden', updated_at = now() where id = p_target_id;
      elsif p_action = 'remove' then
        update public.posts set status = 'removed', updated_at = now() where id = p_target_id;
      elsif p_action = 'restore' then
        update public.posts set status = 'published', updated_at = now() where id = p_target_id;
      elsif p_action = 'delete_permanent' then
        delete from public.posts where id = p_target_id;
      end if;
    when 'reel' then
      if p_action = 'hide' then
        update public.reels set status = 'hidden', updated_at = now() where id = p_target_id;
      elsif p_action = 'remove' then
        update public.reels set status = 'removed', updated_at = now() where id = p_target_id;
      elsif p_action = 'restore' then
        update public.reels set status = 'published', updated_at = now() where id = p_target_id;
      elsif p_action = 'delete_permanent' then
        delete from public.reels where id = p_target_id;
      end if;
    when 'comment' then
      if p_action in ('hide', 'remove') then
        update public.post_comments set is_removed = true where id = p_target_id;
      elsif p_action = 'restore' then
        update public.post_comments set is_removed = false where id = p_target_id;
      elsif p_action = 'delete_permanent' then
        delete from public.post_comments where id = p_target_id;
      end if;
    when 'business_ad' then
      if p_action in ('hide', 'remove') then
        update public.business_ads
        set status = 'ended', ends_at = coalesce(ends_at, now()), updated_at = now()
        where id = p_target_id;
      elsif p_action = 'restore' then
        update public.business_ads
        set status = 'paused', updated_at = now()
        where id = p_target_id;
      elsif p_action = 'delete_permanent' then
        delete from public.business_ads where id = p_target_id;
      end if;
    when 'marketplace_listing' then
      if p_action = 'hide' then
        update public.marketplace_listings set content_status = 'hidden', updated_at = now() where id = p_target_id;
      elsif p_action = 'remove' then
        update public.marketplace_listings set content_status = 'removed', updated_at = now() where id = p_target_id;
      elsif p_action = 'restore' then
        update public.marketplace_listings set content_status = 'published', updated_at = now() where id = p_target_id;
      elsif p_action = 'delete_permanent' then
        delete from public.marketplace_listings where id = p_target_id;
      end if;
    when 'business_shop', 'business' then
      if p_action in ('hide', 'remove') then
        update public.businesses set shop_published = false where id = p_target_id;
      elsif p_action = 'restore' then
        update public.businesses
        set shop_published = true
        where id = p_target_id and registration_status = 'approved';
      elsif p_action = 'delete_permanent' then
        raise exception 'İşletme mağazası kalıcı silinemez; yayından kaldırın.';
      end if;
    else
      raise exception 'Desteklenmeyen içerik türü';
  end case;

  if not found then
    raise exception 'İçerik bulunamadı';
  end if;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason, metadata)
  values (
    auth.uid(),
    p_target_type,
    p_target_id,
    p_action,
    v_reason,
    jsonb_build_object('owner_id', v_owner_id)
  );

  if p_action in ('remove', 'hide') then
    v_notify_event := 'content_removed';
    perform public.admin_notify_content_moderation(v_owner_id, v_notify_event, p_target_type, p_target_id, p_action, v_reason);
  elsif p_action = 'restore' then
    v_notify_event := 'content_restored';
    perform public.admin_notify_content_moderation(v_owner_id, v_notify_event, p_target_type, p_target_id, p_action, v_reason);
  elsif p_action = 'delete_permanent' and v_owner_id is not null then
    perform public.admin_notify_content_moderation(
      v_owner_id,
      'content_removed'::public.notification_event_type,
      p_target_type,
      p_target_id,
      p_action,
      v_reason || ' (kalıcı silindi)'
    );
  end if;

  v_label := public.admin_content_type_label(p_target_type);

  return jsonb_build_object(
    'target_type', p_target_type,
    'target_id', p_target_id,
    'action', p_action,
    'owner_id', v_owner_id,
    'label', v_label
  );
end;
$$;

create or replace function public.admin_list_removed_content(p_limit int default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if not public.is_moderator() then
    raise exception 'Yetkisiz';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t) order by t.removed_at desc)
    from (
      select * from (
        select
          'post'::text as target_type,
          p.id as target_id,
          coalesce(nullif(trim(p.title), ''), left(coalesce(p.content, ''), 120)) as title,
          p.status::text as status,
          p.author_id as owner_id,
          pr.username as owner_username,
          pr.full_name as owner_full_name,
          p.updated_at as removed_at
        from public.posts p
        left join public.profiles pr on pr.id = p.author_id
        where p.status in ('removed', 'hidden')

        union all

        select
          'reel'::text,
          r.id,
          coalesce(left(r.caption, 120), 'Reel'),
          r.status::text,
          r.author_id,
          pr.username,
          pr.full_name,
          r.updated_at
        from public.reels r
        left join public.profiles pr on pr.id = r.author_id
        where r.status in ('removed', 'hidden')

        union all

        select
          'comment'::text,
          c.id,
          left(coalesce(c.content, ''), 120),
          case when c.is_removed then 'removed' else 'published' end,
          c.author_id,
          pr.username,
          pr.full_name,
          c.created_at
        from public.post_comments c
        left join public.profiles pr on pr.id = c.author_id
        where c.is_removed = true

        union all

        select
          'business_ad'::text,
          ba.id,
          ba.title,
          ba.status::text,
          ba.owner_id,
          pr.username,
          pr.full_name,
          ba.updated_at
        from public.business_ads ba
        left join public.profiles pr on pr.id = ba.owner_id
        where ba.status = 'ended'
          and exists (
            select 1 from public.moderation_actions ma
            where ma.target_type = 'business_ad'
              and ma.target_id = ba.id
              and ma.action in ('remove', 'hide', 'delete_permanent')
          )

        union all

        select
          'marketplace_listing'::text,
          l.id,
          l.title,
          l.content_status::text,
          l.author_id,
          pr.username,
          pr.full_name,
          l.updated_at
        from public.marketplace_listings l
        left join public.profiles pr on pr.id = l.author_id
        where l.content_status in ('removed', 'hidden')

        union all

        select
          'business_shop'::text,
          b.id,
          b.name,
          case when b.shop_published then 'published' else 'removed' end,
          b.owner_id,
          pr.username,
          pr.full_name,
          coalesce(
            (
              select ma.created_at
              from public.moderation_actions ma
              where ma.target_type in ('business_shop', 'business')
                and ma.target_id = b.id
                and ma.action in ('remove', 'hide')
              order by ma.created_at desc
              limit 1
            ),
            b.created_at
          )
        from public.businesses b
        left join public.profiles pr on pr.id = b.owner_id
        where b.shop_published = false
          and b.registration_status = 'approved'
          and exists (
            select 1 from public.moderation_actions ma
            where ma.target_type in ('business_shop', 'business')
              and ma.target_id = b.id
              and ma.action in ('remove', 'hide')
          )
      ) combined
      order by removed_at desc
      limit v_limit
    ) t
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_moderate_feed_content(text, uuid, text, text) to authenticated;
grant execute on function public.admin_list_removed_content(int) to authenticated;
