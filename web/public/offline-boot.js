(function () {
  if (!('serviceWorker' in navigator)) return;
  var rootReady = document.getElementById('vora-offline-root');
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
  });
  if (rootReady) return;
  var bar = document.createElement('div');
  bar.setAttribute('role', 'status');
  bar.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:80;background:#1a2230;color:#f4f7fb;border:1px solid #2a3444;border-radius:999px;padding:6px 12px;font:600 13px/1.3 Segoe UI,sans-serif;display:none';
  document.documentElement.appendChild(bar);
  function paint() {
    var offline = !navigator.onLine;
    bar.style.display = offline ? 'block' : 'none';
    bar.textContent = offline ? 'Çevrimdışısın' : '';
  }
  window.addEventListener('online', function () {
    bar.style.display = 'block';
    bar.textContent = 'Bağlantı yeniden sağlandı';
    setTimeout(paint, 2400);
  });
  window.addEventListener('offline', paint);
  paint();
})();
