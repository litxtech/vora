import type { Metadata } from 'next';
import { NewPasswordForm, ResetCodeForm } from '@/components/auth-forms';
import { currentUser } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Şifre sıfırla',
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  const user = await currentUser();
  return (
    <section className="block">
      <div className="wrap auth-wrap">
        {user ? <NewPasswordForm /> : <ResetCodeForm email={email ?? ''} />}
      </div>
    </section>
  );
}
