'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import {
  forgotPasswordAction,
  loginAction,
  registerAction,
  sendLoginCodeAction,
  updatePasswordAction,
  verifyLoginCodeAction,
  verifyResetCodeAction,
  type AuthState,
} from '@/lib/auth-actions';

const initial: AuthState = { error: null, message: null };

function Note({ state }: { state: AuthState }) {
  return (
    <>
      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.message ? <p className="form-ok">{state.message}</p> : null}
    </>
  );
}

export function LoginForm({ reset }: { reset?: boolean }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <form className="stack auth-card" action={action}>
      <h1>Giriş yap</h1>
      <p className="muted">E-posta veya kullanıcı adınla devam et. Hesap, mobil uygulamadaki hesabınla aynıdır.</p>
      {reset ? <p className="form-ok">Şifren güncellendi. Yeni şifrenle giriş yap.</p> : null}
      <label htmlFor="identifier">E-posta veya kullanıcı adı</label>
      <input id="identifier" name="identifier" autoComplete="username" required />
      <label htmlFor="password">Şifre</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required />
      <Note state={state} />
      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Giriş yapılıyor…' : 'Giriş yap'}
      </button>
      <p className="auth-links">
        <Link href="/forgot-password">Şifremi unuttum</Link>
        <Link href="/login/code">Kod ile giriş</Link>
        <Link href="/register">Hesabın yok mu? Kayıt ol</Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initial);
  return (
    <form className="stack auth-card" action={action}>
      <h1>Kayıt ol</h1>
      <p className="muted">18 yaş ve üzeri. Oluşan hesap uygulamada da geçerlidir.</p>
      <div className="choice-row">
        <label><input type="radio" name="account_type" value="personal" defaultChecked /> Bireysel</label>
        <label><input type="radio" name="account_type" value="business" /> İşletme</label>
      </div>
      <label htmlFor="first_name">Ad</label>
      <input id="first_name" name="first_name" autoComplete="given-name" required />
      <label htmlFor="last_name">Soyad</label>
      <input id="last_name" name="last_name" autoComplete="family-name" required />
      <label htmlFor="username">Kullanıcı adı</label>
      <input id="username" name="username" autoComplete="username" required minLength={4} maxLength={30} />
      <label htmlFor="email">E-posta</label>
      <input id="email" name="email" type="email" autoComplete="email" required />
      <label htmlFor="password">Şifre</label>
      <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      <label htmlFor="birth_date">Doğum tarihi</label>
      <input id="birth_date" name="birth_date" type="date" />
      <label htmlFor="business_name">İşletme adı</label>
      <input id="business_name" name="business_name" placeholder="Yalnızca işletme hesabında" />
      <label className="check-line">
        <input name="accept" type="checkbox" required />
        <span>18 yaşından büyüğüm. <Link href="/terms">Koşulları</Link>, <Link href="/privacy">gizlilik politikasını</Link> ve <Link href="/child-safety">çocuk güvenliği</Link> kurallarını kabul ediyorum.</span>
      </label>
      <Note state={state} />
      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Kaydediliyor…' : 'Hesap aç'}
      </button>
      <p className="auth-links">
        <Link href="/login">Zaten hesabın var mı? Giriş yap</Link>
      </p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initial);
  return (
    <form className="stack auth-card" action={action}>
      <h1>Şifremi unuttum</h1>
      <p className="muted">Kayıtlı e-postana sıfırlama bağlantısı ve kod gönderilir.</p>
      <label htmlFor="email">E-posta</label>
      <input id="email" name="email" type="email" autoComplete="email" required />
      <Note state={state} />
      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Gönderiliyor…' : 'Sıfırlama gönder'}
      </button>
      <p className="auth-links">
        <Link href="/login">Girişe dön</Link>
      </p>
    </form>
  );
}

export function ResetCodeForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(verifyResetCodeAction, initial);
  return (
    <form className="stack auth-card" action={action}>
      <h1>Yeni şifre</h1>
      <p className="muted">E-postadaki 6 haneli kodu ve yeni şifreni gir. Bağlantıya tıkladıysan kod gerekmez.</p>
      <input type="hidden" name="email" value={email} />
      <label htmlFor="code">Doğrulama kodu</label>
      <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required />
      <label htmlFor="password">Yeni şifre</label>
      <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      <label htmlFor="password_confirm">Yeni şifre tekrar</label>
      <input id="password_confirm" name="password_confirm" type="password" autoComplete="new-password" required minLength={8} />
      <Note state={state} />
      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Kaydediliyor…' : 'Şifreyi güncelle'}
      </button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, initial);
  return (
    <form className="stack auth-card" action={action}>
      <h1>Yeni şifre belirle</h1>
      <label htmlFor="password">Yeni şifre</label>
      <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      <label htmlFor="password_confirm">Yeni şifre tekrar</label>
      <input id="password_confirm" name="password_confirm" type="password" autoComplete="new-password" required minLength={8} />
      <Note state={state} />
      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Kaydediliyor…' : 'Şifreyi kaydet'}
      </button>
    </form>
  );
}

export function LoginCodeForm() {
  const [sendState, sendAction, sending] = useActionState(sendLoginCodeAction, initial);
  const [verifyState, verifyAction, verifying] = useActionState(verifyLoginCodeAction, initial);
  return (
    <div className="stack auth-card">
      <h1>Kod ile giriş</h1>
      <p className="muted">E-postana tek kullanımlık kod gider.</p>
      <form className="stack" action={sendAction}>
        <label htmlFor="email">E-posta</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <Note state={sendState} />
        <button className="btn ghost" type="submit" disabled={sending}>
          {sending ? 'Gönderiliyor…' : 'Kod gönder'}
        </button>
      </form>
      <form className="stack" action={verifyAction}>
        <label htmlFor="verify-email">E-posta</label>
        <input id="verify-email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="code">Kod</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required />
        <Note state={verifyState} />
        <button className="btn" type="submit" disabled={verifying}>
          {verifying ? 'Doğrulanıyor…' : 'Giriş yap'}
        </button>
      </form>
      <p className="auth-links">
        <Link href="/login">Şifre ile giriş</Link>
      </p>
    </div>
  );
}
