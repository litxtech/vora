import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth-forms';

export const metadata: Metadata = {
  title: 'Kayıt ol',
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <section className="block">
      <div className="wrap auth-wrap">
        <RegisterForm />
      </div>
    </section>
  );
}
