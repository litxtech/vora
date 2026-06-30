import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type EditProfileHeroProps = {
  displayName: string;
  username: string;
  avatarUri: string | null;
  coverUri: string | null;
  isPremium: boolean;
  isVerified: boolean;
  isBusinessVerified?: boolean;
  isBusinessMode?: boolean;
  profileUsername: string;
  onPickCover: () => void;
  onRemoveCover: () => void;
  onAvatarMenu: () => void;
  onRemoveAvatar: () => void;
};

export function EditProfileHero({
  displayName,
  username,
  avatarUri,
  coverUri,
  isPremium,
  isVerified,
  isBusinessVerified = false,
  isBusinessMode = false,
  profileUsername,
  onPickCover,
  onRemoveCover,
  onAvatarMenu,
  onRemoveAvatar,
}: EditProfileHeroProps) {
  const { colors } = useTheme();

  const coverColors = isBusinessVerified
    ? (['#1A1508', '#2A2010', colors.surfaceElevated] as const)
    : isPremium
      ? (['#1A1508', '#2A2010', colors.surfaceElevated] as const)
      : ([`${colors.primary}55`, `${colors.primary}22`, colors.surfaceElevated] as const);

  return (
    <View style={styles.wrap}>
      <View style={styles.coverWrap}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.cover} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={coverColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cover}
          />
        )}

        <LinearGradient
          colors={['transparent', `${colors.background}EE`]}
          style={styles.coverFade}
          pointerEvents="none"
        />

        <View style={styles.coverActions} pointerEvents="box-none">
          {coverUri ? (
            <>
              <Pressable
                onPress={onPickCover}
                style={styles.photoBtn}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Ionicons name="crop-outline" size={13} color="#fff" />
                <Text variant="caption" style={styles.photoBtnText}>
                  Kırp / Değiştir
                </Text>
              </Pressable>
              <Pressable
                onPress={onRemoveCover}
                style={styles.photoBtn}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={13} color="#fff" />
                <Text variant="caption" style={styles.photoBtnText}>
                  Sil
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={onPickCover}
              style={styles.photoBtn}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Ionicons name="image-outline" size={13} color="#fff" />
              <Text variant="caption" style={styles.photoBtnText}>
                {isBusinessMode ? 'Kapak yükle' : 'Kapak ekle'}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.avatarOverlay} pointerEvents="box-none">
          <View style={styles.avatarRing} pointerEvents="auto">
            <ProfileAvatar
              username={profileUsername}
              avatarUrl={avatarUri}
              size={96}
              isPremium={isPremium}
              isVerified={isVerified}
              isBusinessVerified={isBusinessVerified}
              displayInitial={displayName}
              imageFit={isBusinessMode ? 'contain' : 'cover'}
              onPress={onAvatarMenu}
            />
            <Pressable
              onPress={onAvatarMenu}
              style={[styles.avatarEditBtn, { borderColor: colors.background }]}
              accessibilityRole="button"
              accessibilityLabel={isBusinessMode ? 'Logoyu kırp veya değiştir' : 'Profil fotoğrafını düzenle'}
              hitSlop={8}
            >
              <Ionicons name="camera" size={14} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.info}>
        <Text variant="h2" style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        <Text secondary variant="caption">
          @{username || profileUsername}
          {isBusinessMode ? ' · Kurumsal hesap' : ''}
        </Text>
        <View style={styles.avatarActions}>
          <Pressable onPress={onAvatarMenu} hitSlop={8}>
            <Text variant="caption" style={{ color: isBusinessMode ? '#FFB300' : colors.primary, fontWeight: '600' }}>
              {isBusinessMode ? 'Logoyu kırp / değiştir' : 'Fotoğrafı düzenle'}
            </Text>
          </Pressable>
          {avatarUri ? (
            <>
              <Text secondary variant="caption">
                ·
              </Text>
              <Pressable onPress={onRemoveAvatar} hitSlop={8}>
                <Text variant="caption" style={{ color: colors.textSecondary, fontWeight: '600' }}>
                  Kaldır
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  coverWrap: {
    position: 'relative',
    marginBottom: 48,
  },
  cover: {
    width: '100%',
    height: 160,
    borderRadius: radius.xl,
  },
  coverFade: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xl,
  },
  coverActions: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    zIndex: 10,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  photoBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: -48,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  avatarRing: {
    position: 'relative',
  },
  avatarEditBtn: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 2,
  },
  info: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  name: {
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  avatarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
