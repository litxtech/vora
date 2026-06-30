import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SensitiveContentOverlay } from '@/features/moderation/components/SensitiveContentOverlay';
import { useSafetyPreferences } from '@/features/moderation/hooks/useSafetyPreferences';

type SensitiveMediaWrapperProps = {
  isSensitive: boolean;
  children: ReactNode;
};

export function SensitiveMediaWrapper({ isSensitive, children }: SensitiveMediaWrapperProps) {
  const prefs = useSafetyPreferences();
  const [revealed, setRevealed] = useState(false);

  if (!isSensitive || prefs.show_sensitive_content || revealed) {
    return <>{children}</>;
  }

  return (
    <View style={styles.wrap}>
      <View style={prefs.blur_sensitive_content ? styles.blurred : undefined}>{children}</View>
      <SensitiveContentOverlay
        onReveal={() => setRevealed(true)}
        blurred={prefs.blur_sensitive_content}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', overflow: 'hidden' },
  blurred: { opacity: 0.15 },
});
