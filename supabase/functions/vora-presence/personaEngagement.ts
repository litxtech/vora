import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  askChatCompletion,
  type AiChatConfig,
} from '../_shared/aiChat.ts';

type PersonaRow = {
  id: string;
  profile_id: string;
  display_name: string;
  region_id: string;
  bio: string;
  gender: string;
};

const FALLBACK_COMMENTS = [
  'Valla çok güzel olmuş',
  'Helal olsun',
  'Harika paylaşım',
  'Eline sağlık',
  'Güzel kare',
  'Aynen öyle',
  'Süper olmuş',
  'Böyle devam',
  'Güzel yazmışsın',
  'Tam yerinde',
  'Haklısın',
  'Güzel görmüşsün',
];

export async function runPersonaEngagement(
  admin: SupabaseClient,
  personas: PersonaRow[],
  textConfig: AiChatConfig | null,
  opts: { maxLikes: number; maxComments: number },
): Promise<{ likes: number; comments: number }> {
  if (!personas.length) return { likes: 0, comments: 0 };

  let likes = 0;
  let comments = 0;
  const shuffled = [...personas].sort(() => Math.random() - 0.5);

  for (const persona of shuffled.slice(0, opts.maxLikes + opts.maxComments)) {
    const { data: posts } = await admin
      .from('posts')
      .select('id, content, author_id, region_id')
      .eq('status', 'published')
      .neq('author_id', persona.profile_id)
      .eq('region_id', persona.region_id)
      .order('created_at', { ascending: false })
      .limit(12);

    const candidates = (posts ?? []).filter((p) => p.author_id !== persona.profile_id);
    if (!candidates.length) continue;

    const target = candidates[Math.floor(Math.random() * candidates.length)];

    if (likes < opts.maxLikes) {
      const { error } = await admin.from('post_likes').insert({
        post_id: target.id,
        user_id: persona.profile_id,
      });
      if (!error) {
        likes += 1;
        await admin.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', persona.profile_id);
      }
    }

    if (comments < opts.maxComments && Math.random() < 0.55) {
      let comment = FALLBACK_COMMENTS[Math.floor(Math.random() * FALLBACK_COMMENTS.length)];
      if (textConfig) {
        const ai = await askChatCompletion(textConfig, [
          {
            role: 'system',
            content: 'Karadenizli gerçek kullanıcı gibi kısa, samimi bir yorum yaz. En fazla 80 karakter. Sadece yorum metnini döndür.',
          },
          {
            role: 'user',
            content: `Profil: ${persona.display_name}\nGönderi: ${(target.content as string)?.slice(0, 200)}`,
          },
        ], { temperature: 0.9, maxTokens: 60 });
        if (ai) comment = ai.trim().slice(0, 120);
      }

      const { error } = await admin.from('post_comments').insert({
        post_id: target.id,
        author_id: persona.profile_id,
        content: comment,
      });
      if (!error) {
        comments += 1;
        await admin.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', persona.profile_id);
      }
    }
  }

  return { likes, comments };
}
