import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import {
  MAX_PROFILE_SOCIAL_LINKS,
  MAX_PROFILE_WEBSITE_LINKS,
  SOCIAL_PLATFORM_DEFS,
  type ProfileLinkDraft,
} from '@/features/profile/constants/profileLinks';
import { ProfileLinkPlatformIcon } from '@/features/profile/components/ProfileLinkPlatformIcon';
import { isLikelyCustomSocialUrl } from '@/features/profile/services/socialProfileUrls';
import type { ProfileSocialPlatform } from '@/features/profile/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ProfileLinksEditorProps = {
  drafts: ProfileLinkDraft[];
  onChange: (drafts: ProfileLinkDraft[]) => void;
};

function SocialLinkFields({
  draft,
  platformDef,
  onChange,
}: {
  draft: ProfileLinkDraft;
  platformDef: (typeof SOCIAL_PLATFORM_DEFS)[number];
  onChange: (patch: Partial<ProfileLinkDraft>) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.socialFields}>
      {draft.useCustomUrl ? (
        <Input
          label="Özel URL"
          value={draft.url}
          onChangeText={(v) => onChange({ url: v })}
          placeholder="https://..."
          autoCapitalize="none"
          keyboardType="url"
          hint="Doğrudan profil bağlantısını yapıştırın"
        />
      ) : (
        <Input
          label="Kullanıcı adı"
          value={draft.username}
          onChangeText={(v) => {
            if (isLikelyCustomSocialUrl(v)) {
              onChange({ useCustomUrl: true, url: v, username: '' });
              return;
            }
            onChange({ username: v });
          }}
          placeholder={platformDef.usernamePlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          hint={
            platformDef.usernameHint ??
            'Bağlantı otomatik oluşturulur; tıklanınca ilgili uygulamada profil açılır.'
          }
        />
      )}

      <View style={styles.switchRow}>
        <View style={styles.switchMeta}>
          <Text variant="label">Özel URL kullan</Text>
          <Text secondary variant="caption">
            Kullanıcı adı yerine doğrudan bağlantı girin
          </Text>
        </View>
        <Switch
          value={draft.useCustomUrl}
          onValueChange={(useCustomUrl) =>
            onChange({
              useCustomUrl,
              url: useCustomUrl ? draft.url : '',
              username: useCustomUrl ? '' : draft.username,
            })
          }
          trackColor={{ true: colors.primary }}
        />
      </View>
    </View>
  );
}

