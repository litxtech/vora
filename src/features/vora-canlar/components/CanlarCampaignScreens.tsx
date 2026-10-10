import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase/client';
import { CanlarButton, CanlarCard, CanlarCasePicker, CanlarEmpty, CanlarField, CanlarHeroImage, CanlarScaffold, CanlarSectionTitle, CanlarStatusPill } from '@/features/vora-canlar/components/CanlarScaffold';
import { CanlarMoneyMeter } from '@/features/vora-canlar/components/canlarUi';
import { CanlarSupportBar } from '@/features/vora-canlar/components/CanlarSupportBar';
import {
  CAMPAIGN_STATUS_LABELS,
  CANLAR_ACCENT,
  CANLAR_UNCONFIGURED,
  DONATION_STATUS_LABELS,
  HELP_KIND_OPTIONS,
  PAYOUT_MODEL_LABELS,
  PROOF_KIND_OPTIONS,
  formatMinor,
} from '@/features/vora-canlar/constants';
import { FEE_DISCLOSURE, prePaymentBreakdown } from '@/features/vora-canlar/services/money';
import {
  acceptCanlarPolicy,
  createCanlarCampaign,
  loadDonation,
  loadOwnerDashboard,
  loadPublicCampaign,
  prepareDonation,
  startCanlarCheckout,
  submitCanlarProof,
} from '@/features/vora-canlar/services/api';
import type { CanlarMoney } from '@/features/vora-canlar/services/api';
import { findCanlarExample } from '@/features/vora-canlar/samples';
import { explainCanlarError, missingMessage } from '@/features/vora-canlar/services/plainLanguage';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

function liraToMinor(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, frac = ''] = normalized.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}

function MoneyBlock({ money, currency }: { money: CanlarMoney; currency: string }) {
  const rows = [
    ['İadeler düşülmüş bağış', money.donor_net_of_refunds_minor],
    ['Ödeme kuruluşu ücreti', money.processor_fee_minor],
    ['Diğer kesintiler', money.other_deduction_minor],
    ['Kampanyaya ayrılan net', money.campaign_net_minor],
    ['Bekleyen', money.pending_gross_minor],
    ['Ters ibraz', money.disputed_minor],
    ['Başarısız', money.failed_gross_minor],
    ['Ödenen', money.paid_out_minor],
    ['Onaylı harcama', money.approved_expense_minor],
    ['Harcanabilir bakiye', money.available_minor],
    ['Eksik kanıt tutarı', money.missing_proof_minor],
  ] as const;
  return (
    <CanlarCard>
      {rows.map(([label, amount]) => (
        <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
          <Text secondary style={{ flex: 1 }}>{label}</Text>
          <Text style={{ fontWeight: '800' }}>{formatMinor(amount, currency)}</Text>
        </View>
      ))}
      {money.fee_unknown_count > 0 ? (
        <Text secondary>{money.fee_unknown_count} bağışın işlem ücreti henüz kesinleşmedi. Bu tutarlar harcanabilir bakiyeye girmez.</Text>
      ) : null}
    </CanlarCard>
  );
}

