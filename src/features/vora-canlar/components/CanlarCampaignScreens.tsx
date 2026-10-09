import { useEffect, useState } from 'react';
import { Pressable, TextInput } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { supabase } from '@/lib/supabase/client';
import { CanlarCard, CanlarEmpty, CanlarScaffold } from '@/features/vora-canlar/components/CanlarScaffold';
import {
  CAMPAIGN_STATUS_LABELS,
  CANLAR_ACCENT,
  CANLAR_UNCONFIGURED,
  DONATION_STATUS_LABELS,
  PAYOUT_MODEL_LABELS,
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
        <Text key={label}>{label}: {formatMinor(amount, currency)}</Text>
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

  useEffect(() => {
    if (!id) return;
    void loadPublicCampaign(id).then((result) => {
      if (result.error) setError(result.error);
      setPayload(result.data);
    });
  }, [id]);

  const campaign = payload?.campaign as Record<string, unknown> | undefined;
  const money = payload?.money as CanlarMoney | undefined;
  const proofs = (payload?.public_proofs ?? []) as { id: string; kind: string; public_summary: string | null; review_status: string }[];

  return (
    <CanlarScaffold title="Kampanya">
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {!campaign ? <CanlarEmpty label="Kampanya bulunamadı veya henüz herkese açık değil." /> : null}
      {campaign ? (
        <CanlarCard>
          <Text style={{ fontSize: 20, fontWeight: '700' }}>{String(campaign.title)}</Text>
          <Text>{String(campaign.purpose)}</Text>
          <Text secondary>{CAMPAIGN_STATUS_LABELS[String(campaign.status)] ?? String(campaign.status)}</Text>
          <Text secondary>
            Ödeme {campaign.payments_enabled ? 'açık' : 'kapalı'}. Yayın, para aktarımını kendiliğinden serbest bırakmaz.
          </Text>
          <Text secondary>Hedef {formatMinor(Number(campaign.target_minor), String(campaign.currency))}</Text>
          <Text secondary>Yönlendirme: {PAYOUT_MODEL_LABELS[String(campaign.payout_model)] ?? String(campaign.payout_model)}</Text>
          {campaign.payout_model !== 'beneficiary' ? <Text secondary>{CANLAR_UNCONFIGURED.stripeConnect}</Text> : null}
          {campaign.budget_gap_note ? <Text>Hedef farkı: {String(campaign.budget_gap_note)}</Text> : null}
        </CanlarCard>
      ) : null}
      {money && campaign ? <MoneyBlock money={money} currency={String(campaign.currency)} /> : null}
      <Text style={{ fontWeight: '700' }}>Şeffaflık</Text>
      {Number(payload?.proof_gap ?? 0) > 0 ? (
        <Text style={{ color: colors.warning }}>Ödenmiş kayıt var, onaylı harcama kanıtı eksik. Bu durum gizlenmez.</Text>
      ) : null}
      {proofs.length === 0 ? <CanlarEmpty label="Onaylanmış ve kişisel verilerden arındırılmış kanıt özeti yok." /> : proofs.map((proof) => (
        <CanlarCard key={proof.id}>
          <Text style={{ fontWeight: '700' }}>{proof.kind}</Text>
          <Text>{proof.public_summary}</Text>
          <Text secondary>Onaylı özet. Ham fatura herkese açık değildir.</Text>
        </CanlarCard>
      ))}
      {campaign?.payments_enabled && id ? (
        <Pressable style={button} onPress={() => router.push(`/vora-canlar/donate/${id}` as never)}>
          <Text style={buttonText}>Bağış yap</Text>
        </Pressable>
      ) : null}
      {user && campaign && user.id === campaign.owner_id && id ? (
        <Pressable onPress={() => router.push(`/vora-canlar/manage/${id}` as never)}>
          <Text style={{ color: CANLAR_ACCENT, fontWeight: '700' }}>Kampanya paneli</Text>
        </Pressable>
      ) : null}
    </CanlarScaffold>
  );
}

