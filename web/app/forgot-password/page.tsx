import type { Metadata } from 'next';
import { ForgotForm } from '@/components/auth-forms';

export const metadata: Metadata = {
  title: 'Şifremi unuttum',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <section className="block">
      <div className="wrap auth-wrap">
        <ForgotForm />
      </div>
    </section>
  );
}
