import { useEffect, useState } from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { DetailLoadingShell } from '@/components/ui/DetailLoadingShell';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { JobSeekerPublicView } from '@/features/job-seekers/components/JobSeekerPublicView';
import {
  fetchPublicJobSeekerProfile,
  type PublicJobSeekerProfile,
} from '@/features/job-seekers/services/seekerData';
import { getOrCreateDirectConversation } from '@/features/messaging/services/conversationData';
import { openChat } from '@/features/messaging/services/messagingNavigation';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export function JobSeekerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [profile, setProfile] = useState<PublicJobSeekerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchPublicJobSeekerProfile(id)
      .then((data) => {
        if (!data) setError('Profil bulunamadı.');
        else setProfile(data);
      })
      .catch(() => setError('Profil yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleMessage = async () => {
    if (!profile || !(await requireAuth('Mesaj'))) return;

    const { conversationId, error: convError } = await getOrCreateDirectConversation(profile.userId);
    if (convError) {
      Alert.alert('Hata', convError);
      return;
    }
    if (conversationId) openChat(conversationId);
  };

  const handleEdit = () => {
    router.push('/settings/job-seeker' as never);
  };

  if (loading) {
    return <DetailLoadingShell gradient />;
  }

  if (error || !profile) {
    return (
      <GradientBackground>
        <AuthHeader title="İş Arayan Profili" showBack />
        <View style={styles.center}>
          <Text secondary>{error ?? 'Profil bulunamadı.'}</Text>
        </View>
      </GradientBackground>
    );
  }

  const isOwnProfile = user?.id === profile.userId;

  return (
    <GradientBackground>
      <AuthHeader title="İş Arayan Profili" showBack />
      <JobSeekerPublicView
        profile={profile}
        isOwnProfile={isOwnProfile}
        onMessage={isOwnProfile ? undefined : handleMessage}
        onEdit={isOwnProfile ? handleEdit : undefined}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
});
