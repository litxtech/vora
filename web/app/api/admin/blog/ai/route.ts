import { adminContext } from '@/lib/blog/admin';
import { isAiAction, runBlogAi } from '@/lib/blog/ai';
import { applyAiPatch, type ArticleDraft } from '@/lib/blog/studio';

const bursts = new Map<string, number[]>();

export async function POST(request: Request) {
  const admin = await adminContext();
  if (!admin) return Response.json({ error: 'Yetkisiz.' }, { status: 401 });
  const now = Date.now();
  const recent = (bursts.get(admin.userId) ?? []).filter((stamp) => now - stamp < 60_000);
  if (recent.length >= 8) return Response.json({ error: 'Çok fazla istek. Bir dakika bekleyin.' }, { status: 429 });
  recent.push(now);
  bursts.set(admin.userId, recent);

  const body = (await request.json().catch(() => null)) as {
    action?: string;
    topic?: string;
    language?: string;
    tone?: string;
    audience?: string;
    length?: string;
    city?: string;
    selection?: string;
    confirm?: boolean;
    draft?: ArticleDraft;
  } | null;
  if (!body?.action || !isAiAction(body.action)) return Response.json({ error: 'Geçersiz işlem.' }, { status: 400 });
  if ((body.action === 'regenerate_all' || body.action === 'seo_fields') && !body.confirm) {
    return Response.json({ error: 'Bu işlem onay gerektirir.', needsConfirm: true }, { status: 409 });
  }

  const since = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const [{ count }, settings, categories, posts] = await Promise.all([
    admin.supabase.from('web_ai_generation_logs').select('id', { count: 'exact', head: true }).eq('user_id', admin.userId).gte('created_at', since),
    admin.supabase.from('web_blog_settings').select('brand_voice, seo_rules, daily_limit').eq('id', 1).maybeSingle(),
    admin.supabase.from('web_blog_categories').select('id, slug, name'),
    admin.supabase.from('web_blog_posts').select('slug').eq('status', 'published').limit(80),
  ]);
  const dailyLimit = Number(settings.data?.daily_limit ?? 40);
  if ((count ?? 0) >= dailyLimit) return Response.json({ error: 'Günlük üretim sınırına ulaşıldı.' }, { status: 429 });

  try {
    const result = await runBlogAi({
      action: body.action,
      topic: body.topic,
      language: body.language,
      tone: body.tone,
      audience: body.audience,
      length: body.length,
      city: body.city,
      selection: body.selection,
      article: body.draft ? { title: body.draft.title, excerpt: body.draft.excerpt, content: body.draft.content, seoTitle: body.draft.seoTitle } : undefined,
      categories: categories.data ?? [],
      blogSlugs: (posts.data ?? []).map((row) => String(row.slug)),
      brandVoice: settings.data?.brand_voice || 'Doğal, modern, samimi ve bilgilendirici.',
      seoRules: settings.data?.seo_rules || 'Anahtar kelime yığma. Sahte istatistik yazma.',
      signal: request.signal,
    });
    const draft = body.draft ?? null;
    if (body.action === 'translate' && draft?.id) {
      const source = await admin.supabase.from('web_blog_posts').select('translation_group_id').eq('id', draft.id).maybeSingle();
      const groupId = source.data?.translation_group_id ?? crypto.randomUUID();
      if (!source.data?.translation_group_id) {
        await admin.supabase.from('web_blog_posts').update({ translation_group_id: groupId }).eq('id', draft.id);
      }
      const created = await admin.supabase.from('web_blog_posts').insert({
        title: result.patch.title || draft.title,
        slug: result.patch.slug || `${draft.slug}-${body.language || 'en'}`,
        language: body.language || 'en',
        excerpt: result.patch.excerpt || '',
        content: result.patch.content || draft.content,
        status: 'draft',
        seo_title: result.patch.seoTitle || null,
        seo_description: result.patch.seoDescription || null,
        og_title: result.patch.ogTitle || null,
        og_description: result.patch.ogDescription || null,
        faqs: result.patch.faqs ?? [],
        tags: result.patch.tags ?? [],
        translation_group_id: groupId,
        generation_source: 'ai',
        ai_model: result.model,
        ai_generated_at: new Date().toISOString(),
        ai_last_action: 'translate',
        created_by: admin.userId,
      }).select('id').single();
      await admin.supabase.from('web_ai_generation_logs').insert({
        user_id: admin.userId,
        article_id: created.data?.id ?? draft.id,
        provider: result.provider,
        model: result.model,
        action: 'translate',
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        estimated_cost: result.estimatedCost,
        status: created.error ? 'error' : 'ok',
      });
      if (created.error || !created.data) return Response.json({ error: 'Çeviri taslağı kaydedilemedi. Özgün yazı duruyor.' }, { status: 400 });
      return Response.json({ redirectId: created.data.id, model: result.model });
    }
    const article = draft ? applyAiPatch(draft, result.patch, body.action, Boolean(body.confirm)) : null;
    if (article && result.patch.categorySlug && article.fieldModes.categoryId !== 'manual') {
      const match = (categories.data ?? []).find((item) => item.slug === result.patch.categorySlug);
      if (match?.id) article.categoryId = String(match.id);
    }
    await admin.supabase.from('web_ai_generation_logs').insert({
      user_id: admin.userId,
      article_id: draft?.id ?? null,
      provider: result.provider,
      model: result.model,
      action: body.action,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      estimated_cost: result.estimatedCost,
      status: 'ok',
    });
    if (draft?.id) {
      await admin.supabase.from('web_blog_audit').insert({
        article_id: draft.id,
        actor_id: admin.userId,
        action: 'AI_GENERATED',
        detail: { operation: body.action, model: result.model },
      });
    }
    return Response.json({
      article,
      patch: result.patch,
      model: result.model,
      usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens, estimatedCost: result.estimatedCost },
    });
  } catch {
    return Response.json({ error: 'AI şu anda kullanılamıyor. Mevcut metin duruyor.' }, { status: 503 });
  }
}
