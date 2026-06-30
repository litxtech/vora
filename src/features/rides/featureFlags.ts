import {
  buildControlSubFeature,
  buildSectionSubFeature,
  buildTabSubFeatures,
  featureControlId,
  featureSectionId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';
import { RIDES_TABS } from '@/features/rides/constants';

const PARENT = 'rides';
const GROUP = 'centers' as const;

const VEHICLES_SECTION = featureSectionId(PARENT, 'vehicles');

export const RIDES_FEATURE = {
  vehiclePhotos: featureControlId(VEHICLES_SECTION, 'photos'),
  search: featureControlId(PARENT, 'search'),
  popularRoutes: featureControlId(PARENT, 'popular-routes'),
  section: {
    account: featureSectionId(PARENT, 'account'),
    vehicles: VEHICLES_SECTION,
    license: featureSectionId(PARENT, 'license'),
    earnings: featureSectionId(PARENT, 'earnings'),
    payout: featureSectionId(PARENT, 'payout'),
    create: featureSectionId(PARENT, 'create'),
    myTrips: featureSectionId(PARENT, 'my-trips'),
    reservations: featureSectionId(PARENT, 'reservations'),
  },
  tab: (tabId: string) => `${PARENT}.tab.${tabId}`,
  tripReserve: featureControlId(PARENT, 'trip-reserve'),
  tripPay: featureControlId(PARENT, 'trip-pay'),
  tripChat: featureControlId(PARENT, 'trip-chat'),
  tripCancel: featureControlId(PARENT, 'trip-cancel'),
  tripReview: featureControlId(PARENT, 'trip-review'),
  tripPdf: featureControlId(PARENT, 'trip-pdf'),
  tripEdit: featureControlId(PARENT, 'trip-edit'),
  tripPublish: featureControlId(PARENT, 'trip-publish'),
  tripStart: featureControlId(PARENT, 'trip-start'),
  tripComplete: featureControlId(PARENT, 'trip-complete'),
  tripRefund: featureControlId(PARENT, 'trip-refund'),
  tripMap: featureControlId(PARENT, 'trip-map'),
} as const;

export const RIDES_SUB_FEATURES: AppFeatureDef[] = [
  ...buildTabSubFeatures(PARENT, GROUP, RIDES_TABS),
  buildSectionSubFeature(PARENT, GROUP, 'create', 'Yolculuk oluştur', 'Boş koltuk ilanı verme'),
  buildSectionSubFeature(PARENT, GROUP, 'account', 'Yolculuk hesabı', 'Sürücü / yolcu hesap merkezi'),
  buildSectionSubFeature(PARENT, GROUP, 'my-trips', 'Yolculuklarım', 'Paylaştığın ilanlar'),
  buildSectionSubFeature(PARENT, GROUP, 'reservations', 'Rezervasyonlarım', 'Katıldığın yolculuklar'),
  buildSectionSubFeature(PARENT, GROUP, 'vehicles', 'Araçlarım', 'Araç kaydı ve doğrulama'),
  buildControlSubFeature(
    VEHICLES_SECTION,
    GROUP,
    'photos',
    'Araç fotoğrafı yükleme',
    'Araç kaydında galeriden fotoğraf seçme',
  ),
  buildSectionSubFeature(PARENT, GROUP, 'license', 'Ehliyet doğrulama', 'Sürücü belgesi yükleme'),
  buildSectionSubFeature(PARENT, GROUP, 'payout', 'IBAN & ödeme profili', 'Sürücü ödeme bilgileri'),
  buildSectionSubFeature(PARENT, GROUP, 'earnings', 'Sürücü kazançları', 'Tamamlanan yolculuk gelirleri'),
  buildControlSubFeature(PARENT, GROUP, 'search', 'Yolculuk arama', 'Nereden-nereye arama ve filtre çubuğu'),
  buildControlSubFeature(PARENT, GROUP, 'popular-routes', 'Popüler rotalar', 'Rotalar sekmesindeki hızlı rota çipleri'),
  buildControlSubFeature(PARENT, GROUP, 'trip-reserve', 'Yolculuk · Rezervasyon', 'Yolculuk detayında rezervasyon talebi'),
  buildControlSubFeature(PARENT, GROUP, 'trip-pay', 'Yolculuk · Ödeme', 'Yolculuk detayında ödeme tamamlama'),
  buildControlSubFeature(PARENT, GROUP, 'trip-chat', 'Yolculuk · Sohbet', 'Yolculuk detayında trip sohbeti'),
  buildControlSubFeature(PARENT, GROUP, 'trip-cancel', 'Yolculuk · İptal', 'Rezervasyon veya yolculuk iptali'),
  buildControlSubFeature(PARENT, GROUP, 'trip-review', 'Yolculuk · Puanla', 'Tamamlanan yolculuk değerlendirmesi'),
  buildControlSubFeature(PARENT, GROUP, 'trip-pdf', 'Yolculuk · PDF bilet', 'PDF bilet indirme'),
  buildControlSubFeature(PARENT, GROUP, 'trip-edit', 'Yolculuk · Düzenle', 'Sürücü · ilan düzenleme'),
  buildControlSubFeature(PARENT, GROUP, 'trip-publish', 'Yolculuk · Yayınla', 'Sürücü · ilanı yayınlama'),
  buildControlSubFeature(PARENT, GROUP, 'trip-start', 'Yolculuk · Erken başlat', 'Sürücü · yolculuğu başlatma'),
  buildControlSubFeature(PARENT, GROUP, 'trip-complete', 'Yolculuk · Tamamla', 'Sürücü · yolculuğu bitirme'),
  buildControlSubFeature(PARENT, GROUP, 'trip-refund', 'Yolculuk · İade talebi', 'Yolcu · iade talebi oluşturma'),
  buildControlSubFeature(PARENT, GROUP, 'trip-map', 'Yolculuk · Harita', 'Canlı harita ve güzergah'),
];

export const SUB_FEATURES = RIDES_SUB_FEATURES;
