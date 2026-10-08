import { AiWriter } from '@/components/blog-studio/AiWriter';
import { requireAdmin } from '@/lib/admin-auth';
import { CITIES } from '@/lib/cities';

export default async function StudioWritePage() {
  const supabase = await requireAdmin();
  const { data } = await supabase.from('web_blog_categories').select('id, name').order('name');
  return (
    <AiWriter
      cities={CITIES.map((city) => ({ id: city.id, name: city.name }))}
      categories={(data ?? []).map((item) => ({ id: String(item.id), name: String(item.name) }))}
    />
  );
}
