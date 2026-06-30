import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHARE_BASE_URL = Deno.env.get('SHARE_BASE_URL') ?? 'https://vora.app';
const APP_SCHEME = Deno.env.get('APP_SCHEME') ?? 'vora';
const IOS_STORE_URL =
  Deno.env.get('IOS_APP_STORE_URL') ?? 'https://apps.apple.com/tr/app/vora-x/id6777120091?l=tr';
const ANDROID_STORE_URL =
  Deno.env.get('ANDROID_PLAY_STORE_URL') ??
  'https://play.google.com/store/apps/details?id=com.karadeniz.dijitalagi';
const APPLE_TEAM_ID = Deno.env.get('APPLE_TEAM_ID') ?? '9W6CR7KXM7';
const ANDROID_PACKAGE = Deno.env.get('ANDROID_PACKAGE') ?? 'com.karadeniz.dijitalagi';

function parseSha256Fingerprints(): string[] {
  const raw =
    Deno.env.get('ANDROID_SHA256_FINGERPRINTS') ??
    Deno.env.get('ANDROID_SHA256_FINGERPRINT') ??
    '';
  return raw
    .split(/[,\n;]+/)
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
}

type ShareMeta = {
  title: string;
  description: string;
  imageUrl: string | null;
  videoUrl: string | null;
  canonicalUrl: string;
  deepLink: string;
  contentType: 'website' | 'article' | 'video.other';
  primaryCtaLabel?: string;
  badgeLabel?: string;
  authorDisplayName?: string | null;
  authorUsername?: string | null;
  authorAvatarUrl?: string | null;
  postTitle?: string | null;
};

function htmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function resolveRequestPath(url: URL): string {
  const kind = url.searchParams.get('kind') ?? url.searchParams.get('type');
  const id = url.searchParams.get('id');
  if (kind && id && /^[prvums]$/.test(kind)) {
    return `/${kind}/${id}`;
  }

  let path = url.pathname;
  for (const prefix of ['/functions/v1/share-preview', '/share-preview']) {
    if (path.startsWith(prefix)) {
      path = path.slice(prefix.length) || '/';
      break;
    }
  }
  return path;
}

