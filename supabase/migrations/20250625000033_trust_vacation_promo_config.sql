-- Tatil promosyon kartı: app_appearance içinde admin'den yönetilebilir kampanya alanı

update public.app_system_config
set value = coalesce(value, '{}'::jsonb) || jsonb_build_object(
  'trust_vacation_promo', coalesce(
    value->'trust_vacation_promo',
    jsonb_build_object(
      'enabled', true,
      'badge', 'Tatil heyecanı',
      'title', 'Vora''da tatil heyecanı devam ediyor',
      'message', '100 güven puanına ulaşan üyelere Rize ve Uzungöl tatili hediye edilmeye devam ediyor. Hemen platforma katıl — sosyalleş, tüm Karadeniz''de haberin olsun.',
      'highlight', '100 puan · Rize & Uzungöl',
      'cta_label', 'Puan kazanma rehberi',
      'cta_href', '/settings/insights',
      'image_url', null,
      'dismissible', true,
      'placements', jsonb_build_object(
        'feed', true,
        'wallet', true,
        'insights', true,
        'lobby', true
      )
    )
  )
)
where key = 'app_appearance';