export function CanlarCampaignCreateScreen() {
  const { colors } = useTheme();
  const [caseId, setCaseId] = useState('');
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
      <Text style={{ color: colors.textSecondary }}>
        Kimlik doğrulaması ve kampanya sahibi rolü onaylı olmalıdır. Belge yüklemek doğrulama sayılmaz. Başvuru incelemede kalır; ödeme ayrıca açılır.
      </Text>
      <Field value={caseId} onChange={setCaseId} placeholder="Kurtarma dosyası kimliği" />
      <Field value={title} onChange={setTitle} placeholder="Başlık" />
      <Field value={purpose} onChange={setPurpose} placeholder="Yardımın amacı" multiline />
      <Field value={helpKind} onChange={setHelpKind} placeholder="treatment, food, medicine, transport, care, other" />
      <Field value={model} onChange={setModel} placeholder="beneficiary, clinic veya supplier" />
      <Field value={target} onChange={setTarget} placeholder="Hedef tutar (TL)" />
      <Field value={lineLabel} onChange={setLineLabel} placeholder="Gider kalemi" />
      <Field value={lineAmount} onChange={setLineAmount} placeholder="Kalem tutarı (TL)" />
      <Field value={gap} onChange={setGap} placeholder="Hedef ile kalemler farklıysa açıklama" />
      <Field value={fulfillment} onChange={setFulfillment} placeholder="Yardım nasıl yerine getirilecek?" multiline />
      <Field value={proofPlan} onChange={setProofPlan} placeholder="Hangi kanıtlar yüklenecek?" multiline />
      <Pressable onPress={() => setAccepted((value) => !value)}>
        <Text>{accepted ? 'Bağış ve yardım politikası onaylandı' : 'Bağış ve yardım politikasını onaylıyorum'}</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/vora-canlar/policy' as never)}><Text style={{ color: CANLAR_ACCENT }}>Politikayı oku</Text></Pressable>
      {model !== 'beneficiary' ? <Text secondary>{CANLAR_UNCONFIGURED.stripeConnect}</Text> : null}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Pressable
        style={button}
        onPress={async () => {
          const targetMinor = liraToMinor(target);
          const lineMinor = liraToMinor(lineAmount);
          if (!accepted || targetMinor == null || lineMinor == null) {
            setError('Politika onayı ve geçerli tutarlar gerekir.');
            return;
          }
          const consent = await acceptCanlarPolicy();
          if (consent.error) {
            setError(consent.error);
            return;
          }
          const result = await createCanlarCampaign({
            caseId: caseId.trim(),
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
            setError(result.error ?? 'Başvuru gönderilemedi.');
            return;
          }
          router.replace(`/vora-canlar/campaign/${result.data}` as never);
        }}
      >
        <Text style={buttonText}>İncelemeye gönder</Text>
      </Pressable>
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
      <Field value={amount} onChange={setAmount} placeholder="Brüt bağış (TL)" />
      {breakdown ? (
        <CanlarCard>
          <Text>Brüt tutar: {formatMinor(breakdown.grossMinor)}</Text>
          <Text>Ödeme kuruluşu ücreti: henüz belli değil</Text>
          <Text>Kampanyaya ayrılacak net: ödeme tamamlanınca kesinleşir</Text>
          <Text secondary>{FEE_DISCLOSURE_TEXT}</Text>
        </CanlarCard>
      ) : null}
      <Pressable onPress={() => setAnonymous((value) => !value)}>
        <Text>{anonymous ? 'Kimliğim kampanya sahibine kapalı' : 'Adım kampanya sahibine görünebilir'}</Text>
      </Pressable>
      <Pressable onPress={() => setAccepted((value) => !value)}>
        <Text>{accepted ? 'Bağış koşulları onaylandı' : 'Bağış ve iade koşullarını onaylıyorum'}</Text>
      </Pressable>
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Pressable
        disabled={busy}
        style={button}
        onPress={async () => {
          if (!id || !accepted || minor == null) {
            setError('Tutar ve politika onayı gerekir.');
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
            setError(prepared.error ?? 'Bağış kaydı açılamadı.');
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
      >
        <Text style={buttonText}>{busy ? 'Yönlendiriliyor' : 'Ödemeye geç'}</Text>
      </Pressable>
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
          <Text style={{ fontWeight: '700' }}>{DONATION_STATUS_LABELS[row.status] ?? row.status}</Text>
          <Text>Brüt: {formatMinor(row.gross_minor, row.currency)}</Text>
          <Text>İşlem ücreti: {row.processor_fee_minor == null ? 'Henüz kesinleşmedi' : formatMinor(row.processor_fee_minor, row.currency)}</Text>
          <Text>Diğer kesinti: {formatMinor(row.other_deduction_minor, row.currency)}</Text>
          <Text>İade: {formatMinor(row.refunded_minor, row.currency)}</Text>
          <Text>Kampanyaya net: {row.net_minor == null ? 'Ücret kesinleşmeden hesaplanmaz' : formatMinor(row.net_minor, row.currency)}</Text>
          <Text secondary>Bu ekran Stripe kaydı doğrulanmadan başarı göstermez.</Text>
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
      <Text style={{ fontWeight: '700' }}>Bağışlar</Text>
      <Text secondary>Bağışçı kimliği anonim kayıtlarda açılmaz.</Text>
      {donations.map((donation) => (
        <CanlarCard key={donation.id}>
          <Text>{formatMinor(donation.gross_minor)} · {DONATION_STATUS_LABELS[donation.status] ?? donation.status}</Text>
          <Text secondary>{donation.anonymous ? 'Anonim bağışçı' : 'Bağışçı adını paylaşmayı seçti'}</Text>
        </CanlarCard>
      ))}
      <Text style={{ fontWeight: '700' }}>Kanıtlar</Text>
      {proofs.length === 0 ? <CanlarEmpty label="Kanıt yok. Eksik kanıt gizlenmez." /> : proofs.map((proof) => (
        <CanlarCard key={proof.id}>
          <Text>{proof.review_status}</Text>
          {proof.review_note ? <Text secondary>{proof.review_note}</Text> : null}
        </CanlarCard>
      ))}
      {id ? <Pressable onPress={() => router.push(`/vora-canlar/proof/${id}` as never)}><Text style={{ color: CANLAR_ACCENT }}>Kanıt yükle</Text></Pressable> : null}
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
      setError('Geçerli bir tutar girin.');
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
      <Field value={kind} onChange={setKind} placeholder="vet_invoice, receipt, clinic_note..." />
      <Field value={amount} onChange={setAmount} placeholder="Harcama tutarı (TL)" />
      <Field value={payee} onChange={setPayee} placeholder="Alıcı veya klinik" />
      <Field value={summary} onChange={setSummary} placeholder="Kişisel veri içermeyen özet" multiline />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {fileName ? <Text>Yüklendi, inceleme bekliyor: {fileName}</Text> : null}
      <Pressable style={button} onPress={() => void upload()}><Text style={buttonText}>Belgeyi yükle</Text></Pressable>
    </CanlarScaffold>
  );
}

function Field({ value, onChange, placeholder, multiline }: { value: string; onChange: (value: string) => void; placeholder: string; multiline?: boolean }) {
  const { colors } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      multiline={multiline}
      style={[field, multiline && { minHeight: 88 }, { color: colors.text, borderColor: colors.border }]}
    />
  );
}

const field = { borderWidth: 1, borderRadius: 12, padding: 12 } as const;
const button = { backgroundColor: CANLAR_ACCENT, borderRadius: 12, padding: 14 } as const;
const buttonText = { color: '#fff', fontWeight: '700', textAlign: 'center' } as const;

export const FEE_DISCLOSURE_TEXT = FEE_DISCLOSURE;
