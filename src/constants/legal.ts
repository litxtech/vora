import { env } from '@/config/env';

export type PolicyState = {
  terms: boolean;
  privacy: boolean;
  childProtection: boolean;
  ageConfirm: boolean;
};

export const INITIAL_POLICY_STATE: PolicyState = {
  terms: false,
  privacy: false,
  childProtection: false,
  ageConfirm: false,
};

export function allPoliciesAccepted(policies: PolicyState): boolean {
  return policies.terms && policies.privacy && policies.childProtection && policies.ageConfirm;
}

export type PolicyConsents = {
  terms_accepted_at: string;
  privacy_accepted_at: string;
  child_protection_accepted_at: string;
  age_confirmed_at: string;
  /** İlk Premium satın alımından önce bir kez kaydedilir */
  premium_terms_accepted_at?: string;
  /** İlk reklam gönderiminden önce bir kez kaydedilir */
  ad_policy_accepted_at?: string;
  ad_policy_version?: string;
};

export function buildPolicyConsents(): PolicyConsents {
  const now = new Date().toISOString();
  return {
    terms_accepted_at: now,
    privacy_accepted_at: now,
    child_protection_accepted_at: now,
    age_confirmed_at: now,
  };
}

export const SUPPORT_EMAIL = 'support@litxtech.com';

/** App Store açıklamasına veya Custom EULA alanına yapıştırılabilir standart Apple EULA linki. */
export const APPLE_STANDARD_EULA_URL =
  'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export type LegalDocument = {
  title: string;
  slug: string;
  summary: string;
  /** App Store metadata ve harici linkler için; tanımlıysa uygulama içi yerine bu URL açılır. */
  publicUrl?: string;
  sections: readonly { heading: string; body: string }[];
};