export function CanlarCampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const example = findCanlarExample(typeof id === 'string' ? id : undefined);

  useEffect(() => {
    if (!id || example) return;
    void loadPublicCampaign(id).then((result) => {
      if (result.error) setError(result.error);
      setPayload(result.data);
    });
  }, [id, example]);

  if (example?.kind === 'campaign') {
    return (
      <CanlarScaffold title={example.title} hero={<CanlarHeroImage source={example.image} label={example.title} />}>
        <CanlarStatusPill label="Örnektir" />
        <Text style={{ fontSize: 28, fontWeight: '800', lineHeight: 34 }}>{example.title}</Text>
        <Text secondary>{example.city}</Text>
        <CanlarStatusPill label={example.badge} tone={example.tone} />
        <Text style={{ fontSize: 17, lineHeight: 26 }}>{example.summary}</Text>
        <CanlarSectionTitle title="Örnek şeffaflık" caption="Rakamlar gerçek ödeme değildir." />
        <CanlarCard>
          <Text secondary>Ödeme yöntemi</Text>
          <Text style={{ fontWeight: '800' }}>Açık</Text>
          <Text secondary>Hedef</Text>
          <Text style={{ fontWeight: '800' }}>12.000,00 TRY</Text>
          <Text secondary>Toplanan bağış</Text>
          <Text style={{ fontWeight: '800' }}>Henüz yok</Text>
        </CanlarCard>
        <CanlarSectionTitle title="Örnek bağış işlemi" caption="Gerçek tahsilat değildir." />
        <CanlarCard>
          <CanlarStatusPill label="Örnektir" />
          <Text>Bağışçı: Ayşe Demir (@ayse)</Text>
          <Text>Gönderi: Boncuk için mama</Text>
          <Text>Vaka: Boncuk · Rize</Text>
          <Text>İşlem: Bağış ödemesi</Text>
          <Text secondary>Örnek kayıttır. Ödeme alınmaz.</Text>
        </CanlarCard>
        {example.events.map((event) => (
          <CanlarCard key={event.label}>
            <CanlarStatusPill label="Örnektir" />
            <Text style={{ fontWeight: '800' }}>{event.label}</Text>
            <Text secondary>{event.note}</Text>
          </CanlarCard>
        ))}
      </CanlarScaffold>
    );
  }

  const campaign = payload?.campaign as Record<string, unknown> | undefined;
  const money = payload?.money as CanlarMoney | undefined;
  const proofs = (payload?.public_proofs ?? []) as { id: string; kind: string; public_summary: string | null; review_status: string }[];

  return (
    <CanlarScaffold title="Kampanya">
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {!campaign ? <CanlarEmpty label="Kampanya bulunamadı veya henüz herkese açık değil." /> : null}
      {campaign ? (
        <CanlarCard>
          <Text style={{ fontSize: 22, fontWeight: '800' }}>{String(campaign.title)}</Text>
          <CanlarStatusPill label={CAMPAIGN_STATUS_LABELS[String(campaign.status)] ?? String(campaign.status)} />
          <Text>{String(campaign.purpose)}</Text>
          <Text secondary>
            {HELP_KIND_OPTIONS.find((item) => item.id === campaign.help_kind)?.label ?? 'Yardım'} · Ödeme {campaign.payments_enabled ? 'açık' : 'kapalı'}. Yayın, para aktarımını kendiliğinden serbest bırakmaz.
          </Text>
          {money && Number(campaign.target_minor) > 0 ? (
            <CanlarMoneyMeter
              raised={money.donor_net_of_refunds_minor}
              target={Number(campaign.target_minor)}
              currency={String(campaign.currency)}
            />
          ) : (
            <Text style={{ fontWeight: '800' }}>
              Toplanan {formatMinor(money?.donor_net_of_refunds_minor ?? 0, String(campaign.currency))}
            </Text>
          )}
          <Text secondary>Yönlendirme: {PAYOUT_MODEL_LABELS[String(campaign.payout_model)] ?? String(campaign.payout_model)}</Text>
          {campaign.payout_model !== 'beneficiary' ? <Text secondary>{CANLAR_UNCONFIGURED.stripeConnect}</Text> : null}
          {campaign.budget_gap_note ? <Text>Hedef farkı: {String(campaign.budget_gap_note)}</Text> : null}
        </CanlarCard>
      ) : null}
      {campaign?.case_id ? (
        <CanlarButton quiet label="İlgili kurtarma dosyası" icon="paw-outline" onPress={() => router.push(`/vora-canlar/case/${String(campaign.case_id)}` as never)} />
      ) : null}
      {campaign?.fulfillment_plan ? (
        <>
          <CanlarSectionTitle title="Yardım nasıl yerine gelecek" />
          <Text>{String(campaign.fulfillment_plan)}</Text>
        </>
      ) : null}
      {money && campaign ? (
        <>
          <CanlarSectionTitle title="Finansal durum" caption="Brüt, ücret, net ve onaylı harcama ayrı satırlardadır. Belgesiz tutar onaylı harcama sayılmaz." />
          <MoneyBlock money={money} currency={String(campaign.currency)} />
        </>
      ) : null}
      <CanlarSectionTitle title="Onaylı belgeler" />
      {Number(payload?.proof_gap ?? 0) > 0 ? (
        <Text style={{ color: colors.warning }}>Ödenmiş kayıt var, onaylı harcama kanıtı eksik. Bu durum gizlenmez.</Text>
      ) : null}
      {proofs.length === 0 ? <CanlarEmpty label="Onaylanmış ve kişisel verilerden arındırılmış kanıt özeti yok." /> : proofs.map((proof) => (
        <CanlarCard key={proof.id}>
          <Text style={{ fontWeight: '800' }}>{PROOF_KIND_OPTIONS.find((item) => item.id === proof.kind)?.label ?? proof.kind}</Text>
          <Text>{proof.public_summary}</Text>
          <Text secondary>Onaylı özet. Ham fatura herkese açık değildir.</Text>
        </CanlarCard>
      ))}
      {id ? (
        <>
          <CanlarSectionTitle title="Destek ol" />
          <CanlarSupportBar
            caseId={campaign?.case_id ? String(campaign.case_id) : null}
            campaignId={campaign?.payments_enabled ? id : null}
          />
        </>
      ) : null}
      {user && campaign && user.id === campaign.owner_id && id ? (
        <CanlarButton label="Kampanya paneli" icon="options-outline" onPress={() => router.push(`/vora-canlar/manage/${id}` as never)} />
      ) : null}
    </CanlarScaffold>
  );
}

