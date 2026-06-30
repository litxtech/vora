import { buildControlSubFeature, buildSectionSubFeature, buildTabSubFeatures, featureControlId } from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';
import { HIZMET_HUB_TABS } from '@/features/vora-hizmetler/constants';

const PARENT = 'vora-hizmetler';
const GROUP = 'centers' as const;

export const VORA_HIZMETLER_FEATURE = {
  tab: (tabId: string) => `${PARENT}.tab.${tabId}`,
  discoverSearch: featureControlId(PARENT, 'discover-search'),
  discoverFilter: featureControlId(PARENT, 'discover-filter'),
  detailEdit: featureControlId(PARENT, 'detail-edit'),
  detailCancel: featureControlId(PARENT, 'detail-cancel'),
  detailChat: featureControlId(PARENT, 'detail-chat'),
  detailPay: featureControlId(PARENT, 'detail-pay'),
  detailComplete: featureControlId(PARENT, 'detail-complete'),
  detailReview: featureControlId(PARENT, 'detail-review'),
  detailCompareOffers: featureControlId(PARENT, 'detail-compare-offers'),
  detailSubmitOffer: featureControlId(PARENT, 'detail-submit-offer'),
  detailAcceptOffer: featureControlId(PARENT, 'detail-accept-offer'),
  detailRejectOffer: featureControlId(PARENT, 'detail-reject-offer'),
  providerStartJob: featureControlId(PARENT, 'provider-start-job'),
  providerOpenMap: featureControlId(PARENT, 'provider-open-map'),
  detailDispute: featureControlId(PARENT, 'detail-dispute'),
  detailCompletionProof: featureControlId(PARENT, 'detail-completion-proof'),
  detailLiveLocation: featureControlId(PARENT, 'detail-live-location'),
  providerMessage: featureControlId(PARENT, 'provider-message'),
  providerCreateRequest: featureControlId(PARENT, 'provider-create-request'),
  providerApply: featureControlId(PARENT, 'provider-apply'),
  providerFavorite: featureControlId(PARENT, 'provider-favorite'),
  providerSubscribe: featureControlId(PARENT, 'provider-subscribe'),
  providerManage: featureControlId(PARENT, 'provider-manage'),
  section: {
    create: `${PARENT}.section.create`,
    emergency: `${PARENT}.section.emergency`,
    map: `${PARENT}.section.map`,
    discover: `${PARENT}.section.discover`,
    ai: `${PARENT}.section.ai`,
  },
} as const;

const DETAIL_CONTROLS: AppFeatureDef[] = [
  buildControlSubFeature(PARENT, GROUP, 'detail-edit', 'Detay · İlanı düzenle', 'Sahip · ilan düzenleme'),
  buildControlSubFeature(PARENT, GROUP, 'detail-cancel', 'Detay · İlanı kaldır', 'Sahip · ilanı iptal etme'),
  buildControlSubFeature(PARENT, GROUP, 'detail-chat', 'Detay · Mesajlaş', 'İş anlaşması sonrası sohbet'),
  buildControlSubFeature(PARENT, GROUP, 'detail-pay', 'Detay · Ödeme yap', 'Güvenli ödeme butonu'),
  buildControlSubFeature(PARENT, GROUP, 'detail-complete', 'Detay · İş bitti', 'Müşteri · işi tamamlama onayı'),
  buildControlSubFeature(PARENT, GROUP, 'detail-review', 'Detay · Değerlendir', 'Tamamlanan iş için puanlama'),
  buildControlSubFeature(PARENT, GROUP, 'detail-compare-offers', 'Detay · Teklifleri karşılaştır', 'Çoklu teklif karşılaştırma'),
  buildControlSubFeature(PARENT, GROUP, 'detail-submit-offer', 'Detay · Teklif ver', 'Usta · teklif gönderme'),
  buildControlSubFeature(PARENT, GROUP, 'detail-accept-offer', 'Detay · Teklifi kabul et', 'Müşteri · teklif kabulü'),
  buildControlSubFeature(PARENT, GROUP, 'detail-reject-offer', 'Detay · Teklifi reddet', 'Müşteri · teklif reddi'),
  buildControlSubFeature(PARENT, GROUP, 'provider-start-job', 'Usta · İşe başladım', 'Usta durum güncelleme'),
  buildControlSubFeature(PARENT, GROUP, 'provider-open-map', 'Usta · Haritada aç', 'İş konumuna yönlendirme'),
  buildControlSubFeature(PARENT, GROUP, 'detail-dispute', 'Detay · İtiraz aç', 'Ödeme itirazı'),
  buildControlSubFeature(PARENT, GROUP, 'detail-completion-proof', 'Detay · İş kanıtı', 'Tamamlama fotoğrafı gönderme/görüntüleme'),
  buildControlSubFeature(PARENT, GROUP, 'detail-live-location', 'Detay · Canlı konum', 'Konum paylaşımı ve takibi'),
  buildControlSubFeature(PARENT, GROUP, 'provider-message', 'Usta profil · Mesaj', 'Usta profilinden mesaj'),
  buildControlSubFeature(PARENT, GROUP, 'provider-create-request', 'Usta profil · Talep oluştur', 'Ustaya iş talebi'),
  buildControlSubFeature(PARENT, GROUP, 'provider-apply', 'Usta profil · Teklif ver', 'Usta profilinden başvuru'),
  buildControlSubFeature(PARENT, GROUP, 'provider-favorite', 'Usta profil · Favori', 'Usta favorileme'),
  buildControlSubFeature(PARENT, GROUP, 'provider-subscribe', 'Usta profil · Abone ol', 'Usta bildirim aboneliği'),
  buildControlSubFeature(PARENT, GROUP, 'provider-manage', 'Usta profilim', 'Kendi usta profil kısayolu'),
];

export const VORA_HIZMETLER_SUB_FEATURES: AppFeatureDef[] = [
  ...buildTabSubFeatures(PARENT, GROUP, HIZMET_HUB_TABS),
  buildSectionSubFeature(PARENT, GROUP, 'create', 'Talep oluştur', 'Yeni hizmet talebi'),
  buildSectionSubFeature(PARENT, GROUP, 'emergency', 'Acil Çağır', 'Acil hizmet eşleştirme'),
  buildSectionSubFeature(PARENT, GROUP, 'map', 'Hizmet Haritası', 'Yakındaki ustalar'),
  buildSectionSubFeature(PARENT, GROUP, 'discover', 'Usta Keşfet', 'Usta arama ve listeleme paneli'),
  buildSectionSubFeature(PARENT, GROUP, 'ai', 'Yapay Zekâ Destekli Talep', 'Otomatik kategori ve fiyat tahmini'),
  buildControlSubFeature(PARENT, GROUP, 'discover-search', 'Usta arama', 'Keşfet panelindeki arama çubuğu'),
  buildControlSubFeature(PARENT, GROUP, 'discover-filter', 'Meslek filtresi', 'Keşfet panelindeki meslek seçici'),
  ...DETAIL_CONTROLS,
];

export const SUB_FEATURES = VORA_HIZMETLER_SUB_FEATURES;