export const LEGAL_DOCUMENTS = {
  terms: {
    title: 'Kullanım Şartları (EULA)',
    slug: 'terms',
    publicUrl: env.legal.termsOfUseUrl,
    summary:
      'Vora platformunu ve Premium abonelik hizmetlerini kullanırken geçerli kurallar, haklar ve sorumluluklar.',
    sections: [
      {
        heading: 'Hizmet Tanımı',
        body: 'Vora; 18 yaş ve üzeri kullanıcılara yönelik bir sosyal platformdur. Canlı haber ve içerik paylaşımı, mesajlaşma, harita tabanlı içerikler, iş ilanları, Date ve İzdivaç gibi yetişkin sosyal özellikler, işletme reklamları ve topluluk etkileşimi sunar. Hizmet LitxTech tarafından işletilir. Platform çocuklara veya 18 yaş altına yönelik değildir.',
      },
      {
        heading: 'Yaş ve Kayıt Koşulları',
        body: 'Platform yalnızca 18 yaş ve üzeri kullanıcılar içindir. Kayıt sırasında doğru bilgi vermek, kullanım şartlarını, gizlilik politikasını ve çocuk koruma politikasını kabul etmek zorunludur. Yanlış veya eksik bilgiyle oluşturulan hesaplar askıya alınabilir veya kapatılabilir.',
      },
      {
        heading: 'Kullanıcı Sorumlulukları',
        body: 'Paylaşımlarınızın doğruluğundan, yasalara uygunluğundan ve üçüncü kişilerin telif, gizlilik ve kişilik haklarına saygı göstermekten siz sorumlusunuz. Başkası adına hesap açmak, kimliğe bürünmek veya hesabınızı devretmek yasaktır.',
      },
      {
        heading: 'İçerik Politikası',
        body: 'Nefret söylemi, şiddet, taciz, dolandırıcılık, yanıltıcı haber, yasa dışı faaliyet teşviki, çocuklara yönelik zararlı içerik, pornografi ve spam yasaktır. Date ve İzdivaç yalnızca 18+ üyeler içindir. İhlal eden içerikler kaldırılabilir; tekrarlayan ihlallerde hesap kısıtlanabilir veya kalıcı olarak kapatılabilir.',
      },
      {
        heading: 'Hesap Güvenliği',
        body: 'Şifrenizi ve oturum bilgilerinizi gizli tutmak sizin sorumluluğunuzdadır. Yetkisiz erişim veya şüpheli aktivite tespit ettiğinizde derhal support@litxtech.com adresine bildirin.',
      },
      {
        heading: 'Fikri Mülkiyet',
        body: 'Platformun tasarımı, yazılımı ve markası LitxTech’e aittir. Kullanıcılar yalnızca paylaştıkları kendi içeriklerinin haklarından sorumludur; platforma içerik yükleyerek hizmetin sunulması için gerekli sınırlı kullanım izni vermiş olursunuz.',
      },
      {
        heading: 'Hesap Askıya Alma ve Sonlandırma',
        body: 'Kurallara aykırı kullanım, güvenlik riski veya yasal zorunluluk hâlinde hesabınız geçici olarak dondurulabilir veya kalıcı olarak kapatılabilir. Hesabınızı dilediğiniz zaman uygulama ayarlarından silme talebinde bulunabilirsiniz.',
      },
      {
        heading: 'Reklamlar',
        body: 'Vora, Reklam Merkezi üzerinden işletmelerin oluşturduğu sponsorlu içerikler gösterebilir. Reklamlar yayından önce moderasyona tabidir; yetişkin içerik, şiddet, kumar ve yanıltıcı teklifler yasaktır. Reklam hedeflemesi yalnızca 18 yaş ve üzeri hesaplara yöneliktir. Google AdMob veya üçüncü taraf reklam ağı kullanılmaz.',
      },
      {
        heading: 'Vora Premium Abonelik Hizmeti',
        body: 'Vora Premium; altın profil rozeti, gelişmiş istatistikler, profil öne çıkarma ve profil ziyaretçisi görüntüleme gibi ek özellikler sunan isteğe bağlı, ücretli bir abonelik hizmetidir. Android Google Play sürümünde uygulama içi abonelik satışı şu an kapalıdır; özellikler tüm üyelere açıktır. Premium satın alma sunulduğu platformlarda bu şartların abonelik hükümleri de geçerlidir.',
      },
      {
        heading: 'Abonelik Paketleri ve Fiyatlandırma',
        body: 'Vora Premium aylık ve yıllık otomatik yenilenen abonelik paketleri olarak sunulur. Güncel paket adları, süreleri ve fiyatları satın alma ekranında açıkça gösterilir; ödeme onayından önce seçtiğiniz paketin adı, süresi ve tutarı size bildirilir. Fiyatlar vergi dahil veya hariç olarak ekranda belirtildiği şekilde uygulanır.',
      },
      {
        heading: 'Otomatik Yenileme',
        body: 'Abonelikler, iptal edilmediği sürece her fatura döneminin sonunda otomatik olarak yenilenir. Mevcut dönem bitiminden en az 24 saat önce iptal etmediğiniz takdirde bir sonraki dönem için ücret tahsil edilir. Yenileme ücreti, o an geçerli paket fiyatı üzerinden hesaplanır.',
      },
      {
        heading: 'Ödeme Yöntemleri',
        body: 'iOS cihazlarda abonelikler Apple App Store In-App Purchase (IAP) üzerinden; diğer platformlarda veya alternatif olarak Stripe ödeme altyapısı üzerinden işlenebilir. Ödeme, seçtiğiniz sağlayıcının (Apple ID veya Stripe) hesabınıza yansır. LitxTech, Apple veya Stripe dışındaki ödeme kanallarından sorumlu değildir.',
      },
      {
        heading: 'Abonelik İptali',
        body: 'Apple üzerinden satın alınan abonelikler iPhone Ayarlar → Apple ID → Abonelikler menüsünden iptal edilir. Stripe üzerinden satın alınan abonelikler uygulama içi Premium ekranından veya support@litxtech.com adresinden iptal edilebilir. İptal, mevcut fatura döneminin sonuna kadar erişiminizi sürdürür; kısmi dönem iadesi yapılmaz.',
      },
      {
        heading: 'Paket Değişikliği ve Yükseltme',
        body: 'Aylık paketten yıllık pakete geçiş, kullanılmayan süre oranında mahsup edilerek yapılabilir. Apple aboneliklerinde paket değişiklikleri Apple’ın abonelik kurallarına tabidir. Yıllıktan aylığa düşürme, mevcut dönem sonunda geçerli olur.',
      },
      {
        heading: 'İade Politikası',
        body: 'App Store üzerinden yapılan satın almaların iade talepleri Apple’ın iade politikasına tabidir ve Apple’a yönlendirilir. Stripe ödemelerinde yürürlükteki tüketici mevzuatı ve Stripe iade kuralları geçerlidir. Haksız tahsilat şüphesinde support@litxtech.com adresine başvurabilirsiniz.',
      },
      {
        heading: 'Abonelik Sona Ermesi',
        body: 'Abonelik süresi dolduğunda, iptal edildiğinde veya ödeme alınamadığında Premium özellikler devre dışı kalır. Hesabınız silinse bile yasal saklama yükümlülükleri kapsamında fatura kayıtları tutulabilir.',
      },
      {
        heading: 'Sorumluluk Sınırı',
        body: 'Platform “olduğu gibi” sunulur. Kullanıcı paylaşımlarının doğruluğu garanti edilmez. Mücbir sebep hâllerinde hizmet kesintilerinden doğan dolaylı zararlardan LitxTech sorumlu tutulamaz.',
      },
      {
        heading: 'Değişiklikler',
        body: 'Bu şartlar güncellenebilir. Önemli değişiklikler uygulama içinde veya e-posta yoluyla duyurulur. Güncellemeden sonra platformu kullanmaya devam etmeniz yeni şartları kabul ettiğiniz anlamına gelir.',
      },
      {
        heading: 'İletişim',
        body: 'Kullanım şartları, hesap işlemleri ve destek talepleri için support@litxtech.com adresinden bize ulaşabilirsiniz.',
      },
    ],
  },
  privacy: {
    title: 'Gizlilik Politikası',
    slug: 'privacy',
    publicUrl: env.legal.privacyPolicyUrl,
    summary: 'Kişisel verilerinizin nasıl toplandığı, işlendiği, saklandığı ve korunduğu hakkında bilgi.',
    sections: [
      {
        heading: 'Veri Sorumlusu',
        body: 'Kişisel verileriniz 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında LitxTech tarafından veri sorumlusu sıfatıyla işlenir. Sorularınız için support@litxtech.com adresine yazabilirsiniz.',
      },
      {
        heading: 'Toplanan Veriler',
        body: 'Kayıt ve profil bilgileri (ad, kullanıcı adı, e-posta, doğum tarihi, cinsiyet), profil fotoğrafı, konum verisi (izin verildiğinde), paylaşımlar, mesajlar, Date ve İzdivaç profilleri, reklam gösterim/tıklama kayıtları, cihaz ve oturum bilgileri, bildirim tercihleri ve kullanım istatistikleri toplanabilir.',
      },
      {
        heading: 'Veri İşleme Amaçları',
        body: 'Verileriniz hesap oluşturma ve kimlik doğrulama, platform hizmetlerinin sunulması, güvenlik ve kötüye kullanımın önlenmesi, kişiselleştirilmiş içerik önerileri, bildirim gönderimi ve yasal yükümlülüklerin yerine getirilmesi amacıyla işlenir.',
      },
      {
        heading: 'Hukuki Dayanak',
        body: 'Verileriniz; sözleşmenin kurulması ve ifası, meşru menfaat, açık rızanız ve kanuni zorunluluklar kapsamında işlenir. Konum, bildirim ve medya erişimleri cihaz izinlerinize bağlıdır.',
      },
      {
        heading: 'Veri Saklama Süresi',
        body: 'Hesabınız aktif olduğu sürece verileriniz saklanır. Hesap silme talebinden sonra yasal saklama yükümlülükleri hariç verileriniz makul süre içinde silinir veya anonimleştirilir.',
      },
      {
        heading: 'Rehber Eşleştirme',
        body: 'Rehber izni uygulama açılışında, kayıtta veya girişte istenmez. İzni Mesajlar içindeki Kişiler sekmesinde veya “Arkadaşlarını Vora’da bul” ekranında siz başlatınca değerlendiririz. İzin vermemeniz diğer özelliklerin kullanılmasını engellemez. İzin verdiğinizde rehberinizdeki adlar ve numaralar, telefonda kayıtlı biçimleriyle güvenlik ve eşleştirme amacıyla sunucuda saklanır. Vora kullanmayan kişilere mesaj gönderilmez. Hesap silme işlemi tamamlandığında bu kayıtlar silinir.',
      },
      {
        heading: 'Veri Paylaşımı',
        body: 'Kişisel verileriniz, açık rızanız veya yasal zorunluluk olmadıkça üçüncü taraflarla paylaşılmaz. Altyapı, analitik, bildirim ve güvenlik hizmetleri yalnızca hizmetin sunulması için gerekli ölçüde ve sözleşmesel güvencelerle kullanılabilir.',
      },
      {
        heading: 'Uluslararası Aktarım',
        body: 'Verileriniz hizmet altyapısı gereği yurt dışındaki sunucularda işlenebilir. Bu durumda KVKK’ya uygun aktarım güvenceleri sağlanır.',
      },
      {
        heading: 'Haklarınız',
        body: 'KVKK kapsamında verilerinize erişim, düzeltme, silme, işlemeyi kısıtlama, itiraz ve veri taşınabilirliği taleplerinde bulunabilirsiniz. Taleplerinizi support@litxtech.com adresine iletebilirsiniz.',
      },
      {
        heading: 'Çerezler ve Benzer Teknolojiler',
        body: 'Oturum yönetimi, güvenlik ve performans için gerekli teknik veriler kullanılabilir. Bildirim ve analitik tercihleri uygulama ayarlarından yönetilebilir.',
      },
      {
        heading: 'Güvenlik',
        body: 'Verilerinizi korumak için şifreleme, erişim kontrolü ve güvenlik denetimleri uygulanır. Veri ihlali şüphesi durumunda yasal süreler içinde gerekli bildirimler yapılır.',
      },
      {
        heading: 'Reklamlar ve Hedefleme',
        body: 'Reklam Merkezi kampanyaları yaş (en az 18), bölge ve ilgi alanına göre gösterilebilir. Reklam verenler işletme tanıtımı yapar; üçüncü taraf reklam ağı (AdMob vb.) kullanılmaz. Reklam içerikleri moderasyona tabidir.',
      },
      {
        heading: 'Date ve İzdivaç',
        body: 'Date ve İzdivaç yalnızca 18 yaşını doldurmuş, profili tamamlanmış üyeler içindir. Bu özelliklerde cinsiyet, doğum tarihi ve kullanıcıların paylaştığı profil/etkinlik bilgileri eşleşme ve katılım için işlenir.',
      },
      {
        heading: 'Abonelik ve Ödeme Verileri',
        body: 'Android Google Play sürümünde uygulama içi abonelik satışı yapılmaz. Abonelik sunulan platformlarda ödeme sağlayıcısı (Apple veya Stripe) aracılığıyla işlem kimliği, abonelik durumu, paket türü ve fatura dönemi bilgileri işlenebilir. Kredi kartı numarası gibi hassas ödeme bilgileri LitxTech sunucularında saklanmaz.',
      },
      {
        heading: 'İletişim',
        body: 'Gizlilik talepleri, veri indirme ve silme istekleri için support@litxtech.com adresinden destek ekibimize ulaşabilirsiniz.',
      },
    ],
  },
  child_protection: {
    title: 'Çocuk Koruma Politikası',
    slug: 'child_protection',
    publicUrl: env.legal.childProtectionPolicyUrl,
    summary: '18 yaş altı kullanıcıların korunmasına ve çocuk güvenliğine yönelik politikalarımız.',
    sections: [
      {
        heading: 'Yaş Sınırı',
        body: 'Vora yalnızca 18 yaş ve üzeri kullanıcılar içindir. 18 yaş altı bireylerin kayıt olması, hesap oluşturması veya platformu kullanması kesinlikle yasaktır. Kayıt sırasında yaş beyanı zorunludur.',
      },
      {
        heading: 'Yaş Doğrulama ve Hesap Kapatma',
        body: '18 yaş altı kullanım şüphesi tespit edildiğinde hesap derhal askıya alınır veya kapatılır. Yanlış yaş beyanı yapan kullanıcıların hesapları kalıcı olarak sonlandırılabilir.',
      },
      {
        heading: 'Yasaklı İçerikler',
        body: 'Çocuk istismarı, çocuklara yönelik cinsel içerik, grooming, çocukları hedef alan taciz, şiddet veya sömürü içeren tüm paylaşımlar sıfır tolerans politikasıyla yasaktır ve yetkili mercilere bildirilebilir.',
      },
      {
        heading: 'İçerik Moderasyonu',
        body: 'Çocuk güvenliğini tehdit eden içerikler otomatik ve manuel moderasyon ile tespit edilir, kaldırılır ve ilgili hesaplar kısıtlanır. Tekrarlayan ihlallerde kalıcı hesap kapatma uygulanır.',
      },
      {
        heading: 'Bildirim Mekanizması',
        body: 'Çocuk güvenliğini tehdit eden içerik, kullanıcı veya davranışları uygulama içi şikayet özelliğiyle veya doğrudan support@litxtech.com adresine yazarak bildirebilirsiniz. Acil durumlarda yerel kolluk kuvvetlerine başvurmanız önerilir.',
      },
      {
        heading: 'Ebeveyn ve Veli Hakları',
        body: '18 yaş altı bir çocuğun platformu kullandığını düşünüyorsanız support@litxtech.com adresine başvurarak hesabın incelenmesini ve kapatılmasını talep edebilirsiniz. Gerekli durumlarda ebeveyn veya veli bilgilendirmesi yapılır.',
      },
      {
        heading: 'Veri Koruma',
        body: '18 yaş altı bireylere ait bilerek toplanan kişisel veri bulunmamaktadır. Yanlışlıkla toplanan veriler tespit edildiğinde derhal silinir.',
      },
      {
        heading: 'Eğitim ve Farkındalık',
        body: 'Kullanıcıları çevrimiçi güvenlik, mahremiyet ve çocuk koruma konularında bilgilendirmek için uygulama içi uyarılar ve topluluk kuralları sunulur.',
      },
      {
        heading: 'İletişim',
        body: 'Çocuk koruma ile ilgili tüm bildirim ve talepler için support@litxtech.com adresinden 7/24 destek ekibimize ulaşabilirsiniz.',
      },
    ],
  },
  canlar_aid: {
    title: 'Vora Canlar Bağış ve Yardım Politikası',
    slug: 'canlar_aid',
    summary:
      'Hayvan kurtarma, bağış, harcama kanıtı, ayni yardım ve gönüllülük için LITXTECH LLC kuralları. Bu metin hukuki uygunluk onayı değildir.',
    sections: [
      {
        heading: 'İşleten',
        body: 'Vora Canlar, LITXTECH LLC tarafından işletilen Vora uygulamasının bir özelliğidir. Destek: support@litxtech.com. Adres: 15442 VENTURA BLVD STE 201-183.',
      },
      {
        heading: 'Ne işe yarar',
        body: 'Vora Canlar hayvan ihbarı, kurtarma dosyası, tedavi takibi, bağış kampanyası, harcama kanıtı, ayni yardım ve gönüllülük kaydı tutar. Ayrı bir hesap açılmaz. Platformun tamamen yasal veya resmî olarak onaylı olduğu iddia edilmez. Türkiye’de yardım toplama, kişisel veri ve ödeme hizmetleri için ayrıca profesyonel hukuki değerlendirme gerekir.',
      },
      {
        heading: 'Kim ne yapabilir',
        body: 'Misafirler herkese açık kayıtları görebilir. Gönderi, beğeni, yorum, mesaj, bağış, kampanya ve rol başvurusu için e-posta doğrulamalı üyelik gerekir. Gönüllü, kurtarıcı, kampanya sahibi ve klinik ilişkisi için mevcut kimlik doğrulamasının onaylanmış olması gerekir. Belge yüklemek tek başına kimlik doğrulaması değildir.',
      },
      {
        heading: 'Bağış tutarları',
        body: 'Brüt bağış, ödeme kuruluşu işlem ücreti, varsa ayrıca açıklanan kesinti, iade, ters ibraz, kampanyaya ayrılan net tutar, yararlanıcıya veya kliniğe yapılan ödeme ve onaylanmış harcama ayrı tutulur. İşlem ücreti ödeme yöntemine göre değişir ve ödeme tamamlanmadan kesin tutar gibi gösterilmez. Bekleyen, başarısız veya iade edilmiş ödemeler tamamlanmış bağış sayılmaz. Platform bu politikayla ayrıca bir komisyon eklemez.',
      },
      {
        heading: 'Paranın kime gittiği',
        body: 'Kampanyanın yayınlanması para çekme yetkisi vermez. Ödeme, kampanya incelemesinden ayrı açılır. Tahsilat, paranın kliniğe veya yararlanıcıya geçtiği anlamına gelmez. Kliniğe veya tedarikçiye ödeme, referanslı ve denetimli kayıtla izlenir; otomatik transfer vaat edilmez.',
      },
      {
        heading: 'Kanıt ve şeffaflık',
        body: 'Kampanya sahibi fatura, makbuz, klinik belgesi veya benzeri kanıt yükleyebilir. Yükleme onay değildir. Onaylı etiket yalnızca yetkili incelemeden sonra kullanılır. Kamuya ham fatura, kimlik, tam adres veya banka bilgisi açılmaz. Onaylı kayıtlarda kişisel verilerden arındırılmış özet gösterilir. Kanıt eksikse bu durum kampanya sayfasında gizlenmez.',
      },
      {
        heading: 'İade',
        body: 'İade ve ters ibraz, ödeme kuruluşunun kuralları ve uygulanabilir tüketici mevzuatı çerçevesinde işlenir. Kısmi iade, bağışçının net bağışından ve kampanya bakiyesinden düşülür. İade talepleri support@litxtech.com adresine iletilebilir. Hukuki zorunluluk veya şüpheli kampanya halinde ödeme durdurulabilir.',
      },
      {
        heading: 'Ayni yardım',
        body: 'Mama, ilaç, nakil, geçici yuva ve gönüllü emek parasal bağış toplamına eklenmez. Tahmini parasal değer ancak doğrulandıysa ve parasal bağıştan ayrı gösterilir.',
      },
      {
        heading: 'Gizlilik ve saklama',
        body: 'Hassas konum, kimlik belgesi ve ham harcama dosyası herkese açık alanda tutulmaz. Katkı göstergeleri varsayılan olarak gizlidir ve gizlenen değer başkasının profil yanıtından da çıkarılır. Bağışçı kimliği, bağışçı aksini seçmedikçe kampanya sahibine açılmaz. Politikanın bu sürümü ayrıca onaylanır; eski bir kullanım şartı onayı bu sürümün onayı sayılmaz.',
      },
      {
        heading: 'Çocuk güvenliği',
        body: 'Vora 18 yaş ve üzeri kullanıcılar içindir. Vora Canlar bu yaş sınırını değiştirmez. Çocuk güvenliği ihlalleri mevcut çocuk koruma politikasına tabidir.',
      },
      {
        heading: 'İletişim',
        body: 'Bağış, kanıt, iade ve veri talepleri için support@litxtech.com adresine yazabilirsiniz. LITXTECH LLC, 15442 VENTURA BLVD STE 201-183.',
      },
    ],
  },
} as const;

export type LegalSlug = keyof typeof LEGAL_DOCUMENTS;
