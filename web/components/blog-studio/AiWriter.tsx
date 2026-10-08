'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { emptyDraft, type ArticleDraft } from '@/lib/blog/studio';

export function AiWriter({ cities, categories }: { cities: { id: string; name: string }[]; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState('tr');
  const [city, setCity] = useState('');
  const [tone, setTone] = useState('');
  const [audience, setAudience] = useState('');
  const [length, setLength] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useState(() => ({ current: null as AbortController | null }))[0];

  useEffect(() => {
    const apply = () => {
      const viewport = window.visualViewport;
      const inset = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
      document.documentElement.style.setProperty('--keyboard-inset', `${Math.round(inset)}px`);
    };
    window.visualViewport?.addEventListener('resize', apply);
    window.visualViewport?.addEventListener('scroll', apply);
    return () => {
      window.visualViewport?.removeEventListener('resize', apply);
      window.visualViewport?.removeEventListener('scroll', apply);
    };
  }, []);

  async function create(manual: boolean) {
    setError('');
    if (manual) {
      router.push('/admin/blog/new?manual=1');
      return;
    }
    if (topic.trim().length < 8) {
      setError('Bir konu yazın.');
      return;
    }
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch('/api/admin/blog/ai', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_article', topic, language, city, tone, audience, length, draft: emptyDraft() }),
      });
      const result = (await response.json()) as { article?: ArticleDraft; error?: string };
      if (!response.ok || !result.article) {
        setError(result.error || 'AI şu anda kullanılamıyor.');
        return;
      }
      const article = { ...result.article, status: 'draft', language };
      const saved = await fetch('/api/admin/blog/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: article, source: 'ai' }),
      });
      const body = (await saved.json()) as { id?: string; error?: string };
      if (!saved.ok || !body.id) {
        localStorage.setItem('vora-blog:new', JSON.stringify(article));
        setError(body.error || 'Taslak sunucuya yazılamadı. Metin tarayıcıda duruyor.');
        return;
      }
      router.push(`/admin/blog/${body.id}`);
    } catch (reason) {
      if ((reason as { name?: string }).name !== 'AbortError') setError('AI şu anda kullanılamıyor.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="studio">
      <h1>Yeni yazı</h1>
      <p>AI ile oluştur veya metni kendin yaz. AI sonucu taslak olarak kalır.</p>
      <label htmlFor="topic">Konu</label>
      <input id="topic" value={topic} placeholder="Trabzon’da yeni insanlarla tanışmanın yolları" onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'center' })} onChange={(event) => setTopic(event.target.value)} />
      <button type="button" onClick={() => setOpen((value) => !value)}>İsteğe bağlı alanlar</button>
      {open ? (
        <div className="stack">
          <label htmlFor="language">Dil</label>
          <select id="language" value={language} onChange={(event) => setLanguage(event.target.value)}>
            {['tr', 'en', 'de', 'fr', 'es', 'ar'].map((code) => <option key={code}>{code}</option>)}
          </select>
          <label htmlFor="city">Şehir</label>
          <select id="city" value={city} onChange={(event) => setCity(event.target.value)}>
            <option value="">Otomatik</option>
            {cities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <label htmlFor="tone">Ton</label>
          <input id="tone" value={tone} onChange={(event) => setTone(event.target.value)} />
          <label htmlFor="audience">Hedef kitle</label>
          <input id="audience" value={audience} onChange={(event) => setAudience(event.target.value)} />
          <label htmlFor="length">Uzunluk</label>
          <input id="length" value={length} onChange={(event) => setLength(event.target.value)} />
          <p className="meta">Kategori listesi: {categories.map((item) => item.name).join(', ') || 'henüz yok'}. Yeni kategori otomatik açılmaz.</p>
        </div>
      ) : null}
      {busy ? <p>Vora AI yazıyor… <button type="button" onClick={() => abortRef.current?.abort()}>Cancel</button></p> : null}
      {error ? <p>{error}</p> : null}
      <div className="studio-bar">
        <button type="button" onClick={() => void create(true)}>Manuel yaz</button>
        <button type="button" onClick={() => void create(false)}>Blog oluştur</button>
      </div>
    </section>
  );
}
