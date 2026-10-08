import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';

async function saveSettings(formData: FormData) {
  'use server';
  const supabase = await requireAdmin();
  const { data: profile } = await supabase.auth.getUser();
  const role = profile.user
    ? (await supabase.from('profiles').select('role').eq('id', profile.user.id).single()).data?.role
    : null;
  if (role !== 'super_admin') return;
  await supabase.from('web_blog_settings').upsert({
    id: 1,
    brand_voice: String(formData.get('brand_voice') ?? ''),
    seo_rules: String(formData.get('seo_rules') ?? ''),
    daily_limit: Number(formData.get('daily_limit') ?? 40),
    updated_at: new Date().toISOString(),
  });
  revalidatePath('/admin/studio/settings');
}

export default async function StudioSettingsPage() {
  const supabase = await requireAdmin();
  const { data: user } = await supabase.auth.getUser();
  const role = user.user ? (await supabase.from('profiles').select('role').eq('id', user.user.id).single()).data?.role : null;
  const { data } = await supabase.from('web_blog_settings').select('brand_voice, seo_rules, daily_limit').eq('id', 1).maybeSingle();
  return (
    <section>
      <h1>AI Settings</h1>
      {role === 'super_admin' ? (
        <form action={saveSettings} className="stack">
          <label htmlFor="brand_voice">Brand voice</label>
          <textarea id="brand_voice" name="brand_voice" defaultValue={data?.brand_voice ?? ''} />
          <label htmlFor="seo_rules">SEO kuralları</label>
          <textarea id="seo_rules" name="seo_rules" defaultValue={data?.seo_rules ?? ''} />
          <label htmlFor="daily_limit">Günlük üretim sınırı</label>
          <input id="daily_limit" name="daily_limit" type="number" min={1} max={200} defaultValue={data?.daily_limit ?? 40} />
          <button className="btn" type="submit">Kaydet</button>
        </form>
      ) : (
        <p>Ses ve sınır ayarlarını yalnızca super admin değiştirir.</p>
      )}
    </section>
  );
}