export function ProfileLinksEditor({ drafts, onChange }: ProfileLinksEditorProps) {
  const { colors } = useTheme();
  const [addingSocial, setAddingSocial] = useState(false);
  const [addingWebsite, setAddingWebsite] = useState(false);
  const [newSocialPlatform, setNewSocialPlatform] = useState<ProfileSocialPlatform | null>(null);
  const [newSocialUsername, setNewSocialUsername] = useState('');
  const [newSocialUseCustomUrl, setNewSocialUseCustomUrl] = useState(false);
  const [newSocialUrl, setNewSocialUrl] = useState('');
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('');
  const [newWebsiteTitle, setNewWebsiteTitle] = useState('');

  const socialDrafts = drafts.filter((d) => d.kind === 'social');
  const websiteDrafts = drafts.filter((d) => d.kind === 'website');
  const usedPlatforms = useMemo(
    () => new Set(socialDrafts.map((d) => d.platform).filter(Boolean) as ProfileSocialPlatform[]),
    [socialDrafts],
  );
  const availablePlatforms = SOCIAL_PLATFORM_DEFS.filter((p) => !usedPlatforms.has(p.id));
  const newPlatformDef = newSocialPlatform
    ? SOCIAL_PLATFORM_DEFS.find((p) => p.id === newSocialPlatform)
    : null;

  const removeAt = (index: number) => {
    onChange(drafts.filter((_, i) => i !== index));
  };

  const resetNewSocial = () => {
    setNewSocialPlatform(null);
    setNewSocialUsername('');
    setNewSocialUseCustomUrl(false);
    setNewSocialUrl('');
    setAddingSocial(false);
  };

  const addSocial = () => {
    if (!newSocialPlatform) {
      Alert.alert('Platform seçin', 'Lütfen bir sosyal medya platformu seçin.');
      return;
    }
    if (newSocialUseCustomUrl ? !newSocialUrl.trim() : !newSocialUsername.trim()) {
      Alert.alert(
        newSocialUseCustomUrl ? 'Bağlantı gerekli' : 'Kullanıcı adı gerekli',
        newSocialUseCustomUrl ? 'Özel URL girin.' : 'Kullanıcı adınızı girin.',
      );
      return;
    }
    if (socialDrafts.length >= MAX_PROFILE_SOCIAL_LINKS) {
      Alert.alert('Limit', `En fazla ${MAX_PROFILE_SOCIAL_LINKS} sosyal medya bağlantısı ekleyebilirsiniz.`);
      return;
    }

    onChange([
      ...drafts,
      {
        kind: 'social',
        platform: newSocialPlatform,
        username: newSocialUseCustomUrl ? '' : newSocialUsername.trim(),
        useCustomUrl: newSocialUseCustomUrl,
        url: newSocialUseCustomUrl ? newSocialUrl.trim() : '',
        title: '',
      },
    ]);
    resetNewSocial();
  };

  const addWebsite = () => {
    if (!newWebsiteUrl.trim()) {
      Alert.alert('Bağlantı gerekli', 'Web sitesi adresini girin.');
      return;
    }
    if (websiteDrafts.length >= MAX_PROFILE_WEBSITE_LINKS) {
      Alert.alert('Limit', `En fazla ${MAX_PROFILE_WEBSITE_LINKS} web sitesi ekleyebilirsiniz.`);
      return;
    }

    onChange([
      ...drafts,
      {
        kind: 'website',
        platform: null,
        username: '',
        useCustomUrl: false,
        url: newWebsiteUrl.trim(),
        title: newWebsiteTitle.trim(),
      },
    ]);
    setNewWebsiteUrl('');
    setNewWebsiteTitle('');
    setAddingWebsite(false);
  };

  const updateDraft = (index: number, patch: Partial<ProfileLinkDraft>) => {
    onChange(drafts.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  return (
    <View style={styles.container}>
      <Text secondary variant="caption">
        Sosyal medyada yalnızca kullanıcı adınızı girin; bağlantı otomatik oluşturulur ve tıklanınca ilgili
        uygulamada profiliniz açılır. İsterseniz özel URL de ekleyebilirsiniz.
      </Text>

      {drafts.map((draft, index) => {
        const platformDef = draft.platform ? SOCIAL_PLATFORM_DEFS.find((p) => p.id === draft.platform) : null;
        return (
          <View
            key={`${draft.kind}-${draft.platform ?? 'web'}-${index}`}
            style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
          >
            <View style={styles.rowHeader}>
              {draft.kind === 'social' && platformDef ? (
                <View style={styles.rowLabel}>
                  <ProfileLinkPlatformIcon platform={platformDef.id} size={14} />
                  <Text variant="caption" style={{ fontWeight: '600' }}>
                    {platformDef.label}
                  </Text>
                </View>
              ) : (
                <View style={styles.rowLabel}>
                  <Ionicons name="globe-outline" size={14} color={colors.primary} />
                  <Text variant="caption" style={{ fontWeight: '600' }}>
                    Web Sitesi
                  </Text>
                </View>
              )}
              <Pressable onPress={() => removeAt(index)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            {draft.kind === 'website' ? (
              <>
                <Input
                  label="Başlık (isteğe bağlı)"
                  value={draft.title}
                  onChangeText={(v) => updateDraft(index, { title: v })}
                  placeholder="Örn: Kişisel Blog"
                  maxLength={80}
                />
                <Input
                  label="Bağlantı"
                  value={draft.url}
                  onChangeText={(v) => updateDraft(index, { url: v })}
                  placeholder="ornek.com"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </>
            ) : platformDef ? (
              <SocialLinkFields
                draft={draft}
                platformDef={platformDef}
                onChange={(patch) => updateDraft(index, patch)}
              />
            ) : null}
          </View>
        );
      })}

      {addingSocial ? (
        <View style={[styles.addPanel, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
          <Text variant="label">Sosyal medya ekle</Text>
          <View style={styles.platformGrid}>
            {availablePlatforms.map((platform) => {
              const selected = newSocialPlatform === platform.id;
              return (
                <Pressable
                  key={platform.id}
                  onPress={() => setNewSocialPlatform(platform.id)}
                  style={[
                    styles.platformChip,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? `${colors.primary}14` : 'transparent',
                    },
                  ]}
                >
                  <ProfileLinkPlatformIcon platform={platform.id} size={14} />
                  <Text variant="caption" numberOfLines={1} style={{ maxWidth: 72 }}>
                    {platform.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {newPlatformDef ? (
            newSocialUseCustomUrl ? (
              <Input
                label="Özel URL"
                value={newSocialUrl}
                onChangeText={setNewSocialUrl}
                placeholder="https://..."
                autoCapitalize="none"
                keyboardType="url"
              />
            ) : (
              <Input
                label="Kullanıcı adı"
                value={newSocialUsername}
                onChangeText={(v) => {
                  if (isLikelyCustomSocialUrl(v)) {
                    setNewSocialUseCustomUrl(true);
                    setNewSocialUrl(v);
                    setNewSocialUsername('');
                    return;
                  }
                  setNewSocialUsername(v);
                }}
                placeholder={newPlatformDef.usernamePlaceholder}
                autoCapitalize="none"
                autoCorrect={false}
              />
            )
          ) : null}

          {newPlatformDef ? (
            <View style={styles.switchRow}>
              <View style={styles.switchMeta}>
                <Text variant="label">Özel URL kullan</Text>
                <Text secondary variant="caption">
                  Kullanıcı adı yerine doğrudan bağlantı
                </Text>
              </View>
              <Switch
                value={newSocialUseCustomUrl}
                onValueChange={setNewSocialUseCustomUrl}
                trackColor={{ true: colors.primary }}
              />
            </View>
          ) : null}

          <View style={styles.addActions}>
            <Pressable onPress={resetNewSocial}>
              <Text variant="caption" style={{ color: colors.textSecondary, fontWeight: '600' }}>
                İptal
              </Text>
            </Pressable>
            <Pressable onPress={addSocial}>
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                Ekle
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {addingWebsite ? (
        <View style={[styles.addPanel, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
          <Text variant="label">Web sitesi ekle</Text>
          <Input
            label="Başlık (isteğe bağlı)"
            value={newWebsiteTitle}
            onChangeText={setNewWebsiteTitle}
            placeholder="Örn: Portfolyo"
            maxLength={80}
          />
          <Input
            label="Bağlantı"
            value={newWebsiteUrl}
            onChangeText={setNewWebsiteUrl}
            placeholder="ornek.com"
            autoCapitalize="none"
            keyboardType="url"
          />
          <View style={styles.addActions}>
            <Pressable onPress={() => setAddingWebsite(false)}>
              <Text variant="caption" style={{ color: colors.textSecondary, fontWeight: '600' }}>
                İptal
              </Text>
            </Pressable>
            <Pressable onPress={addWebsite}>
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                Ekle
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.addButtons}>
        {socialDrafts.length < MAX_PROFILE_SOCIAL_LINKS && availablePlatforms.length > 0 && !addingSocial ? (
          <Pressable
            onPress={() => setAddingSocial(true)}
            style={[styles.addBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="logo-instagram" size={16} color={colors.primary} />
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
              Sosyal medya ekle
            </Text>
          </Pressable>
        ) : null}
        {websiteDrafts.length < MAX_PROFILE_WEBSITE_LINKS && !addingWebsite ? (
          <Pressable
            onPress={() => setAddingWebsite(true)}
            style={[styles.addBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="globe-outline" size={16} color={colors.primary} />
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
              Web sitesi ekle
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  row: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  socialFields: { gap: spacing.sm },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchMeta: { flex: 1, gap: 2 },
  addPanel: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  addActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  addButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
