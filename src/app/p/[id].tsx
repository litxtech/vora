import { Redirect, useLocalSearchParams } from 'expo-router';

export default function PostShareLinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href={`/detail/posts/${id}`} />;
}
