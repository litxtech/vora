import { CanlarProfileBody } from '@/features/vora-canlar/components/CanlarProfileSheet';
import { CanlarScaffold } from '@/features/vora-canlar/components/CanlarScaffold';

export function CanlarProfileScreen() {
  return (
    <CanlarScaffold title="Profilim">
      <CanlarProfileBody />
    </CanlarScaffold>
  );
}
