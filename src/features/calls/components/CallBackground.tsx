import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';

type CallBackgroundProps = ViewProps & {
  children: React.ReactNode;
};

export function CallBackground({ children, style, ...props }: CallBackgroundProps) {
  return (
    <View style={[styles.root, style]} {...props}>
      <LinearGradient
        colors={['#0B1220', '#141C2B', '#1A2236', '#0A0E14']}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0E14',
  },
  content: {
    flex: 1,
  },
});
