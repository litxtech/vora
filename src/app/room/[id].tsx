import { ActivityIndicator, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ComponentType } from 'react';

type RoomScreenProps = { roomId: string };

export default function RoomRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [RoomScreen, setRoomScreen] = useState<ComponentType<RoomScreenProps> | null>(null);

  useEffect(() => {
    void import('@/features/city-voice/components/JointCityRoomScreen').then((mod) => {
      setRoomScreen(() => mod.JointCityRoomScreen);
    });
  }, []);

  if (!id || typeof id !== 'string') return <Redirect href="/(tabs)/discover" />;

  if (!RoomScreen) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <RoomScreen roomId={id} />;
}
