import { useEffect, useState } from 'react';
import { Pressable, TextInput } from 'react-native';
import { Text } from '@/components/ui/Text';
import { CanlarCard, CanlarEmpty, CanlarScaffold } from '@/features/vora-canlar/components/CanlarScaffold';
import { CANLAR_ACCENT, CANLAR_UNCONFIGURED } from '@/features/vora-canlar/constants';
import {
  loadAdminQueue,
  recordCanlarPayout,
  reviewCanlarCampaign,
  reviewCanlarClinic,
  reviewCanlarProof,
  reviewCanlarRole,
  verifyCanlarRescue,
} from '@/features/vora-canlar/services/api';
import { canAdmin } from '@/constants/roles';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function AdminCanlarScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const isAdmin = profile?.role ? canAdmin(profile.role) : false;
  const [queue, setQueue] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('İnceleme notu');

  const reload = () => {
    void loadAdminQueue().then((result) => {
      if (result.error) setError(result.error);
      setQueue(result.data);
    });
  };

  useEffect(() => {
    reload();
  }, []);

  const cases = (queue?.cases ?? []) as { id: string; public_code: string; status: string; city_label: string }[];
  const campaigns = (queue?.campaigns ?? []) as { id: string; title: string; status: string }[];
  const proofs = (queue?.proofs ?? []) as { id: string; kind: string; review_status: string }[];
  const roles = (queue?.roles ?? []) as { id: string; role_key: string; status: string }[];
  const clinics = (queue?.clinics ?? []) as { id: string; name: string; verification_status: string }[];

  return (
    <CanlarScaffold title="Vora Canlar yönetimi">
      <Text style={{ color: colors.textSecondary }}>{CANLAR_UNCONFIGURED.stripeConnect}</Text>
      <Text secondary>{CANLAR_UNCONFIGURED.identityLiveness}</Text>
      <Text secondary>Kimlik belgeleri bu ekranda açılmaz. Finansal ayrıntı yalnızca yönetici rolündedir.</Text>
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <TextInput value={reason} onChangeText={setReason} placeholder="Gerekçe" placeholderTextColor={colors.textMuted} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.text }} />
      <Text style={{ fontWeight: '700' }}>İhbarlar</Text>
      {cases.length === 0 ? <CanlarEmpty label="Bekleyen ihbar yok." /> : cases.map((item) => (
        <CanlarCard key={item.id}>
          <Text>{item.public_code} · {item.city_label} · {item.status}</Text>
          <RescueVerify caseId={item.id} reason={reason} onDone={reload} />
        </CanlarCard>
      ))}
      {isAdmin ? (
        <>
          <Text style={{ fontWeight: '700' }}>Kampanyalar</Text>
          {campaigns.map((item) => (
            <CanlarCard key={item.id}>
              <Text>{item.title} · {item.status}</Text>
              <Pressable onPress={() => void reviewCanlarCampaign(item.id, 'live', false, reason).then(reload)}>
                <Text>Yayınla, ödemeyi kapalı bırak</Text>
              </Pressable>
              <Pressable onPress={() => void reviewCanlarCampaign(item.id, 'live', true, reason).then(reload)}>
                <Text>Yayınla ve ödemeyi aç</Text>
              </Pressable>
              <Pressable onPress={() => void reviewCanlarCampaign(item.id, 'paused', false, reason).then(reload)}>
                <Text>Durdur</Text>
              </Pressable>
              <Pressable onPress={() => void reviewCanlarCampaign(item.id, 'rejected', false, reason).then(reload)}>
                <Text>Reddet</Text>
              </Pressable>
            </CanlarCard>
          ))}
          <Text style={{ fontWeight: '700' }}>Roller</Text>
          {roles.map((item) => (
            <CanlarCard key={item.id}>
              <Text>{item.role_key} · {item.status}</Text>
              <Pressable onPress={() => void reviewCanlarRole(item.id, 'approved', reason).then(reload)}><Text>Onayla</Text></Pressable>
              <Pressable onPress={() => void reviewCanlarRole(item.id, 'needs_more', reason).then(reload)}><Text>Ek inceleme</Text></Pressable>
              <Pressable onPress={() => void reviewCanlarRole(item.id, 'rejected', reason).then(reload)}><Text>Reddet</Text></Pressable>
            </CanlarCard>
          ))}
          <Text style={{ fontWeight: '700' }}>Klinikler</Text>
          {clinics.map((item) => (
            <CanlarCard key={item.id}>
              <Text>{item.name} · {item.verification_status}</Text>
              <Pressable onPress={() => void reviewCanlarClinic(item.id, 'approved', reason).then(reload)}><Text>Doğrulanmış klinik</Text></Pressable>
            </CanlarCard>
          ))}
          <Text secondary>Doğrudan klinik ödemesi referanssız “ödendi” olamaz. Stripe Connect yoktur.</Text>
          <PayoutForm onDone={reload} reason={reason} />
        </>
      ) : <Text secondary>Kampanya, rol ve ödeme kararları yönetici rolüne açıktır.</Text>}
      <Text style={{ fontWeight: '700' }}>Kanıtlar</Text>
      {proofs.map((item) => (
        <CanlarCard key={item.id}>
          <Text>{item.kind} · {item.review_status}</Text>
          <Pressable onPress={() => void reviewCanlarProof(item.id, 'approved', reason, reason).then(reload)}><Text>Arındırılmış özelle onayla</Text></Pressable>
          <Pressable onPress={() => void reviewCanlarProof(item.id, 'rejected', reason, '').then(reload)}><Text>Reddet</Text></Pressable>
          <Pressable onPress={() => void reviewCanlarProof(item.id, 'needs_more', reason, '').then(reload)}><Text>Ek belge iste</Text></Pressable>
        </CanlarCard>
      ))}
    </CanlarScaffold>
  );
}

