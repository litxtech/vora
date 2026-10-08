export type CityTopicSlug =
  | 'sosyal-yasam'
  | 'gezilecek-yerler'
  | 'etkinlikler'
  | 'yeni-insanlarla-tanisma';

export type CityTopic = {
  slug: CityTopicSlug;
  title: string;
  description: string;
  paragraphs: string[];
};

export type CityPage = {
  id: string;
  name: string;
  description: string;
  intro: string;
  history: string;
  social: string;
  culture: string;
  local: string;
  community: string;
  related: string[];
  topics: CityTopic[];
};

export const CITIES: CityPage[] = [
  {
    id: 'trabzon',
    name: 'Trabzon',
    description:
      'Trabzon’da şehir hayatı, liman kültürü, üniversite çevresi ve Vora topluluğu. Herkese açık paylaşımlar, etkinlikler ve şehir odası.',
    intro:
      'Trabzon, Karadeniz’in en işlek kent merkezlerinden biridir. Liman, çarşı ve üniversite aynı günün içinde birbirine karışır; Vora’da bu tempo mahalle ölçeğinde görünür.',
    history:
      'Kent, İmparatorluk limanı olarak büyüdü. Ayasofya, sur içi ve Zağnos Vadisi bugün de merkezin yönünü belirler. Tarih burada vitrin değil, hâlâ içinden geçilen sokaktır.',
    social:
      'Akşam buluşmaları çoğunlukla Meydan, Uzun Sokak ve sahil hattında toplanır. KTÜ öğrencileriyle yerleşik aileler aynı çarşıyı kullanır; tanışmak için ayrı bir “sahne” gerekmez, ortak bir mahalle yeter.',
    culture:
      'Horon, hamsi sofrası ve taraftar günleri aynı takvimi paylaşır. Misafirperverlik hızlıdır ama özel hayat da hızlı korunur: herkese açık paylaşım ile ev içi sohbet aynı şey değildir.',
    local:
      'Akçaabat köftesi, Sümela yolu ve Uzungöl günübirlik rotaları kentin dışına taşar. Merkezde ise Forum, Moloz ve Beşirli farklı ritimler tutar.',
    community:
      'Vora’da Trabzon şehir odası, bu ilde oturan veya burayla bağı olan kişilerin ortak sesli alanıdır. Liderlik ve meclis, uygulamanın içindeki şehir yönetimine aittir; web yalnızca herkese açık yüzeyi gösterir.',
    related: ['rize', 'giresun', 'gumushane', 'bayburt'],
    topics: [
      {
        slug: 'sosyal-yasam',
        title: 'Trabzon’da sosyal hayat',
        description: 'Trabzon merkezinde günün nasıl aktığı ve yeni bir çevre edinmenin pratik hali.',
        paragraphs: [
          'Trabzon’da sosyal hayat sahile sıkışmış değildir. Öğleden sonra çarşı, akşam üstü sahil, maç günü ise stadyum çevresi ayrı kalabalıklar üretir.',
          'Yeni gelen biri için en sürdürülebilir çevre, tek bir mekân değil tekrar eden bir ritimdir: aynı çay ocağı, aynı yürüyüş saati, aynı şehir odası.',
          'Vora’da Trabzon etiketli herkese açık paylaşımlar bu ritmi dışarıdan da okunur kılar. Özel hesaplar ve arkadaş kitlesi paylaşımları bu sayfada yer almaz.',
        ],
      },
      {
        slug: 'gezilecek-yerler',
        title: 'Trabzon’da gezilecek yerler',
        description: 'Merkez, Sümela ve Uzungöl’ü aynı güne sıkıştırmadan planlamak.',
        paragraphs: [
          'Ayasofya ve surlar yarım güne sığar. Sümela ve Uzungöl ise ayrı bir gün ister; ikisini aynı öğleden sonraya zorlamak yolu da deneyimi de bozar.',
          'Atatürk Köşkü ve Boztepe manzarası merkezden ayrılmadan kenti yukarıdan okutur. Akçaabat’a inen yol hem mutfak hem sahil için kısadır.',
          'Kalabalık yaz günlerinde Uzungöl’de zamanı sabah seçmek, öğleden sonraki otopark kuyruğundan daha çok yer gördürür.',
        ],
      },
    ],
  },
  {
    id: 'rize',
    name: 'Rize',
    description:
      'Rize’de çay bahçeleri, yağmurla kurulan sosyal hayat ve Kaçkar eteklerindeki Vora topluluğu.',
    intro:
      'Rize, kıyı ile yayla arasında dar bir şeritte yaşar. Çay toplama takvimi şehrin sosyal takvimini de belirler.',
    history:
      'Çay, Cumhuriyet döneminde bu kıyının geçim düzenini değiştirdi. Öncesinde liman ve Laz yerleşimleri vardı; bugünkü Rize ikisinin üstüne kuruludur.',
    social:
      'Yağmur planı iptal etmez, içeri alır. Çay ocakları ve fırın önleri günün kısa buluşma noktalarıdır. Yazın sohbet yaylaya taşınır.',
    culture:
      'Tulum ve horon burada sahne işi değil düğün işidir. Misafire çay ikram etmemek neredeyse selamı eksik bırakmaktır.',
    local:
      'Ayder, Palovit ve Fırtına Vadisi günübirlik değil konaklamalı rotalardır. Merkezde çay araştırma enstitüsü ve liman yürüyüşü daha sakin kalır.',
    community:
      'Rize’deki Vora kullanıcıları çoğu zaman hem kıyı hem köy bağını aynı profilde taşır. Şehir odası bu iki ritmi tek sesli alanda buluşturur.',
    related: ['trabzon', 'artvin', 'bayburt'],
    topics: [
      {
        slug: 'sosyal-yasam',
        title: 'Rize’de sosyal hayat',
        description: 'Yağmurlu kıyıda ve yaz yaylasında insanların nasıl bir araya geldiği.',
        paragraphs: [
          'Rize’de “dışarı çıkalım” çoğu zaman “çay içelim” demektir. Uzun masa, kısa sohbetten daha yaygındır.',
          'Mayıs–Eylül arası köy ve yayla evleri sosyal merkezi sahilden devralır. Kışın ise merkezdeki esnaf sohbeti şehrin hafızası olur.',
          'Yeni taşınan biri için belediye etkinliği ve çay hasadı dönemi, rastgele bir mekândan daha sağlam bir giriş kapısıdır.',
        ],
      },
      {
        slug: 'gezilecek-yerler',
        title: 'Rize’de gezilecek yerler',
        description: 'Kaçkar eteklerini acele etmeden görmek.',
        paragraphs: [
          'Zilkale ve Fırtına Vadisi sabah ışığında okunur. Öğleden sonra vadi gölgelenir, şelale yolları ise ıslanır.',
          'Ayder’e yaz ortasında arabayla dalmak yerine erken saatte yürümek, hem yolu hem dereyi görünür bırakır.',
          'Çayeli ve Pazar sahili, yayla gününün ertesi için deniz kenarında toparlanma hattıdır.',
        ],
      },
    ],
  },
  {
    id: 'artvin',
    name: 'Artvin',
    description:
      'Artvin’de yayla yerleşimleri, Barhal ve Karagöl çevresi ile seyrek ama sıkı bir şehir topluluğu.',
    intro:
      'Artvin merkez bir vadi kentidir. Asıl sosyal coğrafya ise Borçka, Şavşat, Yusufeli ve Macahel hattına dağılır.',
    history:
      'Çoruh boyunca kurulan köyler, baraj gölleriyle yer değiştirdi. Yusufeli’nin taşınması bu hafızanın en görünür örneğidir.',
    social:
      'İnsanlar seyrektir, bağlar sıkıdır. Bir yayla şenliği, yılın geri kalanındaki birçok kent buluşmasından daha çok yüz yüze getirir.',
    culture:
      'Gürcü ve Hemşin mutfakları aynı ilin içinde ayrı diller konuşur. Peynir, mıhlama ve kaymaklı ekmek aynı sofrada yan yana durabilir.',
    local:
      'Karagöl ve Mençuna Şelalesi kısa kaçamak değildir. Barhal kiliseleri ve Kaçkar’ın Artvin yüzü yürüyüş planı ister.',
    community:
      'Vora’da Artvin odası, merkezde az kişi olsa da yayladaki bağı taşıyanlar için ortak bir adres olur.',
    related: ['rize', 'bayburt', 'gumushane'],
    topics: [
      {
        slug: 'gezilecek-yerler',
        title: 'Artvin’de gezilecek yerler',
        description: 'Baraj gölleri, şelaleler ve yüksek yaylalar için ayrı günler.',
        paragraphs: [
          'Borçka Karagöl’e giden yol, manzarayı varıştan önce başlatır. Öğle kalabalığı kıyıyı daraltır; sabah daha geniş bir göl bırakır.',
          'Mençuna’ya inen patika ıslaktır. Ayakkabı seçimi, fotoğraf planından önce gelir.',
          'Şavşat tarafı daha sakin bir yayla hattıdır. Aynı hafta hem Karagöl hem Kaçkar geçişi planlamak yolu yorar.',
        ],
      },
    ],
  },
  {
    id: 'giresun',
    name: 'Giresun',
    description:
      'Giresun’da fındık, ada silüeti ve Aksu şenliklerinin şekillendirdiği kıyı topluluğu.',
    intro:
      'Giresun, fındık bahçelerinin denize baktığı bir kıyı kentidir. Ada, limanın hemen önünde şehrin pusulası gibi durur.',
    history:
      'Antik Kerasous’tan kalan iz, bugünkü çarşı ve kale arasında sıkışmıştır. Modern şehir fındık ticaretiyle kıyıya yayılmıştır.',
    social:
      'Aksu Festivali şehri bir haftalığına sahneye çevirir. Yılın geri kalanında sahil yürüyüşü ve çarşı içi kısa duraklar yeter.',
    culture:
      'Fındık kırma mevsimi aile takvimidir. Kiraz ise ilçelere göre değişen ikinci bir hasat sohbetidir.',
    local:
      'Kümbet ve Kulakkaya yaylaları yaz sıcağından kaçış rotasıdır. Ada’ya bakmak için kayık şart değildir; liman yeter.',
    community:
      'Giresun Vora topluluğu festival haftasında belirginleşir, kışın ise mahalle ölçeğine iner.',
    related: ['trabzon', 'ordu', 'gumushane'],
    topics: [
      {
        slug: 'sosyal-yasam',
        title: 'Giresun’da sosyal hayat',
        description: 'Festival haftası ile sakin kıyı haftalarının farkı.',
        paragraphs: [
          'Aksu günlerinde şehir tanışmak için kendiliğinden bir zemin kurar. O haftanın dışı daha yavaştır.',
          'Sahil bandı akşam yürüyüşü için ortaktır. Uzun sohbet ise hâlâ çay ocağı ve ev ziyaretinde biter.',
          'Yeni gelen öğrenciler ve fındık mevsiminde dönen aileler aynı aylarda kente eklenir.',
        ],
      },
    ],
  },
  {
    id: 'ordu',
    name: 'Ordu',
    description:
      'Ordu’da Boztepe, teleferik hattı ve fındık bahçelerinin arasına sıkışmış kıyı sosyal hayatı.',
    intro:
      'Ordu, denize yukarıdan bakan bir kenttir. Boztepe’ye çıkan hat, merkezi hem manzara hem buluşma yerine çevirir.',
    history:
      'Kotyora’dan gelen liman geçmişi, bugün balıkçılık ve fındıkla devam eder. Şehir son yıllarda sahil dolgusuyla doğuya uzadı.',
    social:
      'Teleferik üst istasyonu kısa bir kaçış, alt istasyon ise günlük buluşma noktasıdır. Üniversite çevresi akşamı merkeze indirir.',
    culture:
      'Fındık burada sadece ürün değil, yaz sonu ziyaretlerinin bahanesi ve takvimidir.',
    local:
      'Perşembe Yaylası ve Çambaşı, merkezden ayrı bir gece ister. Hoynat Adası ise tekneyle kısa bir sapmadır.',
    community:
      'Ordu şehir odasında kıyı ile yayla aynı il kimliğinde buluşur.',
    related: ['giresun', 'samsun', 'tokat'],
    topics: [
      {
        slug: 'sosyal-yasam',
        title: 'Ordu’da sosyal hayat',
        description: 'Boztepe hattı ve sahil arasındaki günlük ritim.',
        paragraphs: [
          'Ordu’da bir akşam planı çoğu zaman “aşağı inmek” veya “yukarı çıkmak” diye kurulur. İkisi de yürünebilir mesafededir.',
          'Yazın sahil daha kalabalık, bahçeler daha sessizdir. Hasat yaklaşınca sohbet merkeze değil köye kayar.',
          'Yeni bir çevre için tekrar eden saat, tek seferlik bir etkinlikten daha işe yarar.',
        ],
      },
    ],
  },
  {
    id: 'samsun',
    name: 'Samsun',
    description:
      'Samsun’da büyükşehir temposu, 19 Mayıs hafızası ve Karadeniz’in en geniş kent topluluğu.',
    intro:
      'Samsun, bölgenin ölçek olarak en büyük kentidir. Bandırma hattı, üniversite ve liman aynı haritada yan yana durur.',
    history:
      '19 Mayıs 1919, kentin ulusal hafızadaki yerini sabitler. Ondan önce ve sonra Samsun bir tahıl ve tütün limanıdır.',
    social:
      'İlkadım çarşısı ile Atakum sahili farklı kuşakları taşır. Büyükşehirde tanışmak mahalle seçmekle başlar.',
    culture:
      'Pide ve kaz çekmesi aynı menüde değildir; ilçeye göre sofra değişir. Kent kültürü kıyı ile iç kesim arasında gider gelir.',
    local:
      'Amazon Köyü ve Şahinkaya Kanyonu günübirliktir. Merkezde Bandırma Vapuru müzesi kısa ve net bir duraktır.',
    community:
      'Samsun’daki Vora kitlesi ilçelere bölünür. Şehir odası bu dağılmayı tek bir ortak seste toplar.',
    related: ['ordu', 'sinop', 'amasya', 'corum'],
    topics: [
      {
        slug: 'yeni-insanlarla-tanisma',
        title: 'Samsun’da yeni insanlarla tanışmak',
        description: 'Büyükşehirde mahalle seçerek çevre kurmak.',
        paragraphs: [
          'Samsun’da “herkes merkezde” varsayımı işlemez. Atakum, İlkadım ve Canik ayrı akşamlar yaşar.',
          'Üniversite dönemleri şehre dalga dalga insan ekler. Kalıcı çevre ise ders dışı tekrar eden bir etkinlikte kurulur.',
          'Vora’da Samsun herkese açık paylaşımları, hangi ilçenin o hafta hareketli olduğunu dışarıdan da gösterir.',
        ],
      },
      {
        slug: 'etkinlikler',
        title: 'Samsun’da etkinlikler',
        description: 'Büyükşehir takviminde kaybolmadan buluşma seçmek.',
        paragraphs: [
          'Samsun’un takvimi fuar, konser ve üniversite baharını aynı aya yığabilir. Hepsine gitmek yerine bir tür seçmek daha sürdürülebilir.',
          'Sahil etkinlikleri hava durumuna bağlıdır. Kapalı salonlar kışın asıl buluşma yeridir.',
          'Vora’da yayımlanan herkese açık etkinlikler bu sayfada listelenir. Özel davetler ve konum pinleri gösterilmez.',
        ],
      },
    ],
  },
  {
    id: 'sinop',
    name: 'Sinop',
    description:
      'Sinop’ta kuzey ucun sakin temposu, tarihi cezaevi müzesi ve kısa sahil sohbetleri.',
    intro:
      'Sinop, Türkiye’nin en kuzey uçlarından birinde yavaş akan bir liman kentidir. Kalabalık burada istisna, rüzgâr kuraldır.',
    history:
      'Antik Sinope’den kalan surlar hâlâ limanı kucaklar. Tarihi cezaevi bugün müze olarak gezilir; kentin hafızası bu binada somuttur.',
    social:
      'Akşam yürüyüşü sur dışındaki sahilde biter. Yeni biriyle tanışmak için büyük bir etkinlik gerekmez; tekrar eden bir çay saati yeter.',
    culture:
      'Balık sofrası turistik menüden önce ev menüsüdür. Yazlıkçılar temmuzda ritmi hızlandırır, eylülde kent yine kendi hızına döner.',
    local:
      'İnceburun, Erfelek şelaleleri ve Hamsilos koyu aynı güne sığdırılmamalıdır. Her biri ayrı bir yön seçer.',
    community:
      'Sinop Vora odası küçük olabilir. Küçük odalarda sohbet daha uzun sürer.',
    related: ['samsun', 'kastamonu', 'corum'],
    topics: [],
  },
  {
    id: 'kastamonu',
    name: 'Kastamonu',
    description:
      'Kastamonu’da ahşap konaklar, Ilgaz ormanı ve iç kesimin daha yavaş sosyal takvimi.',
    intro:
      'Kastamonu denize sırtını dönmüş gibi durur ama Karadeniz’in iç hattını tutar. Konaklar ve çarşı, kentin ölçeğini belirler.',
    history:
      'Osmanlı’da şehzade ve sürgün kenti olarak anılan Kastamonu, ahşap sivil mimarisiyle bu geçmişi sokakta bırakmıştır.',
    social:
      'Çarşı içi selamlaşma hâlâ işler. Yeni gelen biri için esnaf sohbeti, büyük bir sosyal uygulamadan daha hızlı kapı açar.',
    culture:
      'Pastırma, siyez ve etli ekmek aynı ilin farklı ilçelerinden gelir. Sofrada acele edilmez.',
    local:
      'Ilgaz kayak ve yürüyüş için ayrı mevsimlerdir. Daday ve Taşköprü günübirlik sapmalardır.',
    community:
      'Kastamonu topluluğu Vora’da kıyı kentlerinden daha seyrek görünür. Seyreklik, herkese açık paylaşımın değerini düşürmez.',
    related: ['sinop', 'karabuk', 'corum', 'bartin'],
    topics: [],
  },
  {
    id: 'bartin',
    name: 'Bartın',
    description:
      'Bartın ve Amasra’da iki koy, ahşap evler ve küçük liman sosyal hayatı.',
    intro:
      'Bartın Irmağı kenti denize bağlar. Sosyal hayatın kartpostalı ise çoğu zaman Amasra’dır.',
    history:
      'Amasra, Roma ve Ceneviz izlerini surların içinde tutar. Bartın merkez daha çok cumhuriyet dönemi çarşısı ve nehir kenarıdır.',
    social:
      'Amasra yazın doludur, kışın mahalle geri gelir. Bartın merkezde üniversite bu dalgalanmayı dengeler.',
    culture:
      'Salatalık, tarhana ve balık aynı haftada sofraya iner. Küçük şehirde dedikodu da dayanışma da hızlı yayılır.',
    local:
      'Amasra Kalesi ve iki koy yarım gündür. Kuşkayası ve İnönü Koyu daha sakin alternatiflerdir.',
    community:
      'Bartın şehir odası, merkez ile Amasra’yı aynı il kimliğinde tutar.',
    related: ['zonguldak', 'karabuk', 'kastamonu'],
    topics: [],
  },
  {
    id: 'karabuk',
    name: 'Karabük',
    description:
      'Karabük’te sanayi hafızası ile Safranbolu’nun korunmuş çarşısı yan yana durur.',
    intro:
      'Karabük, demir-çelikle kurulan bir Cumhuriyet kentidir. Birkaç kilometre ötedeki Safranbolu ise bambaşka bir zaman diliminde yürür.',
    history:
      'Kardemir, şehrin nüfusunu ve mahallelerini belirledi. Safranbolu evleri UNESCO listesiyle bu sanayi hikâyesinin yanında ayrı bir koruma alanı oldu.',
    social:
      'Merkezde buluşma hâlâ sanayi kenti pratikliğiyle işler. Safranbolu çarşısı ise daha çok ziyaret ve hafta sonu ritmidir.',
    culture:
      'Lokum, ev yemekleri ve konak sofrası Safranbolu’ya aittir. Merkezin kültürü vardiya saatlerine daha yakındır.',
    local:
      'Safranbolu çarşısı ve Yörük Köyü yürünebilir. Bulak ve Yenice ormanları ayrı bir gün ister.',
    community:
      'Karabük Vora topluluğu bu ikili kimliği tek şehir odasında taşır.',
    related: ['bartin', 'kastamonu', 'bolu', 'zonguldak'],
    topics: [],
  },
  {
    id: 'zonguldak',
    name: 'Zonguldak',
    description:
      'Zonguldak’ta maden hafızası, dik sokaklar ve Filyos hattının yeni temposu.',
    intro:
      'Zonguldak denize tepeden iner. Maden, kenti hem kurmuş hem de sokakların eğimini belirlemiştir.',
    history:
      'Taşkömürü havzası Cumhuriyet sanayisinin erken adreslerindendir. Üzülmez ve Kozlu isimleri hâlâ bir meslek hafızası taşır.',
    social:
      'Mahalle aidiyeti güçlüdür. Yeni gelen biri için “hangi semt” sorusu, “ne iş yapıyorsun” sorusuyla birlikte gelir.',
    culture:
      'Madenci sohbeti nostalji değildir; birçok ailede hâlâ yakın tarihtir. Sahil ise bu ağırlığın karşısında açık bir nefes alanıdır.',
    local:
      'Gökgöl Mağarası ve Filyos plajı farklı yönlere bakar. Merkezde liman yürüyüşü kısa sürer.',
    community:
      'Zonguldak şehir odası, kıyı ilçeleri ile merkezi aynı konuşmada tutmaya yarar.',
    related: ['bartin', 'karabuk', 'duzce', 'bolu'],
    topics: [],
  },
  {
    id: 'bolu',
    name: 'Bolu',
    description:
      'Bolu’da Abant, Yedigöller ve Mengen mutfağının kurduğu iç Karadeniz durağı.',
    intro:
      'Bolu, İstanbul–Ankara hattının üzerinde bir orman kentidir. Geçip gitmek kolay, kalıp yürümek daha öğreticidir.',
    history:
      'Hitit ve Roma izleri ilçelere dağılır. Modern Bolu ise yol, orman işletmesi ve mutfak okuluyla tanınır.',
    social:
      'Mengen’den çıkan aşçılar memleket sohbetini Türkiye’ye taşır. Kent içinde buluşma ise göller hattına ve çarşıya bölünür.',
    culture:
      'Kızılcık tarhanası ve mantı, misafir ağırlamanın hâlâ evde başladığını hatırlatır.',
    local:
      'Abant ve Gölcük aynı güne sığar. Yedigöller sığmaz; o rota ayrı bir sabah ister.',
    community:
      'Bolu’daki Vora kullanıcıları çoğu zaman hem yol üstü hem yayla bağını birlikte taşır.',
    related: ['duzce', 'zonguldak', 'karabuk'],
    topics: [],
  },
  {
    id: 'duzce',
    name: 'Düzce',
    description:
      'Düzce’de deprem sonrası yeniden kurulan merkez, Akçakoca sahili ve Efteni gölü.',
    intro:
      'Düzce küçük bir merkezden ibaret değildir. Ova, orman ve Akçakoca kıyısı aynı ilin üç ayrı hızıdır.',
    history:
      '1999 depremleri kentin fiziksel hafızasını değiştirdi. Yeni merkez, eski mahalle bağlarının üzerine kuruldu.',
    social:
      'Yeniden kurulan şehirde komşuluk bilinçli bir çabadır. Üniversite bu çabaya her yıl yeni yüzler ekler.',
    culture:
      'Fındık ve kestane iç kesimde, balık Akçakoca’da konuşulur. Tek bir “Düzce sofrası” yoktur.',
    local:
      'Akçakoca Ceneviz kalesi yarım gündür. Efteni ve Samandere ayrı sapmalardır.',
    community:
      'Düzce şehir odası, ovadaki merkez ile kıyıdaki ilçeyi aynı il diye hatırlatır.',
    related: ['bolu', 'zonguldak'],
    topics: [],
  },
  {
    id: 'gumushane',
    name: 'Gümüşhane',
    description:
      'Gümüşhane’de dar vadi, madencilik izi ve Zigana ile Tomara’nın yüksek durakları.',
    intro:
      'Gümüşhane, Harşit Vadisi’ne sıkışmış sakin bir merkezdir. Asıl nefes yaylada ve eski madenci köylerinde alınır.',
    history:
      'Gümüş madeni kente adını verdi. Santa (Dumanlı) harabeleri, terk edilmiş bir vadi yaşamının açık arşividir.',
    social:
      'Merkez küçüktür; herkesin yolu çarşıdan geçer. Tanışmak burada tesadüfe değil tekrar eden selama bağlıdır.',
    culture:
      'Pestil ve köme kışlık hazırlıktır, hediye değil sadece. Sofrada tatlı, misafirin payıdır.',
    local:
      'Tomara Şelalesi ve Zigana geçidi aynı günü ikiye böler. Santa’ya çıkış ise ayrı bir sabah planı ister.',
    community:
      'Gümüşhane Vora topluluğu küçük olduğu için şehir odasındaki her ses daha net duyulur.',
    related: ['trabzon', 'bayburt', 'giresun'],
    topics: [
      {
        slug: 'gezilecek-yerler',
        title: 'Gümüşhane’de gezilecek yerler',
        description: 'Vadi, şelale ve terk edilmiş köy aynı tempoda gezilmez.',
        paragraphs: [
          'Tomara’ya inen merdivenler ıslaktır. Şelaleyi görmek için acele eden kişi dönüşte aynı merdiveni daha yavaş çıkar.',
          'Santa harabeleri fotoğraf noktası olmanın ötesinde boşalmış bir yaşamdır. Sessiz gezmek, anlatıyı bozmaz.',
          'Zigana’dan bakınca Trabzon yolu anlaşılır. Gümüşhane’yi yalnızca transit durak sanmak, vadiyi atlamak olur.',
        ],
      },
    ],
  },
  {
    id: 'bayburt',
    name: 'Bayburt',
    description:
      'Bayburt’ta Çoruh kıyısı, Baksı Müzesi ve yüksek ovada seyrek kurulan bağlar.',
    intro:
      'Bayburt, Karadeniz ile Doğu Anadolu’nun birbirine değdiği yüksek bir ovadır. Rüzgâr ve Çoruh şehrin iki sabitidir.',
    history:
      'Kale, ovayı yukarıdan tutar. Baksı Müzesi ise çağdaş sanatı bu coğrafyaya bilinçli olarak taşımıştır.',
    social:
      'İnsan az, mesafe uzundur. Bir düğün veya panayır, aylarca sürecek selamlaşmanın başlangıcı olabilir.',
    culture:
      'Tel helva ve lor dolması misafir sofrasının parçasıdır. Acele ikram edilmez.',
    local:
      'Çoruh kıyısı ve Aydıntepe yeraltı şehirleri farklı günlerdir. Kışın yol planı havaya bırakılmalıdır.',
    community:
      'Bayburt odası Vora’da küçük durabilir. Küçük bir oda, uzaktaki hemşehri için tek ortak adres olabilir.',
    related: ['gumushane', 'trabzon', 'rize'],
    topics: [],
  },
  {
    id: 'amasya',
    name: 'Amasya',
    description:
      'Amasya’da Yeşilırmak kıyısı, kral kaya mezarları ve şehzadeler kenti hafızası.',
    intro:
      'Amasya, nehrin iki yakasına kurulmuş dar bir tarihtir. Akşam ışığı kayalara vurunca şehir kartpostal olmaktan çıkar, sokak olur.',
    history:
      'Pontus krallarının mezarları hâlâ nehre bakar. Osmanlı’da şehzadelerin sancağa çıktığı kent olarak idari hafızası da güçlüdür.',
    social:
      'Yalıboyu yürüyüşü herkesindir. Uzun sohbet ise çarşıdaki kısa dükkân duraklarında ve ev ziyaretlerinde kurulur.',
    culture:
      'Elma ve kiraz takvimi ilçelere göre değişir. Sofrada toyga ve bakla dolması hâlâ ev yemeğidir.',
    local:
      'Kral mezarları ve müze yarım gündür. Boraboy ve Yaylacık ayrı bir sapmadır.',
    community:
      'Amasya, Karadeniz’in iç sınırında durur. Vora’daki şehir odası bu sınırı bir kimlik olarak taşır.',
    related: ['tokat', 'corum', 'samsun'],
    topics: [],
  },
  {
    id: 'corum',
    name: 'Çorum',
    description:
      'Çorum’da Hitit başkenti, leblebi çarşısı ve İç Karadeniz’in ova kent ritmi.',
    intro:
      'Çorum bir ova kentidir. Hititler burayı başkent seçtiğinde de, leblebi ticareti büyüdüğünde de gerekçe aynıdır: yol ve düzlük.',
    history:
      'Hattuşa ve Alacahöyük, merkezden ayrı bir arkeoloji günüdür. Kentin kendisi ise Cumhuriyet çarşısı ve sanayi siteleriyle okunur.',
    social:
      'Çarşı selamı işler. Yeni bir çevre, büyük bir etkinlikten çok aynı saatte aynı fırına uğramakla başlar.',
    culture:
      'Leblebi burada atıştırmalık değil bir zanaattır. İskilip dolması ise ilçenin kendi sofrasını korur.',
    local:
      'Hattuşa’ya ayıracağınız süre, çarşıda içeceğiniz çaydan uzun olmalıdır. İkisini aynı öğlene sıkıştırmayın.',
    community:
      'Çorum Vora topluluğu ovadaki merkezi ve Hitit ilçelerini aynı şehir kimliğinde tutar.',
    related: ['amasya', 'samsun', 'kastamonu', 'tokat'],
    topics: [],
  },
  {
    id: 'tokat',
    name: 'Tokat',
    description:
      'Tokat’ta Ballıca Mağarası, Niksar ovası ve yazmacılıkla süren çarşı hafızası.',
    intro:
      'Tokat, Yeşilırmak’ın başka bir durağında daha geniş bir ovaya açılır. Kaleden bakınca şehir çarşı, bağ ve ova diye üçe ayrılır.',
    history:
      'Danişmend ve Osmanlı katmanları kalede üst üste durur. Yazmacılık, bu katmanların hâlâ tezgâhta süren halidir.',
    social:
      'Çarşı içi tanıdık çevresi kapalı görünebilir. Düzenli bir kurs, dernek veya şehir odası bu çemberi dışarıdan da açar.',
    culture:
      'Tokat kebabı ve üzüm yaprağı aynı bağın iki ürünüdür. Sofrada acele edilmez.',
    local:
      'Ballıca Mağarası serindir ve ayrı bir sabah ister. Niksar ve Zile günübirlik ilçe duraklarıdır.',
    community:
      'Tokat şehir odası, ovadaki ilçelerle merkezi aynı konuşmada bir araya getirir.',
    related: ['amasya', 'samsun', 'ordu'],
    topics: [],
  },
];

export function cityById(id: string): CityPage | undefined {
  return CITIES.find((city) => city.id === id);
}

export function cityTopic(cityId: string, topic: string): { city: CityPage; topic: CityTopic } | undefined {
  const city = cityById(cityId);
  const found = city?.topics.find((item) => item.slug === topic);
  if (!city || !found) return undefined;
  return { city, topic: found };
}
