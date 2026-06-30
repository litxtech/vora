import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, json, jsonSafeError, requireAuth } from '../_shared/supabaseAuth.ts';

const BANNED_WORDS = [
  'amk', 'sik', 'orospu', 'piç', 'göt',
];

const SPAM_PATTERNS = [
  /\b(t\.me\/|telegram\.me\/|bit\.ly\/)/i,
  /(ücretsiz\s+para|bedava\s+btc)/i,
];

const REVIEW_PATTERNS = [
  /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/,
  /(dolandır|scam|ifşa|plaka)/i,
];

const MAX_TEXT_LENGTH = 8000;

type ModeratePayload = {
  text: string;
  target_type?: string;
  target_id?: string;
};

type ModerateResult = {
  allowed: boolean;
  requires_review: boolean;
  flags: string[];
  score: number;
  reason: string | null;
  provider: string;
};

function scanRules(text: string): ModerateResult {
  const normalized = text.toLowerCase();
  const flags: string[] = [];
  let score = 0;

  for (const word of BANNED_WORDS) {
    if (normalized.includes(word)) {
      return {
        allowed: false,
        requires_review: false,
        flags: ['profanity'],
        score: 1,
        reason: 'İçerik topluluk kurallarına aykırı ifadeler içeriyor.',
        provider: 'rules',
      };
    }
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      return {
        allowed: false,
        requires_review: false,
        flags: ['spam'],
        score: 0.9,
        reason: 'Spam veya yönlendirme bağlantıları tespit edildi.',
        provider: 'rules',
      };
    }
  }

  for (const pattern of REVIEW_PATTERNS) {
    if (pattern.test(text)) {
      flags.push('suspicious');
      score = Math.max(score, 0.65);
    }
  }

  if (flags.includes('suspicious')) {
    return {
      allowed: true,
      requires_review: true,
      flags,
      score,
      reason: null,
      provider: 'rules',
    };
  }

  return {
    allowed: true,
    requires_review: false,
    flags: [],
    score: 0,
    reason: null,
    provider: 'rules',
  };
}

async function scanOpenAI(text: string, apiKey: string): Promise<ModerateResult | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: text }),
    });

    if (!res.ok) return null;

    const responseJson = await res.json();
    const result = responseJson.results?.[0];
    if (!result) return null;

    const flagged = result.flagged === true;
    const categories = Object.entries(result.categories ?? {})
      .filter(([, v]) => v === true)
      .map(([k]) => k);

    if (flagged) {
      return {
        allowed: false,
        requires_review: false,
        flags: categories.length ? categories : ['ai_flagged'],
        score: Math.max(...Object.values(result.category_scores ?? {}).map(Number), 0.8),
        reason: 'İçerik otomatik moderasyon tarafından işaretlendi.',
        provider: 'openai',
      };
    }

    return {
      allowed: true,
      requires_review: false,
      flags: [],
      score: 0,
      reason: null,
      provider: 'openai',
    };
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;

    const { user, admin: adminClient } = authResult;
    const openAiKey = Deno.env.get('OPENAI_API_KEY');

    const body = (await req.json()) as ModeratePayload;
    const text = (body.text ?? '').trim();

    if (!text) {
      return json({ allowed: true, requires_review: false, flags: [], score: 0 });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return json({ error: 'Text too long' }, 400);
    }

    let result = scanRules(text);

    if (openAiKey) {
      const aiResult = await scanOpenAI(text, openAiKey);
      if (aiResult && !aiResult.allowed) {
        result = aiResult;
      } else if (aiResult?.provider === 'openai' && result.requires_review) {
        result.provider = 'rules+openai';
      }
    }

    const action = !result.allowed ? 'blocked' : result.requires_review ? 'review' : 'allowed';

    await adminClient.from('ai_moderation_logs').insert({
      user_id: user.id,
      target_type: body.target_type ?? null,
      target_id: body.target_id ?? null,
      text_sample: text.slice(0, 500),
      flags: result.flags,
      score: result.score,
      action,
      provider: result.provider,
    });

    return json(result);
  } catch (error) {
    return jsonSafeError(error, 500);
  }
});
