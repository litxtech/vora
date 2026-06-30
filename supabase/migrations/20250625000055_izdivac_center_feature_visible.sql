-- İzdivaç merkezi: kullanıcıya yetki verildiğinde merkez kartı görünsün (global bayrak açık)

update public.app_feature_flags
set is_button_visible = true
where feature_id = 'izdivac-center';

insert into public.app_feature_flags (feature_id, label, feature_group, is_button_visible)
values ('izdivac-center', 'İzdivaç', 'centers', true)
on conflict (feature_id) do update
  set is_button_visible = true,
      label = excluded.label;
