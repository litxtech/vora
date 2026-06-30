-- İzdivaç erişim iptali bildirimi (55P04 önlemi: enum ayrı migration)

alter type public.notification_event_type add value if not exists 'izdivac_access_revoked';
