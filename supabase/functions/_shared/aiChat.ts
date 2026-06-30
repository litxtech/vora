export type AiProviderId = 'deepseek' | 'openai' | 'custom';

export type AiChatConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: AiProviderId;
  supportsVision: boolean;
};

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function chatCompletionsUrl(baseUrl: string): string {
  const base = normalizeBaseUrl(baseUrl);
  return base.endsWith('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
}

/** Metin yanıtları için: önce DeepSeek, yoksa OpenAI. */
export function resolveTextAiConfig(): AiChatConfig | null {
  const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY')?.trim();
  if (deepseekKey) {
    return {
      apiKey: deepseekKey,
      baseUrl: normalizeBaseUrl(Deno.env.get('DEEPSEEK_BASE_URL') ?? 'https://api.deepseek.com'),
      model: Deno.env.get('DEEPSEEK_MODEL') ?? 'deepseek-v4-flash',
      provider: 'deepseek',
      supportsVision: false,
    };
  }

  const openAiKey = Deno.env.get('OPENAI_API_KEY')?.trim();
  if (openAiKey) {
    return {
      apiKey: openAiKey,
      baseUrl: 'https://api.openai.com',
      model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini',
      provider: 'openai',
      supportsVision: true,
    };
  }

  return null;
}

/**
 * Görsel analiz için ayrı OpenAI-uyumlu uç nokta.
 * DeepSeek chat API görsel desteklemez; bu yüzden vision ayrı yapılandırılır.
 */
export function resolveVisionAiConfig(): AiChatConfig | null {
  const visionKey = Deno.env.get('AI_VISION_API_KEY')?.trim();
  if (visionKey) {
    const baseUrl = normalizeBaseUrl(
      Deno.env.get('AI_VISION_BASE_URL') ?? 'https://api.openai.com',
    );
    return {
      apiKey: visionKey,
      baseUrl,
      model: Deno.env.get('AI_VISION_MODEL') ?? 'gpt-4o-mini',
      provider: 'custom',
      supportsVision: true,
    };
  }

  const openAiKey = Deno.env.get('OPENAI_API_KEY')?.trim();
  if (openAiKey) {
    return {
      apiKey: openAiKey,
      baseUrl: 'https://api.openai.com',
      model: Deno.env.get('OPENAI_VISION_MODEL') ?? Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini',
      provider: 'openai',
      supportsVision: true,
    };
  }

  return null;
}

type ChatMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string }
  | {
    role: 'user';
    content: Array<{ type: string; text?: string; image_url?: { url: string; detail?: string } }>;
  };

export async function askChatCompletion(
  config: AiChatConfig,
  messages: ChatMessage[],
  opts?: { temperature?: number; maxTokens?: number },
): Promise<string | null> {
  try {
    const body: Record<string, unknown> = {
      model: config.model,
      temperature: opts?.temperature ?? 0.4,
      max_tokens: opts?.maxTokens ?? 600,
      messages,
    };

    if (config.provider === 'deepseek') {
      body.thinking = { type: 'disabled' };
    }

    const res = await fetch(chatCompletionsUrl(config.baseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[aiChat] ${config.provider} text failed:`, res.status, errBody.slice(0, 240));
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    console.error(`[aiChat] ${config.provider} text error:`, err);
    return null;
  }
}

export async function askVisionCompletion(
  config: AiChatConfig,
  system: string,
  userText: string,
  imageUrls: string[],
  opts?: { temperature?: number; maxTokens?: number },
): Promise<string | null> {
  try {
    const content: Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }> = [
      { type: 'text', text: userText },
    ];
    for (const url of imageUrls.slice(0, 4)) {
      content.push({ type: 'image_url', image_url: { url, detail: 'low' } });
    }

    const body: Record<string, unknown> = {
      model: config.model,
      temperature: opts?.temperature ?? 0.5,
      max_tokens: opts?.maxTokens ?? 900,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content },
      ],
    };

    const res = await fetch(chatCompletionsUrl(config.baseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[aiChat] ${config.provider} vision failed:`, res.status, errBody.slice(0, 240));
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    console.error(`[aiChat] ${config.provider} vision error:`, err);
    return null;
  }
}

export function aiProviderLabel(config: AiChatConfig | null, vision = false): string {
  if (!config) return 'vora';
  if (vision) return config.provider === 'deepseek' ? 'deepseek-vision' : `${config.provider}-vision`;
  return config.provider;
}

export function missingAiKeyMessage(): string {
  if (Deno.env.get('DEEPSEEK_API_KEY') || Deno.env.get('OPENAI_API_KEY')) return '';
  return ' Yapay zekâ için DEEPSEEK_API_KEY (veya OPENAI_API_KEY) gerekli.';
}

export function missingVisionKeyMessage(): string {
  if (resolveVisionAiConfig()) return '';
  return ' Görsel analizi için AI_VISION_API_KEY yapılandırın (DeepSeek chat API görsel desteklemez).';
}
