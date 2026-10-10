import { useEffect, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { CanlarButton, CanlarCard, CanlarCasePicker, CanlarField, CanlarScaffold, CanlarStatusPill } from '@/features/vora-canlar/components/CanlarScaffold';
import { CANLAR_ACCENT, CANLAR_UNCONFIGURED } from '@/features/vora-canlar/constants';
import { radius, spacing } from '@/constants/theme';
import {
  applyCanlarRole,
  loadContributionStats,
  offerCanlarAid,
  saveCanlarNotificationPrefs,
  saveCanlarPrivacy,
} from '@/features/vora-canlar/services/api';
import { explainCanlarError, missingMessage } from '@/features/vora-canlar/services/plainLanguage';
import { fetchLatestVerificationRequest } from '@/features/identity-verification/services/verificationStatus';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const AID_TYPES = [
  ['food', 'Mama'],
  ['medicine', 'İlaç ve malzeme'],
  ['transport', 'Nakil'],
  ['foster', 'Geçici yuva'],
  ['volunteer_work', 'Gönüllü çalışma'],
  ['care', 'Bakım'],
  ['other', 'Diğer'],
] as const;

export function CanlarAidScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ type?: string; caseId?: string }>();
  const initialType = AID_TYPES.some((item) => item[0] === params.type) ? params.type as (typeof AID_TYPES)[number][0] : 'food';
  const [type, setType] = useState<(typeof AID_TYPES)[number][0]>(initialType);
  const [caseId, setCaseId] = useState<string | null>(typeof params.caseId === 'string' ? params.caseId : null);
  const [note, setNote] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  return (
    <CanlarScaffold title="Ayni yardım">
      <Text style={{ color: colors.textSecondary }}>
        Mama, ilaç, nakil veya bakım teklifidir. Gönüllü rol başvurusu ve veteriner hizmeti ayrıdır. Para bağışına eklenmez.
      </Text>
      <ChoiceRow options={AID_TYPES} value={type} onChange={setType} />
      <Text secondary>İsterseniz kendi ihbarınızı seçin. Vaka numarası yazılmaz; sistem ihbar açılınca verir. Seçmezseniz teklif dosyaya bağlanmadan kaydolur.</Text>
      <CanlarCasePicker userId={user?.id ?? null} value={caseId} onChange={setCaseId} />
      <CanlarField value={note} onChangeText={setNote} placeholder="Neyi, nereye ve ne zaman vereceksiniz?" multiline />
      <CanlarField value={quantity} onChangeText={setQuantity} placeholder="Miktar. Örnek: 2 kutu mama" />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {done ? <Text>Teklif kaydedildi. Teslim edilmeden katkı sayılmaz.</Text> : null}
      <CanlarButton
        label="Teklifi kaydet"
        icon="gift-outline"
        onPress={async () => {
          const problems = [
            note.trim().length < 8 ? 'Teslim planı eksik. Neyi, nereye vereceğinizi yazın.' : '',
          ].filter(Boolean);
          const missing = missingMessage(problems);
          if (missing) {
            setError(missing);
            return;
          }
          const result = await offerCanlarAid({
            caseId,
            campaignId: null,
            type,
            note,
            quantity,
          });
          if (result.error) setError(explainCanlarError(result.error));
          else setDone(true);
        }}
      />
    </CanlarScaffold>
  );
}

