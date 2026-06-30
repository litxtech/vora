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
        body: 'Vora; canlı haber paylaşımı, mesajlaşma, harita tabanlı içerikler, iş ilanları ve topluluk etkileşimi sunan bir dijital platformdur. Hizmet LitxTech tarafından işletilir.',
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
        body: 'Nefret söylemi, şiddet, taciz, dolandırıcılık, yanıltıcı haber, yasa dışı faaliyet teşviki, çocuklara yönelik zararlı içerik ve spam yasaktır. İhlal eden içerikler kaldırılabilir; tekrarlayan ihlallerde hesap kısıtlanabilir veya kalıcı olarak kapatılabilir.',
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
        heading: 'Vora Premium Abonelik Hizmeti',
        body: 'Vora Premium; altın profil rozeti, gelişmiş istatistikler, profil öne çıkarma ve profil ziyaretçisi görüntüleme gibi ek özellikler sunan isteğe bağlı, ücretli bir abonelik hizmetidir. Premium satın alarak bu şartların abonelik hükümlerini de kabul etmiş olursunuz.',
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
        body: 'Kayıt ve profil bilgileri (ad, kullanıcı adı, e-posta, doğum tarihi), profil fotoğrafı, konum verisi (izin verildiğinde), paylaşımlar, mesajlar, cihaz ve oturum bilgileri, bildirim tercihleri ve kullanım istatistikleri toplanabilir.',
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
        heading: 'Abonelik ve Ödeme Verileri',
        body: 'Premium abonelik satın alımlarında ödeme sağlayıcısı (Apple veya Stripe) aracılığıyla işlem kimliği, abonelik durumu, paket türü ve fatura dönemi bilgileri işlenebilir. Kredi kartı numarası gibi hassas ödeme bilgileri LitxTech sunucularında saklanmaz; bu veriler ilgili ödeme sağlayıcısı tarafından işlenir.',
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
} as const;

export type LegalSlug = keyof typeof LEGAL_DOCUMENTS;
