-- İlan durumu bir kez yazılır. Sonraki çağrı durumu değiştirmez.
-- Bu dosya incelenmeden üretimde çalıştırılmamalıdır.

create or replace function public.canlar_set_listing_outcome(p_post_id uuid, p_outcome text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.canlar_require_member(false);
  v_post public.canlar_posts%rowtype;
  v_status text;
  v_treatment text;
  v_from text;
begin
  if p_outcome not in ('treating', 'recovered', 'lost') then
    raise exception 'Durum seçilemedi.';
  end if;
  select * into v_post from public.canlar_posts where id = p_post_id and status = 'published';
  if not found then
    raise exception 'İlan bulunamadı.';
  end if;
  if v_post.author_id <> v_uid and not public.is_moderator() then
    raise exception 'Bu ilanın durumunu güncelleme yetkiniz yok.';
  end if;
  if v_post.outcome is not null then
    raise exception 'İlan durumu bir kez yazılır ve değiştirilemez.';
  end if;

  v_status := case p_outcome when 'treating' then 'treatment' when 'recovered' then 'completed' else 'lost' end;
  v_treatment := case p_outcome when 'treating' then 'ongoing' when 'recovered' then 'completed' else 'lost' end;

  perform public.canlar_open_internal();
  update public.canlar_posts
    set outcome = p_outcome, donation_open = false
    where id = p_post_id
      and outcome is null;

  if not found then
    raise exception 'İlan durumu bir kez yazılır ve değiştirilemez.';
  end if;

  if v_post.campaign_id is not null then
    update public.canlar_campaigns
      set payments_enabled = false, status = 'closed'
      where id = v_post.campaign_id;
  end if;

  if v_post.case_id is not null then
    select status into v_from from public.canlar_cases where id = v_post.case_id;
    update public.canlar_cases
      set status = v_status, treatment_status = v_treatment
      where id = v_post.case_id;
    insert into public.canlar_case_events (case_id, from_status, to_status, note, is_public, actor_id)
    values (
      v_post.case_id,
      v_from,
      v_status,
      case p_outcome
        when 'treating' then 'Tedavi oldu. Bağış kapandı.'
        when 'recovered' then 'İyileşti. Bağış kapandı.'
        else 'Maalesef kaybettik. Bağış kapandı.'
      end,
      true,
      v_uid
    );
  end if;
end;
$$;
