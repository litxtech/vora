import {
  buildControlSubFeature,
  buildTabSubFeatures,
  featureControlId,
  featureTabId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';

const PARENT = 'messages';
const GROUP = 'tabs' as const;

const MESSAGE_TABS = [
  { id: 'requests', label: 'İstekler' },
  { id: 'contacts', label: 'Kişiler' },
  { id: 'friends', label: 'Arkadaşlar' },
] as const;

/** Mesajlar ekranı sekmeleri ve kısayol butonları. */
export const MESSAGING_FEATURE = {
  tab: {
    requests: featureTabId(PARENT, 'requests'),
    contacts: featureTabId(PARENT, 'contacts'),
    friends: featureTabId(PARENT, 'friends'),
  },
  newChat: featureControlId(PARENT, 'new-chat'),
  createGroup: featureControlId(PARENT, 'create-group'),
  archive: featureControlId(PARENT, 'archive'),
  composerAttach: featureControlId(PARENT, 'composer-attach'),
  composerVoice: featureControlId(PARENT, 'composer-voice'),
  composerCamera: featureControlId(PARENT, 'composer-camera'),
  chatSearch: featureControlId(PARENT, 'chat-search'),
  chatGallery: featureControlId(PARENT, 'chat-gallery'),
  chatAudioCall: featureControlId(PARENT, 'chat-audio-call'),
  chatVideoCall: featureControlId(PARENT, 'chat-video-call'),
  chatMenu: featureControlId(PARENT, 'chat-menu'),
  chatGroupInfo: featureControlId(PARENT, 'chat-group-info'),
  attachPhoto: featureControlId(PARENT, 'attach-photo'),
  attachVideo: featureControlId(PARENT, 'attach-video'),
  attachFile: featureControlId(PARENT, 'attach-file'),
  attachLocation: featureControlId(PARENT, 'attach-location'),
  msgQuote: featureControlId(PARENT, 'msg-quote'),
  msgReact: featureControlId(PARENT, 'msg-react'),
  msgForward: featureControlId(PARENT, 'msg-forward'),
  msgCopy: featureControlId(PARENT, 'msg-copy'),
  msgSelect: featureControlId(PARENT, 'msg-select'),
  msgEdit: featureControlId(PARENT, 'msg-edit'),
  msgReport: featureControlId(PARENT, 'msg-report'),
  msgDeleteMe: featureControlId(PARENT, 'msg-delete-me'),
  msgDeleteAll: featureControlId(PARENT, 'msg-delete-all'),
  pendingRetry: featureControlId(PARENT, 'pending-retry'),
  pendingCancel: featureControlId(PARENT, 'pending-cancel'),
  pendingDelete: featureControlId(PARENT, 'pending-delete'),
  selectionCopy: featureControlId(PARENT, 'selection-copy'),
  selectionForward: featureControlId(PARENT, 'selection-forward'),
  selectionDelete: featureControlId(PARENT, 'selection-delete'),
} as const;

export const MESSAGING_SUB_FEATURES: AppFeatureDef[] = [
  ...buildTabSubFeatures(PARENT, GROUP, [...MESSAGE_TABS]),
  buildControlSubFeature(PARENT, GROUP, 'new-chat', 'Yeni sohbet', 'Sohbet listesindeki kalem (yeni mesaj) butonu'),
  buildControlSubFeature(PARENT, GROUP, 'create-group', 'Grup oluştur', 'Sohbet listesindeki grup oluşturma butonu'),
  buildControlSubFeature(PARENT, GROUP, 'archive', 'Arşivlenmiş sohbetler', 'Arşivlenmiş sohbetlere geçiş satırı'),
  buildControlSubFeature(PARENT, GROUP, 'composer-attach', 'Sohbet · Ekle butonu', 'Sohbet giriş çubuğundaki (+) dosya/medya ekleme butonu'),
  buildControlSubFeature(PARENT, GROUP, 'composer-voice', 'Sohbet · Sesli mesaj', 'Sohbet giriş çubuğundaki mikrofon (sesli mesaj) butonu'),
  buildControlSubFeature(PARENT, GROUP, 'composer-camera', 'Sohbet · Kamera', 'Sohbet giriş çubuğundaki anlık fotoğraf (kamera) butonu'),
  buildControlSubFeature(PARENT, GROUP, 'chat-search', 'Sohbet · Arama', 'Sohbet başlığındaki mesaj arama butonu'),
  buildControlSubFeature(PARENT, GROUP, 'chat-gallery', 'Sohbet · Galeri', 'Sohbet başlığındaki medya galerisi butonu'),
  buildControlSubFeature(PARENT, GROUP, 'chat-audio-call', 'Sohbet · Sesli arama', 'Sohbet başlığındaki sesli arama butonu'),
  buildControlSubFeature(PARENT, GROUP, 'chat-video-call', 'Sohbet · Görüntülü arama', 'Sohbet başlığındaki görüntülü arama butonu'),
  buildControlSubFeature(PARENT, GROUP, 'chat-menu', 'Sohbet · Menü', 'Sohbet başlığındaki üç nokta menüsü'),
  buildControlSubFeature(PARENT, GROUP, 'chat-group-info', 'Sohbet · Grup bilgisi', 'Grup sohbetindeki bilgi butonu'),
  buildControlSubFeature(PARENT, GROUP, 'attach-photo', 'Sohbet · Fotoğraf ekle', 'Ekle menüsündeki fotoğraf seçeneği'),
  buildControlSubFeature(PARENT, GROUP, 'attach-video', 'Sohbet · Video ekle', 'Ekle menüsündeki video seçeneği'),
  buildControlSubFeature(PARENT, GROUP, 'attach-file', 'Sohbet · Dosya ekle', 'Ekle menüsündeki dosya seçeneği'),
  buildControlSubFeature(PARENT, GROUP, 'attach-location', 'Sohbet · Konum paylaş', 'Ekle menüsündeki konum paylaşımı'),
  buildControlSubFeature(PARENT, GROUP, 'msg-quote', 'Mesaj · Alıntıla', 'Mesaja uzun basınca alıntılama'),
  buildControlSubFeature(PARENT, GROUP, 'msg-react', 'Mesaj · Tepki ver', 'Mesaja uzun basınca emoji tepkisi'),
  buildControlSubFeature(PARENT, GROUP, 'msg-forward', 'Mesaj · İlet', 'Mesaja uzun basınca iletme'),
  buildControlSubFeature(PARENT, GROUP, 'msg-copy', 'Mesaj · Kopyala', 'Mesaja uzun basınca kopyalama'),
  buildControlSubFeature(PARENT, GROUP, 'msg-select', 'Mesaj · Seç', 'Mesaja uzun basınca çoklu seçim modu'),
  buildControlSubFeature(PARENT, GROUP, 'msg-edit', 'Mesaj · Düzenle', 'Kendi metin mesajını düzenleme'),
  buildControlSubFeature(PARENT, GROUP, 'msg-report', 'Mesaj · Şikayet et', 'Başkasının mesajını şikayet etme'),
  buildControlSubFeature(PARENT, GROUP, 'msg-delete-me', 'Mesaj · Benden sil', 'Mesajı yalnızca kendinden silme'),
  buildControlSubFeature(PARENT, GROUP, 'msg-delete-all', 'Mesaj · Herkesten sil', 'Mesajı herkesten silme'),
  buildControlSubFeature(PARENT, GROUP, 'pending-retry', 'Bekleyen mesaj · Tekrar gönder', 'Gönderilemeyen mesajı yeniden deneme'),
  buildControlSubFeature(PARENT, GROUP, 'pending-cancel', 'Bekleyen mesaj · İptal et', 'Kuyruktaki mesajı iptal etme'),
  buildControlSubFeature(PARENT, GROUP, 'pending-delete', 'Bekleyen mesaj · Sil', 'Gönderilemeyen mesajı silme'),
  buildControlSubFeature(PARENT, GROUP, 'selection-copy', 'Seçim · Kopyala', 'Çoklu seçim çubuğundaki kopyala'),
  buildControlSubFeature(PARENT, GROUP, 'selection-forward', 'Seçim · İlet', 'Çoklu seçim çubuğundaki ilet'),
  buildControlSubFeature(PARENT, GROUP, 'selection-delete', 'Seçim · Sil', 'Çoklu seçim çubuğundaki sil'),
];

export const SUB_FEATURES = MESSAGING_SUB_FEATURES;