export function CanlarCampaignCreateScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [caseId, setCaseId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [helpKind, setHelpKind] = useState('treatment');
  const [model, setModel] = useState('beneficiary');
  const [target, setTarget] = useState('');
  const [lineLabel, setLineLabel] = useState('');
  const [lineAmount, setLineAmount] = useState('');
  const [gap, setGap] = useState('');
  const [fulfillment, setFulfillment] = useState('');
  const [proofPlan, setProofPlan] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <CanlarScaffold title="Kampanya başvurusu">
      <Text secondary>
        Başvuru incelemede kalır. Ödeme ayrıca açılır. Vaka numarası yazılmaz; kendi ihbarınızı seçin. Numara ihbar kaydolunca otomatik verilmiş olur.
      </Text>
      <CanlarCasePicker userId={user?.id ?? null} value={caseId} onChange={setCaseId} />
      <Field value={title} onChange={setTitle} placeholder="Başlık" />
      <Field value={purpose} onChange={setPurpose} placeholder="Yardımın amacı" multiline />
      <Choice options={HELP_KIND_OPTIONS} value={helpKind} onChange={setHelpKind} />
      <Choice options={Object.entries(PAYOUT_MODEL_LABELS).map(([id, label]) => ({ id, label }))} value={model} onChange={setModel} />
      <Field value={target} onChange={setTarget} placeholder="Hedef tutar (TL)" />
      <Field value={lineLabel} onChange={setLineLabel} placeholder="Gider kalemi" />
      <Field value={lineAmount} onChange={setLineAmount} placeholder="Kalem tutarı (TL)" />
      <Field value={gap} onChange={setGap} placeholder="Hedef ile kalemler farklıysa açıklama" />
      <Field value={fulfillment} onChange={setFulfillment} placeholder="Yardım nasıl yerine getirilecek?" multiline />
      <Field value={proofPlan} onChange={setProofPlan} placeholder="Hangi kanıtlar yüklenecek?" multiline />
      <CanlarPolicyConsent accepted={accepted} onToggle={() => setAccepted((value) => !value)} />
      {model !== 'beneficiary' ? <Text secondary>{CANLAR_UNCONFIGURED.stripeConnect}</Text> : null}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <CanlarButton
        label="İncelemeye gönder"
        icon="paper-plane-outline"
        onPress={async () => {
          const targetMinor = liraToMinor(target);
          const lineMinor = liraToMinor(lineAmount);
          const problems = [
            !caseId ? 'İhbar seçilmedi. Kendi dosyanızdan birini seçin; numara yazılmaz.' : '',
            title.trim().length < 3 ? 'Başlık eksik. Kampanyanın adını yazın.' : '',
            purpose.trim().length < 8 ? 'Yardımın amacı çok kısa. Paranın ne için kullanılacağını yazın.' : '',
            targetMinor == null ? 'Hedef tutar sayı değil. Örnek: 12000' : '',
            targetMinor != null && (targetMinor < 1000 || targetMinor > 50_000_000) ? 'Hedef en az 10 TL, en çok 500.000 TL olabilir.' : '',
            lineMinor == null ? 'Gider kalemi tutarı sayı değil. Örnek: 12000' : '',
            targetMinor != null && lineMinor != null && targetMinor !== lineMinor && !gap.trim()
              ? 'Hedef ile gider aynı değil. Farkın nedenini yazın.'
              : '',
            fulfillment.trim().length < 8 ? 'Yardımın nasıl yerine getirileceği eksik.' : '',
            proofPlan.trim().length < 8 ? 'Hangi belgelerin yükleneceği eksik.' : '',
            !accepted ? 'Bağış ve yardım politikasını onaylamadınız.' : '',
          ].filter(Boolean);
          const missing = missingMessage(problems);
          if (!caseId || missing || targetMinor == null || lineMinor == null) {
            setError(missing ?? 'Eksik alan var.');
            return;
          }
          const consent = await acceptCanlarPolicy();
          if (consent.error) {
            setError(explainCanlarError(consent.error));
            return;
          }
          const result = await createCanlarCampaign({
            caseId,
            title,
            purpose,
            helpKind,
            model,
            targetMinor,
            currency: 'try',
            clinicId: null,
            fulfillment,
            proofPlan,
            gapNote: gap,
            lines: [{ category: helpKind, label: lineLabel || title, amount_minor: lineMinor }],
          });
          if (result.error || !result.data) {
            setError(explainCanlarError(result.error ?? 'Başvuru gönderilemedi.'));
            return;
          }
          router.replace(`/vora-canlar/campaign/${result.data}` as never);
        }}
      />
    </CanlarScaffold>
  );
}

