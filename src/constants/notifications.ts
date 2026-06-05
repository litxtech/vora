export const NOTIFICATION_EVENT_TYPES = [
  { id: 'like', label: 'Beğeni', prefKey: 'likes' },
  { id: 'comment', label: 'Yorum', prefKey: 'comments' },
  { id: 'comment_reply', label: 'Yorum Yanıtı', prefKey: 'comments' },
  { id: 'quote', label: 'Alıntı', prefKey: 'likes' },
  { id: 'follow', label: 'Takip', prefKey: 'follows' },
  { id: 'friend_request', label: 'Arkadaşlık İsteği', prefKey: 'friend_requests' },
  { id: 'friend_accepted', label: 'Arkadaş Kabul', prefKey: 'friend_requests' },
  { id: 'message', label: 'Mesaj', prefKey: 'messages' },
  { id: 'mention', label: 'Bahsetme', prefKey: 'mentions' },
  { id: 'reel_like', label: 'Reel Beğeni', prefKey: 'likes' },
  { id: 'emergency', label: 'Acil Durum', prefKey: 'emergency' },
  { id: 'job', label: 'İş İlanı', prefKey: 'jobs' },
  { id: 'event_nearby', label: 'Yakındaki Etkinlik', prefKey: 'nearby_events' },
  { id: 'incident_update', label: 'Olay Gelişmesi', prefKey: 'nearby_events' },
  { id: 'call_incoming', label: 'Gelen Arama', prefKey: 'messages' },
  { id: 'save', label: 'Kaydetme', prefKey: 'likes' },
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number]['id'];

export const MAX_NOTIFICATION_SOUND_SECONDS = 10;

export const PUSH_PREF_OPTIONS = [
  { id: 'likes', label: 'Beğeniler', description: 'Gönderi ve reel beğenileri' },
  { id: 'comments', label: 'Yorumlar', description: 'Yorum ve yanıtlar' },
  { id: 'follows', label: 'Takip', description: 'Yeni takipçiler' },
  { id: 'friend_requests', label: 'Arkadaşlık', description: 'Arkadaşlık istekleri ve kabul' },
  { id: 'messages', label: 'Mesajlar', description: 'Yeni mesajlar ve aramalar' },
  { id: 'mentions', label: 'Bahsetmeler', description: 'Sizi etiketleyen paylaşımlar' },
  { id: 'nearby_events', label: 'Yakındaki olaylar', description: 'Bölgesel olay ve gelişmeler' },
  { id: 'emergency', label: 'Acil durum', description: 'Kritik uyarılar' },
  { id: 'jobs', label: 'İş ilanları', description: 'Yeni iş fırsatları' },
] as const;

export type PushPrefId = (typeof PUSH_PREF_OPTIONS)[number]['id'];