function muxThumbnail(playbackId: string): string {
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=1`;
}

function muxStream(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

function extractMuxPlaybackId(url: string): string | null {
  const match = url.match(/stream\.mux\.com\/([^./?]+)/);
  return match?.[1] ?? null;
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|m3u8|webm)(\?|$)/i.test(url) || url.includes('stream.mux.com');
}

function pickMediaImage(mediaUrls: string[] | null | undefined): { image: string | null; video: string | null } {
  const urls = mediaUrls ?? [];
  for (const url of urls) {
    if (!url) continue;
    const playbackId = extractMuxPlaybackId(url);
    if (playbackId) {
      return { image: muxThumbnail(playbackId), video: muxStream(playbackId) };
    }
    if (isVideoUrl(url)) {
      return { image: null, video: url };
    }
    return { image: url, video: null };
  }
  return { image: null, video: null };
}

function renderLandingPage(meta: ShareMeta): string {
  const title = htmlEscape(meta.title);
  const description = htmlEscape(meta.description.slice(0, 300));
  const image = meta.imageUrl ? htmlEscape(meta.imageUrl) : '';
  const video = meta.videoUrl ? htmlEscape(meta.videoUrl) : '';
  const canonical = htmlEscape(meta.canonicalUrl);
  const deepLink = htmlEscape(meta.deepLink);
  const iosStore = htmlEscape(IOS_STORE_URL);
  const androidStore = htmlEscape(ANDROID_STORE_URL);
  const badge = htmlEscape(meta.badgeLabel ?? 'Vora');
  const primaryLabel = htmlEscape(meta.primaryCtaLabel ?? 'Uygulamada Aç');

  const authorName = htmlEscape(
    meta.authorDisplayName?.trim() || (meta.authorUsername ? `@${meta.authorUsername}` : 'Vora'),
  );
  const authorHandle = meta.authorUsername
    ? htmlEscape(`@${meta.authorUsername} · Karadeniz Dijital Ağı`)
    : htmlEscape('Karadeniz Dijital Ağı');
  const postTitle = meta.postTitle ? htmlEscape(meta.postTitle) : '';
  const avatarUrl = meta.authorAvatarUrl ? htmlEscape(meta.authorAvatarUrl) : '';
  const avatarInitial = htmlEscape((meta.authorUsername ?? 'V').slice(0, 1).toUpperCase());
  const hasAuthor = Boolean(meta.authorUsername || meta.authorDisplayName);

  const ogVideoTags = video
    ? `<meta property="og:video" content="${video}" />
<meta property="og:video:type" content="video/mp4" />`
    : '';

  const mediaBlock = image
    ? `<img class="media" src="${image}" alt="${title}" />`
    : video
      ? `<video class="media" src="${video}" controls playsinline poster="${image}"></video>`
      : '';

  const authorBlock = hasAuthor
    ? `<div class="author">
        ${
          avatarUrl
            ? `<img class="avatar" src="${avatarUrl}" alt="${authorName}" />`
            : `<div class="avatar avatar-fallback">${avatarInitial}</div>`
        }
        <div class="author-meta">
          <div class="author-name">${authorName}</div>
          <div class="author-handle">${authorHandle}</div>
        </div>
      </div>`
    : '';

  const postTitleBlock = postTitle ? `<h1 class="post-title">${postTitle}</h1>` : '';
  const bodyBlock = description
    ? `<p class="post-body">${description}</p>`
    : `<p class="post-body muted">Vora üzerinde paylaşılan içerik</p>`;

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${postTitle || title}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="${meta.contentType}" />
  <meta property="og:site_name" content="Vora" />
  <meta property="og:title" content="${postTitle || title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonical}" />
  ${image ? `<meta property="og:image" content="${image}" />` : ''}
  ${ogVideoTags}
  <meta name="twitter:card" content="${video ? 'player' : image ? 'summary_large_image' : 'summary'}" />
  <meta name="twitter:title" content="${postTitle || title}" />
  <meta name="twitter:description" content="${description}" />
  ${image ? `<meta name="twitter:image" content="${image}" />` : ''}
  <meta name="apple-itunes-app" content="app-id=${IOS_STORE_URL.match(/id(\d+)/)?.[1] ?? ''}, app-argument=${deepLink}" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0A0E14; color: #F4F7FB; }
    .wrap { max-width: 520px; margin: 0 auto; padding: 20px 16px 40px; }
    .brand-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .brand { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; letter-spacing: 0.04em; color: #1E88E5; }
    .brand-dot { width: 8px; height: 8px; border-radius: 50%; background: #1E88E5; }
    .card { background: #121820; border: 1px solid #2A3444; border-radius: 18px; padding: 16px; box-shadow: 0 12px 40px rgba(0,0,0,0.28); }
    .author { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
    .avatar { width: 44px; height: 44px; border-radius: 22px; object-fit: cover; flex-shrink: 0; }
    .avatar-fallback { display: flex; align-items: center; justify-content: center; background: rgba(30,136,229,0.15); color: #1E88E5; font-weight: 800; font-size: 18px; }
    .author-meta { min-width: 0; }
    .author-name { font-size: 15px; font-weight: 700; line-height: 1.2; }
    .author-handle { font-size: 12px; color: #9AA8BC; margin-top: 2px; }
    .post-title { font-size: 18px; line-height: 1.35; margin: 0 0 10px; font-weight: 700; }
    .post-body { color: #D7DEE8; line-height: 1.55; margin: 0 0 16px; white-space: pre-wrap; font-size: 15px; }
    .post-body.muted { color: #9AA8BC; }
    .media { width: 100%; border-radius: 14px; background: #111722; margin-bottom: 16px; display: block; }
    .actions { display: grid; gap: 10px; margin-top: 18px; }
    a.btn { display: block; text-align: center; text-decoration: none; padding: 14px 16px; border-radius: 14px; font-weight: 700; font-size: 15px; }
    .primary { background: #1E88E5; color: #fff; }
    .secondary { background: #1A2230; color: #fff; border: 1px solid #2A3444; }
    .stores { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="brand-bar">
      <div class="brand"><span class="brand-dot"></span> VORA</div>
      <div class="brand">${badge}</div>
    </div>
    <div class="card">
      ${authorBlock}
      ${postTitleBlock}
      ${bodyBlock}
      ${mediaBlock}
      <div class="actions">
        <a class="btn primary" id="open-app" href="${deepLink}">${primaryLabel}</a>
        <div class="stores">
          <a class="btn secondary" href="${iosStore}">App Store</a>
          <a class="btn secondary" href="${androidStore}">Google Play</a>
        </div>
      </div>
    </div>
  </div>
  <script>
    (function () {
      var deepLink = ${JSON.stringify(meta.deepLink)};
      var iosStore = ${JSON.stringify(IOS_STORE_URL)};
      var androidStore = ${JSON.stringify(ANDROID_STORE_URL)};
      var ua = navigator.userAgent || '';
      var isIOS = /iPhone|iPad|iPod/i.test(ua);
      var isAndroid = /Android/i.test(ua);
      var storeUrl = isIOS ? iosStore : isAndroid ? androidStore : androidStore;
      var openedAt = Date.now();
      window.location.replace(deepLink);
      setTimeout(function () {
        if (Date.now() - openedAt < 1400) {
          window.location.replace(storeUrl);
        }
      }, 700);
      document.getElementById('open-app').addEventListener('click', function (event) {
        event.preventDefault();
        window.location.replace(deepLink);
        setTimeout(function () { window.location.replace(storeUrl); }, 700);
      });
    })();
  </script>
</body>
</html>`;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function isSocialPreviewCrawler(userAgent: string): boolean {
  return /facebookexternalhit|Facebot|Twitterbot|WhatsApp|Telegram|LinkedInBot|Slackbot|Discordbot|Googlebot|bingbot|Pinterest|Embedly/i.test(
    userAgent,
  );
}

function shouldRedirectMobileToApp(userAgent: string): boolean {
  return /iPhone|iPad|iPod|Android/i.test(userAgent) && !isSocialPreviewCrawler(userAgent);
}

function redirectToDeepLink(deepLink: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: deepLink,
      'Cache-Control': 'no-store',
    },
  });
}

