import {
  buildControlSubFeature,
  featureControlId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';

const PARENT = 'feed';
const GROUP = 'tabs' as const;

/** Gönderi kartı altındaki etkileşim butonları. */
export const FEED_FEATURE = {
  comment: featureControlId(PARENT, 'comment'),
  quote: featureControlId(PARENT, 'quote'),
  like: featureControlId(PARENT, 'like'),
  save: featureControlId(PARENT, 'save'),
  share: featureControlId(PARENT, 'share'),
  shareChat: featureControlId(PARENT, 'share-chat'),
  regionFilter: featureControlId(PARENT, 'region-filter'),
  districtFilter: featureControlId(PARENT, 'district-filter'),
  postMoreMenu: featureControlId(PARENT, 'post-more-menu'),
  postCardFollow: featureControlId(PARENT, 'post-card-follow'),
  postMenuDelete: featureControlId(PARENT, 'post-menu-delete'),
  postMenuReport: featureControlId(PARENT, 'post-menu-report'),
  postMenuMisinfo: featureControlId(PARENT, 'post-menu-misinfo'),
  postMenuSafety: featureControlId(PARENT, 'post-menu-safety'),
  postMenuModeration: featureControlId(PARENT, 'post-menu-moderation'),
  postDetailShare: featureControlId(PARENT, 'post-detail-share'),
  postDetailComments: featureControlId(PARENT, 'post-detail-comments'),
  commentLike: featureControlId(PARENT, 'comment-like'),
  commentReply: featureControlId(PARENT, 'comment-reply'),
  commentSubmit: featureControlId(PARENT, 'comment-submit'),
  commentMenuReply: featureControlId(PARENT, 'comment-menu-reply'),
  commentMenuEdit: featureControlId(PARENT, 'comment-menu-edit'),
  commentMenuCopy: featureControlId(PARENT, 'comment-menu-copy'),
  commentMenuDelete: featureControlId(PARENT, 'comment-menu-delete'),
  commentMenuReport: featureControlId(PARENT, 'comment-menu-report'),
} as const;

export const FEED_SUB_FEATURES: AppFeatureDef[] = [
  buildControlSubFeature(PARENT, GROUP, 'comment', 'Yorum butonu', 'Gönderi kartındaki yorum butonu'),
  buildControlSubFeature(PARENT, GROUP, 'quote', 'Alıntı butonu', 'Gönderiyi alıntılama butonu'),
  buildControlSubFeature(PARENT, GROUP, 'like', 'Beğeni butonu', 'Gönderi kartındaki kalp / beğeni butonu'),
  buildControlSubFeature(PARENT, GROUP, 'save', 'Kaydet butonu', 'Gönderiyi koleksiyona kaydetme butonu'),
  buildControlSubFeature(PARENT, GROUP, 'share', 'Paylaş butonu', 'Gönderiyi dışarı paylaşma butonu'),
  buildControlSubFeature(
    PARENT,
    GROUP,
    'share-chat',
    'Mesaja gönder butonu',
    'Gönderiyi sohbete iletme (uçak) butonu',
  ),
  buildControlSubFeature(PARENT, GROUP, 'region-filter', 'İl filtresi', 'Akış başlığındaki il seçici'),
  buildControlSubFeature(PARENT, GROUP, 'district-filter', 'İlçe filtresi', 'Akış başlığındaki ilçe seçici'),
  buildControlSubFeature(PARENT, GROUP, 'post-more-menu', 'Gönderi menüsü', 'Gönderi kartındaki üç nokta menüsü'),
  buildControlSubFeature(PARENT, GROUP, 'post-card-follow', 'Gönderide takip et', 'Gönderi kartı başlığındaki takip butonu'),
  buildControlSubFeature(PARENT, GROUP, 'post-menu-delete', 'Gönderiyi sil', 'Kendi gönderinizdeki silme seçeneği'),
  buildControlSubFeature(PARENT, GROUP, 'post-menu-report', 'Şikayet et', 'Gönderi menüsündeki şikayet seçeneği'),
  buildControlSubFeature(PARENT, GROUP, 'post-menu-misinfo', 'Yanlış bilgi işaretle', 'Gönderi menüsündeki yanlış bilgi seçeneği'),
  buildControlSubFeature(PARENT, GROUP, 'post-menu-safety', 'Engelle / sessize al', 'Gönderi menüsündeki güvenlik seçeneği'),
  buildControlSubFeature(PARENT, GROUP, 'post-menu-moderation', 'Moderasyon', 'Gönderi menüsündeki moderasyon seçeneği (yetkili)'),
  buildControlSubFeature(PARENT, GROUP, 'post-detail-share', 'Gönderi detay · Paylaş', 'Gönderi detay başlığındaki paylaş butonu'),
  buildControlSubFeature(PARENT, GROUP, 'post-detail-comments', 'Gönderi detay · Yorumlar', 'Gönderi detayındaki yorumlar kısayolu'),
  buildControlSubFeature(PARENT, GROUP, 'comment-like', 'Yorum · Beğeni', 'Yorum satırındaki kalp / beğeni butonu'),
  buildControlSubFeature(PARENT, GROUP, 'comment-reply', 'Yorum · Yanıtla', 'Yorum satırındaki yanıtla butonu'),
  buildControlSubFeature(PARENT, GROUP, 'comment-submit', 'Yorum · Gönder', 'Yorum girişindeki gönder butonu'),
  buildControlSubFeature(PARENT, GROUP, 'comment-menu-reply', 'Yorum menüsü · Yanıtla', 'Yorum menüsündeki yanıtla seçeneği'),
  buildControlSubFeature(PARENT, GROUP, 'comment-menu-edit', 'Yorum menüsü · Düzenle', 'Kendi yorumunu düzenleme'),
  buildControlSubFeature(PARENT, GROUP, 'comment-menu-copy', 'Yorum menüsü · Kopyala', 'Yorum metnini kopyalama'),
  buildControlSubFeature(PARENT, GROUP, 'comment-menu-delete', 'Yorum menüsü · Sil', 'Kendi yorumunu silme'),
  buildControlSubFeature(PARENT, GROUP, 'comment-menu-report', 'Yorum menüsü · Şikayet', 'Başkasının yorumunu şikayet etme'),
];

export const SUB_FEATURES = FEED_SUB_FEATURES;
