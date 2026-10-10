import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { PhoneShell } from '@/components/phone-shell';
import { resolveWebAccess } from '@/lib/access-review';
import { requireProfile } from '@/lib/session';
import { createSessionClient } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Vora',
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await requireProfile();
  const supabase = await createSessionClient();
  if (supabase) {
    const access = await resolveWebAccess(supabase, user.id);
    const path = (await headers()).get('x-vora-path') ?? '';
    if (access.action === 'end') {
      await supabase.auth.signOut();
      redirect(`/login?access=${access.scenario}`);
    }
    if (access.action === 'keep' && path !== '/app/account-access') {
      redirect('/app/account-access');
    }
  }
  const name = profile?.full_name || profile?.username || user.email || 'Hesabım';
  return <PhoneShell name={name}>{children}</PhoneShell>;
}
