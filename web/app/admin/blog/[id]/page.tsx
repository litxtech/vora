import { notFound } from 'next/navigation';
import { AiWriter } from '@/components/blog-studio/AiWriter';
import { StudioEditor } from '@/components/blog-studio/StudioEditor';
import { requireAdmin } from '@/lib/admin-auth';
import { rowToDraft } from '@/lib/blog/map';
import { CITIES } from '@/lib/cities';
import { editorialPaths } from '@/lib/seo/routes';

type Params = { id: string };

export default async function BlogEditorPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ manual?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await requireAdmin();
  const { data: profile } = await supabase.auth.getUser();
  const { data: me } = profile.user
    ? await supabase.from('profiles').select('full_name, username').eq('id', profile.user.id).maybeSingle()
    : { data: null };
  const author = me?.full_name || me?.username || 'Vora';
  const { data: categories } = await supabase.from('web_blog_categories').select('id, name, slug').order('name');
  const choices = (categories ?? []).map((item) => ({ id: String(item.id), name: String(item.name) }));
  const cities = CITIES.map((city) => ({ id: city.id, name: city.name }));
  if (id === 'new' && query.manual !== '1') {
    return <AiWriter cities={cities} categories={choices} />;
  }
  const existing = id === 'new' ? null : (await supabase.from('web_blog_posts').select('*').eq('id', id).maybeSingle()).data;
  if (id !== 'new' && !existing) notFound();
  const links = editorialPaths()
    .filter((path) => path.startsWith('/city/') || path.startsWith('/blog') || path.startsWith('/features'))
    .slice(0, 24)
    .map((href) => ({ href, label: href }));
  return <StudioEditor initial={rowToDraft((existing as Record<string, unknown> | null) ?? null, author)} categories={choices} cities={cities} links={links} />;
}