export function CanlarPrivacyScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [flags, setFlags] = useState({
    animals: false,
    rescues: false,
    donations: false,
    inKind: false,
    volunteer: false,
  });
  const [notices, setNotices] = useState({ rescue: true, treatment: true, campaign: true, promo: false });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    void loadContributionStats(user.id).then((result) => {
      const privacy = (result.data?.privacy ?? null) as Record<string, boolean> | null;
      if (!privacy) return;
      setFlags({
        animals: Boolean(privacy.show_animals),
        rescues: Boolean(privacy.show_rescues),
        donations: Boolean(privacy.show_donations),
        inKind: Boolean(privacy.show_in_kind),
        volunteer: Boolean(privacy.show_volunteer),
      });
    });
  }, [user]);

  const row = (label: string, help: string, value: boolean, onChange: (value: boolean) => void) => (
    <CanlarCard>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontWeight: '800' }}>{label}</Text>
          <Text secondary>{help}</Text>
        </View>
        <Switch value={value} onValueChange={onChange} accessibilityLabel={label} />
      </View>
    </CanlarCard>
  );

  return (
    <CanlarScaffold title="Katkı gizliliği">
      <Text style={{ color: colors.textSecondary }}>
        Varsayılan olarak göstergeler gizlidir. Gizlenen değer başkasının profil yanıtında da yer almaz. Ayrı bir itiraz formu yoktur; red gerekçesi yalnızca ilgili kayıtta duruyorsa görünür.
      </Text>
      {row('Desteklenen hayvan sayısı', 'Farklı hayvan sayısı. Aynı hayvana birden fazla bağış bir kez sayılır.', flags.animals, (animals) => setFlags({ ...flags, animals }))}
      {row('Doğrulanmış kurtarma', 'Yalnızca yetkili doğrulaması olan kurtarmalar.', flags.rescues, (rescues) => setFlags({ ...flags, rescues }))}
      {row('Bağış tutarı', 'İadeler düşülmüş gerçekleşen bağış. İşlem ücreti bu tutara karışmaz.', flags.donations, (donations) => setFlags({ ...flags, donations }))}
      {row('Ayni yardım', 'Para karşılığı değildir.', flags.inKind, (inKind) => setFlags({ ...flags, inKind }))}
      {row('Gönüllülük', 'İletişim bilgisi bu göstergede açılmaz.', flags.volunteer, (volunteer) => setFlags({ ...flags, volunteer }))}
      <Text style={{ fontWeight: '700' }}>Bildirimler</Text>
      <Text secondary>Finansal ve güvenlik bildirimleri kapatılamaz. Aşağıdakiler isteğe bağlıdır.</Text>
      {row('Kurtarma güncellemeleri', 'Takip ettiğiniz dosyalar.', notices.rescue, (rescue) => setNotices({ ...notices, rescue }))}
      {row('Tedavi güncellemeleri', 'Tedavi süreci.', notices.treatment, (treatment) => setNotices({ ...notices, treatment }))}
      {row('Kampanya duyuruları', 'Onay ve ek bilgi.', notices.campaign, (campaign) => setNotices({ ...notices, campaign }))}
      {row('Tanıtım', 'İsteğe bağlı duyurular.', notices.promo, (promo) => setNotices({ ...notices, promo }))}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {saved ? <Text>Kaydedildi.</Text> : null}
      <CanlarButton
        label="Kaydet"
        icon="checkmark"
        onPress={async () => {
          const privacy = await saveCanlarPrivacy(flags);
          const prefs = await saveCanlarNotificationPrefs(notices);
          if (privacy.error || prefs.error) setError(privacy.error ?? prefs.error);
          else setSaved(true);
        }}
      />
    </CanlarScaffold>
  );
}

export function CanlarRoleScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [role, setRole] = useState('volunteer');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [identity, setIdentity] = useState<'approved' | 'pending' | 'none'>('none');

  useEffect(() => {
    if (!user) return;
    void fetchLatestVerificationRequest(user.id).then((request) => {
      if (!request) setIdentity('none');
      else if (request.status === 'approved') setIdentity('approved');
      else if (request.status === 'pending' || request.status === 'in_review') setIdentity('pending');
      else setIdentity('none');
    });
  }, [user]);

  return (
    <CanlarScaffold title="Rol başvurusu">
      <CanlarCard>
        {identity === 'approved' ? (
          <CanlarStatusPill label="Kimlik doğrulandı" tone={colors.success} />
        ) : identity === 'pending' ? (
          <CanlarStatusPill label="Kimlik incelemede" tone={CANLAR_ACCENT} />
        ) : (
          <CanlarStatusPill label="Kimlik henüz doğrulanmadı" tone={colors.textMuted} />
        )}
        <Text style={{ color: colors.textSecondary }}>{CANLAR_UNCONFIGURED.identityLiveness}</Text>
        {identity === 'approved' ? (
          <Text secondary>Kimlik belgeniz onaylı. Başvurunuz bu durumla birlikte alınır.</Text>
        ) : (
          <CanlarButton label="Mevcut kimlik doğrulamasına git" icon="shield-checkmark-outline" onPress={() => router.push('/settings/identity-verification' as never)} />
        )}
      </CanlarCard>
      <ChoiceRow
        options={[
          ['volunteer', 'Gönüllü'],
          ['rescuer', 'Kurtarma ekibi'],
          ['campaign_owner', 'Kampanya sahibi'],
          ['clinic_contact', 'Klinik iletişim'],
        ]}
        value={role}
        onChange={setRole}
      />
      <CanlarField value={note} onChangeText={setNote} placeholder="Kısa açıklama" />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {done ? <Text>Başvuru alındı. Onay, kimlik incelemesi tamamlanmadan verilmez.</Text> : null}
      <CanlarButton
        label="Başvur"
        icon="ribbon-outline"
        onPress={async () => {
          const result = await applyCanlarRole(role, note);
          if (result.error) setError(result.error);
          else setDone(true);
        }}
      />
    </CanlarScaffold>
  );
}

function ChoiceRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map(([id, label]) => {
        const active = value === id;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(id)}
            style={{
              borderWidth: 1,
              borderRadius: radius.full,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderColor: active ? CANLAR_ACCENT : colors.border,
              backgroundColor: active ? `${CANLAR_ACCENT}22` : colors.surface,
            }}
          >
            <Text style={{ fontWeight: active ? '800' : '500', color: active ? CANLAR_ACCENT : colors.text }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
