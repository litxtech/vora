'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';
import { createSessionClient } from '@/lib/supabase';

export async function signInAdmin(formData: FormData) {
  const supabase = await createSessionClient();
  if (!supabase) throw new Error('Supabase yapılandırılmadı.');
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect('/admin/login?error=1');
  redirect('/admin');
}

export async function signOutAdmin() {
  const supabase = await createSessionClient();
  if (supabase) await supabase.auth.signOut();
  redirect('/admin/login');
}

export async function sendContact(formData: FormData) {
  if (String(formData.get('company') ?? '').trim()) return;
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  if (name.length < 2 || !email.includes('@') || message.length < 10) {
    redirect('/contact?error=1');
  }
  const supabase = await createSessionClient();
  if (!supabase) redirect('/contact?error=1');
  const { error } = await supabase.from('web_contact_messages').insert({ name, email, message });
  if (error) redirect('/contact?error=1');
  redirect('/contact?sent=1');
}

function jsonField(raw: string): unknown[] {
  const text = raw.trim();
  if (!text) return [];
  const parsed = JSON.parse(text) as unknown;
  return Array.isArray(parsed) ? parsed : [];
}

export async function saveBlogPost(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const faqsRaw = String(formData.get('faqs') ?? '');
  const linksRaw = String(formData.get('internal_links') ?? '');
  const galleryRaw = String(formData.get('gallery') ?? '');
  let faqs: unknown[] = [];
  let internal_links: unknown[] = [];
  let gallery: unknown[] = [];
  try {
    faqs = jsonField(faqsRaw);
    internal_links = jsonField(linksRaw);
    gallery = jsonField(galleryRaw);
  } catch {
    redirect(`/admin/blog/${id || 'new'}?error=json`);
  }
  const status = String(formData.get('status') ?? 'draft');
  const payload = {
    slug: String(formData.get('slug') ?? '').trim(),
    language: String(formData.get('language') ?? 'tr'),
    title: String(formData.get('title') ?? '').trim(),
    excerpt: String(formData.get('excerpt') ?? ''),
    content: String(formData.get('content') ?? ''),
    cover_image_url: String(formData.get('cover_image_url') ?? '') || null,
    cover_image_alt: String(formData.get('cover_image_alt') ?? '') || null,
    gallery,
    video_url: String(formData.get('video_url') ?? '') || null,
    author_name: String(formData.get('author_name') ?? 'Vora'),
    city_slug: String(formData.get('city_slug') ?? '') || null,
    tags: String(formData.get('tags') ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    status,
    seo_title: String(formData.get('seo_title') ?? '') || null,
    seo_description: String(formData.get('seo_description') ?? '') || null,
    og_title: String(formData.get('og_title') ?? '') || null,
    og_description: String(formData.get('og_description') ?? '') || null,
    og_image_url: String(formData.get('og_image_url') ?? '') || null,
    faqs,
    internal_links,
    published_at: status === 'published' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  if (id && id !== 'new') {
    const { error } = await supabase.from('web_blog_posts').update(payload).eq('id', id);
    if (error) redirect(`/admin/blog/${id}?error=1`);
    revalidatePath(`/blog/${payload.slug}`);
    redirect(`/admin/blog/${id}`);
  }
  const { data, error } = await supabase.from('web_blog_posts').insert(payload).select('id').single();
  if (error || !data) redirect('/admin/blog/new?error=1');
  revalidatePath('/blog');
  redirect(`/admin/blog/${data.id}`);
}

export async function saveRedirect(formData: FormData) {
  const supabase = await requireAdmin();
  const from_path = String(formData.get('from_path') ?? '').trim();
  const to_path = String(formData.get('to_path') ?? '').trim();
  const { error } = await supabase.from('web_redirects').insert({ from_path, to_path, status_code: 301 });
  if (error) redirect('/admin/redirects?error=1');
  redirect('/admin/redirects');
}

export async function savePage(formData: FormData) {
  const supabase = await requireAdmin();
  const slug = String(formData.get('slug') ?? '').trim();
  const locked = ['privacy', 'terms', 'child-safety', 'community-rules', 'account-deletion'];
  if (locked.includes(slug)) redirect('/admin?error=locked');
  const { error } = await supabase.from('web_pages').upsert({
    slug,
    title: String(formData.get('title') ?? ''),
    content_md: String(formData.get('content_md') ?? ''),
    status: String(formData.get('status') ?? 'draft'),
    updated_at: new Date().toISOString(),
  });
  if (error) redirect('/admin?error=1');
  redirect('/admin');
}
