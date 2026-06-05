export const LEGAL_DOCUMENTS = {
  terms: {
    title: 'Kullanım Şartları',
    slug: 'terms',
    summary:
      'Karadeniz Dijital Ağı platformunu kullanırken tüm kullanıcıların uyması gereken kurallar ve sorumluluklar.',
    sections: [
      {
        heading: 'Genel Hükümler',
        body: 'Bu platform yalnızca 18 yaş ve üzeri kullanıcılar içindir. Kayıt olarak bu şartları kabul etmiş sayılırsınız.',
      },
      {
        heading: 'Kullanıcı Sorumlulukları',
        body: 'Paylaşımlarınızın doğruluğundan, yasalara uygunluğundan ve üçüncü kişilerin haklarına saygı göstermekten siz sorumlusunuz.',
      },
      {
        heading: 'İçerik Politikası',
        body: 'Nefret söylemi, şiddet içeren, yanıltıcı veya yasa dışı içerikler yasaktır. İhlaller moderasyon sürecine tabidir.',
      },
      {
        heading: 'Hesap Güvenliği',
        body: 'Hesap bilgilerinizi gizli tutmak ve yetkisiz erişimi derhal bildirmek sizin sorumluluğunuzdadır.',
      },
    ],
  },
  privacy: {
    title: 'Gizlilik Politikası',
    slug: 'privacy',
    summary: 'Kişisel verilerinizin nasıl toplandığı, kullanıldığı ve korunduğu hakkında bilgi.',
    sections: [
      {
        heading: 'Toplanan Veriler',
        body: 'E-posta, kullanıcı adı, profil bilgileri, konum (izin verildiğinde) ve kullanım verileri toplanabilir.',
      },
      {
        heading: 'Veri Kullanımı',
        body: 'Verileriniz platform hizmetlerini sunmak, güvenliği sağlamak ve kişiselleştirilmiş öneriler sunmak için kullanılır.',
      },
      {
        heading: 'Veri Paylaşımı',
        body: 'Kişisel verileriniz yasal zorunluluklar dışında üçüncü taraflarla paylaşılmaz.',
      },
      {
        heading: 'Haklarınız',
        body: 'Verilerinize erişim, düzeltme ve silme talebinde bulunma hakkına sahipsiniz.',
      },
    ],
  },
  child_protection: {
    title: 'Çocuk Koruma Politikası',
    slug: 'child_protection',
    summary: '18 yaş altı kullanıcıların korunmasına yönelik politikalarımız.',
    sections: [
      {
        heading: 'Yaş Sınırı',
        body: 'Bu platform yalnızca 18 yaş ve üzeri kullanıcılar içindir. 18 yaş altı kayıt kabul edilmez.',
      },
      {
        heading: 'İçerik Filtreleme',
        body: 'Çocuklara yönelik zararlı içerikler aktif olarak filtrelenir ve kaldırılır.',
      },
      {
        heading: 'Bildirim Mekanizması',
        body: 'Çocuk güvenliğini tehdit eden içerikleri uygulama içinden veya destek kanallarından bildirebilirsiniz.',
      },
      {
        heading: 'Ebeveyn Bilgilendirme',
        body: '18 yaş altı kullanım tespit edildiğinde hesap derhal askıya alınır ve gerekli bildirimler yapılır.',
      },
    ],
  },
} as const;

export type LegalSlug = keyof typeof LEGAL_DOCUMENTS;
