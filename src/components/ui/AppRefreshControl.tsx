import { RefreshControl, type RefreshControlProps } from 'react-native';
import { resolveListRefreshIndicatorVisible } from '@/lib/ui/listRefresh';

type AppRefreshControlProps = Omit<RefreshControlProps, 'refreshing'> & {
  refreshing: boolean;
};

/** Android'de yenileme simülasyonu yok; iOS'ta standart spinner. */
export function AppRefreshControl({ refreshing, tintColor, colors, ...props }: AppRefreshControlProps) {
  const visible = resolveListRefreshIndicatorVisible(refreshing);

  return (
    <RefreshControl
      refreshing={visible}
      tintColor={tintColor}
      colors={visible ? colors : ['transparent']}
      progressBackgroundColor={visible ? undefined : 'transparent'}
      {...props}
    />
  );
}
