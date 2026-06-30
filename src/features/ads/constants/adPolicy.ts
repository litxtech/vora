import { AD_SESSION_HOURS } from '@/features/ads/constants';
import { SUPPORT_EMAIL } from '@/constants/legal';

export type AdPolicySection = {
  heading: string;
  body: string;
};

export const AD_POLICY_META = {
  title: 'Reklam Yayınlama Politikası',
  summary:
    'Vora Reklam Merkezi üzerinden yayınlanan tüm kampanyalar için geçerli kurallar, gösterim ilkeleri ve sorumluluklar.',
  lastUpdated: '27 Haziran 2026',
  version: '1.1',
} as const;

export const AD_POLICY_HIGHLIGHTS = [
  'Her kullanıcıya aynı reklam yalnızca bir kez gösterilir.',
  'Tüm reklamlar yayın öncesi moderasyon onayından geçer.',
  'Tıklama başı 8 kuruş — ön ödemeli reklam cüzdanından düşülür.',
  `Her onaylı oturum ${AD_SESSION_HOURS} saat sürer.`,
] as const;

export const AD_POLICY_SECTIONS: readonly AdPolicySection[] = [
  {
    heading: '1. Amaç ve Kapsam',
    body: 'Bu politika, Vora platformunda Reklam Merkezi aracılığıyla yürütülen reklam kampanyalarının oluşturulması, onaylanması, yayınlanması ve sonlandırılmasına ilişkin kuralları düzenler. Reklam veren her hesap, ilk kampanya oluşturmadan önce bu politikayı okuyup bir kez onaylamakla yükümlüdür. Onay, hesap bazında kaydedilir; sonraki kampanyalarda tekrar istenmez.',
  },
  {
    heading: '2. Reklam Verme Şartları',
    body: 'Reklam yayınlamak için Premium abonelik gerekmez. Reklam cüzdanınıza bakiye yüklemeniz ve kampanya bütçe tavanı belirlemeniz yeterlidir. Her gerçek tıklamada sabit 8 kuruş (0,08 ₺) cüzdan bakiyenizden düşülür. Bakiye veya bütçe tavanı tükendiğinde reklam otomatik durur. Reklam veren, kampanya içeriğinin doğruluğundan, hedef linklerin güvenliğinden ve yürürlükteki mevzuata uygunluğundan münhasıran sorumludur.',
  },
  {
    heading: '3. Tekil Gösterim İlkesi',
    body: 'Vora, kullanıcı deneyimini korumak amacıyla tekil gösterim ilkesini uygular: Aynı reklam kampanyası, aynı kullanıcı hesabına yalnızca bir kez gösterilir. Kullanıcı reklamı bir kez görüntüledikten sonra, o kampanya kendisine tekrar sunulmaz — hedef kitle, bütçe veya oturum süresi dolmamış olsa bile. Bu kural feed, reels, harita ve işletme yerleşimlerinin tamamında geçerlidir. Gösterim sayıları benzersiz kullanıcı bazında hesaplanır.',
  },
  {
    heading: '4. Moderasyon ve Onay Süreci',
    body: 'Oluşturulan her reklam, yayına alınmadan önce moderasyon ekibimiz tarafından incelenir. Onaylanan reklamlar en fazla 24 saatlik bir oturum halinde yayınlanır; süre sonunda otomatik olarak sona erer. Yeniden yayın için reklam veren yeni bir oturum başlatabilir (yeterli cüzdan bakiyesi ve kalan kampanya bütçesi olmak kaydıyla). Platform, içerik politikasına aykırı reklamları onaylamama, duraklatma veya kaldırma hakkını saklı tutar.',
  },
  {
    heading: '5. İzin Verilen ve Yasak İçerikler',
    body: 'Reklamlar; işletme tanıtımı, etkinlik duyurusu, ürün/hizmet lansmanı, topluluk faydasına içerikler ve yasal ticari faaliyetler için uygundur. Yasak içerikler: yanıltıcı veya sahte iddialar, yetkisiz finansal vaatler, tıbbi/farmakolojik onaysız tedavi reklamları, yetişkin içerik, şiddet, nefret söylemi, ayrımcılık, spam, kötü amaçlı yazılım, telif ihlali, kişilik hakları ihlali ve platform dışı dolandırıcılık girişimleridir.',
  },
  {
    heading: '6. Hedefleme ve Veri Kullanımı',
    body: 'Reklam veren; genel yayın (tüm bölgeler) veya bölgesel hedefleme (şehir, ilçe, yaş aralığı, ilgi alanı) seçeneklerini kullanabilir. Platform, hedefleme kriterlerini yalnızca reklamın ilgili kullanıcılara ulaştırılması amacıyla işler. Kişisel veriler, Gizlilik Politikamız ve KVKK kapsamında korunur.',
  },
  {
    heading: '7. Faturalama ve Ödeme',
    body: 'Reklam cüzdanına Stripe üzerinden bakiye yüklenir. Yalnızca gerçekleşen tıklamalar ücretlendirilir; gösterimler ücretsizdir. Tıklama başı sabit ücret 8 kuruştur. Bakiye yetersiz kaldığında reklam duraklatılır. Cüzdan bakiyesi iade edilemez; kullanılmayan bakiye sonraki kampanyalarda kullanılabilir.',
  },
  {
    heading: '8. Performans ve Şeffaflık',
    body: 'Reklam Merkezi panelinde gösterim, tıklama, harcama ve oturum süresi istatistikleri sunulur. Platform, bot veya sahte etkileşim tespit ettiğinde ilgili trafiği istatistiklerden düşer ve gerekirse kampanyayı askıya alır.',
  },
  {
    heading: '9. Reklam Veren Yükümlülükleri',
    body: 'Reklam veren; doğru bilgi sunmak, tıklama tuzağı kullanmamak, hedef URL\'lerin güvenli (HTTPS) olmasını sağlamak ve fikri mülkiyet haklarına saygı göstermekle yükümlüdür. İhlal halinde reklam verme yetkisi kısıtlanabilir veya kaldırılabilir.',
  },
  {
    heading: '10. Değişiklikler ve İletişim',
    body: `Bu politika LitxTech tarafından güncellenebilir. Sorularınız için ${SUPPORT_EMAIL} adresine başvurabilirsiniz.`,
  },
];