async function fetchPostMeta(supabase: ReturnType<typeof createClient>, id: string): Promise<ShareMeta | null> {
  const { data } = await supabase
    .from('posts')
    .select('id, title, content, media_urls, author_id')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;

  const { data: author } = await supabase
    .from('profiles')
    .select('username, full_name, avatar_url')
    .eq('id', data.author_id)
    .maybeSingle();

  const media = pickMediaImage(data.media_urls as string[] | null);
  const username = (author?.username as string | null) ?? null;
  const displayName = (author?.full_name as string | null)?.trim() ?? null;
  const postTitle = (data.title as string | null)?.trim() || null;
  const content = ((data.content as string | null) ?? '').trim();
  const authorLabel = username ? `@${username}` : 'Vora';
  const ogTitle = postTitle || (displayName ? `${displayName} · Vora` : `${authorLabel} · Vora`);
  const description = content || 'Karadeniz Dijital Ağı\'nda paylaşılan gönderi';

  return {
    title: ogTitle,
    description,
    imageUrl: media.image,
    videoUrl: media.video,
    canonicalUrl: `${SHARE_BASE_URL}/p/${id}`,
    deepLink: `${APP_SCHEME}://p/${id}`,
    contentType: media.video ? 'video.other' : 'article',
    authorDisplayName: displayName,
    authorUsername: username,
    authorAvatarUrl: (author?.avatar_url as string | null) ?? null,
    postTitle,
  };
}

async function fetchReelMeta(supabase: ReturnType<typeof createClient>, id: string): Promise<ShareMeta | null> {
  const { data } = await supabase
    .from('reels')
    .select('id, caption, author_id, videos (mux_playback_id, thumbnail_url)')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;

  const { data: author } = await supabase
    .from('profiles')
    .select('username, full_name, avatar_url')
    .eq('id', data.author_id)
    .maybeSingle();

  const videoRow = Array.isArray(data.videos) ? data.videos[0] : data.videos;
  const playbackId = videoRow?.mux_playback_id as string | null;
  const thumbnail =
    (videoRow?.thumbnail_url as string | null) ??
    (playbackId ? muxThumbnail(playbackId) : null);

  const username = (author?.username as string | null) ?? null;
  const displayName = (author?.full_name as string | null)?.trim() ?? null;
  const caption = ((data.caption as string | null) ?? '').trim();

  return {
    title: username ? `@${username} · Vora Reels` : 'Vora Reels',
    description: caption || 'Vora Reels videosu',
    imageUrl: thumbnail,
    videoUrl: playbackId ? muxStream(playbackId) : null,
    canonicalUrl: `${SHARE_BASE_URL}/r/${id}`,
    deepLink: `${APP_SCHEME}://r/${id}`,
    contentType: 'video.other',
    authorDisplayName: displayName,
    authorUsername: username,
    authorAvatarUrl: (author?.avatar_url as string | null) ?? null,
  };
}

