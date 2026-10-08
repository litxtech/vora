'use server';

import { redirect } from 'next/navigation';
import { createSessionClient } from '@/lib/supabase';
import { siteUrl } from '@/lib/site';

export type AuthState = { error: string | null; message: string | null };

const BAD_LOGIN = 'E-posta, kullanıcı adı veya şifre hatalı.';

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '').trim();
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const identifier = field(formData, 'identifier');
  const password = String(formData.get('password') ?? '');
  if (!identifier) return { error: 'E-posta veya kullanıcı adı gerekli.', message: null };
  if (!password) return { error: 'Şifre gerekli.', message: null };

  const supabase = await createSessionClient();
  if (!supabase) return { error: 'Bağlantı kurulamadı. Biraz sonra tekrar dene.', message: null };

  let email = identifier.toLowerCase();
  if (!identifier.includes('@')) {
    const username = identifier.toLowerCase().replace(/^@/, '');
    const { data, error } = await supabase.rpc('resolve_login_email', { p_username: username });
    if (error || !data) return { error: BAD_LOGIN, message: null };
    email = String(data).toLowerCase();
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: BAD_LOGIN, message: null };
  redirect('/app');
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const firstName = field(formData, 'first_name');
  const lastName = field(formData, 'last_name');
  const username = field(formData, 'username').toLowerCase().replace(/^@/, '');
  const email = field(formData, 'email').toLowerCase();
  const password = String(formData.get('password') ?? '');
  const birthDate = field(formData, 'birth_date');
  const accountType = field(formData, 'account_type') === 'business' ? 'business' : 'personal';
  const businessName = field(formData, 'business_name');
  const accepted = formData.get('accept') === 'on';

  if (!firstName || !lastName) return { error: 'Ad ve soyad gerekli.', message: null };
  if (!/^[a-z0-9_.-]{4,30}$/.test(username)) {
    return { error: 'Kullanıcı adı 4-30 karakter olmalı; harf, rakam, alt çizgi, nokta ve tire kullanılabilir.', message: null };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Geçerli bir e-posta gir.', message: null };
  if (password.length < 8) return { error: 'Şifre en az 8 karakter olmalı.', message: null };
  if (birthDate) {
    const born = new Date(birthDate);
    if (Number.isNaN(born.getTime())) return { error: 'Doğum tarihi geçersiz.', message: null };
    const today = new Date();
    let age = today.getFullYear() - born.getFullYear();
    const month = today.getMonth() - born.getMonth();
    if (month < 0 || (month === 0 && today.getDate() < born.getDate())) age -= 1;
    if (age < 18) return { error: 'Vora 18 yaş ve üzeri içindir.', message: null };
  }
  if (!accepted) return { error: 'Devam etmek için 18 yaşında olduğunu ve koşulları kabul etmelisin.', message: null };
  if (accountType === 'business' && businessName.length < 2) {
    return { error: 'İşletme hesabı için işletme adı gerekli.', message: null };
  }

  const supabase = await createSessionClient();
  if (!supabase) return { error: 'Bağlantı kurulamadı. Biraz sonra tekrar dene.', message: null };

  const { data: taken } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();
  if (taken) return { error: 'Bu kullanıcı adı kullanılıyor.', message: null };

  const now = new Date().toISOString();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/app`,
      data: {
        username,
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        birth_date: birthDate || null,
        account_type: accountType,
        ...(accountType === 'business' ? { business_name: businessName } : {}),
        policy_consents: {
          terms_accepted_at: now,
          privacy_accepted_at: now,
          child_protection_accepted_at: now,
          age_confirmed_at: now,
        },
      },
    },
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes('already')) {
      return { error: 'Bu e-posta zaten kayıtlı. Giriş yap veya şifreni sıfırla.', message: null };
    }
    return { error: 'Kayıt tamamlanamadı. Bilgileri kontrol edip tekrar dene.', message: null };
  }

  if (data.session) redirect('/app');
  return {
    error: null,
    message: 'Hesabın açıldı. E-postandaki doğrulama bağlantısına tıkla, sonra giriş yap.',
  };
}

export async function forgotPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = field(formData, 'email').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Geçerli bir e-posta gir.', message: null };
  const supabase = await createSessionClient();
  if (!supabase) return { error: 'Bağlantı kurulamadı. Biraz sonra tekrar dene.', message: null };
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });
  if (error) return { error: 'Sıfırlama e-postası gönderilemedi. Biraz sonra tekrar dene.', message: null };
  redirect(`/reset-password?email=${encodeURIComponent(email)}`);
}

export async function verifyResetCodeAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = field(formData, 'email').toLowerCase();
  const code = field(formData, 'code');
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('password_confirm') ?? '');
  if (!email || code.length < 6) return { error: 'E-posta ve 6 haneli kod gerekli.', message: null };
  if (password.length < 8) return { error: 'Yeni şifre en az 8 karakter olmalı.', message: null };
  if (password !== confirm) return { error: 'Şifreler eşleşmiyor.', message: null };

  const supabase = await createSessionClient();
  if (!supabase) return { error: 'Bağlantı kurulamadı.', message: null };
  const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
  if (verifyError) return { error: 'Kod geçersiz veya süresi dolmuş.', message: null };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: 'Şifre güncellenemedi. Tekrar dene.', message: null };
  redirect('/login?reset=1');
}

export async function updatePasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('password_confirm') ?? '');
  if (password.length < 8) return { error: 'Yeni şifre en az 8 karakter olmalı.', message: null };
  if (password !== confirm) return { error: 'Şifreler eşleşmiyor.', message: null };
  const supabase = await createSessionClient();
  if (!supabase) return { error: 'Bağlantı kurulamadı.', message: null };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: 'Sıfırlama bağlantısının süresi dolmuş. E-postayı yeniden iste.', message: null };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: 'Şifre güncellenemedi. Tekrar dene.', message: null };
  redirect('/app');
}

export async function sendLoginCodeAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = field(formData, 'email').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Geçerli bir e-posta gir.', message: null };
  const supabase = await createSessionClient();
  if (!supabase) return { error: 'Bağlantı kurulamadı.', message: null };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=/app` },
  });
  if (error) return { error: 'Kod gönderilemedi. Biraz sonra tekrar dene.', message: null };
  return { error: null, message: 'Kod e-postana gönderildi. Aşağıya yaz veya bağlantıya tıkla.' };
}

export async function verifyLoginCodeAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = field(formData, 'email').toLowerCase();
  const code = field(formData, 'code');
  if (!email || code.length < 6) return { error: 'E-posta ve kod gerekli.', message: null };
  const supabase = await createSessionClient();
  if (!supabase) return { error: 'Bağlantı kurulamadı.', message: null };
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) return { error: 'Kod geçersiz veya süresi dolmuş.', message: null };
  redirect('/app');
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSessionClient();
  if (supabase) await supabase.auth.signOut();
  redirect('/');
}
