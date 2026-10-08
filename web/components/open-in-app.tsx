'use client';

import { useEffect, useState } from 'react';

const IOS_STORE = 'https://apps.apple.com/tr/app/vora-x/id6777120091?l=tr';
const ANDROID_STORE = 'https://play.google.com/store/apps/details?id=com.litxtech.vora';
const ANDROID_PACKAGE = 'com.litxtech.vora';
const HIDE_KEY = 'vora-hide-open-app';

function deepPath(pathname: string, search: string): string {
  const parts = pathname.split('/').filter(Boolean);
  const head = parts[0] ?? '';
  if (head === 'events' && parts[1]) return `detail/events/${parts[1]}${search}`;
  if (['p', 'r', 'v', 'u', 'm', 's', 'city', 'room', 'council', 'election', 'leader-line'].includes(head)) {
    return `${pathname.replace(/^\//, '')}${search}`;
  }
  return '';
}

function openNativeApp() {
  const path = deepPath(window.location.pathname, window.location.search);
  const android = /Android/i.test(navigator.userAgent);
  if (android) {
    const fallback = encodeURIComponent(ANDROID_STORE);
    window.location.href = `intent://${path}#Intent;scheme=vora;package=${ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`;
    return;
  }
  const started = Date.now();
  window.location.href = path ? `vora://${path}` : 'vora://';
  window.setTimeout(() => {
    if (document.hidden || Date.now() - started > 1600) return;
    window.location.href = IOS_STORE;
  }, 1200);
}

export function OpenInApp() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const phone = window.matchMedia('(max-width: 900px)').matches;
    if (!phone || window.localStorage.getItem(HIDE_KEY) === '1') return;
    setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="open-app" role="region" aria-label="Uygulamaya geç">
      <img src="/vora-logo.png" alt="" width={36} height={36} />
      <p>
        <strong>Vora uygulaması</strong>
        <span>Bu sayfayı telefonda uygulamada aç.</span>
      </p>
      <button type="button" className="btn" onClick={openNativeApp}>
        Uygulamaya geç
      </button>
      <button
        type="button"
        className="open-app-close"
        aria-label="Kapat"
        onClick={() => {
          window.localStorage.setItem(HIDE_KEY, '1');
          setShow(false);
        }}
      >
        ×
      </button>
    </div>
  );
}
