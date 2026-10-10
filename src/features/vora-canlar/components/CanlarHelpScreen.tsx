import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { CanlarScaffold } from '@/features/vora-canlar/components/CanlarScaffold';
import { CANLAR_ACCENT } from '@/features/vora-canlar/constants';
import { radius, spacing } from '@/constants/theme';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useTheme } from '@/providers/ThemeProvider';

const ACTIONS: {
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  auth: string | null;
  tone: string;
}[] = [
  {
    title: 'Bağış kampanyaları',
    body: 'Açık kampanyaya bağış yap.',
    icon: 'heart',
    href: '/vora-canlar/campaigns',
    auth: null,
    tone: CANLAR_ACCENT,
  },
];

export function CanlarHelpScreen() {
  const { colors } = useTheme();
  const { requireAuth } = useRequireAuth();

  return (
    <CanlarScaffold title="Yardım Et">
      <Text secondary>Açık bağışlara yardım et.</Text>
      {ACTIONS.map((action) => (
        <Pressable
          key={action.href}
          accessibilityRole="button"
          onPress={async () => {
            if (action.auth) {
              const allowed = await requireAuth(action.auth);
              if (!allowed) return;
            }
            router.push(action.href as never);
          }}
          style={({ pressed }) => ({
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            borderRadius: 22,
            padding: spacing.md,
            flexDirection: 'row',
            gap: spacing.md,
            alignItems: 'center',
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <View style={{ width: 56, height: 56, borderRadius: radius.lg, backgroundColor: `${action.tone}18`, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={action.icon} size={26} color={action.tone} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontWeight: '800', fontSize: 17 }}>{action.title}</Text>
            <Text secondary>{action.body}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ))}
    </CanlarScaffold>
  );
}
