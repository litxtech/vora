'use client';

import { ANDROID_PLAY_STORE_URL, IOS_APP_STORE_URL } from '@/lib/site';

function track() {
  void fetch('/api/analytics', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ event: 'download_click', path: window.location.pathname, contentType: 'page' }),
    keepalive: true,
  }).catch(() => undefined);
}

export function StoreBadges() {
  return (
    <div className="badges">
      <a href={IOS_APP_STORE_URL} onClick={track}>
        <img
          alt="App Store'dan indirin"
          src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/tr-tr?size=250x83&releaseDate=1700000000"
          height={48}
        />
      </a>
      <a href={ANDROID_PLAY_STORE_URL} onClick={track}>
        <img
          alt="Google Play'den alın"
          src="https://play.google.com/intl/en_us/badges/static/images/badges/tr_badge_web_generic.png"
          height={48}
        />
      </a>
    </div>
  );
}