async function fetchVerifyMeta(supabase: ReturnType<typeof createClient>, code: string): Promise<ShareMeta | null> {
  const { data, error } = await supabase.rpc('verify_content_trust', { p_trust_code: code });
  if (error || !data?.found) {
    return {
      title: 'VORA Doğrulama',
      description: 'Bu içerik VORA Content Trust System ile doğrulanır.',
      imageUrl: null,
      videoUrl: null,
      canonicalUrl: `${SHARE_BASE_URL}/v/${code}`,
      deepLink: `${APP_SCHEME}://v/${code}`,
      contentType: 'website',
    };
  }

  const postId = data.post_id as string | undefined;
  if (postId) {
    const postMeta = await fetchPostMeta(supabase, postId);
    if (postMeta) {
      return {
        ...postMeta,
        title: `✓ VORA · ${postMeta.title}`,
        canonicalUrl: `${SHARE_BASE_URL}/v/${code}`,
        deepLink: `${APP_SCHEME}://v/${code}`,
      };
    }
  }

  return {
    title: `✓ VORA · @${data.author_username ?? 'kullanici'}`,
    description: 'Doğrulanmış VORA içeriği',
    imageUrl: null,
    videoUrl: null,
    canonicalUrl: `${SHARE_BASE_URL}/v/${code}`,
    deepLink: `${APP_SCHEME}://v/${code}`,
    contentType: 'website',
  };
}

async function fetchProfileMeta(supabase: ReturnType<typeof createClient>, username: string): Promise<ShareMeta | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, bio')
    .eq('username', username)
    .maybeSingle();
  if (!data) return null;

  return {
    title: data.full_name?.trim() || `@${data.username}`,
    description: ((data.bio as string | null) ?? '').trim() || `@${data.username} · Vora profili`,
    imageUrl: (data.avatar_url as string | null) ?? null,
    videoUrl: null,
    canonicalUrl: `${SHARE_BASE_URL}/u/${data.username}`,
    deepLink: `${APP_SCHEME}://u/${data.username}`,
    contentType: 'website',
    authorDisplayName: (data.full_name as string | null)?.trim() ?? null,
    authorUsername: data.username as string,
    authorAvatarUrl: (data.avatar_url as string | null) ?? null,
  };
}

function formatListingPrice(
  price: number | null,
  listingType: string,
  currency: string,
): string {
  if (listingType === 'free') return 'Ücretsiz';
  if (listingType === 'trade') return 'Takas';
  if (price == null) return 'Fiyat sorulur';
  const symbol = currency.toLowerCase() === 'try' ? '₺' : currency.toUpperCase();
  return `${price.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${symbol}`;
}

async function fetchMarketplaceMeta(
  supabase: ReturnType<typeof createClient>,
  id: string,
  buy: boolean,
): Promise<ShareMeta | null> {
  const { data } = await supabase
    .from('marketplace_listings')
    .select('id, title, description, price, currency, listing_type, status, district, cover_url, media_urls')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;

  const listingType = (data.listing_type as string) ?? 'sale';
  const status = (data.status as string) ?? 'active';
  const priceLabel = formatListingPrice(
    data.price as number | null,
    listingType,
    (data.currency as string) ?? 'try',
  );
  const district = ((data.district as string | null) ?? '').trim();
  const descriptionLines = [
    priceLabel,
    district ? `📍 ${district}` : null,
    '',
    ((data.description as string | null) ?? '').trim().slice(0, 180),
  ].filter((line) => line !== null);

  const cover =
    (data.cover_url as string | null) ??
    ((data.media_urls as string[] | null)?.[0] ?? null);

  const canBuy = buy && status === 'active' && listingType !== 'free' && listingType !== 'trade';
  const query = buy ? '?buy=1' : '';

  return {
    title: (data.title as string).trim(),
    description: descriptionLines.join('\n'),
    imageUrl: cover,
    videoUrl: null,
    canonicalUrl: `${SHARE_BASE_URL}/m/${id}${query}`,
    deepLink: `${APP_SCHEME}://m/${id}${query}`,
    contentType: 'website',
    badgeLabel: 'Vora · Yerel Pazar',
    primaryCtaLabel: canBuy ? 'Bu ürünü Satın Al' : status === 'sold' ? 'Satıldı — Uygulamada Gör' : 'İlanı Görüntüle',
  };
}