export function CanlarDonateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [amount, setAmount] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const minor = liraToMinor(amount);
  const breakdown = minor != null && minor > 0 ? prePaymentBreakdown(minor) : null;

  return (
    <CanlarScaffold title="Bağış">
      <Text style={{ color: colors.textSecondary }}>{FEE_DISCLOSURE}</Text>
      <Text secondary>{CANLAR_UNCONFIGURED.processorFee}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {['100', '250', '500', '1000'].map((preset) => (
          <Pressable key={preset} accessibilityRole="button" onPress={() => setAmount(preset)}>
            <CanlarStatusPill label={`${preset} TL`} tone={amount === preset ? CANLAR_ACCENT : undefined} />
          </Pressable>
        ))}
      </View>
      <Field value={amount} onChange={setAmount} placeholder="Bağış tutarı, TL. Örnek: 100" />
      {breakdown ? (
        <CanlarCard>
          <Text>Brüt tutar: {formatMinor(breakdown.grossMinor)}</Text>
          <Text>Ödeme kuruluşu ücreti: henüz belli değil</Text>
          <Text>Kampanyaya ayrılacak net: ödeme tamamlanınca kesinleşir</Text>
          <Text secondary>{FEE_DISCLOSURE_TEXT}</Text>
        </CanlarCard>
      ) : null}
      <DonorNameChoice anonymous={anonymous} onChange={setAnonymous} />
      <CanlarPolicyConsent accepted={accepted} onToggle={() => setAccepted((value) => !value)} />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <CanlarButton
        label={busy ? 'Yönlendiriliyor' : 'Ödemeye geç'}
        icon="card-outline"
        onPress={async () => {
          const problems = [
            !id ? 'Kampanya bulunamadı. Bağış butonunun olduğu paylaşımdan tekrar açın.' : '',
            !amount.trim() ? 'Tutar boş. Örnek: 100' : '',
            amount.trim() && minor == null ? 'Tutar sayı değil. Örnek: 100 veya 100,50' : '',
            minor != null && (minor < 1000 || minor > 50_000_000) ? 'Bağış en az 10 TL, en çok 500.000 TL olabilir.' : '',
            !accepted ? 'Bağış koşullarını onaylamadınız.' : '',
          ].filter(Boolean);
          const missing = missingMessage(problems);
          if (busy || missing || minor == null || !id) {
            if (!busy) setError(missing ?? 'Eksik alan var.');
            return;
          }
          setBusy(true);
          const consent = await acceptCanlarPolicy();
          if (consent.error) {
            setError(consent.error);
            setBusy(false);
            return;
          }
          const prepared = await prepareDonation(id, minor, anonymous);
          if (prepared.error || !prepared.data) {
            setError(explainCanlarError(prepared.error ?? 'Bağış kaydı açılamadı.'));
            setBusy(false);
            return;
          }
          const checkout = await startCanlarCheckout(prepared.data);
          setBusy(false);
          if (checkout.error) {
            setError(checkout.error);
            return;
          }
          router.replace(`/vora-canlar/donation/${prepared.data}` as never);
        }}
      />
      <Text secondary>Durum ve bağış notları, yardım bekleyenler sayfasının sağ üstündeki Durum ve Bağış butonlarındadır.</Text>
    </CanlarScaffold>
  );
}

