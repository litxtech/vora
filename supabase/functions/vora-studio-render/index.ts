import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, json, jsonSafeError, requireAuth } from '../_shared/supabaseAuth.ts';

type RenderPayload = {
  userId: string;
  sourceUri: string;
  manifest: Record<string, unknown>;
  thumbnailTimeSec?: number;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;

    const { user, admin } = authResult;
    const body = (await req.json()) as RenderPayload;

    if (!body.userId || body.userId !== user.id) {
      return json({ error: 'Forbidden' }, 403);
    }

    const ffmpegCommands = Array.isArray(body.manifest?.ffmpegCommands)
      ? body.manifest.ffmpegCommands
      : [];

    const { data: job, error } = await admin
      .from('vora_studio_jobs')
      .insert({
        user_id: user.id,
        status: 'queued',
        manifest: body.manifest,
        ffmpeg_commands: ffmpegCommands,
      })
      .select('id')
      .single();

    if (error) {
      return json({ error: error.message }, 400);
    }

    const workerUrl = Deno.env.get('VORA_FFMPEG_WORKER_URL');
    if (workerUrl) {
      await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          sourceUri: body.sourceUri,
          manifest: body.manifest,
          thumbnailTimeSec: body.thumbnailTimeSec ?? 0,
        }),
      });
    }

    return json({
      jobId: job.id,
      outputUri: body.sourceUri,
      status: workerUrl ? 'queued' : 'preview_only',
      ffmpegCommands,
    });
  } catch (error) {
    return jsonSafeError(error, 500);
  }
});
