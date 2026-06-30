import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, isUuid, json, jsonSafeError, requireAuth } from '../_shared/supabaseAuth.ts';

type MuxAsset = {
  data: {
    status: string;
    duration?: number;
    playback_ids?: { id: string; policy: string }[];
  };
};

type MuxUpload = {
  data: {
    status: string;
    asset_id?: string;
  };
};

async function muxGet(path: string, auth: string) {
  const res = await fetch(`https://api.mux.com${path}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) return null;
  return res.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;

    const { user, admin } = authResult;

    const muxTokenId = Deno.env.get('MUX_TOKEN_ID');
    const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET');

    if (!muxTokenId || !muxTokenSecret) {
      return json({ error: 'Missing configuration' }, 500);
    }

    const { videoId } = await req.json();
    if (!isUuid(videoId)) {
      return json({ error: 'videoId required' }, 400);
    }

    const { data: video, error } = await admin
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .maybeSingle();

    if (error || !video) {
      return json({ error: 'Video not found' }, 404);
    }

    if (video.owner_id !== user.id) {
      return json({ error: 'Forbidden' }, 403);
    }

    if (video.status === 'ready' && video.mux_playback_id) {
      return json({ status: 'ready', playbackId: video.mux_playback_id });
    }

    const auth = btoa(`${muxTokenId}:${muxTokenSecret}`);
    let assetId = video.mux_asset_id as string | null;

    if (!assetId && video.mux_upload_id) {
      const upload = (await muxGet(`/video/v1/uploads/${video.mux_upload_id}`, auth)) as MuxUpload | null;
      if (upload?.data?.asset_id) {
        assetId = upload.data.asset_id;
        await admin.from('videos').update({ mux_asset_id: assetId }).eq('id', videoId);
      } else if (upload?.data?.status === 'errored') {
        await admin.from('videos').update({ status: 'failed' }).eq('id', videoId);
        return json({ status: 'error' });
      }
    }

    if (!assetId) {
      return json({ status: 'processing' });
    }

    const asset = (await muxGet(`/video/v1/assets/${assetId}`, auth)) as MuxAsset | null;
    if (!asset?.data) {
      return json({ status: 'processing' });
    }

    if (asset.data.status === 'errored') {
      await admin.from('videos').update({ status: 'failed' }).eq('id', videoId);
      return json({ status: 'error' });
    }

    if (asset.data.status !== 'ready') {
      return json({ status: 'processing' });
    }

    const playbackId = asset.data.playback_ids?.[0]?.id ?? null;
    if (!playbackId) {
      return json({ status: 'processing' });
    }

    const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?time=1`;
    const durationSeconds = asset.data.duration ? Math.round(asset.data.duration) : null;

    await admin
      .from('videos')
      .update({
        mux_playback_id: playbackId,
        thumbnail_url: thumbnailUrl,
        duration_seconds: durationSeconds,
        status: 'ready',
      })
      .eq('id', videoId);

    return json({ status: 'ready', playbackId, thumbnailUrl });
  } catch (err) {
    return jsonSafeError(err, 500);
  }
});