export function CanlarDonationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [row, setRow] = useState<Awaited<ReturnType<typeof loadDonation>>['data']>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let stopped = false;
    const tick = async () => {
      const result = await loadDonation(id);
      if (stopped) return;
      if (result.error) setError(result.error);
      setRow(result.data);
    };
    void tick();
    const timer = setInterval(() => void tick(), 3000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [id]);

  return (
    <CanlarScaffold title="Bağış hareketi">
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {!row ? <CanlarEmpty label="Kayıt yükleniyor. Ödeme dönüşü tek başına başarı sayılmaz." /> : (
        <CanlarCard>
          <CanlarStatusPill label={DONATION_STATUS_LABELS[row.status] ?? row.status} tone={row.status === 'succeeded' ? '#2E7D32' : row.status === 'failed' ? '#E53935' : CANLAR_ACCENT} />
          <Text>Brüt: {formatMinor(row.gross_minor, row.currency)}</Text>
          <Text>İşlem ücreti: {row.processor_fee_minor == null ? 'Henüz kesinleşmedi' : formatMinor(row.processor_fee_minor, row.currency)}</Text>
          <Text>Diğer kesinti: {formatMinor(row.other_deduction_minor, row.currency)}</Text>
          <Text>İade: {formatMinor(row.refunded_minor, row.currency)}</Text>
          <Text style={{ fontWeight: '800' }}>Kampanyaya net: {row.net_minor == null ? 'Ücret kesinleşmeden hesaplanmaz' : formatMinor(row.net_minor, row.currency)}</Text>
          <Text secondary>Bu ekran ödeme kaydı doğrulanmadan başarı göstermez.</Text>
        </CanlarCard>
      )}
    </CanlarScaffold>
  );
}

export function CanlarManageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void loadOwnerDashboard(id).then((result) => {
      if (result.error) setError(result.error);
      setData(result.data);
    });
  }, [id]);

  const money = data?.money as CanlarMoney | undefined;
  const donations = (data?.donations ?? []) as { id: string; status: string; gross_minor: number; anonymous: boolean }[];
  const proofs = (data?.proofs ?? []) as { id: string; review_status: string; review_note: string | null }[];

  return (
    <CanlarScaffold title="Kampanya paneli">
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {!data ? <CanlarEmpty label="Panel yükleniyor veya bu kampanyaya yetkiniz yok." /> : null}
      {money ? <MoneyBlock money={money} currency="try" /> : null}
      <CanlarSectionTitle title="Bağışlar" />
      <Text secondary>Bağışçı kimliği anonim kayıtlarda açılmaz.</Text>
      {donations.map((donation) => (
        <CanlarCard key={donation.id}>
          <Text>{formatMinor(donation.gross_minor)} · {DONATION_STATUS_LABELS[donation.status] ?? donation.status}</Text>
          <Text secondary>{donation.anonymous ? 'Anonim bağışçı' : 'Bağışçı adını paylaşmayı seçti'}</Text>
        </CanlarCard>
      ))}
      <CanlarSectionTitle title="Kanıtlar" />
      {proofs.length === 0 ? <CanlarEmpty label="Kanıt yok. Eksik kanıt gizlenmez." /> : proofs.map((proof) => (
        <CanlarCard key={proof.id}>
          <Text>{proof.review_status}</Text>
          {proof.review_note ? <Text secondary>{proof.review_note}</Text> : null}
        </CanlarCard>
      ))}
      {id ? <CanlarButton label="Kanıt yükle" icon="document-attach-outline" onPress={() => router.push(`/vora-canlar/proof/${id}` as never)} /> : null}
    </CanlarScaffold>
  );
}

