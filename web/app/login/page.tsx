import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth-forms';

export const metadata: Metadata = {
  title: 'Giriş yap',
  robots: { index: false, follow: false },
};

const ACCESS_MESSAGE: Record<string, string> = {
  banned: 'Hesabınız askıya alındı. Oturumunuz sonlandırıldı.',
  frozen: 'Hesabınız donduruldu. Oturumunuz sonlandırıldı.',
  deleted: 'Bu hesap silinmiştir. Oturumunuz sonlandırıldı.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; access?: string }>;
}) {
  const { reset, access } = await searchParams;
  return (
    <section className="block">
      <div className="wrap auth-wrap">
        <LoginForm reset={reset === '1'} accessMessage={access ? ACCESS_MESSAGE[access] : undefined} />
      </div>
    </section>
  );
}
