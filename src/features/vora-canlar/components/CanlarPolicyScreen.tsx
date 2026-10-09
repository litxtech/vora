import { Text } from '@/components/ui/Text';
import { CanlarCard, CanlarScaffold } from '@/features/vora-canlar/components/CanlarScaffold';
import { CANLAR_POLICY_VERSION } from '@/features/vora-canlar/constants';
import { LEGAL_DOCUMENTS } from '@/constants/legal';

export function CanlarPolicyScreen() {
  const doc = LEGAL_DOCUMENTS.canlar_aid;
  return (
    <CanlarScaffold title={doc.title}>
      <Text secondary>Sürüm {CANLAR_POLICY_VERSION}. {doc.summary}</Text>
      {doc.sections.map((section) => (
        <CanlarCard key={section.heading}>
          <Text style={{ fontWeight: '700' }}>{section.heading}</Text>
          <Text>{section.body}</Text>
        </CanlarCard>
      ))}
    </CanlarScaffold>
  );
}