export function CanlarProofScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [kind, setKind] = useState('vet_invoice');
  const [amount, setAmount] = useState('');
  const [payee, setPayee] = useState('');
  const [summary, setSummary] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async () => {
    if (!user || !id) return;
    const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: ['application/pdf', 'image/*'] });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    const minor = liraToMinor(amount);
    if (minor == null) {
      setError(amount.trim() ? 'Harcama tutarı sayı değil. Örnek: 350' : 'Harcama tutarı boş. Örnek: 350');
      return;
    }
    const response = await fetch(asset.uri);
    const bytes = await response.arrayBuffer();
    const path = `${user.id}/${id}/${Date.now()}-${asset.name ?? 'kanit'}`;
    const { error: uploadError } = await supabase.storage.from('canlar-proofs').upload(path, bytes, {
      contentType: asset.mimeType ?? 'application/pdf',
      upsert: false,
    });
    if (uploadError) {
      setError(uploadError.message);
      return;
    }
    const result = await submitCanlarProof({
      campaignId: id,
      kind,
      path,
      summary,
      category: kind,
      amountMinor: minor,
      payee,
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    setFileName(asset.name ?? path);
    setError(null);
  };

  return (
    <CanlarScaffold title="Harcama kanıtı">
      <Text style={{ color: colors.textSecondary }}>
        Yüklemek onay değildir. Fotoğraf tek başına finansal kanıt sayılmaz. Dosya özel depodadır; kamuya yalnızca arındırılmış özet açılır.
      </Text>
      <Choice options={PROOF_KIND_OPTIONS} value={kind} onChange={setKind} />
      <Field value={amount} onChange={setAmount} placeholder="Harcama tutarı (TL)" />
      <Field value={payee} onChange={setPayee} placeholder="Alıcı veya klinik" />
      <Field value={summary} onChange={setSummary} placeholder="Kişisel veri içermeyen özet" multiline />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {fileName ? <Text>Yüklendi, inceleme bekliyor: {fileName}</Text> : null}
      <CanlarButton label="Belgeyi yükle" icon="cloud-upload-outline" onPress={() => void upload()} />
    </CanlarScaffold>
  );
}

function DonorNameChoice({
  anonymous,
  onChange,
}: {
  anonymous: boolean;
  onChange: (anonymous: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: '800' }}>Adın kampanya sahibine görünsün mü?</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <NameOption
          selected={anonymous}
          title="Adımı gizle"
          caption="Kampanya sahibi adını görmez."
          onPress={() => onChange(true)}
          border={colors.border}
          surface={colors.surface}
        />
        <NameOption
          selected={!anonymous}
          title="Adım görünsün"
          caption="Adın ve kullanıcı adın sahipte görünür."
          onPress={() => onChange(false)}
          border={colors.border}
          surface={colors.surface}
        />
      </View>
    </View>
  );
}

function NameOption({
  selected,
  title,
  caption,
  onPress,
  border,
  surface,
}: {
  selected: boolean;
  title: string;
  caption: string;
  onPress: () => void;
  border: string;
  surface: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 72,
        borderWidth: 1,
        borderRadius: 14,
        borderColor: selected ? CANLAR_ACCENT : border,
        backgroundColor: surface,
        padding: 10,
        gap: 4,
      }}
    >
      <Text style={{ fontWeight: '800', fontSize: 14 }}>{title}</Text>
      <Text secondary variant="caption">{caption}</Text>
    </Pressable>
  );
}

function CanlarPolicyConsent({ accepted, onToggle }: { accepted: boolean; onToggle: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, padding: 12, gap: 10 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Bağış politikasını oku"
        onPress={() => router.push('/vora-canlar/policy' as never)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <Ionicons name="document-text-outline" size={18} color={CANLAR_ACCENT} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800' }}>Bağış politikası</Text>
          <Text secondary variant="caption">İade, ücret ve bağışın nasıl kullanılacağı.</Text>
        </View>
        <Text style={{ color: CANLAR_ACCENT, fontWeight: '800' }}>Oku</Text>
      </Pressable>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: accepted }} onPress={onToggle} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={accepted ? 'checkbox' : 'square-outline'} size={20} color={accepted ? CANLAR_ACCENT : colors.textMuted} />
        <Text style={{ flex: 1, fontWeight: '700' }}>{accepted ? 'Koşulları onayladın' : 'Okudum, koşulları onaylıyorum'}</Text>
      </Pressable>
    </View>
  );
}

function Field({ value, onChange, placeholder, multiline }: { value: string; onChange: (value: string) => void; placeholder: string; multiline?: boolean }) {
  return <CanlarField value={value} onChangeText={onChange} placeholder={placeholder} multiline={multiline} />;
}

function Choice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { id: T; label: string }[];
  value: string;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((option) => {
        const active = value === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.id)}
            style={{
              borderWidth: 1,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderColor: active ? CANLAR_ACCENT : colors.border,
              backgroundColor: active ? `${CANLAR_ACCENT}22` : colors.surface,
            }}
          >
            <Text style={{ fontWeight: active ? '800' : '500', color: active ? CANLAR_ACCENT : colors.text }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const FEE_DISCLOSURE_TEXT = FEE_DISCLOSURE;
