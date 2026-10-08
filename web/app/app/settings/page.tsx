import Link from 'next/link';
import { logoutAction } from '@/lib/auth-actions';

const LINKS = [
  { href: '/app/profile', label: 'Profili düzenle' },
  { href: '/forgot-password', label: 'Şifreyi sıfırla' },
  { href: '/privacy', label: 'Gizlilik' },
  { href: '/terms', label: 'Kullanım koşulları' },
  { href: '/account-deletion', label: 'Hesabı sil' },
  { href: '/help', label: 'Yardım' },
  { href: '/contact', label: 'İletişim' },
];

export default function SettingsPage() {
  return (
    <>
      <h1>Ayarlar</h1>
      <ul className="settings-list">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
      <form action={logoutAction}>
        <button className="btn" type="submit">
          Çıkış yap
        </button>
      </form>
    </>
  );
}
