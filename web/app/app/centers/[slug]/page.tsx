import Link from 'next/link';
import { notFound } from 'next/navigation';
import { centerBySlug } from '@/lib/mobile-centers';
import { requireProfile } from '@/lib/session';
import { createSessionClient } from '@/lib/supabase';

type Row = Record<string, string | number | null>;

export default async function CenterPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireProfile();
  const { slug } = await params;
  const center = centerBySlug(slug);
  if (!center) notFound();
  const supabase = await createSessionClient();
  let query = supabase!.from(center.table).select(center.columns).limit(40);
  if (center.status) query = query.eq(center.status.column, center.status.value);
  if (center.order) query = query.order(center.order, { ascending: true });
  const { data, error } = await query;
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <p className="crumbs">
        <Link href="/app/centers">Merkezler</Link>
        <span> / {center.title}</span>
      </p>
      <h1>{center.title}</h1>
      <p className="muted">{center.subtitle}</p>
      {error ? <p className="empty">Bu liste şu an açılamadı. Hesabınla tekrar dene.</p> : null}
      {!error && rows.length === 0 ? <p className="empty">Henüz kayıt yok.</p> : null}
      <div className="stack">
        {rows.map((row) => {
          const title = String(row[center.titleKey] ?? 'Kayıt');
          const detail = center.detailKey ? row[center.detailKey] : null;
          const route =
            center.slug === 'yolculuk' ? `${title} → ${detail ?? ''}` : detail != null && detail !== '' ? String(detail) : '';
          return (
            <article className="card" key={String(row.id)}>
              <h3>{center.slug === 'yolculuk' ? route : title}</h3>
              {center.slug !== 'yolculuk' && route ? <p className="meta">{route}</p> : null}
              {typeof row.description === 'string' && row.description ? <p>{row.description}</p> : null}
            </article>
          );
        })}
      </div>
    </>
  );
}
