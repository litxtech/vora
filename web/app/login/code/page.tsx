import type { Metadata } from 'next';
import { LoginCodeForm } from '@/components/auth-forms';

export const metadata: Metadata = {
  title: 'Kod ile giriş',
  robots: { index: false, follow: false },
};

export default function LoginCodePage() {
  return (
    <section className="block">
      <div className="wrap auth-wrap">
        <LoginCodeForm />
      </div>
    </section>
  );
}