async function fetchBusinessShopMeta(
  supabase: ReturnType<typeof createClient>,
  id: string,
): Promise<ShareMeta | null> {
  const { data } = await supabase
    .from('businesses')
    .select(
      'id, name, description, shop_tagline, district, logo_url, cover_url, commerce_mode, registration_status',
    )
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  if ((data.registration_status as string) !== 'approved') return null;

  const commerceLabels: Record<string, string> = {
    showcase: 'Kurumsal Vitrin',
    ecommerce: 'E-Ticaret',
    hotel: 'Otel',
    both: 'Otel & E-Ticaret',
    none: 'Mağaza',
  };

  const name = (data.name as string).trim();
  const tagline = ((data.shop_tagline as string | null) ?? '').trim();
  const district = ((data.district as string | null) ?? '').trim();
  const mode =
    commerceLabels[(data.commerce_mode as string) ?? 'none'] ?? 'İşletme Mağazası';
  const blurb =
    tagline ||
    ((data.description as string | null) ?? '').trim().slice(0, 180) ||
    'Vora üzerinde kurumsal mağaza vitrini';

  const descriptionLines = [mode, district ? `📍 ${district}` : null, blurb].filter(
    (line): line is string => Boolean(line),
  );

  const imageUrl =
    (data.cover_url as string | null) ?? (data.logo_url as string | null) ?? null;

  return {
    title: name,
    description: descriptionLines.join('\n'),
    imageUrl,
    videoUrl: null,
    canonicalUrl: `${SHARE_BASE_URL}/s/${id}`,
    deepLink: `${APP_SCHEME}://s/${id}`,
    contentType: 'website',
    badgeLabel: 'Vora · Mağaza',
    primaryCtaLabel: 'Mağazayı Gör',
  };
}

function serveAppleAssociation(): Response {
  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appID: `${APPLE_TEAM_ID}.${ANDROID_PACKAGE}`,
          paths: ['/p/*', '/r/*', '/v/*', '/u/*', '/m/*', '/s/*'],
        },
      ],
    },
  };
  return jsonResponse(body);
}

function serveAssetLinks(): Response {
  const fingerprints = parseSha256Fingerprints();
  const body = fingerprints.length
    ? [
        {
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: ANDROID_PACKAGE,
            sha256_cert_fingerprints: fingerprints,
          },
        },
      ]
    : [];
  return jsonResponse(body);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = resolveRequestPath(url);

  if (path === '/.well-known/apple-app-site-association' || path === '/apple-app-site-association') {
    return serveAppleAssociation();
  }
  if (path === '/.well-known/assetlinks.json') {
    return serveAssetLinks();
  }

  const match = path.match(/^\/(p|r|v|u|m|s)\/([^/]+)\/?$/);
  if (!match) {
    return htmlResponse(
      renderLandingPage({
        title: 'Vora',
        description: 'Karadeniz Dijital Ağı — paylaşılan içerikleri görüntüleyin veya uygulamayı indirin.',
        imageUrl: null,
        videoUrl: null,
        canonicalUrl: SHARE_BASE_URL,
        deepLink: `${APP_SCHEME}://`,
        contentType: 'website',
      }),
    );
  }

  const [, kind, rawId] = match;
  const id = decodeURIComponent(rawId);
  const wantsBuy = url.searchParams.get('buy') === '1';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  let meta: ShareMeta | null = null;
  switch (kind) {
    case 'p':
      meta = await fetchPostMeta(supabase, id);
      break;
    case 'r':
      meta = await fetchReelMeta(supabase, id);
      break;
    case 'v':
      meta = await fetchVerifyMeta(supabase, id);
      break;
    case 'u':
      meta = await fetchProfileMeta(supabase, id);
      break;
    case 'm':
      meta = await fetchMarketplaceMeta(supabase, id, wantsBuy);
      break;
    case 's':
      meta = await fetchBusinessShopMeta(supabase, id);
      break;
  }

  if (!meta) {
    const fallbackDeepLink = `${APP_SCHEME}://${kind}/${id}`;
    const ua = req.headers.get('user-agent') ?? '';
    if (shouldRedirectMobileToApp(ua)) {
      return redirectToDeepLink(fallbackDeepLink);
    }
    return htmlResponse(
      renderLandingPage({
        title: 'İçerik bulunamadı',
        description: 'Bu bağlantı artık geçerli olmayabilir. Vora uygulamasını indirip keşfetmeye devam edebilirsin.',
        imageUrl: null,
        videoUrl: null,
        canonicalUrl: `${SHARE_BASE_URL}${path}`,
        deepLink: fallbackDeepLink,
        contentType: 'website',
      }),
    );
  }

  const ua = req.headers.get('user-agent') ?? '';
  if (shouldRedirectMobileToApp(ua)) {
    return redirectToDeepLink(meta.deepLink);
  }

  return htmlResponse(renderLandingPage(meta));
});
