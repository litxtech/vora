import { useEffect, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { CanlarButton, CanlarCard, CanlarField, CanlarScaffold } from '@/features/vora-canlar/components/CanlarScaffold';
import { CANLAR_ACCENT, CANLAR_UNCONFIGURED } from '@/features/vora-canlar/constants';
import { radius, spacing } from '@/constants/theme';
import {
  applyCanlarRole,
  loadContributionStats,
  offerCanlarAid,
  saveCanlarNotificationPrefs,
  saveCanlarPrivacy,
} from '@/features/vora-canlar/services/api';
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
  const [type, setType] = useState<(typeof AID_TYPES)[number][0]>('food');
  const [caseId, setCaseId] = useState('');
  const [note, setNote] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  return (
    <CanlarScaffold title="Ayni yardım ve gönüllülük">
      <Text style={{ color: colors.textSecondary }}>
        Mama, ilaç veya emek para bağışına eklenmez. Tahmini parasal değer yalnızca doğrulandığında ve ayrı gösterilir.
      </Text>
      <ChoiceRow options={AID_TYPES} value={type} onChange={setType} />
      <CanlarField value={caseId} onChangeText={setCaseId} placeholder="Kurtarma dosyası kimliği" />
      <CanlarField value={note} onChangeText={setNote} placeholder="İhtiyaç ve teslim planı" multiline />
      <CanlarField value={quantity} onChangeText={setQuantity} placeholder="Miktar" />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {done ? <Text>Teklif kaydedildi. Teslim edilmeden katkı sayılmaz.</Text> : null}
      <CanlarButton
        label="Teklifi kaydet"
        icon="gift-outline"
        onPress={async () => {
          const result = await offerCanlarAid({
            caseId: caseId.trim() || null,
            campaignId: null,
            type,
            note,
            quantity,
          });
          if (result.error) setError(result.error);
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
      <Text style={{ fontWeight: '700' }}>{label}</Text>
      <Text secondary>{help}</Text>
      <Switch value={value} onValueChange={onChange} />
    </CanlarCard>
  );

  return (
    <CanlarScaffold title="Katkı gizliliği">
      <Text style={{ color: colors.textSecondary }}>
        Varsayılan olarak göstergeler gizlidir. Gizlenen değer başkasının profil yanıtında da yer almaz.
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
  const [role, setRole] = useState('volunteer');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  return (
    <CanlarScaffold title="Rol başvurusu">
      <Text style={{ color: colors.textSecondary }}>{CANLAR_UNCONFIGURED.identityLiveness}</Text>
      <CanlarButton label="Mevcut kimlik doğrulamasına git" icon="shield-checkmark-outline" onPress={() => router.push('/settings/identity-verification' as never)} />
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
