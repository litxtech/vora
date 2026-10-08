import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth-forms';

export const metadata: Metadata = {
  title: 'Giriş yap',
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const { reset } = await searchParams;
  return (
    <section className="block">
      <div className="wrap auth-wrap">
        <LoginForm reset={reset === '1'} />
      </div>
    </section>
  );
}
