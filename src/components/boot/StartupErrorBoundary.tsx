import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { devError } from '@/lib/safeLog';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

const BG = '#0A0E14';
const TEXT = '#F4F7FB';
const MUTED = '#9AA8BC';
const ACCENT = '#EF5350';

export class StartupErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    devError('StartupErrorBoundary', 'uncaught render error', error);
    if (__DEV__) {
      console.error('[StartupErrorBoundary]', info.componentStack);
    }
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <View style={styles.root}>
        <Text style={styles.title}>Uygulama başlatılamadı</Text>
        <Text style={styles.body}>
          {__DEV__
            ? this.state.error.message
            : 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'}
        </Text>
        <Pressable style={styles.button} onPress={this.reset}>
          <Text style={styles.buttonText}>Tekrar dene</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    color: ACCENT,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1E88E5',
  },
  buttonText: {
    color: TEXT,
    fontWeight: '600',
  },
});