function RescueVerify({ caseId, reason, onDone }: { caseId: string; reason: string; onDone: () => void }) {
  const { colors } = useTheme();
  const [rescuerId, setRescuerId] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  return (
    <>
      <TextInput
        value={rescuerId}
        onChangeText={setRescuerId}
        placeholder="Onaylı kurtarıcı kullanıcı kimliği"
        placeholderTextColor={colors.textMuted}
        style={{ color: colors.text }}
      />
      {message ? <Text secondary>{message}</Text> : null}
      <Pressable
        onPress={async () => {
          const result = await verifyCanlarRescue(caseId, rescuerId.trim(), reason);
          setMessage(result.error ?? 'Doğrulama kaydı yazıldı.');
          if (!result.error) onDone();
        }}
      >
        <Text style={{ color: CANLAR_ACCENT }}>Kurtarmayı doğrula</Text>
      </Pressable>
    </>
  );
}

function PayoutForm({ onDone, reason }: { onDone: () => void; reason: string }) {
  const { colors } = useTheme();
  const [campaignId, setCampaignId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <CanlarCard>
      <Text style={{ fontWeight: '700' }}>Manuel ödeme kaydı</Text>
      <TextInput value={campaignId} onChangeText={setCampaignId} placeholder="Kampanya kimliği" placeholderTextColor={colors.textMuted} style={{ color: colors.text }} />
      <TextInput value={label} onChangeText={setLabel} placeholder="Klinik veya yararlanıcı" placeholderTextColor={colors.textMuted} style={{ color: colors.text }} />
      <TextInput value={amount} onChangeText={setAmount} placeholder="Tutar kuruş" placeholderTextColor={colors.textMuted} style={{ color: colors.text }} />
      <TextInput value={reference} onChangeText={setReference} placeholder="Ödeme referansı" placeholderTextColor={colors.textMuted} style={{ color: colors.text }} />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Pressable
        onPress={async () => {
          const amountMinor = Number(amount);
          if (!Number.isInteger(amountMinor) || amountMinor <= 0 || !reference.trim()) {
            setError('Tutar tam sayı olmalı ve referans zorunludur.');
            return;
          }
          const result = await recordCanlarPayout({
            campaignId: campaignId.trim(),
            destination: 'clinic',
            label,
            clinicId: null,
            amountMinor,
            status: 'paid',
            reference,
            note: reason,
          });
          if (result.error) setError(result.error);
          else onDone();
        }}
      >
        <Text style={{ color: CANLAR_ACCENT }}>Referanslı ödendi kaydı</Text>
      </Pressable>
    </CanlarCard>
  );
}
